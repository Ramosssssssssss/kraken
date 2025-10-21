import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"

// ====== Configs por host (copiado del estilo del proyecto) ======
const baseFbConfig: fb.Options = {
  host: process.env.FIREBIRD_HOST || "74.208.83.240",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  encoding: "UTF8",
}

const goumamFbConfig: fb.Options = {
  host: process.env.GOUMAM_FIREBIRD_HOST || process.env.FIREBIRD_HOST || "goumam.ddns.net",
  port: Number(process.env.GOUMAM_FIREBIRD_PORT || process.env.FIREBIRD_PORT || 3050),
  database: process.env.GOUMAM_FB_DATABASE || "C:\\Microsip datos\\GOUMAM.FDB",
  user: process.env.GOUMAM_FIREBIRD_USER || process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.GOUMAM_FIREBIRD_PASSWORD || process.env.FIREBIRD_PASSWORD || "masterkeyBS",
  encoding: "UTF8",
}

function hostnameFromReq(req: NextRequest): string {
  const h = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).hostname || ""
  return h.toLowerCase().replace(/:\d+$/, "")
}

function selectFbConfigByHost(hostname: string): fb.Options {
  return hostname === "goumam.krkn.mx" ? goumamFbConfig : baseFbConfig
}

async function queryFirebird<T = any>(
  fbOptions: fb.Options,
  sql: string,
  params: any[] = [],
  maxRetries = 3,
  baseDelayMs = 500
): Promise<T[]> {
  let attempt = 0
  while (true) {
    try {
      return await new Promise<T[]>((resolve, reject) => {
        fb.attach(fbOptions, (err, db) => {
          if (err || !db) return reject(err)
          db.query(sql, params, (qErr: any, rows: any[]) => {
            try { db.detach(() => {}) } catch {}
            if (qErr) return reject(qErr)
            resolve(rows || [])
          })
        })
      })
    } catch (err) {
      attempt++
      if (attempt > maxRetries) throw err

      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 100
      console.warn(`[Firebird] Error en intento ${attempt}, reintentando en ${delay.toFixed(0)} ms...`)
      await new Promise(r => setTimeout(r, delay))
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const hostname = hostnameFromReq(req)
    const fbOptions = selectFbConfigByHost(hostname)

    const { searchParams } = new URL(req.url)
    const noid = (searchParams.get("noid") || searchParams.get("q") || "").trim()
    const provider = (searchParams.get("provider") || "").trim().toLowerCase()

    if (!noid) return NextResponse.json({ ok: false, error: "El parámetro 'noid' es requerido" }, { status: 400 })

    const sql = `
      SELECT FIRST 1 CLAVE_ARTICULO, ARTICULO_ID, ROL_CLAVE_ART_ID
      FROM CLAVES_ARTICULOS
      WHERE CLAVE_ARTICULO = ?
    `

    const rows = await queryFirebird(fbOptions, sql, [noid])
    if (!rows || rows.length === 0) {
      return NextResponse.json({ ok: false, message: "No se encontró la clave en CLAVES_ARTICULOS" }, { status: 404 })
    }

    const r = rows[0]
    const originalRole = Number(r.ROL_CLAVE_ART_ID || 0)
    // Si el proveedor es Panam, forzamos el role a 17 según lo pedido
    const role = provider.includes("panam") ? 17 : originalRole || null

    const data = {
      claveArticulo: r.CLAVE_ARTICULO ?? "",
      articuloId: r.ARTICULO_ID ?? null,
      originalRole: originalRole || null,
      role,
      providerUsed: provider || null,
    }

    return NextResponse.json({ ok: true, data }, { headers: { "Access-Control-Allow-Origin": "*" } })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: "Error interno del servidor", message: String(error?.message || error) }, { status: 500 })
  }
}

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  )
}
