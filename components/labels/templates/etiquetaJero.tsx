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
        <span class="cents">${escapeHTML(distCents)}</span>
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

    // Grid 4×6
    const colW = (W - padX * 2 - colGap * 3) / 4
    // Alturas por fila (tuneadas para dar aire al precio)
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

    // Áreas emparejadas al preview
    const aDesc   = area(1, 1, 3, 4) // filas 1–2, cols 1–3
    const aInv    = area(3, 1, 4, 2)
    const aEst    = area(4, 1, 5, 2)
    const aUni    = area(5, 1, 6, 2)
    const aFecha  = area(3, 2, 4, 4)
    const aPrecio = area(4, 2, 6, 4) // filas 4–5, cols 2–3
    const aDist   = area(6, 3, 7, 4) // fila 6, col 3
    const aQr     = area(6, 1, 7, 3) // fila 6, cols 1–2 (QR + código)

    // === Textos ===
    const desc   = textBox(aDesc.x, aDesc.y, aDesc.w, 3.0, 2, "L", dpi, a?.nombre ?? "", 0.55)
    const invMax = textBox(aInv.x, aInv.y, aInv.w, 2.4, 1, "L", dpi, `G - ${Number.isFinite(a?.inventarioMaximo) ? a.inventarioMaximo : 0}`)
    const estatus= textBox(aEst.x, aEst.y, aEst.w, 2.4, 1, "L", dpi, a?.estatus ?? "-")
    const unidad = textBox(aUni.x, aUni.y, aUni.w, 2.4, 1, "L", dpi, a?.unidad ?? "")
    const fecha  = textBox(aFecha.x, aFecha.y, aFecha.w, 2.4, 1, "R", dpi, a?.fecha ?? "")

    // Precio grande (2 filas alto). Offset pequeño para centrado óptico
    const price  = textBox(aPrecio.x, aPrecio.y + 0.2, aPrecio.w, 7.0, 1, "R", dpi, fmtMoneyZ(a?.precio ?? 0))

    // Distribuidor abajo a la derecha
    const dist   = textBox(aDist.x, aDist.y + 0.3, aDist.w, 2.3, 1, "R", dpi, `Distribuidor: ${fmtMoneyZ(a?.distribuidor ?? 0)}`)

    // === QR + código (Zebra ^BQN) ===
    const qrMargin = 0.4
    const qrSize = Math.min(aQr.w, aQr.h) - qrMargin * 2
    const qrX = aQr.x + qrMargin
    const qrY = aQr.y + qrMargin
    const qrMagHint = dpi >= 300 ? 2 : 3 // 203dpi→3, 300dpi→2 (ajustable)
    const qr = qrBox(qrX, qrY, qrSize, dpi, String(a?.codigo ?? ""), qrMagHint)

    // Código a la derecha del QR si hay espacio
    const codeTextX = qrX + qrSize + 0.8
    const codeTextW = Math.max(0, aQr.x + aQr.w - codeTextX)
    const codeTextY = aQr.y + Math.max(0, (qrSize - 2.4) / 2)
    const codeText  = codeTextW > 6
      ? textBox(codeTextX, codeTextY, codeTextW, 2.4, 1, "L", dpi, String(a?.codigo ?? ""))
      : ""

    return `${start}
${desc}
${invMax}
${estatus}
${unidad}
${fecha}
${price}
${dist}
${qr}
${codeText}
^PQ1
${zplEnd}`
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
        <div className="col-[1/2] row-[3/4]">
          <span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span>
        </div>
        <div className="col-[1/2] row-[4/5]">
          <span className="font-semibold">{a.estatus ?? "-"}</span>
        </div>
        <div className="col-[1/2] row-[5/6]">
          <span className="font-semibold">{a.unidad}</span>
        </div>

        <div className="col-[1/3] row-[6/7] flex items-center gap-2">
          <div style={{ width: 140, height: 140 }}>
            <QRPreview value={a.codigo} sizePx={140} />
          </div>
          <span className="font-semibold">{a.codigo}</span>
        </div>

        <div className="col-[2/4] row-[3/4] text-right">
          <span className="font-semibold">{a.fecha}</span>
        </div>

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
