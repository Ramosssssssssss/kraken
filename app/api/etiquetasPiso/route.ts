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
const FB_ENCODING = (process.env.FB_ENCODING || "WIN1252").toUpperCase() as "WIN1252" | "UTF8"
const FIX_SQL = (process.env.FIX_SQL || "1") === "1"

const fbConfig: fb.Options = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  encoding: "UTF8",
}

const JWT_SECRET = process.env.JWT_SECRET || "elyssia-secret-key"
const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// ======== Config de redondeo de precios ============
type RoundMode = "ROUND" | "CEIL" | "FLOOR"
const PRICE_ROUND_MODE = (process.env.PRICE_ROUND_MODE as RoundMode) || "ROUND"

const _DEC_STR = process.env.PRICE_DECIMALS
const PRICE_DECIMALS = _DEC_STR === undefined ? 0 : Number(_DEC_STR)
if (!Number.isFinite(PRICE_DECIMALS) || PRICE_DECIMALS < 0) {
  throw new Error("PRICE_DECIMALS inválido (use entero >= 0)")
}

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

function roundPrice(v: any, decimals = PRICE_DECIMALS, mode: RoundMode = PRICE_ROUND_MODE): number {
  const n = toNum(v, 0)
  if (!Number.isFinite(n)) return 0
  const factor = Math.pow(10, decimals)
  const scaled = Number((n * factor).toFixed(8))
  let roundedScaled: number
  switch (mode) {
    case "CEIL": roundedScaled = Math.ceil(scaled); break
    case "FLOOR": roundedScaled = Math.floor(scaled); break
    default: roundedScaled = Math.round(scaled)
  }
  const out = roundedScaled / factor
  return Number(out.toFixed(decimals))
}

// Mapeo con logs de entrada/salida
const mapRow = (r: Row, rid: string): ApiRow => {
  console.log(`[${rid}] Valores crudos Firebird:`, {
    R_CODIGO: r.R_CODIGO,
    R_DESCRIPCION: r.R_DESCRIPCION,
    R_UNIDAD_VENTA: r.R_UNIDAD_VENTA,
    R_INVENTARIO_MAXIMO: r.R_INVENTARIO_MAXIMO,
    R_PRECIO_LIST_IVA: r.R_PRECIO_LIST_IVA,
    R_PRECIO_MAYOR_IVA: r.R_PRECIO_MAYOR_IVA,
    R_ESTATUS: r.R_ESTATUS
  })

  const mapped: ApiRow = {
    codigo: r.R_CODIGO ?? "",
    descripcion: r.R_DESCRIPCION ?? "",
    unidad_venta: r.R_UNIDAD_VENTA ?? "",
    inventario_maximo: toNum(r.R_INVENTARIO_MAXIMO),
    precio_lista_iva: roundPrice(r.R_PRECIO_LIST_IVA),
    precio_mayor_iva: roundPrice(r.R_PRECIO_MAYOR_IVA),
    estatus: r.R_ESTATUS ?? null,
  }

  console.log(`[${rid}] Mapeado/redondeado:`, mapped)
  return mapped
}

// ================= DB helper =======================
function queryFirebird<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  return new Promise((resolve, reject) => {
    fb.attach(fbConfig, (err, db) => {
      if (err || !db) return reject(err)
      db.query(sql, params, (qErr: any, rows: any[]) => {
        try { db.detach(() => {}) } catch {}
        if (qErr) return reject(qErr)
        resolve(rows || [])
      })
    })
  })
}

// ================= SQL (con FIX) ===================
function buildSQL() {
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
export async function GET(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 10)
  try {
    const { searchParams } = new URL(req.url)
    const codigo = (searchParams.get("codigo") || req.headers.get("x-codigo") || "").trim()
    const almacenStr = (searchParams.get("almacen") || req.headers.get("x-almacen") || "").trim()
    const almacen = Number(almacenStr)

    const sql = buildSQL()
    const rows = await queryFirebird<Row>(sql, [codigo, almacen])

    if (rows.length === 0) {
      return NextResponse.json({ ok: false, error: "Artículo no encontrado" }, { status: 404 })
    }

    const data = rows.map(r => mapRow(r, rid))

    return NextResponse.json({ ok: true, data })
  } catch (error: any) {
    console.error(`[${rid}] ERROR:`, error)
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 })
  }
}
