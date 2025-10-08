// app/api/buscarArticulo/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import * as fs from "fs"
import * as path from "path"

// ================= Runtime / cache =================
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ================= Config ==========================
const FB_ENCODING = (process.env.FB_ENCODING || "UTF8").toUpperCase() as "WIN1252" | "UTF8"
const FIX_SQL = (process.env.FIX_SQL || "1") === "1"

const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// ===== Config base (FYTTSA) =====
const baseFbConfig: fb.Options = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  encoding: FB_ENCODING, // usar 'encoding' (node-firebird)
}

// ===== Config GOUMAM =====
const goumamFbConfig: fb.Options = {
  host: process.env.GOUMAM_FIREBIRD_HOST || process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.GOUMAM_FIREBIRD_PORT || process.env.FIREBIRD_PORT || 3050),
  database: process.env.GOUMAM_FB_DATABASE || "D:\\Microsip datos\\GOUMAM.FDB",
  user: process.env.GOUMAM_FIREBIRD_USER || process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.GOUMAM_FIREBIRD_PASSWORD || process.env.FIREBIRD_PASSWORD || "masterkeyBS",
  encoding: FB_ENCODING,
}

// ================= Hostname helpers =================
function hostnameFromReq(req: NextRequest): string {
  const h =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    new URL(req.url).hostname ||
    ""
  return h.toLowerCase().replace(/:\d+$/, "")
}

function selectFbConfigByHost(hostname: string): fb.Options {
  if (hostname === "goumam.krkn.mx") return goumamFbConfig
  // default/fyttsa
  return baseFbConfig
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

// ================= Tipos ===========================
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
type RoundMode = "ROUND" | "CEIL" | "FLOOR"
const PRICE_ROUND_MODE = (process.env.PRICE_ROUND_MODE as RoundMode) || "ROUND"
const _DEC_STR = process.env.PRICE_DECIMALS
const PRICE_DECIMALS = _DEC_STR === undefined ? 0 : Number(_DEC_STR)
if (!Number.isFinite(PRICE_DECIMALS) || PRICE_DECIMALS < 0) {
  throw new Error("PRICE_DECIMALS inválido (use entero >= 0)")
}
function roundPrice(v: any, decimals = PRICE_DECIMALS, mode: RoundMode = PRICE_ROUND_MODE): number {
  const n = toNum(v, 0)
  const factor = Math.pow(10, decimals)
  const scaled = Number((n * factor).toFixed(8))
  let roundedScaled: number
  switch (mode) {
    case "CEIL":  roundedScaled = Math.ceil(scaled); break
    case "FLOOR": roundedScaled = Math.floor(scaled); break
    default:      roundedScaled = Math.round(scaled)
  }
  const out = roundedScaled / factor
  return Number(out.toFixed(decimals))
}
const mapRow = (r: Row, rid: string): ApiRow => {
  console.log(`[${rid}] Valores crudos Firebird:`, r)
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

// ================= DB helper (dinámico) =============
function queryFirebird<T = any>(fbOptions: fb.Options, sql: string, params: any[] = []): Promise<T[]> {
  log(`FB[${fbOptions.database}] SQL: ${sql.replace(/\s+/g, " ").trim()} params=${JSON.stringify(params)}`, "DEBUG")
  return new Promise((resolve, reject) => {
    fb.attach(fbOptions, (err, db) => {
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
  if (!FIX_SQL) {
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

// ============== Helpers de búsqueda =================
// (1) Detalle por CÓDIGO usando tu SP existente
async function searchByCodigo(fbOptions: fb.Options, codigo: string, almacen: number, rid: string): Promise<ApiRow[]> {
  const sql = buildSQL()
  const rows = await queryFirebird<Row>(fbOptions, sql, [codigo, almacen])
  return rows.map(r => mapRow(r, rid))
}

// (2) ARTICULO_IDs por ubicación
async function getArticuloIdsPorUbicacion(fbOptions: fb.Options, almacenId: number, ubicacion: string): Promise<number[]> {
  const sql = `
    SELECT ARTICULO_ID
    FROM NIVELES_ARTICULOS
    WHERE ALMACEN_ID = ? AND UPPER(LOCALIZACION) = UPPER(?)
  `
  const rows = await queryFirebird<{ ARTICULO_ID: number }>(fbOptions, sql, [almacenId, ubicacion])
  return rows.map(r => Number(r.ARTICULO_ID)).filter(n => Number.isFinite(n))
}

// (3) CLAVE_ARTICULO(s) por ARTICULO_ID
async function getClavesPorArticuloId(fbOptions: fb.Options, articuloId: number): Promise<string[]> {
  const sql = `SELECT CLAVE_ARTICULO FROM CLAVES_ARTICULOS WHERE ARTICULO_ID = ?`
  const rows = await queryFirebird<{ CLAVE_ARTICULO: string }>(fbOptions, sql, [articuloId])
  return rows.map(r => (r.CLAVE_ARTICULO || "").trim()).filter(Boolean)
}

// (4) Pipeline por ubicación -> ids -> claves -> SP
async function searchByUbicacion(fbOptions: fb.Options, almacen: number, ubicacion: string, rid: string): Promise<ApiRow[]> {
  log(`[${rid}] Buscar por ubicacion="${ubicacion}" almacen=${almacen}`, "INFO")

  const articuloIds = await getArticuloIdsPorUbicacion(fbOptions, almacen, ubicacion)
  if (articuloIds.length === 0) return []

  const clavesSet = new Set<string>()
  const CONC_GET_CLAVES = 20
  for (let i = 0; i < articuloIds.length; i += CONC_GET_CLAVES) {
    const batch = articuloIds.slice(i, i + CONC_GET_CLAVES).map(async (id) => {
      try {
        const claves = await getClavesPorArticuloId(fbOptions, id)
        claves.forEach(c => c && clavesSet.add(c))
      } catch (e) {
        log(`[${rid}] Error obteniendo claves para ARTICULO_ID=${id}: ${String(e)}`, "WARN")
      }
    })
    await Promise.all(batch)
  }

  const claves = Array.from(clavesSet)
  if (claves.length === 0) return []

  const results: ApiRow[] = []
  const CONC_SP = 5
  for (let i = 0; i < claves.length; i += CONC_SP) {
    const batch = claves.slice(i, i + CONC_SP).map(async (clave) => {
      try {
        const detalle = await searchByCodigo(fbOptions, clave, almacen, rid)
        results.push(...detalle)
      } catch (e) {
        log(`[${rid}] Error obteniendo detalle para CLAVE_ARTICULO=${clave}: ${String(e)}`, "WARN")
      }
    })
    await Promise.all(batch)
  }

  log(`[${rid}] Ubicacion="${ubicacion}" -> ${articuloIds.length} articulo_id(s), ${claves.length} clave(s), ${results.length} fila(s)`, "INFO")
  return results
}

// ================= RUTA =============================
export async function GET(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 10)
  try {
    const hostname = hostnameFromReq(req)
    const fbOptions = selectFbConfigByHost(hostname)
    log(`[${rid}] GET /api/buscarArticulo host=${hostname} db=${fbOptions.database}`, "INFO")

    const { searchParams } = new URL(req.url)
    const codigo = (searchParams.get("codigo") || req.headers.get("x-codigo") || "").trim()
    const ubicacion = (searchParams.get("ubicacion") || req.headers.get("x-ubicacion") || "").trim()
    const almacenStr = (searchParams.get("almacen") || req.headers.get("x-almacen") || "").trim()
    const almacen = Number(almacenStr)

    if (!almacenStr || !Number.isFinite(almacen)) {
      return NextResponse.json({ ok: false, error: "Parámetro 'almacen' inválido" }, { status: 400 })
    }

    // 1) por CÓDIGO (comportamiento original)
    if (codigo) {
      const data = await searchByCodigo(fbOptions, codigo, almacen, rid)
      if (data.length === 0) {
        return NextResponse.json({ ok: false, error: "Artículo no encontrado" }, { status: 404 })
      }
      return NextResponse.json({ ok: true, data })
    }

    // 2) por UBICACIÓN (pipeline ARTICULO_ID -> CLAVE_ARTICULO -> SP)
    if (ubicacion) {
      const data = await searchByUbicacion(fbOptions, almacen, ubicacion, rid)
      if (data.length === 0) {
        return NextResponse.json({ ok: false, error: "Sin artículos en esa ubicación" }, { status: 404 })
      }
      return NextResponse.json({ ok: true, data })
    }

    // 3) faltan parámetros
    return NextResponse.json({ ok: false, error: "Falta 'codigo' o 'ubicacion'" }, { status: 400 })
  } catch (error: any) {
    console.error(`[${rid}] ERROR:`, error)
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 })
  }
}
