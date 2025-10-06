// lib/labels/zpl.ts
export function mmToDots(mm: number, dpi: 203 | 300 | 600) {
  return Math.round((mm * dpi) / 25.4)
}

export type ZplOptions = {
  widthMm: number
  heightMm: number
  dpi: 203 | 300 | 600
  showQR?: boolean
}

export type ZplItem = {
  codigo: string
  nombre: string
  precio: number
  distribuidor?: number
  quantity: number
}

export function buildZpl(items: ZplItem[], opts: ZplOptions) {
  const W = mmToDots(opts.widthMm, opts.dpi)
  const H = mmToDots(opts.heightMm, opts.dpi)

  // Escalas base por DPI
  const scale = opts.dpi / 203
  const pad = Math.round(20 * scale)
  const nameFontH = Math.round(38 * scale)
  const priceFontH = Math.round(42 * scale)
  const lineY = Math.round( H * 0.60 )
  const barcodeH = Math.round( H * 0.32 )

  let z = "^XA\n"
  z += `^PW${W}\n^LL${H}\n^CI28\n` // UTF-8
  // Para cada etiqueta, repetimos su bloque ^XA...^XZ (mas robusto en algunas ZPL)
  const blocks: string[] = []

  for (const it of items) {
    for (let i = 0; i < Math.max(1, it.quantity|0); i++) {
      let b = "^XA\n"
      b += `^PW${W}\n^LL${H}\n^CI28\n^LH0,0\n`

      // Nombre (truncate simple por ancho)
      b += `^FO${pad},${pad}^A0N,${nameFontH},${Math.round(nameFontH*0.8)}^FB${W - pad*2},2,0,L,0^FD${sanitize(it.nombre)}^FS\n`

      // Precio
      b += `^FO${pad},${Math.round(H*0.40)}^A0N,${priceFontH},${Math.round(priceFontH*0.8)}^FD$${fmtMoney(it.precio)}^FS\n`

      // Línea
      b += `^FO${pad},${lineY}^GB${W - pad*2},2,2^FS\n`

      // Barcode Code128
      b += `^BY2,3,${barcodeH}\n`
      b += `^FO${pad},${lineY + Math.round(6*scale)}^BCN,${barcodeH},N,N,N\n`
      b += `^FD${sanitize(it.codigo)}^FS\n`

      // QR opcional
      if (opts.showQR) {
        b += `^FO${W - pad - Math.round(110*scale)},${pad}^BQN,2,6\n`
        b += `^FDLA,${sanitize(it.codigo)}^FS\n`
      }

      b += "^XZ\n"
      blocks.push(b)
    }
  }

  // Algunas impresoras prefieren múltiples ^XA...^XZ separados en vez de todo dentro de uno.
  z = blocks.join("")
  return z
}

function fmtMoney(n: number) {
  return (n ?? 0).toFixed(2)
}

function sanitize(s: string) {
  return String(s || "").replace(/\^/g, " ").replace(/~/g, "-")
}
