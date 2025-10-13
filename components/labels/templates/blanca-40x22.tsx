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

 renderZPL: (a: any, dpi: Dpi, opts?: { darkness?: number }) => {
  // === Dimensiones iguales al HTML ===
  const W = 39.9, H = 23.8   // match con renderHTML
  const padX = 2.0, padY = 2.0

  // gap del grid (aprox de "3px 8px" a mm)
  const rowGap = 0.4
  const colGap = 1.2

  // 3 columnas iguales
  const colW = (W - padX * 2 - colGap * 2) / 3

  // 6 filas: ajustadas para que sumen con gaps y padding = H
  // [desc, desc, fila3, fila4, fila5, fila6]
  const rows = [2.8, 2.8, 2.3, 2.9, 2.6, 2.4] // total 15.8
  // check: pad(4.0) + rows(15.8) + rowGap*5(4.0) = 23.8 ✔

  const start = zplStart(W, H, dpi, { darkness: opts?.darkness })

  // Helper para “grid-area: r1/c1/r2/c2” (1-based, end exclusivo)
  const gridArea = (r1: number, c1: number, r2: number, c2: number) => {
    const x = padX + (c1 - 1) * (colW + colGap)
    const y = padY + rows.slice(0, r1 - 1).reduce((s, h) => s + h, 0) + rowGap * (r1 - 1)
    const w = (c2 - c1) * colW + (c2 - c1 - 1) * colGap
    const h = rows.slice(r1 - 1, r2 - 1).reduce((s, hh) => s + hh, 0) + rowGap * (r2 - r1 - 0)
    return { x, y, w, h }
  }

  // === Áreas (mapeadas 1:1 al HTML) ===
  const aDesc   = gridArea(1, 1, 3, 4) // rows 1-2, cols 1-3
  const aInv    = gridArea(3, 1, 4, 2) // row 3, col 1
  const aEst    = gridArea(4, 1, 5, 2) // row 4, col 1
  const aUni    = gridArea(5, 1, 6, 2) // row 5, col 1
  const aCod    = gridArea(6, 1, 7, 2) // row 6, col 1

  const aFecha  = gridArea(3, 2, 4, 4) // row 3, cols 2-3
  const aPrecio = gridArea(4, 2, 6, 4) // rows 4-5, cols 2-3 (span 2 filas)
  const aDist   = gridArea(6, 2, 7, 4) // row 6, cols 2-3

  // === Cajas de texto ===
  // Descripción: 2 líneas, ocupa todo el ancho (como HTML)
  const desc = textBox(aDesc.x, aDesc.y, aDesc.w, 2.8, 2, "L", dpi, a?.nombre ?? "", 0.6)

  // Columna izquierda (1 línea cada una)
  const invMax  = textBox(aInv.x,   aInv.y,   aInv.w, 2.3, 1, "L", dpi, `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`)
  const estatus = textBox(aEst.x,   aEst.y,   aEst.w, 2.3, 1, "L", dpi, a?.estatus ?? "-")
  const unidad  = textBox(aUni.x,   aUni.y,   aUni.w, 2.3, 1, "L", dpi, a?.unidad ?? "")
  const codigo  = textBox(aCod.x,   aCod.y,   aCod.w, 2.3, 1, "L", dpi, a?.codigo ?? "")

  // Fecha (derecha)
  const fecha   = textBox(aFecha.x, aFecha.y, aFecha.w, 2.3, 1, "R", dpi, a?.fecha ?? "")

  // Precio: 1 línea grande, ocupa el alto combinado de filas 4–5 (no se encima)
  // Usa altura ~5.4–5.5mm derivada de aPrecio.h
  const price   = textBox(aPrecio.x, aPrecio.y, aPrecio.w, Math.min(5.6, aPrecio.h), 1, "R", dpi, fmtMoney(a?.precio ?? 0))

  // Dist: para evitar cualquier encimado, lo ponemos en **una sola caja** derecha: "Dist: $..."
  // (Así no hay label/valor compitiendo por la misma línea.)
  const dist    = textBox(aDist.x,  aDist.y,  aDist.w, 2.4, 1, "R", dpi, `Dist: ${fmtMoney(a?.distribuidor ?? 0)}`)

  return `${start}
${desc}
${invMax}
${estatus}
${unidad}
${codigo}
${fecha}
${price}
${dist}
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
