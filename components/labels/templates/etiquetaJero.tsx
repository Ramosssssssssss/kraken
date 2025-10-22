// components/labels/templates/prueba.tsx
"use client"
import React, { useEffect, useRef } from "react"
import type { LabelTemplate, Dpi } from "@/lib/labels/types"
import { escapeHTML } from "@/lib/labels/utils"

// === Pequeño componente para vista previa del QR ===
function QRPreview({ value, sizePx }: { value: string; sizePx: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  useEffect(() => {
    let mounted = true
      ; (async () => {
        try {
          const QRCode = (await import("qrcode")).default
          if (!mounted || !ref.current) return
          await QRCode.toCanvas(ref.current, value, {
            errorCorrectionLevel: "M",
            margin: 0,
            width: sizePx,
          })
        } catch { }
      })()
    return () => {
      mounted = false
    }
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

/* =========================
   Helpers ZPL (grid + QR)
   ========================= */
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
  lineGapMm = 0.6
) => {
  const x = toDots(xmm, dpi)
  const y = toDots(ymm, dpi)
  const w = toDots(wmm, dpi)
  const font = toDots(fontMm, dpi)
  const gap = toDots(lineGapMm, dpi)
  return `^FO${x},${y}^CF0,${font}^FB${Math.max(20, w)},${lines},${gap},${align},0^FD${safeZ(text)}^FS`
}

// QR nativo Zebra (^BQN)
const qrBox = (xmm: number, ymm: number, sizeMm: number, dpi: Dpi, data: string, magHint = 3) => {
  const x = toDots(xmm, dpi)
  const y = toDots(ymm, dpi)
  const mag = Math.max(1, Math.min(10, Math.round(magHint))) // escala entera 1..10
  return `^FO${x},${y}^BQN,2,${mag}^FDLA,${safeZ(data)}^FS`
}

const fmtMoneyZ = (v: unknown) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    Number.isFinite(Number(v)) ? Number(v) : 0
  )

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
      padding:1.5mm;
      width:100%;height:100%;
      display:grid;align-items:center;
      grid-template-columns:repeat(4,1fr);
      grid-template-rows:repeat(6,minmax(0,auto));
      gap:3px 8px;
      font-size:11px;line-height:1.07;font-weight:bold;overflow:hidden;
      padding-top:1mm;
    }

    .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:12px;line-height:1.05;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center;height:8mm;}

    .im{grid-area:6/1/7/2;padding-top:10px;}
    .es{grid-area:4/1/5/2}
    .un{grid-area:5/4/6/5;text-align:left;margin-left:10px;}
    .co{grid-area:3/1/6/2;display:flex;align-items:center;justify-content:flex-start;}
    .co .b{flex:1 1 auto;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .co2{grid-area:4/4/5/5;text-align:left;margin-left:10px;}
    .fe{grid-area:6/4/7/5;text-align:right;padding-top:10px;}

    .pm{
      grid-area:3/2/6/4;
      text-align:right;
      font-weight:700;font-size:38px;
      display:flex;align-items:flex-end;align-self:center;justify-content:flex-end;
    }
    .cents{
      grid-area:3/4/4/5;font-size:13px;line-height:1;text-align:left;
      padding-bottom:10px;margin-left:10px;text-decoration-line:underline;
    }
    .pl{
      grid-area:6/2/7/4;text-align:right;font-weight:600;text-align:center;padding-top:10px;
    }
    .pl .cents{font-size:12px;line-height:1;}

    .b{
      font-weight:700;
      -webkit-text-stroke:0.2px #000;
      text-shadow:
        0 0 0.25px #000,
        0.25px 0 0.25px #000,
        -0.25px 0 0.25px #000,
        0 0.25px 0.25px #000,
        0 -0.25px 0.25px #000;
    }
    .qr{width:12mm;height:12mm;display:block;}
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
      <div class="pm"><span class="b">$${escapeHTML(precioFmt)}</span></div>
      <div class="cents"><span class="b">${escapeHTML(centavos)}</span></div>
      <div class="pl">
        Dist: <span class="b">$${escapeHTML(distFmt)}</span>
        <span class="cent">.${escapeHTML(distCents)}</span>
      </div>
    </div></div></div>`
  },

  /* =========================
     ZPL organizado en grid 4×6 (con QR)
     ========================= */
  renderZPL: (a, dpi: Dpi, opts?: { darkness?: number }) => {
    // Tamaño (coincide con el título)
    const W = 69.9, H = 25.5

    // Márgenes y gaps (equivalentes a gap: "3px 8px")
    const padX = 1.5, padY = 1.5
    const rowGap = 0.8   // ~3 px
    const colGap = 2.1   // ~8 px

    // Grid 4×6 (misma idea que en CSS, afinado para dar aire al precio)
    const colW = (W - padX * 2 - colGap * 3) / 4
    const rows = [3.2, 3.0, 2.6, 4.2, 3.2, 3.1] // 6 filas

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

    // Áreas que reflejan exactamente el CSS del renderHTML
    const aDesc = area(1, 1, 3, 4) // .desc
    const aQR = area(3, 1, 6, 2) // .co (QR + código)
    const aEstatus = area(4, 1, 5, 2) // .es
    const aInv = area(6, 1, 7, 2) // .im (G - ...)
    const aUni = area(5, 4, 6, 5) // .un
    const aCodTop = area(4, 4, 5, 5) // .co2 (código arriba-dcha)
    const aFecha = area(6, 4, 7, 5) // .fe
    const aPrecio = area(3, 2, 6, 4) // .pm (entero grande)
    const aCent = area(3, 4, 4, 5) // .cents (al lado, subrayado)
    const aDist = area(6, 2, 7, 4) // .pl

    // === Textos base (coinciden con HTML) ===
    const desc = textBox(aDesc.x, aDesc.y, aDesc.w, 3.0, 2, "L", dpi, a?.nombre ?? "", 0.55)
    const estatus = textBox(aEstatus.x, aEstatus.y, aEstatus.w, 2.4, 1, "L", dpi, a?.estatus ?? "-")
    const invMax = textBox(aInv.x, aInv.y, aInv.w, 2.4, 1, "L", dpi, `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`)
    const unidad = textBox(aUni.x, aUni.y, aUni.w, 2.4, 1, "L", dpi, a?.unidad ?? "")
    const codTop = textBox(aCodTop.x, aCodTop.y, aCodTop.w, 2.4, 1, "L", dpi, String(a?.codigo ?? ""))
    const fecha = textBox(aFecha.x, aFecha.y, aFecha.w, 2.4, 1, "R", dpi, a?.fecha ?? "")

    // === Precio principal: entero grande en .pm y centavos pequeños subrayados en .cents ===
    const { precioFmt, centavos } = splitPriceParts(a?.precio)
    const precioEntero = textBox(aPrecio.x, aPrecio.y + 0.2, aPrecio.w, 7.0, 1, "R", dpi, `$${precioFmt}`)
    // Centavos: fuente menor y subrayado con ^GB simulando underline
    const centTxt = textBox(aCent.x, aCent.y, aCent.w, 2.8, 1, "L", dpi, centavos)
    const underline = (() => {
      const x = aCent.x
      const y = aCent.y + Math.max(0, aCent.h - 0.6) // ~0.6mm por encima del borde inferior
      const w = Math.max(4, aCent.w)
      return `^FO${toDots(x, dpi)},${toDots(y, dpi)}^GB${toDots(w, dpi)},1,1^FS`
    })()

    // === Distribuidor centrado abajo (mantenemos formato compacto y legible) ===
    const distTxt = textBox(aDist.x, aDist.y + 0.3, aDist.w, 2.6, 1, "C", dpi, `Dist: ${fmtMoneyZ(a?.distribuidor ?? 0)}`)

    // === QR + código a la derecha, dentro del área .co ===
    // Tamaño de QR ~12mm como en CSS (.qr { width/height: 12mm })
    const qrFixed = 12
    const qrMargin = 0.5
    const qrSize = Math.min(qrFixed, Math.min(aQR.w, aQR.h) - qrMargin * 2)
    const qrX = aQR.x + qrMargin
    const qrY = aQR.y + (aQR.h - qrSize) / 2
    const qrMagHint = dpi >= 300 ? 2 : 3 // 203dpi→3, 300dpi→2
    const qr = qrBox(qrX, qrY, qrSize, dpi, String(a?.codigo ?? ""), qrMagHint)

    // Texto del código a la derecha del QR, ocupando el resto del ancho del área .co
    const codeTextX = qrX + qrSize + 0.8
    const codeTextW = Math.max(0, aQR.x + aQR.w - codeTextX)
    const codeTextY = aQR.y + Math.max(0, (aQR.h - 2.4) / 2)
    const codeRight = codeTextW > 6
      ? textBox(codeTextX, codeTextY, codeTextW, 2.4, 1, "L", dpi, String(a?.codigo ?? ""))
      : ""

    return `${start}
${desc}
${estatus}
${invMax}
${unidad}
${codTop}
${fecha}
${precioEntero}
${centTxt}
${underline}
${distTxt}
${qr}
${codeRight}
^PQ1
${zplEnd}`
  },


  preview: (a) => {
    // 1 px ≈ 0.264583 mm (96 DPI). Para la vista previa es suficiente.
    const mmToPx = (mm: number) => Math.round((mm / 25.4) * 96)

    const { precioFmt, centavos } = splitPriceParts(a?.precio)
    const { precioFmt: distFmt, centavos: distCents } = splitPriceParts(a?.distribuidor)

    return (
      <div
        className="p"
        style={{
          // .p
          width: "69.9mm",
          height: "22.4mm",
          pageBreakAfter: "always",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
        }}
      >
        <div className="l" style={{ width: "69.9mm", height: "25.5mm", display: "flex" }}>
          <div
            className="g"
            style={{
              padding: "1mm",
              width: "100%",
              height: "100%",
              display: "grid",
              alignItems: "center",
              gridTemplateColumns: "repeat(4, 1fr)",
              gridTemplateRows: "repeat(6, minmax(0, auto))",
              gap: "1px 8px",
              fontSize: "11px",
              lineHeight: 1.07,
              fontWeight: 700,
              overflow: "hidden",
              paddingTop: "0mm",
            }}
          >
            {/* .desc */}
            <div
              className="desc"
              style={{
                gridArea: "1 / 1 / 3 / 4",
                fontWeight: 700,
                textAlign: "left",
                fontSize: "12px",
                lineHeight: 1.05,
                whiteSpace: "normal",
                overflowWrap: "break-word",
                display: "flex",
                alignItems: "center",
                height: "8mm",
              }}
              dangerouslySetInnerHTML={{ __html: escapeHTML(a?.nombre ?? "") }}
            />

            {/* .im (G - inventario) */}
            <div className="im" style={{ gridArea: "6 / 1 / 7 / 2", paddingTop: "10px" }}>
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{
                  __html: `G - ${Number.isFinite(a?.inventarioMaximo as number) ? a?.inventarioMaximo : 0}`,
                }}
              />
            </div>

            {/* .es (estatus) */}
            <div className="es" style={{ gridArea: "4 / 1 / 5 / 2" }}>
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{ __html: escapeHTML(a?.estatus ?? "-") }}
              />
            </div>

            {/* .un (unidad) */}
            <div className="un" style={{ gridArea: "5 / 4 / 6 / 5", textAlign: "left", marginLeft: "10px" }}>
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{ __html: escapeHTML(a?.unidad ?? "") }}
              />
            </div>

            {/* .co2 (código arriba derecha) */}
            <div className="co2" style={{ gridArea: "4 / 4 / 5 / 5", textAlign: "left", marginLeft: "10px" }}>
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{ __html: escapeHTML(String(a?.codigo ?? "")) }}
              />
            </div>

            {/* .co (QR + código) */}
            <div
              className="co"
              style={{
                gridArea: "3 / 1 / 6 / 2",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <div style={{ width: "12mm", height: "12mm", display: "block" }}>
                <QRPreview value={String(a?.codigo ?? "")} sizePx={mmToPx(12)} />
              </div>
             
            </div>

            {/* .fe (fecha, abajo derecha) */}
            <div className="fe" style={{ gridArea: "6 / 4 / 7 / 5", textAlign: "right", paddingTop: "10px" }}>
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{ __html: escapeHTML(a?.fecha ?? "") }}
              />
            </div>

            {/* .pm (precio entero grande) */}
            <div
              className="pm"
              style={{
                gridArea: "3 / 2 / 6 / 4",
                textAlign: "right",
                fontWeight: 700,
                fontSize: "38px",
                display: "flex",
                alignItems: "flex-end",
                alignSelf: "center",
                justifyContent: "flex-end",
              }}
            >
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{ __html: `$${escapeHTML(precioFmt)}` }}
              />
            </div>

            {/* .cents (centavos, subrayados) */}
            <div
              className="cents"
              style={{
                gridArea: "3 / 4 / 4 / 5",
                fontSize: "13px",
                lineHeight: 1,
                textAlign: "left",
                paddingBottom: "10px",
                marginLeft: "10px",
                textDecorationLine: "underline",
              }}
            >
              <span
                className="b"
                style={{
                  fontWeight: 700,
                  WebkitTextStroke: "0.2px #000",
                  textShadow:
                    "0 0 0.25px #000, 0.25px 0 0.25px #000, -0.25px 0 0.25px #000, 0 0.25px 0.25px #000, 0 -0.25px 0.25px #000",
                }}
                dangerouslySetInnerHTML={{ __html: escapeHTML(centavos) }}
              />
            </div>

            {/* .pl (distribuidor centrado) */}
            <div
              className="pl"
              style={{
                gridArea: "6 / 2 / 7 / 4",
                textAlign: "center",
                fontWeight: 600,
                paddingTop: "10px",
              }}
            >
              <span
                dangerouslySetInnerHTML={{
                  __html: `Dist: <span class="b">$${escapeHTML(distFmt)}</span> <span class="cents">${escapeHTML(
                    distCents
                  )}</span>`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    )
  },

}

export default Prueba2
