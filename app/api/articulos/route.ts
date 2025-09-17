// app/api/articulos/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"

// ======== Config ========
// Recomendado: mover credenciales a variables de entorno
const fbConfig = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FIREBIRD_DATABASE || "D:\\Microsip datos\\DISTRIBUIDORAGOUMAM.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
}

const JWT_SECRET = process.env.JWT_SECRET || "elyssia-secret-key"
const LOGS_DIR = process.env.LOGS_DIR || "./logs"

// ======== Logs ========
// Asegurar que el directorio de logs exista
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true })
}

// Fecha/hora de México (zona: America/Mexico_City)
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
    // Fallback simple si la zona horaria no está disponible
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

  try {
    fs.appendFileSync(logFilePath, logMessage, "utf8")
  } catch (error) {
    // no interrumpir flujo por error de log
    console.error("Error escribiendo en log:", error)
  }

  if (type === "ERROR") console.error(logMessage)
  else if (type === "DEBUG") console.debug(logMessage)
  else if (type === "WARN") console.warn(logMessage)
  else console.log(logMessage)
}

// ======== Auth ========
function verifyToken(token: string): any {
  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    return decoded
  } catch (error) {
    writeLog(`Error verificando token: ${error}`, "ERROR")
    return null
  }
}

// ======== DB helper ========
async function queryFirebird(sql: string, params: any[] = []): Promise<any[]> {
  writeLog(
    `Ejecutando consulta: ${sql.replace(/\s+/g, " ").trim()} con parámetros: ${JSON.stringify(
      params
    )}`,
    "DEBUG"
  )

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

// ======== Rutas ========
// GET /api/articulos?q=texto
export async function GET(req: NextRequest) {
  const requestId = Math.random().toString(36).substring(2, 10)

  try {
    writeLog(`[${requestId}] Iniciando GET /api/articulos`)

    // Leer query param q
    const { searchParams } = new URL(req.url)
    const q = (searchParams.get("q") || "").trim()

    writeLog(`[${requestId}] q recibido: "${q}"`, "DEBUG")

    if (!q) {
      writeLog(`[${requestId}] Falta parámetro q`, "WARN")
      return NextResponse.json(
        { ok: false, error: "El parámetro 'q' es requerido" },
        {
          status: 400,
          headers: {
            "Access-Control-Allow-Origin": "*",
          },
        }
      )
    }

    // (Opcional) Verificar token si quieres restringir el endpoint
    const authHeader = req.headers.get("authorization")
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.substring(7)
      const decoded = verifyToken(token)
      if (!decoded) {
        writeLog(`[${requestId}] Token inválido`, "WARN")
        // Nota: si quieres que sea público, no regreses 401 aquí.
        // return NextResponse.json({ ok:false, error:"No autorizado" }, { status: 401 })
      } else {
        writeLog(
          `[${requestId}] Usuario autenticado. Payload: ${JSON.stringify(decoded)}`,
          "DEBUG"
        )
      }
    } else {
      writeLog(`[${requestId}] Solicitud sin token (endpoint público)`)
    }

    // Consulta con LIKE (dos params, mismo patrón)
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

    const rows = await queryFirebird(sql, [pattern, pattern])

    // Normalizar salida
    const data = rows.map(r => ({
      claveArticulo: r.CLAVE_ARTICULO ?? "",
      nombre: r.NOMBRE ?? "",
    }))

    writeLog(
      `[${requestId}] Búsqueda completada. Coincidencias: ${data.length}`
    )

    return NextResponse.json(
      { ok: true, data },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  } catch (error: any) {
    writeLog(
      `[${requestId}] Error en GET /api/articulos: ${error?.message}`,
      "ERROR"
    )
    writeLog(`[${requestId}] Stack: ${error?.stack}`, "DEBUG")

    return NextResponse.json(
      { ok: false, error: "Error interno del servidor", message: error?.message },
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      }
    )
  }
}

// OPTIONS - CORS preflight
export async function OPTIONS() {
  writeLog("OPTIONS /api/articulos")
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
