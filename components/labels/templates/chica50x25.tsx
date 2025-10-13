"use client"
import React from "react"
import type { LabelTemplate, Dpi } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

// ===== Helpers =====
const toDots = (mm: number, dpi: Dpi) => Math.round((mm / 25.4) * dpi)
const safe = (s: string) => (s || "").replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim()

const zplStart = (wmm: number, hmm: number, dpi: Dpi, opts?: { darkness?: number }) => {
  const md = Math.max(-30, Math.min(30, opts?.darkness ?? 0))
  return `^XA
^CI28
^PW${toDots(wmm, dpi)}
^LL${toDots(hmm, dpi)}
^LT0
^LS0
^PR2,2,2
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

const fmtMoney = (v: unknown) => Number.isFinite(Number(v)) ? money(Number(v)) : money(0)

// ===== Plantilla =====
export const Chica50x25: LabelTemplate = {
  id: "Chica-50x25",
  name: "Chica Totolcingo (50×25.4)",
  width: 49,
  height: 25.4,

  css: (w, h, pad) => `
    @page { size:${w}mm ${h}mm; margin:0 }
    * { box-sizing:border-box; margin:0; padding:0 }
    body { font-family:Arial, Helvetica, sans-serif; -webkit-print-color-adjust:exact; print-color-adjust:exact }
    .p { width:${w}mm; height:${h}mm; page-break-after:always; display:flex; align-items:center; justify-content:center }
    .p:last-child { page-break-after:auto }
    .l { width:${w}mm; height:${h}mm; padding:${pad}mm; display:flex }
    .g {
      width:100%; height:100%;
      display:grid;
      grid-template-columns:repeat(3,1fr);
      grid-template-rows:repeat(6,minmax(0,auto));
      gap:0.8mm 1.8mm;
      font-size:9px; line-height:1.05;
      padding:1mm;
    }
    .desc { grid-area:1/1/3/4; font-weight:700; text-align:left; font-size:9px; line-height:1.1; white-space:normal; overflow-wrap:break-word; display:flex; align-items:start }
    .im { grid-area:3/1/4/2 }
    .es { grid-area:4/1/5/2 }
    .un { grid-area:5/1/6/2 }
    .co { grid-area:6/1/7/2 }
    .fe { grid-area:3/2/4/4; text-align:right }
    .pm { grid-area:4/2/6/4; display:flex; align-items:center; justify-content:flex-end; font-weight:800; font-size:28px; line-height:1 }
    .pl { grid-area:6/2/7/4; text-align:right; font-weight:600 }
    .b { font-weight:600 }
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

  // === ZPL version ===
  renderZPL: (a: any, dpi: Dpi, opts?: { darkness?: number }) => {
  // Tamaño etiqueta
  const W = 49.9, H = 25.4

  // Márgenes y gaps
  const padX = 2.0
  const padY = 0.0              // sin margen top, como pediste
  const colGap = 1.6
  const rowGap = 0.8

  // Grid 3×6
  const colW = (W - padX * 2 - colGap * 2) / 3
  // Alturas por fila (mm) — ajustadas a 50×25.4 para dar aire al precio
  const rows = [3.0, 3.0, 2.3, 3.4, 3.0, 2.6] // 6 filas

  const start = zplStart(W, H, dpi, { darkness: opts?.darkness })

  // Helper: área tipo CSS grid-area: r1/c1 → r2/c2 (r2/c2 exclusivas)
  const sum = (arr:number[], i:number, j:number) => arr.slice(i, j).reduce((s,v)=>s+v, 0)
  const gridArea = (r1:number, c1:number, r2:number, c2:number) => {
    const x = padX + (c1 - 1) * (colW + colGap)
    const y = padY + sum(rows, 0, r1 - 1) + rowGap * (r1 - 1)              // gaps anteriores
    const w = (c2 - c1) * colW + (c2 - c1 - 1) * colGap                    // gaps entre cols
    const h = sum(rows, r1 - 1, r2 - 1) + rowGap * Math.max(0, (r2 - r1 - 1)) // gaps entre filas
    return { x, y, w, h }
  }

  // Áreas (mismo layout que HTML)
  const aDesc   = gridArea(1,1,3,4)
  const aInv    = gridArea(3,1,4,2)
  const aEst    = gridArea(4,1,5,2)
  const aUni    = gridArea(5,1,6,2)
  const aCod    = gridArea(6,1,7,2)
  const aFecha  = gridArea(3,2,4,4)
  const aPrecio = gridArea(4,2,6,4)
  const aDist   = gridArea(6,2,7,4)

  // === Textos ===
  // Descripción 2 líneas
  const desc   = textBox(aDesc.x, aDesc.y, aDesc.w, 2.6, 2, "L", dpi, a?.nombre ?? "", 0.55)
  // Columna izquierda
  const invMax = textBox(aInv.x, aInv.y, aInv.w, 2.3, 1, "L", dpi, `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`)
  const estatus= textBox(aEst.x, aEst.y, aEst.w, 2.3, 1, "L", dpi, a?.estatus ?? "-")
  const unidad = textBox(aUni.x, aUni.y, aUni.w, 2.3, 1, "L", dpi, a?.unidad ?? "")
  const codigo = textBox(aCod.x, aCod.y, aCod.w, 2.3, 1, "L", dpi, a?.codigo ?? "")
  // Columna derecha (arriba)
  const fecha  = textBox(aFecha.x, aFecha.y, aFecha.w, 2.3, 1, "R", dpi, a?.fecha ?? "")

  // Precio grande (ocupa filas 4–6 en la derecha)
  // Ajuste fino: +0.2 mm de offset para centrar ópticamente
  const price  = textBox(aPrecio.x, aPrecio.y + 0.2, aPrecio.w, 6.4, 1, "R", dpi, fmtMoney(a?.precio ?? 0))

  // Distribuidor abajo, con un poco de aire
  const dist   = textBox(aDist.x, aDist.y + 0.6, aDist.w, 2.3, 1, "R", dpi, `Distribuidor: ${fmtMoney(a?.distribuidor ?? 0)}`)

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
    <div className="w-full h-full grid bg-[#d2c600]"
      style={{
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(6, minmax(0, auto))",
        gap: "0.8mm 1.8mm",
        fontSize: 9,
        lineHeight: 1.05
      }}>
      <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
      <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
      <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>
      <div className="col-[1/2] row-[6/7]"><span className="font-semibold">{a.codigo}</span></div>
      <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>
      <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[28px] leading-none">{money(a.precio)}</div>
      <div className="col-[2/4] row-[6/7] text-right font-semibold">Distribuidor: {money(a.distribuidor)}</div>
    </div>
  )
}

export default Chica50x25
