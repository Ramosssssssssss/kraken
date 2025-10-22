import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"

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
  baseDelayMs = 500,
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
      await new Promise((r) => setTimeout(r, delay))
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    const hostname = hostnameFromReq(req)
    const fbOptions = selectFbConfigByHost(hostname)

    const sql = `
      SELECT SUCURSAL_ID, NOMBRE_SUCURSAL, ALMACEN_ID, NOMBRE_ALMACEN, USO_ELEMENTO
      FROM GET_ALL_SUCURSALES_ALMACENES
      ORDER BY SUCURSAL_ID, ALMACEN_ID
    `

    const rows = await queryFirebird(fbOptions, sql)

    const data = (rows || []).map((r: any) => ({
      SUCURSAL_ID: r.SUCURSAL_ID,
      NOMBRE_SUCURSAL: r.NOMBRE_SUCURSAL,
      ALMACEN_ID: r.ALMACEN_ID,
      NOMBRE_ALMACEN: r.NOMBRE_ALMACEN,
      USO_ELEMENTO: r.USO_ELEMENTO,
    }))

    return NextResponse.json({ ok: true, data }, { headers: { "Access-Control-Allow-Origin": "*" } })
  } catch (error: any) {
    console.error("Error GET /api/sucursales-almacenes:", error)
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
    },
  )
}
