// app/page.tsx
"use client"
import Link from "next/link"
import { Info } from "lucide-react"
import React, { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Settings, Printer, Plus, Trash2, Save, BookOpen, Loader2, AlertCircle, Minus, ArrowLeft, RotateCcw } from "lucide-react"

import Noty from "noty";
import "noty/lib/noty.css";
import "noty/lib/themes/mint.css";

interface ArticleItem {
  id: string
  text: string
  quantity: number
  barcode: string
  desc?: string
}

interface LabelTemplate {
  id: string
  name: string
  config: {
    size: string
    margin: string
    width: string
    height: string
    fontSize: string
    font: string
  }
}

type SearchResult = {
  claveArticulo: string
  nombre: string
}

type TamanoEtiqueta = {
  id: number
  nombre: string
  width: number
  height: number
  margen: number
  altoBarra: number
  fontSizeClaveArticulo: number
}

// ~96dpi aprox para preview
const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78))

// Límites físicos
const MAX_W_MM = 135 // ancho/largo máximo
const MAX_H_MM = 300 // alto máximo

const clampMm = (mm: number, max: number) =>
  Number.isFinite(mm) ? Math.max(1, Math.min(max, mm)) : 1

// Evita que el alto de barras exceda el área útil
const clampBarHeight = (barMm: number, labelH: number, marginMm: number) => {
  const maxBar = Math.max(4, labelH - marginMm * 2 - 4)
  return clampMm(barMm, maxBar)
}
// Debajo de clampBarHeight
const clampQrSize = (qrMm: number, labelW: number, labelH: number, marginMm: number) => {
  // área útil (restando márgenes)
  const usableW = Math.max(4, labelW - marginMm * 2)
  const usableH = Math.max(4, labelH - marginMm * 2)
  // que el QR quepa como cuadrado y deja un “colchón” pequeñito
  const maxQr = Math.max(4, Math.min(usableW, usableH) - 4)
  return clampMm(qrMm, maxQr)
}

// === Componente de código de barras (preview) ===
function BarcodeSVG({
  value,
  format,
  heightPx,
  fontFamily,
  fontSizePx,
}: {
  value: string
  format: "CODE128" | "CODE128B"
  heightPx: number
  fontFamily: string
  fontSizePx: number
}) {
  const ref = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        const mod: any = await import("jsbarcode")
        if (!mounted || !ref.current) return
        const JsBarcode = mod.default || mod
        try {
          JsBarcode(ref.current, value, {
            format,
            displayValue: false,
            font: fontFamily,
            fontSize: Math.max(8, Math.round(fontSizePx * 0.8)),
            textMargin: 2,
            margin: 0,
            width: 1.2, // 👈 control del grosor (ajústalo desde estado/props)
          })

          ref.current.setAttribute("preserveAspectRatio", "none")
          ref.current.style.width = "100%"
          ref.current.style.height = `${heightPx}px`
        } catch { }
      })()
    return () => {
      mounted = false
    }
  }, [value, format, heightPx, fontFamily, fontSizePx])

  return <svg ref={ref} className="barcode-svg" />
}
function QRCodeSVG({ value, sizePx }: { value: string; sizePx: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    let mounted = true
      ; (async () => {
        const QRCode = (await import("qrcode")).default
        if (!mounted || !ref.current) return
        try {
          await QRCode.toCanvas(ref.current, value, {
            errorCorrectionLevel: "M",
            margin: 4,              // ← añade zona blanca de seguridad
            color: {
              dark: "#000000",
              light: "#ffffff",     // ← fondo blanco
            },
            width: sizePx,
          })

        } catch { }
      })()
    return () => { mounted = false }
  }, [value, sizePx])

  return <canvas ref={ref} width={sizePx} height={sizePx} />
}


// === NumberField con botones + y - (arreglo de doble click/hold) ===
function NumberField({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  id,
  className = "",
  inputClassName = "",
  ariaLabel,
}: {
  value: string | number
  onChange: (val: string) => void
  min?: number
  max?: number
  step?: number
  id?: string
  className?: string
  inputClassName?: string
  ariaLabel?: string
}) {
  const holdIntervalRef = useRef<number | null>(null)
  const holdTimeoutRef = useRef<number | null>(null)

  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const parseVal = (v: string | number) => {
    const n = typeof v === 'number' ? v : parseFloat(v || '0')
    return Number.isFinite(n) ? n : 0
  }
  const roundToStep = (n: number) => {
    const decimals = Math.max(0, (String(step).split('.')[1] || '').length)
    const p = Math.pow(10, decimals)
    return Math.round(n * p) / p
  }
  const commit = (n: number) => onChange(String(clamp(roundToStep(n))))

  const bump = (d: 1 | -1) => {
    const n = parseVal(value)
    commit(n + d * step)
  }

  const clearHolds = () => {
    if (holdIntervalRef.current != null) {
      window.clearInterval(holdIntervalRef.current)
      holdIntervalRef.current = null
    }
    if (holdTimeoutRef.current != null) {
      window.clearTimeout(holdTimeoutRef.current)
      holdTimeoutRef.current = null
    }
  }

  const handlePointerDown = (d: 1 | -1) => (e: React.PointerEvent) => {
    e.preventDefault()
      ; (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    bump(d) // primer incremento inmediato
    // si se mantiene presionado, comienza auto-repeat después de una pausa
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(() => bump(d), 100)
    }, 350)
  }

  const handlePointerUp = () => clearHolds()
  const handlePointerCancel = () => clearHolds()
  const handlePointerLeave = () => clearHolds()

  useEffect(() => {
    return () => clearHolds()
  }, [])

  return (
    <div className={`flex items-stretch overflow-hidden rounded-md border border-gray-500 bg-gray-700 ${className}`}>
      <Button
        type="button"
        variant="ghost"
        className="px-3 border-r border-gray-600 rounded-none text-white hover:bg-gray-600"
        aria-label="disminuir"
        onPointerDown={handlePointerDown(-1)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      >
        <Minus className="w-4 h-4" />
      </Button>

      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`no-spin bg-gray-700 border-0 text-white text-center focus-visible:ring-0 ${inputClassName}`}
        min={min}
        max={max}
        step={step}
        aria-label={ariaLabel}
      />

      <Button
        type="button"
        variant="ghost"
        className="px-3 border-l border-gray-600 rounded-none text-white hover:bg-gray-600"
        aria-label="aumentar"
        onPointerDown={handlePointerDown(1)}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onPointerLeave={handlePointerLeave}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}

export default function LabelGenerator() {
  const [labelConfig, setLabelConfig] = useState({
    size: "Default",
    margin: "2",
    width: "50",
    height: "25.4",
    text: "",
    fontSize: "10",
    font: "Arial",
    quantity: "1",
    barHeightMm: "20",
    qrSizeMm: "16",   // 👉 tamaño del QR en milímetros
    xDimPx: "1.2", // grosor de módulo (px)


    // 👇 NUEVO
    showDesc: true,
    descFontSize: "18",
  })
  const [barcodeFormat, setBarcodeFormat] = useState<"CODE128" | "CODE128B" | "QR">("CODE128")

  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [templates, setTemplates] = useState<LabelTemplate[]>([])
  const [templateName, setTemplateName] = useState("")
  const [selectedTemplate, setSelectedTemplate] = useState("")
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false)

  // búsqueda de artículos
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // tamaños guardados (BD)
  const [tamanos, setTamanos] = useState<TamanoEtiqueta[]>([])
  const [isLoadingTamanos, setIsLoadingTamanos] = useState(false)
  const [tamanosError, setTamanosError] = useState<string | null>(null)
  const [selectedTamanoId, setSelectedTamanoId] = useState<string>("")

  // dentro de LabelGenerator, debajo de los useState:
  const resetArticles = () => {
    if (articles.length === 0) return;

    setArticles([]);
    new Noty({
      type: "success",
      layout: "topRight",
      theme: "mint",
      text: "Se eliminaron todos los artículos",
      timeout: 2500,
      progressBar: true,
    }).show();
  };

  // ======= IMPORTACIÓN DESDE EXCEL =======
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  type ImportRow = { code: string; copies: number }

  function normalizeRow(obj: any, idx: number): ImportRow | null {
    const codeKeys = ['codigo', 'código', 'code', 'clave', 'clavearticulo', 'clave_articulo']
    const copiesKeys = ['copias', 'copies', 'cantidad', 'qty', 'cantidadcopias']

    let code = ''
    let copiesRaw: any = undefined
    for (const k of Object.keys(obj)) {
      const key = String(k).toLowerCase().replace(/\s|_/g, '')
      if (!code && codeKeys.includes(key)) code = String(obj[k] ?? '').trim()
      if (copiesRaw == null && copiesKeys.includes(key)) copiesRaw = obj[k]
    }

    if (!code && (obj.A != null || obj.B != null)) {
      code = String(obj.A ?? '').trim()
      copiesRaw = obj.B
    }

    if (!code) return null

    let copies = Number.parseInt(String(copiesRaw ?? '1'), 10)
    if (!Number.isFinite(copies) || copies < 1) copies = 1
    return { code, copies }
  }

  async function handleExcelFile(file: File) {
    try {
      const XLSX = (await import('xlsx')).default ?? (await import('xlsx'))
      const data = await file.arrayBuffer()
      const wb = XLSX.read(data, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      if (!ws) throw new Error('La hoja 1 está vacía o no existe.')

      const rowsRaw: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      if (rowsRaw.length === 0) throw new Error('No hay datos en el archivo.')

      const asObjects = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[]
      const normalizedA = asObjects
        .map(normalizeRow)
        .filter((r): r is ImportRow => !!r?.code)

      let normalized = normalizedA
      if (normalized.length === 0) {
        const AisHeader = String(rowsRaw[0]?.[0] ?? '').toLowerCase().includes('odigo') // soporta "codigo"/"código"
        const startIdx = AisHeader ? 1 : 0
        const fromAB = rowsRaw.slice(startIdx).map((arr) => {
          const code = String(arr?.[0] ?? '').trim()
          const copiesRaw = arr?.[1]
          if (!code) return null
          let copies = Number.parseInt(String(copiesRaw ?? '1'), 10)
          if (!Number.isFinite(copies) || copies < 1) copies = 1
          return { code, copies } as ImportRow
        }).filter(Boolean) as ImportRow[]
        normalized = fromAB
      }

      if (normalized.length === 0) {
        throw new Error('No se pudieron interpretar filas válidas (se esperan columnas: código y copias).')
      }

      mergeImportedArticles(normalized)
    } catch (err: any) {
      alert(err?.message || 'Error al leer el archivo.')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // === NUEVO: helper para insertar o acumular por código ===
  // upsertArticleByCode: acepta desc y la conserva
  function upsertArticleByCode(code: string, qty: number, desc?: string) {
    const clean = String(code || '').trim()
    const safeQty = Math.max(1, Math.floor(qty || 1))
    if (!clean) return

    setArticles(prev => {
      const idx = prev.findIndex(a => a.barcode === clean)
      if (idx !== -1) {
        const next = [...prev]
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + safeQty,
          // si antes no tenía desc y ahora sí, guárdala
          desc: next[idx].desc || desc
        }
        return next
      }
      return [
        ...prev,
        {
          id: `${Date.now()}_${clean}_${Math.random().toString(36).slice(2, 7)}`,
          text: clean,           // sigue guardando la clave como texto base
          barcode: clean,
          quantity: safeQty,
          desc                     // <-- NUEVO
        },
      ]
    })
  }


  function mergeImportedArticles(rows: ImportRow[]) {
    // Reutilizamos el helper para evitar duplicar lógica.
    for (const r of rows) {
      if (!r?.code) continue
      upsertArticleByCode(r.code, r.copies)
    }
  }

  function onPickExcelClick() {
    fileInputRef.current?.click()
  }

  function onExcelInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleExcelFile(file)
  }

  function downloadTemplate() {
    const csv = 'codigo,copias\nABC123,1\nXYZ001,3\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plantilla_importacion.csv'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  // plantillas locales
  useEffect(() => {
    const savedTemplates = localStorage.getItem("labelTemplates")
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates))
  }, [])
  useEffect(() => {
    localStorage.setItem("labelTemplates", JSON.stringify(templates))
  }, [templates])

  // Cargar tamaños desde /api/tamano_etiquetas
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingTamanos(true)
        setTamanosError(null)
        const r = await fetch("/api/tamano_etiquetas", { headers: { Accept: "application/json" } })
        const json = await r.json()
        if (!r.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar los tamaños")
        setTamanos(Array.isArray(json.data) ? json.data : [])
      } catch (e: any) {
        setTamanosError(e?.message || "Error de red")
        setTamanos([])
      } finally {
        setIsLoadingTamanos(false)
      }
    }
    load()
  }, [])

  // Cambios con límites
 const handleConfigChange = (key: string, value: string | boolean) => {
  setLabelConfig((prev) => {
    if (key === "width") {
      const w = clampMm(parseFloat(String(value)), MAX_W_MM)
      // si estás en QR, re-clampa el QR porque cambia el ancho útil
      if (barcodeFormat === "QR") {
        const qr = clampQrSize(
          parseFloat(prev.qrSizeMm || "16"),
          w,
          parseFloat(prev.height || "25"),
          parseFloat(prev.margin || "0")
        )
        return { ...prev, width: String(w), qrSizeMm: String(qr) }
      }
      return { ...prev, width: String(w) }
    }

    if (key === "height") {
      const h = clampMm(parseFloat(String(value)), MAX_H_MM)
      const bar = clampBarHeight(parseFloat(prev.barHeightMm || "20"), h, parseFloat(prev.margin || "0"))
      if (barcodeFormat === "QR") {
        const qr = clampQrSize(
          parseFloat(prev.qrSizeMm || "16"),
          parseFloat(prev.width || "50"),
          h,
          parseFloat(prev.margin || "0")
        )
        return { ...prev, height: String(h), barHeightMm: String(bar), qrSizeMm: String(qr) }
      }
      return { ...prev, height: String(h), barHeightMm: String(bar) }
    }

    if (key === "margin") {
      const margin = Math.max(0, parseFloat(String(value)))
      const bar = clampBarHeight(
        parseFloat(prev.barHeightMm || "20"),
        parseFloat(prev.height || "25"),
        margin
      )
      if (barcodeFormat === "QR") {
        const qr = clampQrSize(
          parseFloat(prev.qrSizeMm || "16"),
          parseFloat(prev.width || "50"),
          parseFloat(prev.height || "25"),
          margin
        )
        return { ...prev, margin: String(margin), barHeightMm: String(bar), qrSizeMm: String(qr) }
      }
      return { ...prev, margin: String(margin), barHeightMm: String(bar) }
    }

    if (key === "barHeightMm") {
      const h = clampBarHeight(
        parseFloat(String(value)),
        parseFloat(prev.height || "25"),
        parseFloat(prev.margin || "0")
      )
      // 👇 sincroniza QR SOLO si estás en formato QR
      if (barcodeFormat === "QR") {
        const qr = clampQrSize(
          h, // usa el alto de barra como base para el tamaño del QR
          parseFloat(prev.width || "50"),
          parseFloat(prev.height || "25"),
          parseFloat(prev.margin || "0")
        )
        return { ...prev, barHeightMm: String(h), qrSizeMm: String(qr) }
      }
      return { ...prev, barHeightMm: String(h) }
    }

    return { ...prev, [key]: value }
  })
}


  const aplicarTamanoBD = (t: TamanoEtiqueta) => {
    const w = clampMm(t.width, MAX_W_MM)
    const h = clampMm(t.height, MAX_H_MM)
    const m = Math.max(0, t.margen || 0)
    const bar = clampBarHeight(t.altoBarra ?? 20, h, m)

    setLabelConfig(prev => ({
      ...prev,
      width: String(w),
      height: String(h),
      margin: String(m),
      fontSize: String(t.fontSizeClaveArticulo),
      barHeightMm: String(bar),
    }))
  }

  const saveTemplate = () => {
    if (!templateName.trim()) return
    const newTemplate: LabelTemplate = {
      id: Date.now().toString(),
      name: templateName,
      config: {
        size: labelConfig.size,
        margin: labelConfig.margin,
        width: labelConfig.width,
        height: labelConfig.height,
        fontSize: labelConfig.fontSize,
        font: labelConfig.font,
      },
    }
    setTemplates((prev) => [...prev, newTemplate])
    setTemplateName("")
    setIsTemplateModalOpen(false)
  }

  const loadTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId)
    if (!t) return
    setLabelConfig(prev => ({ ...prev, ...t.config }))
    setSelectedTemplate(templateId)
  }

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId))
    if (selectedTemplate === templateId) setSelectedTemplate("")
  }

  // === MODIFICADO: Agregar artículo (acumula si ya existe el código)
  // addArticle: permite pasar desc
  const addArticle = (claveOverride?: string, descOverride?: string) => {
    const clave = (claveOverride ?? labelConfig.text).trim()
    if (!clave) return
    const qty = Number.parseInt(labelConfig.quantity, 10) || 1

    upsertArticleByCode(clave, qty, descOverride) // <-- pasa desc

    setLabelConfig((prev) => ({ ...prev, text: "", quantity: "1" }))
    setSearchResults([])
    setSearchError(null)
  }


  const removeArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id))
  }

  // 👉 Imprime en la MISMA pestaña (iframe oculto). Papel = etiqueta exacta.
  // 👉 Imprimir etiquetas
  const isMobile = () =>
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const handlePrint = () => {
    if (articles.length === 0) return;

    const labelW = clampMm(parseFloat(labelConfig.width), MAX_W_MM);
    const labelH = clampMm(parseFloat(labelConfig.height), MAX_H_MM);
    const padding = Math.max(0, parseFloat(labelConfig.margin));
    const barH = clampBarHeight(parseFloat(labelConfig.barHeightMm || "20"), labelH, padding);
    const fontPx = parseFloat(labelConfig.fontSize);
    const fontFamily = labelConfig.font;
    const fmt = barcodeFormat;
    const showDesc = !!labelConfig.showDesc
    const descFontPx = Math.max(6, parseFloat(labelConfig.descFontSize || "12"))
    // Escapar caracteres para evitar inyección
    const esc = (s: string) =>
      String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")


    const bodyHtml = articles.map(a =>
      Array.from({ length: a.quantity }, () => `
      <div class="page">
        <div class="label ${fmt === "QR" ? "row" : "column"}">
          ${fmt === "QR"
          ? `<canvas class="qr-canvas" data-value="${a.barcode}"></canvas>`
          : `<svg class="barcode-svg" data-value="${a.barcode}" data-format="${fmt}"></svg>`
        }
          <div class="label-text">SKU ${esc(a.text)}</div>
          ${showDesc && a.desc ? `<div class="desc-text">${esc(a.desc)}</div>` : ""}
        </div>
      </div>
    `).join("")
    ).join("");


    const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Etiquetas</title>
<style>
  @page { size: ${labelW}mm ${labelH}mm; margin: 0; }

  html, body {
    margin: 0;
    padding: 0;
    width: ${labelW}mm;     /* 👈 tamaño físico exacto */
    height: ${labelH}mm;    /* 👈 tamaño físico exacto */
    font-family: ${fontFamily};
  }

  /* Mejor consistencia de dimensiones */
  *, *::before, *::after { box-sizing: border-box; }

  .page {
    width: ${labelW}mm;     /* 👈 NO 100% */
    height: ${labelH}mm;    /* 👈 NO 100% */
    padding: ${padding}mm;
    display: flex;
    align-items: center;
    justify-content: center;
    break-after: page;      /* 👈 reemplaza page-break-after */
    overflow: hidden;       /* evita que nada “empuje” la página */
  }

  .label {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column; 
    align-items: center;
    justify-content: center;
    gap: 0;
  }

  .barcode-svg { width: 100%; height: ${barH}mm; }
  .qr-canvas { width: ${labelConfig.qrSizeMm}mm; height: ${labelConfig.qrSizeMm}mm; }

  .desc-text {
  width: ${labelW}mm; 
    font-size: ${descFontPx}px; text-align: center;
    width: 100%; max-width: 100%;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
.label-text {
  width: 100%;        /* ✅ o elimínala */
  font-size: ${fontPx}px !important;
  font-weight: bold;
  text-align: center;
  word-break: break-word;
}


  @media print {
    html, body {
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
  }
</style>
</head>
<body>
${bodyHtml}
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
<script>
(function(){
  function render() {
    document.querySelectorAll('svg.barcode-svg').forEach(svg=>{
      try {
        JsBarcode(svg, svg.dataset.value, {
          format: svg.dataset.format,
          displayValue: false,
          margin: 0,
          width: 1.2
        });
        svg.setAttribute('preserveAspectRatio', 'none');
      } catch(e){}
    });

    document.querySelectorAll('canvas.qr-canvas').forEach(c=>{
      try {
        // Lee el tamaño CSS en px (derivado de mm)
        const rect = c.getBoundingClientRect();
        // Escala el bitmap para impresión (2x ayuda a nitidez en drivers)
        const devicePx = Math.ceil(rect.width * 2);
        c.width  = devicePx;
        c.height = devicePx;
        QRCode.toCanvas(c, c.dataset.value, {
          errorCorrectionLevel: "M",
          margin: 0,
          width: devicePx
        });
        // Mantén el tamaño físico en la página
        c.style.width  = rect.width + 'px';
        c.style.height = rect.width + 'px';
      } catch(e){}
    });
  }

  window.addEventListener('load', ()=>{
    render();
    setTimeout(()=>{ window.print(); }, 200);
  });

  window.addEventListener('afterprint', ()=>{ try{ window.close(); }catch(e){} });
})();
</script>

</body>
</html>`;

    if (isMobile()) {
      // 📱 en móvil: nueva pestaña/ventana
      const w = window.open('', '_blank', 'noopener,noreferrer');
      if (!w) {
        alert('Activa las ventanas emergentes para imprimir las etiquetas.');
        return;
      }
      w.document.open();
      w.document.write(printHtml);
      w.document.close();
    } else {
      // 💻 en desktop: iframe oculto como antes
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open(); doc.write(printHtml); doc.close();
      const cleanup = () => { try { document.body.removeChild(iframe); } catch { } };
      setTimeout(cleanup, 10000);
    }
  };



  /******************************************************/
  const totalLabels = useMemo(() => articles.reduce((s, a) => s + a.quantity, 0), [articles])

  // búsqueda con debounce
  useEffect(() => {
    const q = labelConfig.text.trim()
    setSearchError(null)
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    if (q.length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }
    const controller = new AbortController()
    abortRef.current = controller
    const t = setTimeout(async () => {
      try {
        setIsSearching(true)
        const r = await fetch(`/api/articulos?q=${encodeURIComponent(q)}`, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        })
        const json = await r.json()
        if (!r.ok || !json?.ok) throw new Error(json?.error || "Error buscando artículos")
        setSearchResults(Array.isArray(json.data) ? json.data : [])
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSearchError(err?.message || "Error de red")
          setSearchResults([])
        }
      } finally {
        setIsSearching(false)
      }
    }, 300)
    return () => {
      clearTimeout(t)
      controller.abort()
    }
  }, [labelConfig.text])

  const onArticleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      if (searchResults.length > 0) {
        const first = searchResults[0]
        addArticle(first.claveArticulo, first.nombre) // ← pasa la desc
      } else if (labelConfig.text.trim()) {
        addArticle()
      }
    }

  }

  // ===== PREVIEW que nunca se desborda =====
  const naturalW = mmToPx(parseFloat(labelConfig.width))
  const naturalH = mmToPx(parseFloat(labelConfig.height))
  const previewPad = Math.max(0, parseInt(labelConfig.margin))
  const previewBarHeightPx = mmToPx(parseFloat(labelConfig.barHeightMm || "20"))

  const previewScale = 1
  const cellW = naturalW
  const cellH = naturalH

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      {/* Oculta spinners nativos en inputs numéricos + mejora iOS */}
      <style jsx global>{`
      input.no-spin::-webkit-outer-spin-button,
      input.no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
      input.no-spin { -moz-appearance: textfield; }
      @supports (-webkit-touch-callout: none) {
        input, select, textarea, button { font-size: 16px; }
      }
    `}</style>

      {/* Padding adaptativo */}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-[1200px] mx-auto">
          {/* Grid principal: 1 columna en móvil, 2 en ≥lg */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch min-h-0">
            {/* Panel de Configuración (izquierda) */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm h-full flex flex-col w-full">
              <CardHeader className="border-b border-gray-600 w-full">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
                    <Settings className="w-5 h-5 text-purple-300" />
                    <span>Configuración</span>
                  </CardTitle>

                  <div className="flex items-center gap-2 text-white font-light text-xs sm:text-sm">
                    <span className="shrink-0">v1.3.2</span>
                    <Link
                      href="/actualizaciones"
                      className="text-purple-300 hover:text-purple-200"
                      title="Ver historial de actualizaciones"
                    >
                      <Info className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Campo de artículo con búsqueda */}
                <div className="space-y-2 relative">
                  <Label className="text-gray-100 font-medium text-sm sm:text-base">Artículo (clave)</Label>
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <Input
                      type="text"
                      placeholder="Busca por clave o nombre…"
                      value={labelConfig.text}
                      onChange={(e) => handleConfigChange("text", e.target.value)}
                      onKeyDown={onArticleKeyDown}
                      className="bg-gray-700 border-gray-500 text-white placeholder-gray-300 flex-1 w-full"
                    />
                    <Button
                      onClick={() => {
                        if (searchResults.length > 0) addArticle(searchResults[0].claveArticulo)
                        else if (labelConfig.text.trim()) addArticle()
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-full sm:w-auto"
                      disabled={!labelConfig.text.trim()}
                      title="Agregar artículo"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      <span className="sm:hidden">Agregar</span>
                    </Button>
                  </div>

                  {(isSearching || searchError || searchResults.length > 0) && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-600 bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
                      {isSearching && (
                        <div className="px-3 py-2 text-sm text-gray-300 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Buscando…
                        </div>
                      )}
                      {searchError && (
                        <div className="px-3 py-2 text-sm text-red-300 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> {searchError}
                        </div>
                      )}
                      {!isSearching && !searchError && searchResults.length === 0 && labelConfig.text.trim().length >= 2 && (
                        <div className="px-3 py-2 text-sm text-gray-400">Sin resultados</div>
                      )}
                      {!isSearching && !searchError && searchResults.length > 0 && (
                        <ul className="divide-y divide-gray-700">
                          {searchResults.map((item, idx) => (
                            <li
                              key={`${item.claveArticulo}-${idx}`}
                              className="px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 cursor-pointer flex items-center justify-between gap-2"
                              onClick={() => {
                                setLabelConfig(prev => ({ ...prev, text: item.claveArticulo }))
                                addArticle(item.claveArticulo, item.nombre) // ← pasa la desc
                              }}

                            >
                              <span className="truncate max-w-[60%] sm:max-w-none">{item.nombre}</span>
                              <span className="text-purple-300 ml-2 shrink-0">{item.claveArticulo}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                {/* Tamaño guardado (BD) */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium text-sm sm:text-base">Tamaño de etiqueta</Label>
                  <Select
                    value={selectedTamanoId}
                    onValueChange={(value) => {
                      setSelectedTamanoId(value)
                      const t = tamanos.find(x => String(x.id) === value)
                      if (t) aplicarTamanoBD(t)
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-500 text-white w-full">
                      <SelectValue placeholder={isLoadingTamanos ? "Cargando..." : "Selecciona un tamaño"} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-500 max-h-64 overflow-y-auto">
                      {isLoadingTamanos && (
                        <div className="px-3 py-2 text-sm text-gray-300 flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
                        </div>
                      )}
                      {tamanosError && (
                        <div className="px-3 py-2 text-sm text-red-300 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" /> {tamanosError}
                        </div>
                      )}
                      {!isLoadingTamanos && !tamanosError && tamanos.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-300">No hay tamaños guardados</div>
                      )}
                      {tamanos.map(t => (
                        <SelectItem key={t.id} value={String(t.id)} className="text-white">
                          {t.nombre} — {t.width}×{t.height}mm (margen {t.margen}mm)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Formato de código de barras */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium text-sm sm:text-base">Formato de código de barras</Label>
                  <Select value={barcodeFormat}
                    onValueChange={(v: "CODE128" | "CODE128B" | "QR") => {
                      setBarcodeFormat(v)
                      if (v === "QR") {
                        setLabelConfig(prev => {
                          const qr = clampQrSize(
                            parseFloat(prev.barHeightMm || "20"),
                            parseFloat(prev.width || "50"),
                            parseFloat(prev.height || "25"),
                            parseFloat(prev.margin || "0")
                          )
                          return { ...prev, qrSizeMm: String(qr) }
                        })
                      }
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-500 text-white w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-500">
                      <SelectItem value="CODE128" className="text-white">CODE128</SelectItem>
                      <SelectItem value="CODE128B" className="text-white">CODE128B</SelectItem>
                      <SelectItem value="QR" className="text-white">Código QR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Plantillas locales */}
                <div className="flex justify-between items-center gap-3 flex-wrap">
                  <Label className="text-gray-100 font-medium text-base">Configurar etiqueta manual</Label>
                  <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-full sm:w-auto">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Guardar Plantilla
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-600 text-white w-full max-w-[95vw] sm:max-w-lg">
                      <DialogHeader>
                        <DialogTitle className="text-white">Crear Nueva Plantilla</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-gray-200">Nombre de la plantilla</Label>
                          <Input
                            type="text"
                            placeholder="Ej: Etiquetas pequeñas, Productos grandes..."
                            value={templateName}
                            onChange={(e) => setTemplateName(e.target.value)}
                            className="bg-gray-700 border-gray-500 text-white placeholder-gray-300"
                          />
                        </div>
                        <div className="bg-gray-700/50 p-4 rounded-lg text-sm">
                          <Label className="text-gray-200 text-sm">Configuración actual:</Label>
                          <div className="mt-2 space-y-1 text-gray-300">
                            <p>Tamaño: {labelConfig.width}mm × {labelConfig.height}mm</p>
                            <p>Margen: {labelConfig.margin}mm</p>
                            <p>Fuente: {labelConfig.font}, {labelConfig.fontSize}px</p>
                            <p>Alto barras: {labelConfig.barHeightMm}mm</p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-col sm:flex-row justify-end">
                          <Button variant="ghost" onClick={() => setIsTemplateModalOpen(false)} className="text-gray-300 hover:text-white w-full sm:w-auto">
                            Cancelar
                          </Button>
                          <Button onClick={saveTemplate} disabled={!templateName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" />
                            Guardar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Etiqueta */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Margen interno (mm)</Label>
                  <NumberField
                    value={labelConfig.margin}
                    onChange={(v) => handleConfigChange("margin", v)}
                    min={3}
                    step={0.5}
                    ariaLabel="Margen interno en milímetros"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Ancho (mm)</Label>
                    <NumberField
                      value={labelConfig.width}
                      onChange={(v) => handleConfigChange("width", v)}
                      min={1}
                      max={135}
                      step={1}
                      ariaLabel="Ancho en milímetros"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Alto (mm)</Label>
                    <NumberField
                      value={labelConfig.height}
                      onChange={(v) => handleConfigChange("height", v)}
                      min={1}
                      max={300}
                      step={1}
                      ariaLabel="Alto en milímetros"
                    />
                  </div>
                </div>

                {/* Alto de barras */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Alto barras (mm)</Label>
                  <NumberField
                    value={labelConfig.barHeightMm}
                    onChange={(v) => handleConfigChange("barHeightMm", v)}
                    min={4}
                    step={1}
                    ariaLabel="Alto de las barras en milímetros"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Número de impresiones</Label>
                  <NumberField
                    value={labelConfig.quantity}
                    onChange={(v) => handleConfigChange("quantity", v)}
                    min={1}
                    step={1}
                    ariaLabel="Número de impresiones"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Tamaño del código (px)</Label>
                    <NumberField
                      value={labelConfig.fontSize}
                      onChange={(v) => handleConfigChange("fontSize", v)}
                      min={6}
                      step={1}
                      ariaLabel="Tamaño de fuente en píxeles"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Fuente</Label>
                    <Select value={labelConfig.font} onValueChange={(value) => handleConfigChange("font", value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-500 text-white w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-500">
                        <SelectItem value="Arial" className="text-white">Arial</SelectItem>
                        <SelectItem value="Helvetica" className="text-white">Helvetica</SelectItem>
                        <SelectItem value="Times" className="text-white">Times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {/* Mostrar descripción y tamaño */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="showDesc" className="text-gray-100 font-medium">Mostrar descripción</Label>
                    <div className="flex items-center gap-2 bg-gray-700 border border-gray-500 rounded-md px-3 py-2">
                      <input
                        id="showDesc"
                        type="checkbox"
                        checked={!!labelConfig.showDesc}
                        onChange={(e) => handleConfigChange("showDesc", e.target.checked)}
                        className="h-4 w-4 accent-purple-600"
                      />
                      <span className="text-gray-200 text-sm">Imprimir texto debajo del código</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Tamaño descripción (px)</Label>
                    <NumberField
                      value={labelConfig.descFontSize}
                      onChange={(v) => handleConfigChange("descFontSize", v)}
                      min={6}
                      step={1}
                      ariaLabel="Tamaño de la descripción en píxeles"
                      // deshabilitado si no se imprime descripción
                      className={labelConfig.showDesc ? "" : "opacity-50 pointer-events-none"}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2 sm:pt-4 flex-col sm:flex-row">
                  <Button onClick={handlePrint} className="bg-gray-600 hover:bg-gray-700 text-white border-0 w-full sm:flex-1" disabled={articles.length === 0}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
                <div className="flex gap-3 pt-2 sm:pt-4 flex-col sm:flex-row">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-full sm:w-auto" onClick={onPickExcelClick} title="Importar desde Excel/CSV">
                    <Plus className="w-4 h-4 mr-2" />
                    Importar Excel
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white w-full sm:w-auto" onClick={downloadTemplate} title="Descargar plantilla CSV">
                    Descargar plantilla
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Derecha: Tabla + Preview, misma altura que izquierda */}
            <div className="flex flex-col gap-4 sm:gap-6 h-full min-h-0">
              {/* Tabla de artículos */}
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-white text-lg sm:text-xl">
                      Artículos ({articles.length})
                    </CardTitle>

                    <div className="flex items-center gap-2 flex-wrap">
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onExcelInputChange} className="hidden" />

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetArticles}
                        disabled={articles.length === 0}
                        title="Eliminar todos los artículos"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Eliminar todos los artículos"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>

                      <span className="text-sm text-purple-300"> Total: {totalLabels} etiquetas </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
                  {articles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No hay artículos agregados</p>
                      <p className="text-sm">Busca, importa o agrega un artículo para comenzar</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto min-h-0">
                      {articles.map((a) => (
                        <div key={a.id} className="flex items-center justify-between gap-3 bg-gray-700/50 p-3 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-medium truncate">{a.text}</p>
                            <p className="text-gray-300 text-sm truncate">Código: {a.barcode}</p>
                            {a.desc && (
                              <p className="text-gray-300 text-xs truncate" title={a.desc}>
                                {a.desc}
                              </p>
                            )}

                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-purple-300 font-medium">{a.quantity}x</span>
                            <Button size="sm" variant="ghost" onClick={() => removeArticle(a.id)} className="text-red-400 hover:text-red-300 hover:bg-red-900/20">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Vista previa (con escalado para no desbordar) */}
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <Eye className="w-5 h-5 text-purple-300" />
                      <CardTitle className="text-white text-lg sm:text-xl">Vista Previa</CardTitle>
                    </div>
                    <p className="text-gray-300 text-xs sm:text-sm">
                      Dimensiones: {labelConfig.width}mm × {labelConfig.height}mm — Alto barras: {labelConfig.barHeightMm}mm — Formato: {barcodeFormat}
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col min-h-0">
                  <div className="bg-gray-900/60 rounded-lg p-4 sm:p-8 min-h-[220px] sm:min-h-[300px] flex-1 flex items-center justify-center relative overflow-auto min-h-0">
                    {articles.length === 0 ? (
                      <div className="text-center text-gray-400">
                        <p>Agrega artículos para ver la vista previa</p>
                      </div>
                    ) : (
                      <div
                        className="grid gap-3 sm:gap-4 justify-center w-full"
                        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${cellW}px, 1fr))` }}
                      >
                        {articles.slice(0, 1).map((a) => (
                          <div
                            key={a.id}
                            className="flex items-center justify-center"
                            style={{ width: `${cellW}px`, height: `${cellH}px`, overflow: "hidden" }}
                          >
                            {/* Etiqueta "real" escalada para caber siempre */}
                            <div
                              className="bg-white rounded-md shadow-lg border-2 border-gray-300 flex flex-col items-center justify-center relative"
                              style={{
                                width: `${naturalW}px`,
                                height: `${naturalH}px`,
                                transform: `scale(${previewScale})`,
                                transformOrigin: "top left",
                                padding: `${previewPad}px`,
                              }}
                            >
                              {/* 1) Código de barras */}
                              {barcodeFormat === "QR" ? (
                                <QRCodeSVG
                                  value={a.barcode}
                                  sizePx={mmToPx(parseFloat(labelConfig.qrSizeMm))}
                                />
                              ) : (
                                <BarcodeSVG
                                  value={a.barcode}
                                  format={barcodeFormat as "CODE128" | "CODE128B"}
                                  heightPx={previewBarHeightPx}
                                  fontFamily={labelConfig.font}
                                  fontSizePx={parseFloat(labelConfig.fontSize)}
                                />
                              )}

                              {/* 2) Texto debajo */}
                              <div
                                className="text-black text-center font-medium"
                                style={{
                                  fontSize: `${Math.max(10, Number.parseInt(labelConfig.fontSize) * 0.8)}px`,
                                  marginTop: "6px",
                                  maxWidth: "100%",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={a.text}
                              >
                                {a.text}
                              </div>
                              {labelConfig.showDesc && a.desc && (
                                <div
                                  className="text-black text-center"
                                  style={{
                                    fontSize: `${Math.max(6, parseFloat(labelConfig.descFontSize || "12"))}px`,
                                    maxWidth: "100%",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                  title={a.desc}
                                >
                                  {a.desc}
                                </div>
                              )}

                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

}

/****************************VERSION ESTABLE********************************/
