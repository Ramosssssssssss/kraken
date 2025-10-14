"use client"
import React from "react"
import type { LabelTemplate, Dpi } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

/* ===== Helpers ZPL locales (autocontenidos) ===== */
const toDots = (mm: number, dpi: Dpi) => Math.round((mm / 25.4) * dpi)
const safeZ = (s: string) => (s ?? "").replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim()
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
  xmm: number,
  ymm: number,
  wmm: number,
  fontMm: number,
  lines: number,
  align: "L" | "C" | "R",
  dpi: Dpi,
  text: string,
  lineGapMm = 0.5
) => {
  const x = toDots(xmm, dpi)
  const y = toDots(ymm, dpi)
  const w = toDots(wmm, dpi)
  const font = toDots(fontMm, dpi)
  const gap = toDots(lineGapMm, dpi)
  return `^FO${x},${y}^CF0,${font}^FB${Math.max(20, w)},${lines},${gap},${align},0^FD${safeZ(text)}^FS`
}
const fmtMoneyZ = (v: unknown) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number.isFinite(Number(v)) ? Number(v) : 0
  )

export const Mini25x25: LabelTemplate = {
  id: "25x25",
  name: "Pequeñas (25×25 mm)",
  width: 25,
  height: 25,
  css: (w, h) => `
@page{size:${w}mm ${h}mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{
  font-family: Arial, "Arial Black", sans-serif;
  color:#000;
  -webkit-print-color-adjust:exact; print-color-adjust:exact;
  -webkit-font-smoothing:none;
  text-rendering:optimizeSpeed;
}
/* ---------- util para “negrita densa” ---------- */
.dense{
  font-weight:900;
  -webkit-text-stroke:0.2px #000;
  text-shadow:
    0 0 0.25px #000,
    0.25px 0 0.25px #000,
    -0.25px 0 0.25px #000,
    0 0.25px 0.25px #000,
    0 -0.25px 0.25px #000;
}
.g{
  width:${w}mm;height:${h}mm;
  display:grid;
  grid-template-columns:repeat(3,1fr);
  grid-template-rows:repeat(6,minmax(0,auto));
  gap:1px;font-size:8px;font-weight:bold;padding:1mm;
}
.desc{
  grid-area: 1 / 1 / 3 / 4;
  display:-webkit-box;
  -webkit-box-orient:vertical;
  -webkit-line-clamp:2;
  overflow:hidden;
  padding:0 0.6mm;
  font-weight:bold;
  font-size:7.6px;
  line-height:1.05;
  text-align:left;
  word-break:break-word;
  hyphens:auto;
}
.im{grid-area: 3 / 1 / 4 / 2;}
.es{grid-area: 4 / 1 / 5 / 2;}
.un{grid-area: 5 / 1 / 6 / 2;}
.co{grid-area: 6 / 1 / 7 / 2;}
.fe{grid-area: 3 / 2 / 4 / 4; text-align:right}
.pm{grid-area: 4 / 2 / 6 / 4; display:flex; align-items:center; justify-content:flex-end; font-weight:bold; font-size:15px}
.pl{grid-area: 6 / 2 / 7 / 4; text-align:right}
.b{font-weight:bold;font-size:7px}
`,

  renderHTML: (a) => `
<div class="p"><div class="l"><div class="g">
  <div class="desc dense">${escapeHTML(a.nombre)}</div>
  <div class="im"><span class="b dense">G - ${Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
  <div class="es"><span class="b dense">${escapeHTML(a.estatus ?? "-")}</span></div>
  <div class="un"><span class="b dense">${escapeHTML(a.unidad)}</span></div>
  <div class="co"><span class="b dense">${escapeHTML(a.codigo)}</span></div>
  <div class="fe"><span class="b dense">${escapeHTML(a.fecha)}</span></div>
  <div class="pm dense">${escapeHTML(money(a.precio))}</div>
  <div class="pl dense">Dist: ${escapeHTML(money(a.distribuidor))}</div>
</div></div></div>`,

  /* ========= ZPL que conserva el diseño del renderHTML (grid 3×6) ========= */
  renderZPL: (a, dpi: Dpi, opts?: { darkness?: number }) => {
    const W = 25, H = 25

    // padding y gaps (CSS: padding:1mm; gap:1px ≈ 0.26–0.3mm)
    const padX = 1, padY = 1
    const rowGap = 0.3
    const colGap = 0.3

    // 3 columnas, 6 filas
    const colW = (W - padX * 2 - colGap * 2) / 3
    // Reparto de alturas (suma = H - paddings - gaps)
    // [desc 2 filas][fila3][fila4][fila5][fila6]
    const rows = [4.0, 4.0, 3.5, 4.5, 3.0, 2.5] // total 21.5mm

    const start = zplStart(W, H, dpi, { darkness: opts?.darkness })

    const sum = (arr: number[], i: number, j: number) => arr.slice(i, j).reduce((s, v) => s + v, 0)
    // grid-area: r1/c1 → r2/c2 (exclusivas r2, c2)
    const area = (r1: number, c1: number, r2: number, c2: number) => {
      const x = padX + (c1 - 1) * (colW + colGap)
      const y = padY + sum(rows, 0, r1 - 1) + rowGap * (r1 - 1)
      const w = (c2 - c1) * colW + (c2 - c1 - 1) * colGap
      const h = sum(rows, r1 - 1, r2 - 1) + rowGap * Math.max(0, r2 - r1 - 1)
      return { x, y, w, h }
    }

    // Áreas mapeadas uno a uno con el HTML
    const aDesc = area(1, 1, 3, 4) // filas 1–2, col 1–3
    const aIm   = area(3, 1, 4, 2) // G - inv
    const aEs   = area(4, 1, 5, 2) // estatus
    const aUn   = area(5, 1, 6, 2) // unidad
    const aCo   = area(6, 1, 7, 2) // código
    const aFe   = area(3, 2, 4, 4) // fecha (derecha)
    const aPm   = area(4, 2, 6, 4) // precio grande (2 filas)
    const aPl   = area(6, 2, 7, 4) // distribuidor (abajo derecha)

    // Tipografías aproximadas (px→mm ~ 0.2646):
    // desc ~7.6px ≈ 2.0mm; b ~7px ≈ 1.9mm; pm ~15px ≈ 4.0mm; pl ~6–7px ≈ 1.7–1.9mm
    const desc   = textBox(aDesc.x, aDesc.y, aDesc.w, 2.0, 2, "L", dpi, a?.nombre ?? "", 0.45)
    const im     = textBox(aIm.x,   aIm.y,   aIm.w,   1.9, 1, "L", dpi, `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`)
    const es     = textBox(aEs.x,   aEs.y,   aEs.w,   1.9, 1, "L", dpi, a?.estatus ?? "-")
    const un     = textBox(aUn.x,   aUn.y,   aUn.w,   1.9, 1, "L", dpi, a?.unidad ?? "")
    const co     = textBox(aCo.x,   aCo.y,   aCo.w,   1.9, 1, "L", dpi, String(a?.codigo ?? ""))
    const fe     = textBox(aFe.x,   aFe.y,   aFe.w,   1.9, 1, "R", dpi, a?.fecha ?? "")
    const pm     = textBox(aPm.x,   aPm.y,   aPm.w,   4.0, 1, "R", dpi, fmtMoneyZ(a?.precio ?? 0))
    const pl     = textBox(aPl.x,   aPl.y,   aPl.w,   1.8, 1, "R", dpi, `Dist: ${fmtMoneyZ(a?.distribuidor ?? 0)}`)

    return `${start}
${desc}
${im}
${es}
${un}
${co}
${fe}
${pm}
${pl}
^PQ1
${zplEnd}`
  },

  preview: (a) => (
    <div
      className="w-full h-full grid bg-[#d2c600]"
      style={{
        gridTemplateColumns: "repeat(3, 1fr)",
        gridTemplateRows: "repeat(6, minmax(0, auto))",
        gap: "3px 8px",
        lineHeight: 1.05,
      }}
    >
      <div className="col-[1/4] row-[1/3] font-bold flex items-center text-[5px]">{a.nombre}</div>
      <div className="col-[1/2] row-[3/4]">
        <span className="font-semibold text-[5px]">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span>
      </div>
      <div className="col-[1/2] row-[4/5]">
        <span className="font-semibold text-[5px]">{a.estatus ?? "-"}</span>
      </div>
      <div className="col-[1/2] row-[5/6]">
        <span className="font-semibold text-[5px]">{a.unidad}</span>
      </div>
      <div className="col-[1/2] row-[6/7]">
        <span className="font-semibold text-[5px]">{a.codigo}</span>
      </div>
      <div className="col-[2/4] row-[3/4] text-right">
        <span className="font-semibold text-[5px]">{a.fecha}</span>
      </div>
      <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[15px]">
        {money(a.precio)}
      </div>
      <div className="col-[2/4] row-[6/7] text-right font-semibold text-[6px]">
        Dist: {money(a.distribuidor)}
      </div>
    </div>
  ),
}

export default Mini25x25
