"use client"
import React from "react"
import type { LabelTemplate, Dpi } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

// helper local mm -> dots
const toDots = (mm: number, dpi: Dpi) => Math.round((mm / 25.4) * dpi)
const safe = (s: string) => (s || "").replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim()

// helpers ZPL
const zplStart = (wmm: number, hmm: number, dpi: Dpi) =>
  `^XA
^CI28
^PW${toDots(wmm, dpi)}
^LL${toDots(hmm, dpi)}
^LT0
^LS0
^PRB
^MD10
^LH0,0`

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

  // NUEVO: layout ZPL equivalente al grid anterior (sin código de barras, solo textos)
  renderZPL: (a, dpi) => {
    const W = 39.9, H = 22.8
    const padX = 2;   // padding lateral (mm)
    const padY = 2;   // padding superior (mm)
    const colGap = 8; // gap visual entre columna izquierda y derecha (mm) solo a efectos de layout

    const start = zplStart(W, H, dpi)

    // Descripción: filas 1-2, cubre todo el ancho menos padding
    const desc = textBox(padX, padY, W - padX * 2, 2.8, 2, "L", dpi, a.nombre ?? "", 0.6)

    // “G - invMax”, “estatus”, “unidad”, “codigo” (columna izquierda, 4 filas)
    const leftX = padX
    const leftW = (W - padX * 2 - colGap) / 2 // aprox 50% para izq
    const rowH = 3.6 // alto aproximado por fila (mm) para 4 filas
    const leftY0 = padY + 7.2 // debajo de descripción

    const invMax = textBox(leftX, leftY0 + rowH * 0, leftW, 2.0, 1, "L", dpi,
      `G - ${Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}`)
    const estatus = textBox(leftX, leftY0 + rowH * 1, leftW, 2.0, 1, "L", dpi, a.estatus ?? "-")
    const unidad  = textBox(leftX, leftY0 + rowH * 2, leftW, 2.0, 1, "L", dpi, a.unidad ?? "")
    const codigo  = textBox(leftX, leftY0 + rowH * 3, leftW, 2.0, 1, "L", dpi, a.codigo ?? "")

    // Fecha (derecha arriba, fila 3)
    const rightX = padX + leftW + colGap
    const rightW = W - rightX - padX
    const fecha  = textBox(rightX, leftY0, rightW, 2.7, 1, "R", dpi, a.fecha ?? "")

    // Precio (grande, filas 4-5 derecha)
    const price  = textBox(
      rightX, leftY0 + rowH * 1.2, rightW, 5.8, 1, "R", dpi,
      money(a.precio ?? 0)
    )

    // Distribuidor (fila 6 derecha)
    const dist   = textBox(
      rightX, leftY0 + rowH * 3, rightW, 2.9, 1, "R", dpi,
      `Dist: ${money(a.distribuidor ?? 0)}`
    )

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
