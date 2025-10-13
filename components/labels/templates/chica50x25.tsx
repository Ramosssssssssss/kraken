"use client"
import React from "react"
import type { LabelTemplate, Dpi } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

// ===== Helpers comunes =====
const toDots = (mm: number, dpi: Dpi) => Math.round((mm / 25.4) * dpi)
const safe = (s: string) => (s || "").replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim()

type BarcodeKind = "none" | "code128" | "qr"

const zplStart = (wmm: number, hmm: number, dpi: Dpi, opts?: { darkness?: number }) => {
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

const fmtMoney = (v: unknown) => Number.isFinite(Number(v)) ? money(Number(v)) : money(0)

// ===== Plantilla =====
export const Chica50x25: LabelTemplate = {
  id: "Chica-50x25",
  name: "Chica Totolcingo (50×25.4 )",
  width: 49,
  height: 25.4,

  css: (w, h, pad) => `
    @page{size:${w}mm ${h}mm;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
    .p:last-child{page-break-after:auto}
    .l{width:${w}mm;height:${h}mm;padding:${pad}mm;display:flex}
    .g{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));gap:1px;font-size:9px;line-height:1.05;padding:1mm;}
    .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:9px;line-height:1;white-space:normal;overflow-wrap:break-word;display:flex;align-items:start}
    .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:3/2/4/4;text-align:right}
    .pm{grid-area:4/2/6/4;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:25px}
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
      <div class="pl">Distribuidor: ${escapeHTML(money(a.distribuidor))}</div>
    </div></div></div>`,

  // === NUEVO: ZPL equivalente ===
  // Puedes pasar opts: { darkness?: number, barcode?: { kind: "none"|"code128"|"qr", value?: string } }
renderZPL: (a: any, dpi: Dpi, opts?: { darkness?: number, barcode?: { kind: BarcodeKind, value?: string } }) => {
  // Dimensiones físicas (mm)
  const W = 49.9, H = 25.4
  const padX = 2.0     // margen lateral (mantener)
  const padY = 0.0     // 🔸 sin margen superior
  const colGap = 3.2   // columnas más juntas

  const start = zplStart(W, H, dpi, { darkness: opts?.darkness })

  // --- Descripción (2 líneas, arriba sin padding)
  const desc = textBox(padX, padY, W - padX * 2, 2.8, 2, "L", dpi, a?.nombre ?? "", 0.55)

  // --- Detalle (grid)
  const detailTop = padY + 5.8 // 🔸 antes 6.8 → más arriba, más compacto

  const leftX = padX
  const leftW = (W - padX * 2 - colGap) / 2
  const rowH = 3.0

  const invMax = textBox(leftX, detailTop + rowH * 0, leftW, 2.2, 1, "L", dpi,
    `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`)
  const estatus = textBox(leftX, detailTop + rowH * 1, leftW, 2.2, 1, "L", dpi, a?.estatus ?? "-")
  const unidad  = textBox(leftX, detailTop + rowH * 2, leftW, 2.2, 1, "L", dpi, a?.unidad ?? "")
  const codigo  = textBox(leftX, detailTop + rowH * 3, leftW, 2.2, 1, "L", dpi, a?.codigo ?? "")

  const rightX = padX + leftW + colGap
  const rightW = W - rightX - padX

  const fecha  = textBox(rightX, detailTop + rowH * 0, rightW, 2.2, 1, "R", dpi, a?.fecha ?? "")
  const price  = textBox(rightX, detailTop + rowH * 1.05, rightW, 6.0, 1, "R", dpi, fmtMoney(a?.precio ?? 0))

  const distY = detailTop + rowH * 3.0
  const distLabelW = 16.0
  const distLabel = textBox(rightX, distY, distLabelW, 2.0, 1, "L", dpi, "Distribuidor:")
  const distValue = textBox(rightX + distLabelW, distY, rightW - distLabelW, 2.0, 1, "R", dpi, fmtMoney(a?.distribuidor ?? 0))

  // --- Código de barras (también sin margen top)
  let barcode = ""
  const kind = opts?.barcode?.kind ?? "none"
  const value = (opts?.barcode?.value ?? a?.codigo ?? a?.sku ?? "").toString()
  if (kind === "code128" && value) {
    const bX = padX
    const bY = 2.0 // 🔸 más pegado al borde superior
    barcode = code128(bX, bY, 6.5, 0.28, dpi, value)
  } else if (kind === "qr" && value) {
    const qX = padX
    const qY = 1.8
    barcode = qrBox(qX, qY, 2.8, value, dpi)
  }

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
}
,

  preview: (a) => (
    <div className="w-full h-full grid bg-[#d2c600]"
      style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "1px", fontSize: 9, lineHeight: 1.05 }}>
      <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
      <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
      <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>
      <div className="col-[1/2] row-[6/7]"><span className="font-semibold">{a.codigo}</span></div>
      <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>
      <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[25px]">{money(a.precio)}</div>
      <div className="col-[2/4] row-[6/7] text-right font-semibold">Distribuidor: {money(a.distribuidor)}</div>
    </div>
  )
}

export default Chica50x25
