"use client"
import React from "react"
import type { LabelTemplate } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"


export const Mini25x25: LabelTemplate = {
id: "25x25",
name: "Pequeñas (25×25 mm)",
width: 25,
height: 25,
css: (w, h) => `
@page{size:${w}mm ${h}mm;margin:0}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
.p:last-child{page-break-after:auto}
.l{width:${w}mm;height:${h}mm;display:flex}


.g{width:${w}mm;height:${h}mm;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));
gap:1px;font-size:8px;font-weight:bold;padding:1mm;}


.desc{grid-area:1/1/2/4;font-weight:bold;text-align:left;font-size:8px;display:flex;margin-top:1.5mm;justify-content:center;line-height:1.05;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}


.im{grid-area:4/1/5/2}.es{grid-area:5/3/6/4}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:4/3/5/4;text-align:right}
.pm{grid-area:2/1/3/4;display:flex;align-items:center;justify-content:flex-end;font-weight:bold;font-size:15px}
.pl{grid-area:6/2/7/4;text-align:right}
.b{font-weight:bold;font-size:7px}
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
preview: (a) => (
<div className="w-full h-full grid bg-[#d2c600]"
style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "3px 8px", lineHeight: 1.05 }}>
<div className="col-[1/4] row-[1/3] font-bold flex items-center text-[5px]">{a.nombre}</div>
<div className="col-[1/2] row-[3/4]"><span className="font-semibold text-[5px]">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
<div className="col-[1/2] row-[4/5]"><span className="font-semibold text-[5px]">{a.estatus ?? "-"}</span></div>
<div className="col-[1/2] row-[5/6]"><span className="font-semibold text-[5px]">{a.unidad}</span></div>
<div className="col-[1/2] row-[6/7]"><span className="font-semibold text-[5px]">{a.codigo}</span></div>
<div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold text-[5px]">{a.fecha}</span></div>
<div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[15px]">{money(a.precio)}</div>
<div className="col-[2/4] row-[6/7] text-right font-semibold text-[6px]">Dist: {money(a.distribuidor)}</div>
</div>
)
}
export default Mini25x25