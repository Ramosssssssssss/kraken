// app/api/conteo_paq/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import * as fs from "fs"
import * as path from "path"

// ===== Runtime / cache =====
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ===== Config base (FYTTSA) =====
const baseFbConfig: fb.Options = {
  host: process.env.FIREBIRD_HOST || "74.208.83.240",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  encoding: "UTF8",
}

// ===== Config GOUMAM (override por hostname) =====
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
  if (hostname === "goumam.krkn.mx") return goumamFbConfig
  return baseFbConfig
}

const LOGS_DIR = process.env.LOGS_DIR || "./logs"
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true })

function nowMX(): string {
  try {
    const parts = new Intl.DateTimeFormat("es-MX", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date())
    const m: Record<string, string> = {}
    parts.forEach((p) => (m[p.type] = p.value))
    return `${m.year}-${m.month}-${m.day} ${m.hour}:${m.minute}:${m.second}`
  } catch {
    return new Date().toISOString().replace("T", " ").substring(0, 19)
  }
}

function log(msg: string, level: "INFO" | "ERROR" | "DEBUG" | "WARN" = "INFO") {
  const file = path.join(LOGS_DIR, `conteo_paq-${new Date().toISOString().slice(0, 10)}.log`)
  const line = `[${nowMX()}] [${level}] ${msg}\n`
  try {
    fs.appendFileSync(file, line, "utf8")
  } catch (e) {
    console.error(e)
  }
  if (level === "ERROR") console.error(line)
  else if (level === "DEBUG") console.debug(line)
  else if (level === "WARN") console.warn(line)
  else console.log(line)
}

// ===== Tipos =====
type RowIn = { folio: string; paquetes: number; tipo?: string | null }
type BodyIn = {
  rows: RowIn[]
  total_paquetes?: number
  fuente?: string
  fecha?: string
}

// ====== POST: UPSERT (si existe FOLIO -> UPDATE; si no -> INSERT) ======
export async function POST(req: NextRequest) {
  const rid = Math.random().toString(36).slice(2, 10)

  try {
    const body = (await req.json()) as BodyIn
    if (!body?.rows?.length) {
      return NextResponse.json(
        { ok: false, error: "rows vacío" },
        { status: 400, headers: { "Access-Control-Allow-Origin": "*" } },
      )
    }

    const hostname = hostnameFromReq(req)
    const fbOptions = selectFbConfigByHost(hostname)

    const upsertRows = () =>
      new Promise<{ inserted: number; updated: number }>((resolve, reject) => {
        fb.attach(fbOptions, (err, db) => {
          if (err || !db) return reject(err)
          db.transaction(fb.ISOLATION_READ_COMMITTED, (txErr, tx) => {
            if (txErr || !tx) {
              try { db.detach(() => {}) } catch {}
              return reject(txErr)
            }

            let inserted = 0
            let updated = 0

            const runOne = (i: number) => {
              if (i >= body.rows.length) {
                return tx.commit((cErr) => {
                  try { db.detach(() => {}) } catch {}
                  if (cErr) return reject(cErr)
                  resolve({ inserted, updated })
                })
              }

              const r = body.rows[i]
              const folio = (r.folio || "").toString().trim()
              const paquetes = Math.max(1, Number(r.paquetes || 0)) // sobrescribe con el valor recibido

              if (!folio) {
                return tx.rollback(() => {
                  try { db.detach(() => {}) } catch {}
                  reject(new Error(`Folio vacío en rows[${i}]`))
                })
              }

              // 1) ¿Existe folio?
              tx.query("SELECT 1 FROM CONTEO_PAQ WHERE FOLIO = ?", [folio], (selErr: any, rows: any[]) => {
                if (selErr) {
                  return tx.rollback(() => {
                    try { db.detach(() => {}) } catch {}
                    reject(selErr)
                  })
                }

                if (rows && rows.length > 0) {
                  // 2a) UPDATE si existe
                  tx.query(
                    "UPDATE CONTEO_PAQ SET NUM_PAQUETES = ? WHERE FOLIO = ?",
                    [paquetes, folio],
                    (updErr: any) => {
                      if (updErr) {
                        return tx.rollback(() => {
                          try { db.detach(() => {}) } catch {}
                          reject(updErr)
                        })
                      }
                      updated++
                      runOne(i + 1)
                    },
                  )
                } else {
                  // 2b) INSERT si no existe
                  tx.query(
                    "INSERT INTO CONTEO_PAQ (FOLIO, NUM_PAQUETES) VALUES (?, ?)",
                    [folio, paquetes],
                    (insErr: any) => {
                      if (insErr) {
                        return tx.rollback(() => {
                          try { db.detach(() => {}) } catch {}
                          reject(insErr)
                        })
                      }
                      inserted++
                      runOne(i + 1)
                    },
                  )
                }
              })
            }

            runOne(0)
          })
        })
      })

    const result = await upsertRows()

    log(
      `[${rid}] POST /api/conteo_paq -> upserts=${body.rows.length} (inserted=${result.inserted}, updated=${result.updated}) host=${hostname}`,
      "INFO",
    )

    return NextResponse.json(
      { ok: true, ...result },
      { headers: { "Access-Control-Allow-Origin": "*" } },
    )
  } catch (error: any) {
    log(`POST /api/conteo_paq ERROR: ${error?.message}`, "ERROR")
    log(`STACK: ${error?.stack}`, "DEBUG")
    return NextResponse.json(
      { ok: false, error: "Error al registrar", message: String(error?.message || error) },
      { status: 500, headers: { "Access-Control-Allow-Origin": "*" } },
    )
  }
}

// ====== OPTIONS: CORS ======
export async function OPTIONS() {
  log("OPTIONS /api/conteo_paq")
  return NextResponse.json(
    {},
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    },
  )
}
