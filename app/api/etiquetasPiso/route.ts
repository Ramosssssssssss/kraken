// app/api/buscarArticulo/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"

// ================= Runtime / cache =================
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ================= Config ==========================
// Usa WIN1252 si tus datos históricos son CP1252/Latin1 (Microsip clásico).
// Usa UTF8 si tu base/tablas/cliente realmente están en UTF8.
const FB_ENCODING = (process.env.FB_ENCODING || "WIN1252").toUpperCase() as "WIN1252" | "UTF8"

// Activa el doble CAST (OCTETS -> WIN1252 -> UTF8) para columnas texto con datos CP1252 guardados en NONE.
const FIX_SQL = (process.env.FIX_SQL || "0") === "1"

const fbConfig: fb.Options = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  encoding: FB_ENCODING, // 👈 esta es la única “decodificación” que necesitamos
}

const JWT_SECRET = process.env.JWT_SECRET || "elyssia-secret-key"
const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// ================= Logs ============================
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
  const file = path.join(LOGS_DIR, `buscar_articulo-${new Date().toISOString().slice(0, 10)}.log`)
  const line = `[${nowMX()}] [${level}] ${msg}\n`
  try { fs.appendFileSync(file, line, "utf8") } catch (e) { console.error(e) }
  if (level === "ERROR") console.error(line)
  else if (level === "DEBUG") console.debug(line)
  else if (level === "WARN") console.warn(line)
  else console.log(line)
}

// ================= Auth opcional ===================
function verifyToken(token?: string) {
  if (!token) return null
  try { return jwt.verify(token, JWT_SECRET) }
  catch (e) { log(`JWT inválido: ${e}`, "WARN"); return null }
}

// ================= Utils ===========================
type Row = {
  R_CODIGO: string
  R_DESCRIPCION: string
  R_UNIDAD_VENTA: string
  R_INVENTARIO_MAXIMO: number
  R_PRECIO_LIST_IVA: number
  R_PRECIO_MAYOR_IVA: number
  R_ESTATUS: string | null
}

type ApiRow = {
  codigo: string
  descripcion: string
  unidad_venta: string
  inventario_maximo: number
  precio_lista_iva: number
  precio_mayor_iva: number
  estatus: string | null
}

const toNum = (v: any, d = 0) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

const mapRow = (r: Row): ApiRow => ({
  // ⚠️ NO decodifiques de nuevo. Ya vienen bien por 'encoding' de la conexión.
  codigo: r.R_CODIGO ?? "",
  descripcion: r.R_DESCRIPCION ?? "",
  unidad_venta: r.R_UNIDAD_VENTA ?? "",
  inventario_maximo: toNum(r.R_INVENTARIO_MAXIMO),
  precio_lista_iva: toNum(r.R_PRECIO_LIST_IVA),
  precio_mayor_iva: toNum(r.R_PRECIO_MAYOR_IVA),
  estatus: r.R_ESTATUS == null ? null : r.R_ESTATUS,
})

// ================= DB helper =======================
function queryFirebird<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  log(`SQL: ${sql.replace(/\s+/g, " ").trim()} | params: ${JSON.stringify(params)}`, "DEBUG")
  return new Promise((resolve, reject) => {
    fb.attach(fbConfig, (err, db) => {
      if (err || !db) {
        log(`Error conectando a Firebird: ${err?.message || err}`, "ERROR")
        return reject(err)
      }
      db.query(sql, params, (qErr: any, rows: any[]) => {
        try { db.detach(() => {}) } catch {}
        if (qErr) {
          log(`Error en consulta Firebird: ${qErr?.message}`, "ERROR")
          return reject(qErr)
        }
        resolve(rows || [])
      })
    })
  })
}

// ================= SQL (doble CAST opcional) =========
// NONE/CP1252 -> UTF8: OCTETS -> WIN1252 -> UTF8
function buildSQL(useFix: boolean) {
  if (!useFix) {
    return `
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
  }
  const fix = (col: string, len = 200) => `
    CAST(
      CAST(
        CAST(${col} AS VARCHAR(${len}) CHARACTER SET OCTETS)
        AS VARCHAR(${len}) CHARACTER SET WIN1252
      )
      AS VARCHAR(${len}) CHARACTER SET UTF8
    )`
  return `
    SELECT
      ${fix("R_CODIGO", 80)}            AS R_CODIGO,
      ${fix("R_DESCRIPCION", 250)}      AS R_DESCRIPCION,
      ${fix("R_UNIDAD_VENTA", 80)}      AS R_UNIDAD_VENTA,
      R_INVENTARIO_MAXIMO,
      R_PRECIO_LIST_IVA,
      R_PRECIO_MAYOR_IVA,
      ${fix("R_ESTATUS", 40)}           AS R_ESTATUS
    FROM DET_ART_ETIQUETAS(?, ?)
  `
}

// ================= RUTA =============================
// GET /api/buscarArticulo?codigo=XXXXX&almacen=19
export async function GET(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 10)
  try {
    log(`[${rid}] GET /api/buscarArticulo (FB_ENCODING=${FB_ENCODING}, FIX_SQL=${FIX_SQL})`)

    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) verifyToken(authHeader.slice(7))

    const { searchParams } = new URL(req.url)
    const codigo = (searchParams.get("codigo") || req.headers.get("x-codigo") || "").trim()
    const almacenStr = (searchParams.get("almacen") || req.headers.get("x-almacen") || "").trim()

    if (!codigo) {
      return NextResponse.json(
        { ok: false, error: "Falta el parámetro 'codigo'." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" } }
      )
    }
    if (!almacenStr || !/^-?\d+$/.test(almacenStr)) {
      return NextResponse.json(
        { ok: false, error: "Falta o es inválido el parámetro 'almacen'." },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" } }
      )
    }
    const almacen = Number(almacenStr)

    const sql = buildSQL(FIX_SQL)
    log(`[${rid}] Ejecutando DET_ART_ETIQUETAS(codigo='${codigo}', almacen=${almacen}) | fixCast=${FIX_SQL}`, "DEBUG")

    const rows = await queryFirebird<Row>(sql, [codigo, almacen])

    if (rows.length === 0) {
      log(`[${rid}] Sin resultados para codigo=${codigo} en almacen=${almacen}`, "WARN")
      return NextResponse.json(
        { ok: false, error: "Artículo no encontrado para el almacén seleccionado." },
        { status: 404, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" } }
      )
    }

    const data = rows.map(mapRow)
    log(`[${rid}] Resultados: ${data.length} | muestra='${data[0]?.descripcion}'`, "INFO")

    return NextResponse.json(
      { ok: true, data },
      { headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" } }
    )
  } catch (error: any) {
    log(`[${rid}] ERROR: ${error?.message}`, "ERROR")
    log(`[${rid}] STACK: ${error?.stack}`, "DEBUG")
    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", message: String(error?.message || error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json; charset=utf-8" } }
    )
  }
}

// ================= OPTIONS (CORS) ===================
export async function OPTIONS() {
  log("OPTIONS /api/buscarArticulo")
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, x-codigo, x-almacen",
        "Content-Type": "application/json; charset=utf-8",
      },
    }
  )
}
