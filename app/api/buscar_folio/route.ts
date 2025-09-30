// app/api/buscar_folio/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"
import iconv from "iconv-lite"

// ===== Runtime / cache =====
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ===== Config =====
// Usa variables de entorno en prod
const fbConfig: fb.Options = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  charset: process.env.FB_CHARSET || "UTF8", // cambia a UTF8 si tu DB lo es
}

const JWT_SECRET = process.env.JWT_SECRET || "elyssia-secret-key"
const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// ===== Logs =====
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

function nowMX(): string {
  try {
    const parts = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
    const m: Record<string, string> = {}
    parts.forEach(p => (m[p.type] = p.value))
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`
  } catch { return new Date().toISOString().replace("T", " ").substring(0, 19) }
}

function log(msg: string, level: "INFO" | "ERROR" | "DEBUG" | "WARN" = "INFO") {
  const file = path.join(LOGS_DIR, `buscar_folio-${new Date().toISOString().slice(0,10)}.log`)
  const line = `[${nowMX()}] [${level}] ${msg}\n`
  try { fs.appendFileSync(file, line, "utf8") } catch (e) { console.error(e) }
  if (level === "ERROR") console.error(line)
  else if (level === "DEBUG") console.debug(line)
  else if (level === "WARN") console.warn(line)
  else console.log(line)
}

// ===== Auth opcional =====
function verifyToken(token?: string) {
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) }
  catch (e) { log(`JWT inválido: ${e}`, "WARN"); return null }
}

// ===== Helpers DB / mappers =====
function decodeField(v: any): string {
  if (typeof v !== "string") return v == null ? "" : String(v)
  try { return iconv.decode(Buffer.from(v, "binary"), "utf8") } catch { return v }
}

function toNum(v: any, d = 0) { const n = Number(v); return Number.isFinite(n) ? n : d }

// 🔧 Normalizador universal de folios: separa prefijo letras + parte numérica con ceros a la izquierda
//    Ej.: "FCT2333" -> "FCT002333" si lenTotal=9  (ajusta lenTotal si tu sistema usa otros largos)
function normalizeFolio(raw: string, lenTotal = 9): string {
  const s = (raw || "").trim()
  const m = s.match(/^([^\d]*)(\d+)$/) // prefijo no-dígitos + números
  if (!m) return s
  const pref = m[1]
  const num = m[2]
  const anchoNum = Math.max(1, lenTotal - pref.length)
  const numPadded = num.padStart(anchoNum, "0")
  return `${pref}${numPadded}`
}

// Quita ceros a la izquierda de la parte numérica de un folio
function denormalizeFolio(folio: string): string {
  const m = (folio || "").match(/^([^\d]*)(\d+)$/)
  if (!m) return folio
  const pref = m[1]
  const num = String(Number(m[2])) // convierte a número y elimina ceros a la izq
  return pref + num
}

// 🔧 Conexión/consulta Firebird (abre/cierra por cada request)
function queryFirebird<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    fb.attach(fbConfig, (err, db) => {
      if (err || !db) return reject(err)
      db.query(sql, params, (qErr: any, rows: any[]) => {
        if (qErr) {
          try { db.detach(() => {}) } catch {}
          return reject(qErr)
        }
        try { db.detach(() => {}) } catch {}
        resolve(rows || [])
      })
    })
  })
}

// 🔧 NUEVO: tipos de etiqueta admitidos
type TipoEtiqueta = "factura" | "traspaso" | "puntoVenta"

// 🔧 NUEVO: Normalizador de tipo (por si llega mayúsculas u otros IDs)
function normalizeTipo(raw?: string | null): TipoEtiqueta {
  const s = (raw || "").toString().trim().toLowerCase()
  if (s === "traspaso" || s === "traspasos") return "traspaso"
  if (s === "puntoventa" || s === "punto_venta" || s === "pv") return "puntoVenta"
  return "factura" // default
}

// 🔧 Estructura de salida unificada (incluye Factura)
type Salida = {
  folio: string
  peso_embarque: number
  sucursal: string
  via_embarque: string
  cliente: string
  nombre_calle: string
  colonia: string
  ciudad: string
  codigo_postal: string
  Factura: string           // <- para matchear con plantilla
  tipoDetectado: TipoEtiqueta
}

// 🔧 Generador de SQL + mapper por tipo
function buildQueryByTipo(tipo: TipoEtiqueta): { sql: string; mapper: (r: any) => Salida } {
  switch (tipo) {
    case "factura":
      return {
        sql: `
          SELECT
            DV.FOLIO,
            COALESCE(DV.PESO_EMBARQUE, 0) AS PESO_EMBARQUE,
            S.NOMBRE  AS SUCURSAL,
            VE.NOMBRE AS VIA_EMBARQUE,
            C.NOMBRE  AS CLIENTE,
            DC.NOMBRE_CALLE,
            DC.COLONIA,
            E.NOMBRE  AS CIUDAD,
            DC.CODIGO_POSTAL
          FROM DOCTOS_VE DV
          INNER JOIN CLIENTES      C  ON C.CLIENTE_ID       = DV.CLIENTE_ID
          INNER JOIN DIRS_CLIENTES DC ON DC.DIR_CLI_ID      = DV.DIR_CONSIG_ID
          INNER JOIN SUCURSALES    S  ON S.SUCURSAL_ID      = DV.SUCURSAL_ID
          LEFT  JOIN VIAS_EMBARQUE VE ON VE.VIA_EMBARQUE_ID = DV.VIA_EMBARQUE_ID
          LEFT  JOIN ESTADOS       E  ON E.ESTADO_ID        = DC.ESTADO_ID
          WHERE DV.FOLIO = ?
        `,
        mapper: (r: any): Salida => ({
          folio: denormalizeFolio(decodeField(r.FOLIO)),
          peso_embarque: toNum(r.PESO_EMBARQUE),
          sucursal: decodeField(r.SUCURSAL),
          via_embarque: decodeField(r.VIA_EMBARQUE),
          cliente: decodeField(r.CLIENTE),
          nombre_calle: decodeField(r.NOMBRE_CALLE),
          colonia: decodeField(r.COLONIA),
          ciudad: decodeField(r.CIUDAD), 
          codigo_postal: decodeField(r.CODIGO_POSTAL),
          Factura: denormalizeFolio(decodeField(r.FOLIO)), // igual que arriba
          tipoDetectado: "factura",
        }),
      }

    case "traspaso":
      return {
        sql: `SELECT TI.FOLIO, S1.NOMBRE AS SUCURSAL_DESTINO, S2.NOMBRE AS SUCURSAL_ORIGEN, VE.NOMBRE AS VIA_EMBARQUE, S3.CALLE, S3.CODIGO_POSTAL, C.NOMBRE AS CIUDAD  FROM TRASPASOS_IN TI
INNER JOIN ALMACENES S1 ON S1.ALMACEN_ID = TI.ALMACEN_DESTINO_ID
INNER JOIN ALMACENES S2 ON S2.ALMACEN_ID = TI.ALMACEN_ORIGEN_ID
INNER JOIN SUCURSALES S3 ON S3.SUCURSAL_ID = TI.SUCURSAL_DESTINO_ID
INNER JOIN VIAS_EMBARQUE VE ON VE.VIA_EMBARQUE_ID = TI.VIA_EMBARQUE_ID
INNER JOIN DOCTOS_IN DI ON DI.DOCTO_IN_ID = TI.DOCTO_IN_ID
INNER JOIN CIUDADES C ON C.CIUDAD_ID = S3.CIUDAD_ID
WHERE TI.FOLIO = ?
        `,
        mapper: (r: any): Salida => ({
        folio: denormalizeFolio(decodeField(r.FOLIO)),
          peso_embarque: toNum(r.PESO_EMBARQUE),
          sucursal: decodeField(r.SUCURSAL_DESTINO),
          via_embarque: decodeField(r.VIA_EMBARQUE),
          cliente: decodeField(r.CLIENTE),
          nombre_calle: decodeField(r.CALLE),
          colonia: decodeField(r.COLONIA),
          ciudad: decodeField(r.CIUDAD),
          codigo_postal: decodeField(r.CODIGO),
          Factura: decodeField(r.FOLIO),
          tipoDetectado: "traspaso",
        }),
      }

    case "puntoVenta":
      return {
        sql: `
SELECT FOLIO, C.NOMBRE AS CLIENTE ,S.NOMBRE AS SUCURSAL, DC.CALLE, DC.COLONIA, CI.NOMBRE, DC.CODIGO_POSTAL, DPV.PESO_EMBARQUE FROM DOCTOS_PV DPV
INNER JOIN SUCURSALES S ON S.SUCURSAL_ID = DPV.SUCURSAL_ID
INNER JOIN CLIENTES C ON C.CLIENTE_ID = DPV.CLIENTE_ID
INNER JOIN DIRS_CLIENTES DC ON DC.DIR_CLI_ID = DPV.DIR_CLI_ID
INNER JOIN CIUDADES CI ON CI.CIUDAD_ID = DC.CIUDAD_ID
WHERE FOLIO = ?
        `,
        mapper: (r: any): Salida => ({
          folio: denormalizeFolio(decodeField(r.FOLIO)),
          peso_embarque: toNum(r.PESO_EMBARQUE),
          sucursal: decodeField(r.SUCURSAL),
          via_embarque: decodeField(r.VIA_EMBARQUE),
          cliente: decodeField(r.CLIENTE),
          nombre_calle: decodeField(r.CALLE),
          colonia: decodeField(r.COLONIA),
          ciudad: decodeField(r.CIUDAD),
          codigo_postal: decodeField(r.CODIGO_POSTAL),
          Factura: decodeField(r.FOLIO),
          tipoDetectado: "puntoVenta",
        }),
      }
  }
}

// 🔧 NUEVO: intenta en orden varios tipos hasta encontrar resultados
async function tryQueriesInOrder(folio: string, prefer?: TipoEtiqueta): Promise<Salida[] & { __tipo?: TipoEtiqueta }> {
  const order: TipoEtiqueta[] = prefer
    ? [prefer, ...(["factura","traspaso","puntoVenta"] as TipoEtiqueta[]).filter(t => t !== prefer)]
    : ["factura", "traspaso", "puntoVenta"]

  for (const tipo of order) {
    const { sql, mapper } = buildQueryByTipo(tipo)
    const rows = await queryFirebird(sql, [folio])
    if (rows.length > 0) {
      const data = rows.map(mapper) as Salida[]
      ;(data as any).__tipo = tipo
      return data as any
    }
  }
  return [] as any
}

// ====== RUTAS ======
export async function GET(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 10)
  try {
    log(`[${rid}] GET /api/buscar_folio`)

    // auth opcional (igual)
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) verifyToken(authHeader.slice(7))

    const { searchParams } = new URL(req.url)
    const folioRaw = (searchParams.get("folio") || req.headers.get("x-folio") || "").trim()

    // 🔧 NUEVO: parametro tipo (opcional, para forzar)
    const tipoRaw = searchParams.get("tipo") || req.headers.get("x-tipo") || ""
    const tipoPreferido = normalizeTipo(tipoRaw || undefined)

    if (!folioRaw) {
      return NextResponse.json(
        { ok: false, error: "Falta el parámetro 'folio'." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    const folio = normalizeFolio(folioRaw, 9)
    log(`[${rid}] folio='${folioRaw}' -> '${folio}' | tipoPreferido='${tipoRaw}' -> '${tipoPreferido}'`, "DEBUG")

    // 🔧 NUEVO: probar 3 consultas en orden
    const resultados = await tryQueriesInOrder(folio, tipoRaw ? tipoPreferido : undefined)

    if (resultados.length === 0) {
      log(`[${rid}] Sin resultados para folio=${folio}`, "WARN")
      return NextResponse.json(
        { ok: false, error: "Folio no encontrado en ninguna tabla." },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    const tipoDetectado = (resultados as any).__tipo as TipoEtiqueta
    log(`[${rid}] Resultados folio=${folio} tipoDetectado=${tipoDetectado}: ${resultados.length}`, "INFO")

    // 🔧 Salida uniforme con Factura incluido por mapper
    return NextResponse.json(
      { ok: true, data: resultados, tipo: tipoDetectado },
      { headers: { "Access-Control-Allow-Origin": "*" } }
    )
  } catch (error: any) {
    log(`GET /api/buscar_folio ERROR: ${error?.message}`, "ERROR")
    log(`STACK: ${error?.stack}`, "DEBUG")
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", message: String(error?.message || error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  log("OPTIONS /api/buscar_folio")
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-folio, x-tipo",
      },
    }
  )
}
 