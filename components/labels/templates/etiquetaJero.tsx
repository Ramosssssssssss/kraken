// components/labels/templates/prueba.tsx
"use client"
import React, { useEffect, useRef } from "react"
import type { LabelTemplate } from "@/lib/labels/types"
import { escapeHTML } from "@/lib/labels/utils"

// === Pequeño componente para vista previa del QR ===
function QRPreview({ value, sizePx }: { value: string; sizePx: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const QRCode = (await import("qrcode")).default
        if (!mounted || !ref.current) return
        await QRCode.toCanvas(ref.current, value, {
          errorCorrectionLevel: "M",
          margin: 0,
          width: sizePx,
        })
      } catch {}
    })()
    return () => { mounted = false }
  }, [value, sizePx])
  return <canvas ref={ref} width={sizePx} height={sizePx} />
}

// === Helper para separar parte entera y centavos ===
function splitPriceParts(value: number | undefined | null) {
  const n = Number.isFinite(value as number) ? Number(value) : 0
  const abs = Math.abs(n)
  const entero = Math.floor(abs)
  const centsNum = Math.round((abs - entero) * 100) % 100
  const centavos = String(centsNum).padStart(2, "0")

  const precioFmt = new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n < 0 ? -entero : entero)

  return { precioFmt, centavos }
}

export const Prueba2: LabelTemplate = {
  id: "prueba2",
  name: "Etiqueta 1.0 (69.8x25.4mm)",
  width: 69.9,
  height: 25.5,
  css: (w, h, pad) => `
    @page{size:${w}mm ${h}mm;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
    .p:last-child{page-break-after:auto}
    
    .l{width:${w}mm;height:${h}mm;display:flex}
    
    .g{
    padding:1.5mm;width:100%;height:100%;display:grid;   align-items: center;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(6,minmax(0,auto));font-size:11px;line-height:1.07;font-weight:bold;overflow:hidden; padding-top: 1mm;}
    
    .desc{grid-area: 1 / 1 / 3 / 5; font-weight:700;text-align:left;font-size:12px;line-height:1.05;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center; height:8mm;}
    
    .im{grid-area: 6 / 1 / 7 / 2;       padding-top:10px; }
    .es{grid-area:4/1/5/2}
    .un{grid-area: 5 / 4 / 6 / 5;  text-align:left; margin-left:10px; }
    .co{grid-area: 3 / 1 / 6 / 2;display:flex;align-items:center;justify-content:flex-start;}
    .co .b{flex:1 1 auto;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .co2{grid-area: 4 / 4 / 5 / 5;  text-align:left;  margin-left:10px;}
    .fe{grid-area: 6 / 4 / 7 / 5;text-align:right;      padding-top:10px;}
    .pm{
    text-align:right;
      grid-area: 3 / 2 / 6 / 4;
      font-weight:700;
    font-size: 38px;
    display: flex;
    align-items: flex-end;
    align-self: center;
    justify-content: flex-end;

    }
  .cents{
 grid-area: 3 / 4 / 4 / 5;
      font-size:13px;
      line-height:1;
       text-align:left;  
       padding-bottom:10px;
       margin-left:10px;
       text-decoration-line: underline;

    }
    .pl{
   grid-area: 6 / 2 / 7 / 4; 
      text-align:right;
      font-weight:600;
         text-align:center;  
               padding-top:10px;
           }
    .pl .cents{
      font-size:12px;
      line-height:1;
   
    }

    .b{
      font-weight:700;
      -webkit-text-stroke:0.2px #000;
      text-shadow:
        0  0     0.25px #000,
        0.25px  0     0.25px #000,
       -0.25px  0     0.25px #000,
        0    0.25px  0.25px #000,
        0   -0.25px  0.25px #000;
    }
    .qr{width:12mm;height:12mm;display:block;}


}

  `,
  renderHTML: (a) => {
    const { precioFmt, centavos } = splitPriceParts(a.precio)
    const { precioFmt: distFmt, centavos: distCents } = splitPriceParts(a.distribuidor)

    return `
    <div class="p"><div class="l"><div class="g">
      <div class="desc">${escapeHTML(a.nombre)}</div>
      <div class="im"><span class="b">G - ${Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div class="es"><span class="b">${escapeHTML(a.estatus ?? "-")}</span></div>
      <div class="un"><span class="b">${escapeHTML(a.unidad)}</span></div>
      <div class="co2"><span class="b">${escapeHTML(a.codigo)}</span></div>
      <div class="co"><canvas class="qr" data-value="${escapeHTML(a.codigo)}"></canvas></div>
      <div class="fe"><span class="b">${escapeHTML(a.fecha)}</span></div>
      <div class="pm">
        <span class="b">$${escapeHTML(precioFmt)}</span>
      </div>

<div class="cents">
       <span class="b">${escapeHTML(centavos)}</span>
      </div>
      <div class="pl">
        Dist: <span class="b">$${escapeHTML(distFmt)}</span>
      </div>
    </div></div></div>`
  },
  preview: (a) => {
    const { precioFmt, centavos } = splitPriceParts(a.precio)
    const { precioFmt: distFmt, centavos: distCents } = splitPriceParts(a.distribuidor)

    return (
      <div
        className="w-full h-full grid bg-[#d2c600]"
        style={{
          gridTemplateColumns: "repeat(4, 1fr)",
          gridTemplateRows: "repeat(6, minmax(0, auto))",
          gap: "3px 8px",
          fontSize: 12,
          lineHeight: 1.05,
        }}
      >
        <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
        <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
        <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
        <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>

        <div className="col-[1/3] row-[6/7] flex items-center gap-2">
          <div style={{ width: 140, height: 140 }}>
            <QRPreview value={a.codigo} sizePx={140} />
          </div>
          <span className="font-semibold">{a.codigo}</span>
        </div>

        <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>

        <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[35px] gap-1">
          <span className="leading-none">${precioFmt}</span>
          <span className="text-[18px] leading-none">.{centavos}</span>
        </div>

        <div className="col-[3/4] row-[6/7] text-right font-semibold">
          Distribuidor: <span className="font-extrabold">${distFmt}</span>
          <span className="text-[12px] align-top">.{distCents}</span>
        </div>
      </div>
    )
  },
}
export default Prueba2
