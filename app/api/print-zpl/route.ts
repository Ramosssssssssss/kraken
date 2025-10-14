// app/api/print-zpl/route.ts
export const runtime = "nodejs"

import net from "net"
import { NextResponse } from "next/server"

type Payload = {
  zpl: string
  ip?: string
  port?: number
}

const PRINTER_IP = process.env.PRINTER_IP || ""     // opcional: fija tu IP aquí
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100)

export async function POST(req: Request) {
  let body: Payload
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "JSON inválido" }, { status: 400 })
  }

  const zpl = (body?.zpl || "").trim()
  const ip  = (body?.ip || PRINTER_IP).trim()
  const port = body?.port || PRINTER_PORT

  if (!zpl) return NextResponse.json({ ok: false, error: "Falta ZPL" }, { status: 400 })
  if (!ip)  return NextResponse.json({ ok: false, error: "Falta IP de la impresora" }, { status: 400 })
  if (!Number.isFinite(port as number)) return NextResponse.json({ ok: false, error: "Puerto inválido" }, { status: 400 })

  // Enviar a 9100/raw
  try {
    await sendRaw9100(ip, port, zpl)
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: String(err?.message || err) }, { status: 502 })
  }
}

function sendRaw9100(ip: string, port: number, data: string) {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket()
    let settled = false

    const cleanup = (err?: Error) => {
      if (settled) return
      settled = true
      try { socket.destroy() } catch {}
      err ? reject(err) : resolve()
    }

    socket.setTimeout(8000)

    socket.on("connect", () => {
      socket.write(data, "utf8", () => {
        // Cierra el envío; algunos modelos requieren un pequeño delay
        setTimeout(() => cleanup(), 50)
      })
    })
    socket.on("timeout", () => cleanup(new Error("Tiempo de espera agotado")))
    socket.on("error", (e) => cleanup(e as Error))
    socket.on("close", () => cleanup())

    socket.connect(port, ip)
  })
}
