// app/api/tamano_etiqueta/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"

// Fuerza runtime Node y sin caché
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ======== Config ========
const fbConfig = {
  host: process.env.FIREBIRD_HOST || "201.110.64.212",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FIREBIRD_DATABASE || "C:\\Microsip datos\\GOUMAM.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "masterkeyBS",
}

const JWT_SECRET = process.env.JWT_SECRET || "elyssia-secret-key"
const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// ======== Logs ========
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

function getDateTimeMX(): string {
  try {
    const f = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
    const m: Record<string, string> = {}
    f.forEach(p => (m[p.type] = p.value))
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`
  } catch {
    return new Date().toISOString().replace("T", " ").substring(0, 19)
  }
}

function writeLog(msg: string, type: "INFO" | "ERROR" | "DEBUG" | "WARN" = "INFO") {
  const logDate = new Date().toISOString().split("T")[0]
  const logFileName = `bonos-api-${logDate}.log`
  const logFilePath = path.join(LOGS_DIR, logFileName)
  const line = `[${getDateTimeMX()}] [${type}] ${msg}\n`
  try { fs.appendFileSync(logFilePath, line, "utf8") } catch (e) { console.error(e) }
  if (type === "ERROR") console.error(line)
  else if (type === "DEBUG") console.debug(line)
  else if (type === "WARN") console.warn(line)
  else console.log(line)
}

// ======== Auth (opcional) ========
function verifyToken(token: string): any {
  try { return jwt.verify(token, JWT_SECRET) }
  catch (e) { writeLog(`Error verificando token: ${e}`, "ERROR"); return null }
}

// ======== DB helper ========
async function queryFirebird(sql: string, params: any[] = []): Promise<any[]> {
  writeLog(`SQL: ${sql.replace(/\s+/g, " ").trim()} | params: ${JSON.stringify(params)}`, "DEBUG")
  return new Promise<any[]>((resolve, reject) => {
    fb.attach(fbConfig, (err, db) => {
      if (err) {
        writeLog(`Error conectando a Firebird: ${err.message}`, "ERROR")
        return reject(err)
      }
      db.query(sql, params, (errQ: any, result: any[]) => {
        db.detach()
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

function mapRow(r: any) {
  // Aseguramos primitivos serializables
  const toNum = (v: any, d = 0) => Number.isFinite(Number(v)) ? Number(v) : d
  const toStr = (v: any, d = "") => (v == null ? d : String(v))
  return {
    id: toNum(r.ETIQUETA_ID),
    nombre: toStr(r.NOMBRE),
    width: toNum(r.WIDTH),
    height: toNum(r.HEIGHT),
    margen: toNum(r.MARGEN),
    altoBarra: toNum(r.ALTO_BARRA, 20),
    fontSizeClaveArticulo: toNum(r.FONT_SIZE_CLAVE_ARTICULO, 12),
  }
}

// ======== Rutas ========
// GET /api/tamano_etiqueta
// GET /api/tamano_etiqueta?id=123
export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10)
  try {
    writeLog(`[${requestId}] GET /api/tamano_etiqueta`)

    // (Opcional) token
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (!decoded) writeLog(`[${requestId}] Token inválido`, "WARN")
      else writeLog(`[${requestId}] Usuario autenticado`, "DEBUG")
    }

    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (id) {
      writeLog(`[${requestId}] Buscando etiqueta por id=${id}`, "DEBUG")
      const sql = `
        SELECT FIRST 1
               ek.ETIQUETA_ID,
               ek.NOMBRE,
               ek.WIDTH,
               ek.HEIGHT,
               ek.MARGEN,
               ek.ALTO_BARRA,
               ek.FONT_SIZE_CLAVE_ARTICULO
          FROM ETIQUETAS_KRKN ek
         WHERE ek.ETIQUETA_ID = ?
      `
      const rows = await queryFirebird(sql, [id])
      if (rows.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Etiqueta no encontrada" },
          { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
        )
      }
      const data = mapRow(rows[0])
      writeLog(`[${requestId}] Etiqueta encontrada: ${data.nombre} (${data.id})`)
      return NextResponse.json({ ok: true, data }, { headers: { "Access-Control-Allow-Origin": "*" } })
    }

    // Listado
    writeLog(`[${requestId}] Listando todas las etiquetas`, "DEBUG")
    const sql = `
      SELECT
        ek.ETIQUETA_ID,
        ek.NOMBRE,
        ek.WIDTH,
        ek.HEIGHT,
        ek.MARGEN,
        ek.ALTO_BARRA,
        ek.FONT_SIZE_CLAVE_ARTICULO
      FROM ETIQUETAS_KRKN ek
      ORDER BY ek.NOMBRE
    `
    const rows = await queryFirebird(sql)
    const data = rows.map(mapRow)
    return NextResponse.json({ ok: true, data }, { headers: { "Access-Control-Allow-Origin": "*" } })
  } catch (error: any) {
    writeLog(`Error GET /api/tamano_etiqueta: ${error?.message}`, "ERROR")
    writeLog(`Stack: ${error?.stack}`, "DEBUG")
    // Devolvemos JSON SIEMPRE para que el front no falle al parsear
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", message: String(error?.message || error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  writeLog("OPTIONS /api/tamano_etiqueta")
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    }
  )
}
