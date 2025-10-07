// components/labels/templates/original-69x25.tsx
"use client"
import React from "react"
import type { LabelTemplate } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

export const Original69x25: LabelTemplate = {
  id: "original-69x25",
  name: "Estandar (69.8×25.4)",
  width: 69.8,
  height: 25.4,
  css: (w, h, pad) => `
    @page{size:${w}mm ${h}mm;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
    .p:last-child{page-break-after:auto}
    
    .l{width:${w}mm;height:${h}mm;padding:${pad}mm;display:flex}
    
    .g{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));gap:3px 8px;font-size:11px;line-height:1.05;font-weight:bold; overflow:hidden;}
    
    .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:12px;line-height:1.2;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center}
    
    .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:3/2/4/4;text-align:right}

    .pm{grid-area:4/2/6/4;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:35px}
    
    .pl{grid-area:6/2/7/4;text-align:right;font-weight:600}
    
    .b{ font-weight:900;                  /* muy negrita */
  -webkit-text-stroke:0.2px #000;   /* trazo finito negro */
  text-shadow:
    0  0   0.25px #000,
    0.25px 0   0.25px #000,
   -0.25px 0   0.25px #000,
    0   0.25px 0.25px #000,
    0  -0.25px 0.25px #000;       }
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
  preview: (a) => (
    <div className="w-full h-full grid bg-[#d2c600]"
      style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "3px 8px", fontSize: 12, lineHeight: 1.05 }}>
      <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
      <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
      <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>
      <div className="col-[1/2] row-[6/7]"><span className="font-semibold">{a.codigo}</span></div>
      <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>
      <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[35px]">{money(a.precio)}</div>
      <div className="col-[2/4] row-[6/7] text-right font-semibold">Distribuidor: {money(a.distribuidor)}</div>
    </div>
  )
}
export default Original69x25
