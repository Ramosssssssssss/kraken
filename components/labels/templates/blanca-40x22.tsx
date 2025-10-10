"use client"
import React from "react"
import type { LabelTemplate, Dpi } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

// ===== Helpers comunes =====
const toDots = (mm: number, dpi: Dpi) => Math.round((mm / 25.4) * dpi)
const safe = (s: string) => (s || "").replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim()

type BarcodeKind = "none" | "code128" | "qr"

const zplStart = (wmm: number, hmm: number, dpi: Dpi, opts?: { darkness?: number }) => {
  // ^MD: -30..30 (0 por defecto). Tú usabas 10; lo dejamos por defecto en 10.
  const md = Math.max(-30, Math.min(30, opts?.darkness ?? 10))
  return `^XA
^CI28
^PW${toDots(wmm, dpi)}
^LL${toDots(hmm, dpi)}
^LT0
^LS0
^PRB
^MD${md}
^LH0,0`
}

const zplEnd = "^XZ"

const textBox = (
  xmm: number, ymm: number, wmm: number,
  fontMm: number, lines: number, align: "L" | "C" | "R",
  dpi: Dpi, text: string, lineGapMm = 0.6
) => {
  const x = toDots(xmm, dpi)
  const y = toDots(ymm, dpi)
  const w = toDots(wmm, dpi)
  const font = toDots(fontMm, dpi)
  const gap = toDots(lineGapMm, dpi)
  return `^FO${x},${y}^CF0,${font}^FB${Math.max(20, w)},${lines},${gap},${align},0^FD${safe(text)}^FS`
}

const code128 = (xmm: number, ymm: number, heightMm: number, moduleMm: number, dpi: Dpi, data: string) => {
  const x = toDots(xmm, dpi)
  const y = toDots(ymm, dpi)
  const h = toDots(heightMm, dpi)
  const mod = Math.max(1, Math.round(toDots(moduleMm, dpi)))
  return `^FO${x},${y}^BY${mod}
^BCN,${h},N,N,N
^FD${safe(data)}^FS`
}

const qrBox = (xmm: number, ymm: number, mag: number, data: string, dpi: Dpi) => {
  const x = toDots(xmm, dpi)
  const y = toDots(ymm, dpi)
  const m = Math.max(1, Math.min(10, Math.round(mag)))
  return `^FO${x},${y}^BQN,2,${m}^FDLA,${safe(data)}^FS`
}

const fmtMoney = (v: unknown) => {
  const n = Number(v)
  return Number.isFinite(n) ? money(n) : money(0)
}

// ===== Plantilla =====
export const Blanca40x22: LabelTemplate = {
  id: "blanca-40x22",
  name: "Etiqueta blanca (40×22.7)",
  width: 39.9,
  height: 23.8,

  css: (w, h) => `
    @page{size:${w}mm ${h}mm;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
    .p:last-child{page-break-after:auto}
    .l{width:${w}mm;height:${h}mm;display:flex}
    .g{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));font-size:7px; gap:3px 8px;
    line-height:1.07; padding: 2mm;}
    .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:8px;line-height:1.03;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center;}
    .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:3/2/4/4;text-align:right}
    .pm{grid-area:4/2/6/4;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:20px}
    .pl{grid-area:6/2/7/4;text-align:right;font-weight:600}.b{font-weight:600}
  `,

  renderHTML: (a) => `
    <div class="p"><div class="l"><div class="g">
      <div class="desc">${escapeHTML(a.nombre)}</div>
      <div class="im"><span class="b">G - ${Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div class="es"><span class="b">${escapeHTML(a.estatus ?? "-")}</span></div>
      <div class="un"><span class="b">${escapeHTML(a.unidad)}</span></div>
      <div class="co"><span class="b">${escapeHTML(a.codigo)}</span></div>
      <div class="fe"><span class="b">${escapeHTML(a.fecha)}</span></div>
      <div class="pm">${escapeHTML(money(a.precio))}</div>
      <div class="pl">Dist: ${escapeHTML(money(a.distribuidor))}</div>
    </div></div></div>`,

  renderZPL: (
  a: any,
  dpi: Dpi,
  opts?: { darkness?: number, barcode?: { kind: BarcodeKind, value?: string } }
) => {
  const W = 39.9, H = 22.8
  const padX = 2.0
  const padY = 2.0
  const colGap = 8.0

  const start = zplStart(W, H, dpi, { darkness: opts?.darkness })

  // ===== 1) Descripción (2 líneas, ancho completo)
  const DESC_H = 2.8
  const DESC_GAP = 0.6
  const desc = textBox(padX, padY, W - padX * 2, DESC_H, 2, "L", dpi, a?.nombre ?? "", 0.6)

  // ===== 2) (Opcional) Código de barras inmediatamente debajo de la descripción
  const kind: BarcodeKind = opts?.barcode?.kind ?? "none"
  const value = (opts?.barcode?.value ?? a?.codigo ?? a?.sku ?? "").toString()

  let barcode = ""
  let contentY = padY + DESC_H + DESC_GAP // siguiente bloque arranca después de la descripción

  if (kind === "code128" && value) {
    const BAR_H = 9.0  // << alto de barras más grande (antes 7.0/18px)
    const BAR_M = 0.8  // margen inferior post-barcode
    const bX = padX
    const bY = contentY
    barcode = code128(bX, bY, BAR_H, 0.30, dpi, value) // CODE128 explícito
    contentY = bY + BAR_H + BAR_M
  } else if (kind === "qr" && value) {
    // Si fueran QR, deja el área más compacta y sigue el flujo
    const QR_SIDE = 3.0
    const qX = padX
    const qY = contentY
    barcode = qrBox(qX, qY, QR_SIDE, value, dpi)
    contentY = qY + QR_SIDE + 0.6
  }

  // ===== 3) Columnas: izquierda (4 filas) y derecha (fecha + precio + dist)
  const leftX = padX
  const leftW = (W - padX * 2 - colGap) / 2
  const rowH  = 3.4

  // La columna ahora arranca SIEMPRE debajo del bloque anterior (desc + barcode si hubo)
  const leftY0 = contentY

  const invMax = textBox(
    leftX, leftY0 + rowH * 0, leftW, 2.3, 1, "L", dpi,
    `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`
  )
  const estatus = textBox(leftX, leftY0 + rowH * 1, leftW, 2.3, 1, "L", dpi, a?.estatus ?? "-")
  const unidad  = textBox(leftX, leftY0 + rowH * 2, leftW, 2.3, 1, "L", dpi, a?.unidad ?? "")
  const codigo  = textBox(leftX, leftY0 + rowH * 3, leftW, 2.3, 1, "L", dpi, a?.codigo ?? "")

  // Columna derecha
  const rightX = padX + leftW + colGap
  const rightW = W - rightX - padX

  // Fecha alineada con la primera fila izquierda
  const fecha = textBox(rightX, leftY0 + rowH * 0 + 0.1, rightW, 2.4, 1, "R", dpi, a?.fecha ?? "")

  // Precio: debajo de fecha con altura amplia, NO se pisa con dist
  const PRICE_H = 5.8            // altura de caja para precio (ligeramente más que antes)
  const PRICE_GAP = 0.6          // margen inferior antes de "Dist:"
  const priceY = leftY0 + rowH * 1 + 0.3
  const price  = textBox(rightX, priceY, rightW, PRICE_H, 1, "R", dpi, fmtMoney(a?.precio ?? 0))

  // Dist: siempre debajo del precio con margen
  const distY = priceY + PRICE_H + PRICE_GAP
  const distLabelW = 9.0
  const distH = 2.2
  const distLabel = textBox(rightX, distY, distLabelW, distH, 1, "L", dpi, "Dist:")
  const distValue = textBox(rightX + distLabelW, distY, rightW - distLabelW, distH, 1, "R", dpi, fmtMoney(a?.distribuidor ?? 0))

  return `${start}
${desc}
${barcode}
${invMax}
${estatus}
${unidad}
${codigo}
${fecha}
${price}
${distLabel}
${distValue}
${zplEnd}`
},


  preview: (a) => (
    <div className="w-full h-full grid"
      style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "1px", fontSize: 7, lineHeight: 1.07 }}>
      <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
      <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
      <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>
      <div className="col-[1/2] row-[6/7]"><span className="font-semibold">{a.codigo}</span></div>
      <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>
      <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[25px]">{money(a.precio)}</div>
      <div className="col-[2/4] row-[6/7] text-right font-semibold">Dist: {money(a.distribuidor)}</div>
    </div>
  )
}

export default Blanca40x22
