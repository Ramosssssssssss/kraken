// app/api/articulos/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"

// ========= Constantes =========
const JWT_SECRET = process.env.JWT_SECRET || "elyssia-secret-key"
const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// Carga segura del mapa de tenants desde ENV (opción A)
let TENANTS_MAP: Record<string, any> = {}
try {
  if (process.env.FIREBIRD_TENANTS) {
    TENANTS_MAP = JSON.parse(process.env.FIREBIRD_TENANTS)
  }
} catch {}

// Cache (memoria) de configs por 5 minutos para la opción B (servicio externo)
const cfgCache = new Map<string, { cfg: any; exp: number }>()
const CFG_TTL_MS = 5 * 60 * 1000

// ========= Utilidades =========
if (!fs.existsSync(LOGS_DIR)) {
  try { fs.mkdirSync(LOGS_DIR, { recursive: true }) } catch {}
}

function getDateTimeMX(): string {
  try {
    const f = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
    const map: Record<string, string> = {}
    f.forEach(p => (map[p.type] = p.value))
    return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`
  } catch {
    return new Date().toISOString().replace("T", " ").substring(0, 19)
  }
}

function writeLog(
  message: string,
  type: "INFO" | "ERROR" | "DEBUG" | "WARN" = "INFO"
) {
  const logDate = new Date().toISOString().split("T")[0]
  const logFileName = `bonos-api-${logDate}.log`
  const logFilePath = path.join(LOGS_DIR, logFileName)
  const logMessage = `[${getDateTimeMX()}] [${type}] ${message}\n`
  try { fs.appendFileSync(logFilePath, logMessage, "utf8") } catch {}
  if (type === "ERROR") console.error(logMessage)
  else if (type === "DEBUG") console.debug(logMessage)
  else if (type === "WARN") console.warn(logMessage)
  else console.log(logMessage)
}

function verifyToken(token: string): any {
  try { return jwt.verify(token, JWT_SECRET) }
  catch (error) {
    writeLog(`Error verificando token: ${String((error as Error)?.message || error)}`, "ERROR")
    return null
  }
}

// --- Resolver tenant del request ---
function resolveTenantFromReq(req: NextRequest): string | null {
  // 1) header explícito
  const h = req.headers.get("x-tenant")
  if (h) return h.toLowerCase()

  // 2) subdominio
  try {
    const host = req.headers.get("host") || ""
    const parts = host.split(".")
    const sub = parts.length >= 3 ? (parts[0] || "").toLowerCase() : ""
    if (sub && !["www", "app"].includes(sub)) return sub
  } catch {}

  // 3) cookie
  const cookieTenant = req.cookies.get("tenant")?.value
  if (cookieTenant) return cookieTenant.toLowerCase()

  // 4) JWT (opcional, si incluyes tenant en el token)
  const auth = req.headers.get("authorization")
  if (auth?.startsWith("Bearer ")) {
    const t = auth.substring(7)
    const decoded: any = verifyToken(t)
    if (decoded?.tenant) return String(decoded.tenant).toLowerCase()
  }

  return null
}

// --- Obtener fbConfig seguro para el tenant ---
async function getFbConfigForTenant(req: NextRequest): Promise<any> {
  const tenant = resolveTenantFromReq(req)
  if (!tenant) throw new Error("No se pudo resolver el tenant")

  // Opción A: ENV JSON (FIREBIRD_TENANTS)
  if (TENANTS_MAP[tenant]) {
    return TENANTS_MAP[tenant]
  }

  // Opción B: Servicio de configuración (baseURL desde header, cookie o env)
  const apiUrl =
    req.headers.get("x-company-apiurl") ||
    req.cookies.get("apiUrl")?.value ||
    process.env.CONFIG_SERVICE_BASEURL

  if (!apiUrl) {
    throw new Error(`No hay config para tenant "${tenant}" y no hay servicio de configuración`)
  }

  // Cache simple para reducir latencia
  const cached = cfgCache.get(tenant)
  const now = Date.now()
  if (cached && cached.exp > now) return cached.cfg

  const url = `${apiUrl.replace(/\/+$/, "")}/fb-config?codigo=${encodeURIComponent(tenant)}`
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      "x-internal-token": process.env.CONFIG_SERVICE_TOKEN || "", // S2S auth
      "x-origin": "elyssia-api",
    },
    cache: "no-store",
  })

  if (!res.ok) {
    const txt = await res.text().catch(() => "")
    throw new Error(`Config service respondió ${res.status}: ${txt}`)
  }

  const json = await res.json()
  // Esperamos estructura: { host, port, database, user, password, charset? }
  if (!json?.host || !json?.database || !json?.user || !json?.password) {
    throw new Error("Config service devolvió un objeto incompleto")
  }

  cfgCache.set(tenant, { cfg: json, exp: now + CFG_TTL_MS })
  return json
}

// --- Helper DB que acepta config dinámico ---
async function queryFirebirdWithConfig(
  fbConfig: any,
  sql: string,
  params: any[] = []
): Promise<any[]> {
  writeLog(
    `FB[${fbConfig?.database}] SQL: ${sql.replace(/\s+/g, " ").trim()} params=${JSON.stringify(params)}`,
    "DEBUG"
  )

  return new Promise<any[]>((resolve, reject) => {
    fb.attach(fbConfig, (err, db) => {
      if (err) {
        writeLog(`Error conectando a Firebird: ${err.message}`, "ERROR")
        return reject(err)
      }

      db.query(sql, params, (errQ: any, result: any[]) => {
        try { db.detach() } catch {}
        if (errQ) {
          writeLog(`Error en consulta Firebird: ${errQ.message}`, "ERROR")
          return reject(errQ)
        }
        writeLog(`Consulta OK. Filas: ${result?.length ?? 0}`, "DEBUG")
        resolve(result || [])
      })
    })
  })
}

// ========= Rutas =========
export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10)

  try {
    writeLog(`[${requestId}] Iniciando GET /api/articulos`)

    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()
    if (!q) {
      writeLog(`[${requestId}] Falta parámetro q`, "WARN")
      return NextResponse.json(
        { ok: false, error: "El parámetro 'q' es requerido" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    // (Opcional) Auth
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (!decoded) writeLog(`[${requestId}] Token inválido`, "WARN")
      else writeLog(`[${requestId}] Usuario autenticado`, "DEBUG")
    } else {
      writeLog(`[${requestId}] Solicitud sin token (endpoint público)`)
    }

    // 1) Resolver config por tenant (headers/cookies/env)
    const fbConfig = await getFbConfigForTenant(req)
    // Defaults razonables
    fbConfig.port = Number(fbConfig.port ?? 3050)
    fbConfig.charset = fbConfig.charset || "ISO8859_1" // o "UTF8" si aplica

    // 2) Ejecutar consulta
    const pattern = `%${q}%`
    const sql = `
      SELECT FIRST 10
             ca.CLAVE_ARTICULO,
             a.NOMBRE
        FROM CLAVES_ARTICULOS ca
        INNER JOIN ARTICULOS a ON a.ARTICULO_ID = ca.ARTICULO_ID
       WHERE UPPER(ca.CLAVE_ARTICULO) LIKE UPPER(?)
          OR UPPER(a.NOMBRE)        LIKE UPPER(?)
       ORDER BY a.NOMBRE
    `
    const rows = await queryFirebirdWithConfig(fbConfig, sql, [pattern, pattern])

    const data = rows.map(r => ({
      claveArticulo: r.CLAVE_ARTICULO ?? "",
      nombre: r.NOMBRE ?? "",
    }))

    writeLog(`[${requestId}] Búsqueda OK. Coincidencias: ${data.length}`)
    return NextResponse.json(
      { ok: true, data },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    )
  } catch (error: any) {
    writeLog(`[${requestId}] Error en GET /api/articulos: ${error?.message}`, "ERROR")
    writeLog(`[${requestId}] Stack: ${error?.stack}`, "DEBUG")
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", message: error?.message },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  writeLog("OPTIONS /api/articulos")
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers":
          "Content-Type, Authorization, x-tenant, x-company-apiurl",
      },
    }
  )
}
