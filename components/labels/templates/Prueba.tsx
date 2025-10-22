// components/labels/templates/prueba.tsx
"use client"
import React, { useEffect, useRef } from "react"
import type { LabelTemplate } from "@/lib/labels/types"
import { escapeHTML, money } from "@/lib/labels/utils"

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

export const Prueba: LabelTemplate = {
  id: "prueba",
  name: "Etiqueta con QR (69.8x25.4mm)",
  width: 69.8,
  height: 25.4,
  css: (w, h, pad) => `
    @page{size:${w}mm ${h}mm;margin:0}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
    .p:last-child{page-break-after:auto}
    
    .l{width:${w}mm;height:${h}mm;padding:${pad}mm;display:flex}
    
    .g{padding:1mm;width:100%;height:100%;display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:repeat(6,minmax(0,auto));font-size:11px;line-height:1.05;font-weight:bold; overflow:hidden;}
    
    .desc{grid-area: 1 / 1 / 3 / 5; font-weight:700;text-align:left;font-size:12px;line-height:1.2;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center}
    
    .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}
    /* MOVEMOS .co para tener espacio del QR y texto del código */
    .co{grid-area: 4 / 2 / 6 / 3;display:flex;align-items:center;gap:6px}
    .fe{grid-area: 3 / 3 / 4 / 5;text-align:right}
.co2{
grid-area: 6 / 1 / 7 / 2; 
}
    .pm{grid-area: 4 / 3 / 6 / 5;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:29px}
    
    .pl{grid-area: 6 / 3 / 7 / 5;text-align:right;font-weight:600}
    /* Contenedor: fila con QR a la izquierda y texto a la derecha */
.co{
  display:flex;
  align-items:center;
  justify-content:flex-start; /* por defecto ya es left, pero lo explicitamos */
  gap:6px;                    /* espacio entre QR y texto */
}

/* (opcional) que el texto use el resto del ancho */
.co .b{
  flex:1 1 auto;
  text-align:left;
  white-space:nowrap;      /* o quítalo si quieres que envuelva */
  overflow:hidden;
  text-overflow:ellipsis;
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

    /* Tamaño del QR en mm para impresión */
    .qr{width:12mm;height:12mm;display:block}
  `,
  renderHTML: (a) => `
    <div class="p"><div class="l"><div class="g">
      <div class="desc">${escapeHTML(a.nombre)}</div>
      <div class="im"><span class="b">G - ${Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
      <div class="es"><span class="b">${escapeHTML(a.estatus ?? "-")}</span></div>
      <div class="un"><span class="b">${escapeHTML(a.unidad)}</span></div>
 <div class="co2">

        <span class="b">${escapeHTML(a.codigo)}</span>
      </div>
      <!-- Bloque de código + QR -->
      <div class="co">
        <canvas class="qr" data-value="${escapeHTML(a.codigo)}"></canvas>
      </div>

      <div class="fe"><span class="b">${escapeHTML(a.fecha)}</span></div>
      <div class="pm">${escapeHTML(money(a.precio))}</div>
      <div class="pl">Distribuidor: ${escapeHTML(money(a.distribuidor))}</div>
    </div></div></div>`,
  preview: (a) => {
  // Conversión simple mm → px para el QR en la vista previa (~96 DPI)
  const mmToPx = (mm: number) => Math.round((mm / 25.4) * 96)

  const BStyle = {
    fontWeight: 700 as const,
    WebkitTextStroke: "0.2px #000",
    textShadow:
      "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
  }

  return (
    <div
      className="p"
      style={{
        margin: "0px",
        width: "69.9mm",
        height: "25.4mm",
        pageBreakAfter: "always",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        className="l"
        style={{
          margin: "0px",
          width: "69.9mm",
          height: "25.4mm",
          padding: "1mm", // puedes ajustar si usas 'pad' dinámico en runtime
          display: "flex",
        }}
      >
        <div
          className="g"
          style={{
            margin: "0px",
            width: "100%",
            height: "100%",
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gridTemplateRows: "repeat(6, minmax(0, auto))",
            fontSize: "11px",
            lineHeight: 1.05,
            fontWeight: 700,
            overflow: "hidden",
        
          }}
        >
          {/* .desc (1/1/3/5) */}
          <div
            className="desc"
            style={{
              gridArea: "1 / 1 / 3 / 5",
              fontWeight: 700,
              textAlign: "left",
              fontSize: "12px",
              lineHeight: 1.2,
              whiteSpace: "normal",
              overflowWrap: "break-word",
              display: "flex",
              alignItems: "center",
            }}
            dangerouslySetInnerHTML={{ __html: escapeHTML(a?.nombre ?? "") }}
          />

          {/* .im (3/1/4/2) */}
          <div className="im" style={{ gridArea: "3 / 1 / 4 / 2" }}>
            <span style={BStyle}>
              G - {Number.isFinite(a?.inventarioMaximo as number) ? a?.inventarioMaximo : 0}
            </span>
          </div>

          {/* .es (4/1/5/2) */}
          <div className="es" style={{ gridArea: "4 / 1 / 5 / 2" }}>
            <span style={BStyle} dangerouslySetInnerHTML={{ __html: escapeHTML(a?.estatus ?? "-") }} />
          </div>

          {/* .un (5/1/6/2) */}
          <div className="un" style={{ gridArea: "5 / 1 / 6 / 2" }}>
            <span style={BStyle} dangerouslySetInnerHTML={{ __html: escapeHTML(a?.unidad ?? "") }} />
          </div>

          {/* .co (4/2/6/3) → QR de 12mm */}
          <div
            className="co"
            style={{
              gridArea: "4 / 2 / 6 / 3",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: "6px",
            }}
          >
            <div style={{ width: "12mm", height: "12mm", display: "block" }}>
              <QRPreview value={String(a?.codigo ?? "")} sizePx={mmToPx(12)} />
            </div>
          </div>

          {/* .fe (3/3/4/5) */}
          <div className="fe" style={{ gridArea: "3 / 3 / 4 / 5", textAlign: "right" }}>
            <span style={BStyle} dangerouslySetInnerHTML={{ __html: escapeHTML(a?.fecha ?? "") }} />
          </div>

          {/* .pm (4/3/6/5) */}
          <div
            className="pm"
            style={{
              gridArea: "4 / 3 / 6 / 5",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              fontWeight: 700,
              fontSize: "29px",
            }}
          >
            <span dangerouslySetInnerHTML={{ __html: escapeHTML(money(a?.precio)) }} />
          </div>

          {/* .pl (6/3/7/5) */}
          <div className="pl" style={{ gridArea: "6 / 3 / 7 / 5", textAlign: "right", fontWeight: 600 }}>
            <span
              dangerouslySetInnerHTML={{ __html: `Distribuidor: ${escapeHTML(money(a?.distribuidor))}` }}
            />
          </div>

          {/* .co2 (6/1/7/2) → texto del código aparte */}
          <div className="co2" style={{ gridArea: "6 / 1 / 7 / 2" }}>
            <span
              style={{
                ...BStyle,
                display: "inline-block",
                maxWidth: "100%",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              dangerouslySetInnerHTML={{ __html: escapeHTML(String(a?.codigo ?? "")) }}
            />
          </div>
        </div>
      </div>
    </div>
  )
},

}
export default Prueba
