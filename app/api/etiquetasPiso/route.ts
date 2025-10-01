// app/api/buscarArticulo/route.ts
import { type NextRequest, NextResponse } from "next/server"
import * as fb from "node-firebird"
import jwt from "jsonwebtoken"
import * as fs from "fs"
import * as path from "path"
import iconv from "iconv-lite"

// Fuerza runtime Node y sin caché
export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export const revalidate = 0

// ======== Config ======== CORREGIDO
const fbConfig = {
  host: process.env.FIREBIRD_HOST || "85.215.109.213",
  port: Number(process.env.FIREBIRD_PORT || 3050),
  database: process.env.FB_DATABASE || "D:\\Microsip datos\\GUIMAR.FDB",
  user: process.env.FIREBIRD_USER || "SYSDBA",
  password: process.env.FIREBIRD_PASSWORD || "BlueMamut$23",
  encoding: 'WIN1252', // 👈 CAMBIO CRÍTICO: Windows-1252 para Microsip
} as fb.Options;

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

// ======== DECODIFICACIÓN MEJORADA ========
function decodeField(v: any): string {
  if (typeof v !== "string") return v == null ? "" : String(v)
  
  try {
    // 👇 PRIMERO: Intentar decodificar desde Windows-1252 (común en Microsip)
    const decodedFromWin1252 = iconv.decode(Buffer.from(v, 'binary'), 'win1252');
    
    // Verificar si hay caracteres corruptos
    if (!decodedFromWin1252.includes('�') && !tieneCaracteresRaros(decodedFromWin1252)) {
      return decodedFromWin1252;
    }
    
    // 👇 SEGUNDO: Si falla, probar Latin1
    const decodedFromLatin1 = iconv.decode(Buffer.from(v, 'binary'), 'latin1');
    if (!decodedFromLatin1.includes('�') && !tieneCaracteresRaros(decodedFromLatin1)) {
      return decodedFromLatin1;
    }
    
    // 👇 TERCERO: Si hay caracteres raros, aplicar corrección específica
    return corregirCaracteresEspecificos(decodedFromWin1252);
    
  } catch (error) { 
    writeLog(`Error decodificando campo: ${error}`, "DEBUG");
    return v;
  }
}

// 👇 Función para detectar caracteres raros como "ý" en lugar de "í"
function tieneCaracteresRaros(texto: string): boolean {
  const caracteresRaros = ['ý', '´', '˜', 'ˆ', '¨', '`'];
  return caracteresRaros.some(caracter => texto.includes(caracter));
}

// 👇 Corrección específica para caracteres mal decodificados
function corregirCaracteresEspecificos(texto: string): string {
  if (!texto) return texto;
  
  const mapeoCorreccion: { [key: string]: string } = {
    // Correcciones para Windows-1252 mal interpretado
    'ý': 'í',
    '´a': 'á',
    '´e': 'é',
    '´i': 'í', 
    '´o': 'ó',
    '´u': 'ú',
    '´A': 'Á',
    '´E': 'É',
    '´I': 'Í',
    '´O': 'Ó',
    '´U': 'Ú',
    '˜n': 'ñ',
    '˜N': 'Ñ',
    'ˆa': 'â',
    'ˆe': 'ê',
    'ˆi': 'î',
    'ˆo': 'ô',
    'ˆu': 'û',
    '¨a': 'ä',
    '¨e': 'ë',
    '¨i': 'ï',
    '¨o': 'ö',
    '¨u': 'ü',
    '`a': 'à',
    '`e': 'è',
    '`i': 'ì',
    '`o': 'ò',
    '`u': 'ù',
    
    // Correcciones adicionales comunes
    'Ã¡': 'á',
    'Ã©': 'é',
    'Ã­': 'í',
    'Ã³': 'ó',
    'Ãº': 'ú',
    'Ã±': 'ñ',
    'Ã‘': 'Ñ',
    'Ã': 'Á',
    'Ã‰': 'É',
    'Ã': 'Í',
    'Ã“': 'Ó',
    'Ãš': 'Ú',
    'Â¡': '¡',
    'Â¿': '¿'
  };

  let textoCorregido = texto;
  
  // Primero reemplazar combinaciones de dos caracteres
  Object.keys(mapeoCorreccion).forEach(caracterCorrupto => {
    const regex = new RegExp(caracterCorrupto, 'g');
    textoCorregido = textoCorregido.replace(regex, mapeoCorreccion[caracterCorrupto]);
  });

  return textoCorregido;
}

function mapRow(r: any) {
  const toNum = (v: any, d = 0) => (Number.isFinite(Number(v)) ? Number(v) : d)
  
  // Decodificar y loguear para debug
  const descripcionOriginal = r.R_DESCRIPCION;
  const descripcionDecodificada = decodeField(descripcionOriginal);
  
  if (descripcionOriginal !== descripcionDecodificada) {
    writeLog(`Descripción decodificada: '${descripcionOriginal}' -> '${descripcionDecodificada}'`, "DEBUG");
  }
  
  return {
    codigo: decodeField(r.R_CODIGO),
    descripcion: descripcionDecodificada,
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
    
    // Log adicional para verificar la decodificación
    if (data.length > 0) {
      const primerArticulo = data[0];
      writeLog(`[${requestId}] Artículo encontrado: ${primerArticulo.codigo} - ${primerArticulo.descripcion}`, "INFO");
      
      // 👇 Debug detallado de caracteres
      if (primerArticulo.descripcion.includes('ý') || primerArticulo.descripcion.includes('´')) {
        writeLog(`[${requestId}] ⚠️  POSIBLE ERROR DE DECODIFICACIÓN DETECTADO`, "WARN");
        writeLog(`[${requestId}] Texto original en bytes: ${Buffer.from(rows[0].R_DESCRIPCION, 'binary').toString('hex')}`, "DEBUG");
      }
    }
    
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