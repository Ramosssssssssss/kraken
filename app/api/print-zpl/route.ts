// app/api/print-zpl/route.ts
import type { NextRequest } from "next/server"
import net from "net"

export const runtime = "nodejs" // importante: NO edge
export const dynamic = "force-dynamic"

type Body = { host: string; port?: number; zpl: string; timeoutMs?: number }

export async function POST(req: NextRequest) {
  try {
    const { host, port = 9100, zpl, timeoutMs = 6000 } = (await req.json()) as Body
    if (!host || !zpl) {
      return new Response(JSON.stringify({ ok: false, error: "Faltan host o zpl" }), { status: 400 })
    }

    const result = await new Promise<{ ok: boolean; bytes?: number }>((resolve, reject) => {
      const socket = new net.Socket()
      let total = 0
      const timer = setTimeout(() => {
        try { socket.destroy() } catch {}
        reject(new Error("Timeout al conectar/enviar a la impresora"))
      }, timeoutMs)

      socket.once("error", (e) => {
        clearTimeout(timer)
        reject(e)
      })

      socket.connect(port, host, () => {
        // Enviar ZPL como UTF-8; Zebra suele aceptarlo bien con ^CI28
        const buf = Buffer.from(zpl, "utf8")
        socket.write(buf, (err) => {
          if (err) { clearTimeout(timer); socket.destroy(); reject(err); return }
          total += buf.length
          // Pequeña espera y cerramos
          setTimeout(() => {
            clearTimeout(timer)
            socket.end()
            resolve({ ok: true, bytes: total })
          }, 100)
        })
      })
    })

    return Response.json(result)
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "Error al imprimir" }), { status: 500 })
  }
}
