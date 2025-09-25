// app/api/buscarArticulo/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"
import iconv from "iconv-lite"   // 👈 necesario para decodificar

// Fuerza runtime Node y sin caché
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ======== Config ========
const fbConfig = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMARTEST.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  charset: "ISO8859_1",   // ⚠️ cámbialo a "UTF8" si tu DB ya está en UTF8
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

// ======== Decodificación ========
function decodeField(v: any): string {
  if (typeof v !== "string") return v == null ? "" : String(v)
  try {
    // decodifica suponiendo que viene en ISO8859_1/WIN1252
    return iconv.decode(Buffer.from(v, "binary"), "utf8")
  } catch {
    return v
  }
}

function mapRow(r: any) {
  const toNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
  return {
    codigo: decodeField(r.R_CODIGO),
    descripcion: decodeField(r.R_DESCRIPCION),
    unidad_venta: decodeField(r.R_UNIDAD_VENTA),
    inventario_maximo: toNum(r.R_INVENTARIO_MAXIMO),
    precio_lista_iva: toNum(r.R_PRECIO_LIST_IVA),
    precio_mayor_iva: toNum(r.R_PRECIO_MAYOR_IVA),
    estatus: r.R_ESTATUS == null ? null : decodeField(r.R_ESTATUS),
  }
}

// ======== Rutas ========
// GET /api/buscarArticulo?codigo=XXXXX&almacen=19
export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10)
  try {
    writeLog(`[${requestId}] GET /api/buscarArticulo`)

    // (Opcional) token
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (!decoded) writeLog(`[${requestId}] Token inválido`, "WARN")
      else writeLog(`[${requestId}] Usuario autenticado`, "DEBUG")
    }

    const { searchParams } = new URL(req.url)
    const codigo = (searchParams.get("codigo") || req.headers.get("x-codigo") || "").trim()
    const almacenStr = (searchParams.get("almacen") || req.headers.get("x-almacen") || "").trim()

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "Falta el parámetro 'codigo'." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }
    if (!almacenStr || !/^-?\d+$/.test(almacenStr)) {
      return NextResponse.json(
        { ok: false, error: "Falta o es inválido el parámetro 'almacen'." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }
    const almacen = Number(almacenStr)

    writeLog(`[${requestId}] Ejecutando SP DET_ART_ETIQUETAS con (codigo='${codigo}', almacen=${almacen})`, "DEBUG")

    const sql = `
      SELECT
        R_CODIGO,
        R_DESCRIPCION,
        R_UNIDAD_VENTA,
        R_INVENTARIO_MAXIMO,
        R_PRECIO_LIST_IVA,
        R_PRECIO_MAYOR_IVA,
        R_ESTATUS
      FROM DET_ART_ETIQUETAS(?, ?)
    `
    const rows = await queryFirebird(sql, [codigo, almacen])

    if (rows.length === 0) {
      writeLog(`[${requestId}] Sin resultados para codigo=${codigo} en almacen=${almacen}`, "WARN")
      return NextResponse.json(
        { ok: false, error: "Artículo no encontrado para el almacén seleccionado." },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*" } }
      )
    }

    const data = rows.map(mapRow)
    writeLog(`[${requestId}] Resultados: ${data.length}`, "INFO")
    return NextResponse.json({ ok: true, data }, { headers: { "Access-Control-Allow-Origin": "*" } })
  } catch (error: any) {
    writeLog(`Error GET /api/buscarArticulo: ${error?.message}`, "ERROR")
    writeLog(`Stack: ${error?.stack}`, "DEBUG")
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", message: String(error?.message || error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
    )
  }
}

// OPTIONS - CORS
export async function OPTIONS() {
  writeLog("OPTIONS /api/buscarArticulo")
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-codigo, x-almacen",
      },
    }
  )
}
