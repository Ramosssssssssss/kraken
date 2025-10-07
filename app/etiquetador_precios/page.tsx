// app/page.tsx
"use client"

import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Eye, Settings, Printer, Plus, Trash2, Minus, Loader2, AlertCircle, Upload, Download, LayoutTemplate, RotateCcw, Search, Camera, Keyboard } from "lucide-react"
import * as XLSX from "xlsx"
import Noty from "noty"
import "noty/lib/noty.css"
import "noty/lib/themes/mint.css"

// ====== NUEVO: importar tipos, utils y templates del registry ======
import type { ArticleItem, LabelTemplate } from "@/lib/labels/types"
import { mmToPx, money } from "@/lib/labels/utils"
import { LABEL_TEMPLATES, getTemplate } from "@/components/labels/templates"
export type TemplateId = (typeof LABEL_TEMPLATES)[number]["id"]

// ============= Utils locales =============
const SCS = [
  { id: "19", nombre: "TOTOLCINGO" },
  { id: "9603355", nombre: "VIA MORELOS" },
  { id: "7506737", nombre: "TEPEXPAN" },
  { id: "9604500", nombre: "VALLEJO" },
  { id: "94274615", nombre: "TEXCOCO" },
  { id: "188104", nombre: "CEDIS" },
]

const todayMX = () =>
  new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })

declare global { interface Window { JsBarcode?: any } }

async function ensureJsBarcodeLoaded(): Promise<void> {
  if (typeof window === "undefined") return
  if (window.JsBarcode) return
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("jsbarcode-cdn") as HTMLScriptElement | null
    if (existing && window.JsBarcode) return resolve()
    const s = document.createElement("script")
    s.id = "jsbarcode-cdn"
    s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error("No se pudo cargar JsBarcode"))
    document.head.appendChild(s)
  })
}

function renderAllBarcodes(root: HTMLElement | Document = document) {
  const els = Array.from(root.querySelectorAll<SVGSVGElement>(".jsb"))
  if (!els.length || !window.JsBarcode) return
  for (const el of els) {
    const code = el.getAttribute("data-code") || ""
    try {
      window.JsBarcode(el, code, { format: "CODE128", displayValue: false, height: 50, margin: 0 })
    } catch { /* noop */ }
  }
}

// ========= Normalización/validación de ubicaciones =========
const UBIC_REGEX = /^[A-Z0-9]{1,4}-(?:[A-Z0-9]{1,4}-){0,3}[A-Z0-9]{1,4}$/

function normalizeCandidate(raw: string) {
  let s = (raw || "").trim().toUpperCase()
  s = s.replace(/[–—_＋+]/g, "-")        // normaliza guiones visualmente parecidos
  const map: Record<string, string> = { O: "0", I: "1", L: "1", S: "5", B: "8" }
  s = s.replace(/[OILSB]/g, (c) => map[c] || c)
  s = s.replace(/-+/g, "-")
  return s
}
const isLikelyUbic = (s: string) => UBIC_REGEX.test(s)

/* ==================================================================== */
/* ========================  ZPL helpers  ============================== */
/* ==================================================================== */
function mmToDots(mm: number, dpi: 203 | 300 | 600) {
  return Math.round((mm / 25.4) * dpi)
}

function escapeZplText(s: string) {
  return (s || "").replace(/[\^~\\]/g, " ").replace(/\s+/g, " ").trim()
}

function buildZplForItem(
  a: { codigo: string; nombre: string; precio: number },
  template: { width: number; height: number },
  dpi: 203 | 300 | 600
) {
  const wDots = mmToDots(template.width, dpi)
  const hDots = mmToDots(template.height, dpi)

  // Márgenes físicos (mm → dots). Ajusta a tu gusto.
  const marginL = mmToDots(2, dpi)
  const marginT = mmToDots(2, dpi)
  const innerW = wDots - marginL - mmToDots(2, dpi)

  // ¿Tu diseño es vertical? rota 90° (R) y permuta PW/LL visualmente
  const isPortrait = template.height > template.width
  const ori = isPortrait ? "R" : "N" // N=normal, R=rotado 90°
  const PW = isPortrait ? hDots : wDots
  const LL = isPortrait ? wDots : hDots

  // Alturas (en mm → dots) pensadas para que escale según la etiqueta
  const bcHeight = mmToDots(Math.min(16, Math.max(8, template.height * 0.45)), dpi)
  const gap = mmToDots(1.5, dpi)

  // Tipografías (alto en dots, ZPL escalará el ancho)
  const fontDesc = mmToDots(Math.min(4, Math.max(2.3, template.height * 0.16)), dpi)
  const fontPrice = mmToDots(Math.min(6.5, Math.max(3.5, template.height * 0.26)), dpi)

  // Posiciones Y relativas
  const yBarcode = marginT
  const yDesc = yBarcode + bcHeight + gap
  const yPrice = yDesc + fontDesc + gap

  const desc = escapeZplText(a.nombre)
  const price = a.precio != null ? `$${a.precio.toFixed(2)}` : ""
  const code = escapeZplText(a.codigo)

  // ^FB para envolver descripción dentro del ancho disponible
  //  ^FB<width>,<maxLines>,<lineSpacing>,<alignment>,<hangIndent>
  const fbWidth = Math.max(40, innerW)

  return `
^XA
^CI28
^PW${PW}
^LL${LL}
^LT0
^LS0
^PRB
^MD10
^LH0,0
^FO${marginL},${yBarcode}
^BY2,2
^BC${ori},${bcHeight},N,N,N
^FD${code}^FS
^FO${marginL},${yDesc}
^CF0,${fontDesc}
^FB${fbWidth},2,${mmToDots(0.6, dpi)},L,0
^FD${desc}^FS
^FO${marginL},${yPrice}
^CF0,${fontPrice}
^FD${price}^FS
^XZ`.trim()
}

function buildZplJob(
  articles: Array<{ codigo: string; nombre: string; precio: number; quantity: number }>,
  template: { width: number; height: number },
  dpi: 203 | 300 | 600
) {
  // Usa ^PQ para cantidad por artículo: 1 etiqueta = 1 ^XA…^XZ + ^PQn
  // (alternativa a concatenar N veces el mismo bloque)
  let out = ""
  for (const a of articles) {
    const unit = { codigo: a.codigo, nombre: a.nombre, precio: a.precio }
    const body = buildZplForItem(unit, template, dpi)
    const qty = Math.max(1, a.quantity)
    // Inserta ^PQ justo antes de ^XZ
    out += body.replace("^XZ", `^PQ${qty}\n^XZ`) + "\n"
  }
  return out
}
// --- NUEVO: usa renderZPL del template si existe; si no, usa el fallback genérico ---
function buildZplJobSmart(
  articles: ArticleItem[],
  template: LabelTemplate,
  dpi: 203 | 300 | 600
) {
  const hasRenderZPL = typeof (template as any)?.renderZPL === "function"

  let out = ""
  for (const a of articles) {
    const qty = Math.max(1, a.quantity)

    // Si el template trae su propio ZPL, úsalo con el artículo completo
    const zplOne = hasRenderZPL
      ? (template as any).renderZPL(a, dpi)
      : buildZplForItem(
        { codigo: a.codigo, nombre: a.nombre, precio: a.precio ?? 0 },
        { width: template.width, height: template.height },
        dpi
      )

    out += String(zplOne).replace("^XZ", `^PQ${qty}\n^XZ`) + "\n"
  }
  return out
}


// Compartir/descargar el ZPL en Android para abrir con Zebra Print Station
async function shareZplToZebra(zpl: string, name = `job_${Date.now()}.zpl`) {
  // Debe ser contexto seguro (https o localhost)
  if (typeof window === "undefined") return
  const isSecure = window.isSecureContext || ["localhost", "127.0.0.1"].includes(location.hostname)
  if (!isSecure) {
    throw new Error("Comparte desde HTTPS (o localhost).")
  }

  // Preparamos el archivo ZPL
  const tryTypes = [
    "application/vnd.zebra-zpl",
    "application/zpl",
    "text/plain",
    "application/octet-stream",
  ]
  const blob = new Blob([zpl], { type: tryTypes[0] })
  const file = new File([blob], name, { type: blob.type })

  // 1) Web Share Level 2 con archivo (ideal)
  const nav: any = navigator
  if (nav?.canShare && nav.canShare({ files: [file] }) && typeof nav.share === "function") {
    await nav.share({
      title: "Zebra ZPL",
      text: "Enviar a Zebra PrintConnect",
      files: [file],
    })
    return
  }

  // 2) Fallback: descarga directa (el usuario toca y elige “Abrir con PrintConnect”)
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/* ==================================================================== */

// ===========================================
export default function Page() {
  // Sucursal
  const [sucursalId, setSucursalId] = useState<string>("")
  useEffect(() => setSucursalId(localStorage.getItem("almacenId") || ""), [])
  useEffect(() => { if (sucursalId) localStorage.setItem("almacenId", sucursalId) }, [sucursalId])
  const sucursalActual = useMemo(() => SCS.find((s) => s.id === sucursalId) || null, [sucursalId])

  // Plantilla (desde registry)
  const [tplId, setTplId] = useState<TemplateId>(LABEL_TEMPLATES[0].id)
  const template = useMemo<LabelTemplate>(() => getTemplate(tplId), [tplId])

  const [printerIp, setPrinterIp] = useState<string>("")
  const [printerPort, setPrinterPort] = useState<string>("9100")

  useEffect(() => {
    setPrinterIp(localStorage.getItem("printerIp") || "")
    setPrinterPort(localStorage.getItem("printerPort") || "9100")
  }, [])
  useEffect(() => { if (printerIp) localStorage.setItem("printerIp", printerIp) }, [printerIp])
  useEffect(() => { if (printerPort) localStorage.setItem("printerPort", printerPort) }, [printerPort])

  // --- imprimir directo por LAN (ZPL) ---
  const handlePrintDirectLan = async () => {
    if (!articles.length) return
    if (!printerIp) {
      new Noty({ type: "warning", layout: "topRight", theme: "mint", text: "Configura la IP de la impresora", timeout: 2200 }).show()
      return
    }
    try {
      const zpl = buildZplJobSmart(articles, template, 203) // ZQ511 a 203 dpi
      const r = await fetch("/api/print-zpl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zpl, ip: printerIp, port: Number(printerPort || 9100) })
        // Si fijas IP/puerto en .env del backend, puedes mandar solo { zpl }
      })
      const j = await r.json()
      if (!r.ok || !j?.ok) throw new Error(j?.error || "Fallo de impresión")
      new Noty({ type: "success", layout: "topRight", theme: "mint", text: "Enviado a la Zebra.", timeout: 2000 }).show()
    } catch (e: any) {
      new Noty({ type: "error", layout: "topRight", theme: "mint", text: `Error al imprimir: ${e?.message || e}`, timeout: 3500 }).show()
    }
  }

  // Artículos
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [quantity, setQuantity] = useState("1")
  const [codigo, setCodigo] = useState("")
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const upsert = (item: ArticleItem) => setArticles((prev) => {
    const i = prev.findIndex((a) => a.codigo === item.codigo)
    if (i !== -1) {
      const next = [...prev]
      next[i] = { ...next[i], quantity: next[i].quantity + item.quantity }
      return next
    }
    return [...prev, item]
  })
  const removeArticle = (id: string) => setArticles((p) => p.filter((a) => a.id !== id))
  const resetArticles = () => {
    if (!articles.length) return
    setArticles([])
    new Noty({ type: "success", layout: "topRight", theme: "mint", text: "Se eliminaron todos los artículos", timeout: 2000 }).show()
  }
  const totalLabels = useMemo(() => articles.reduce((s, a) => s + a.quantity, 0), [articles])

  // Agregar por código (API tuya)
  const addByCodigo = async (cod: string, qtyOverride?: number) => {
    const clean = (cod || "").trim(); if (!clean || !sucursalId) return
    const qty = Number.isFinite(qtyOverride as number) && (qtyOverride as number) > 0
      ? (qtyOverride as number)
      : Math.max(1, parseInt(quantity || "1", 10))
    setLoadingAdd(true); setAddError(null)
    try {
      const r = await fetch(`/api/etiquetasPiso?codigo=${encodeURIComponent(clean)}&almacen=${encodeURIComponent(sucursalId)}`, { headers: { Accept: "application/json" } })
      const j = await r.json()
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo obtener el artículo.")
      const row = Array.isArray(j.data) ? j.data[0] : null
      if (!row) throw new Error("Sin resultados para ese código en el almacén seleccionado.")
      upsert({
        id: `${Date.now()}_${clean}`,
        codigo: clean,
        nombre: String(row.descripcion || "").trim() || "SIN DESCRIPCIÓN",
        unidad: String(row.unidad_venta || "-").trim(),
        precio: Number(row.precio_lista_iva ?? 0),
        distribuidor: Number(row.precio_mayor_iva ?? 0),
        fecha: todayMX(),
        estatus: (row.estatus ?? null) as string | null,
        inventarioMaximo: Number(row.inventario_maximo ?? 0),
        quantity: qty
      })
      setCodigo(""); setQuantity("1")
    } catch (e: any) {
      setAddError(e?.message || "Error al agregar el artículo.")
    } finally { setLoadingAdd(false) }
  }

  // Import/Export Excel
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([["CODIGO", "CANTIDAD"], ["12500", 2], ["12501", 1]])
    // @ts-ignore
    ws["!cols"] = [{ wch: 12 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla")
    XLSX.writeFile(wb, "plantilla_etiquetas_codigos.xlsx")
  }

  const importFromExcel = async (file: File) => {
    setImporting(true); setImportErrors([]); setImportProgress({ done: 0, total: 0 })
    try {
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false }) as any[][]
      const data = rows.slice(1).map((r, i) => ({
        codigo: String(r[0] || "").trim(),
        qty: Math.max(1, parseInt(String(r[1] ?? "1"), 10)),
        i
      }))
      const valid = data.filter((r) => r.codigo)
      const total = valid.length; setImportProgress({ done: 0, total })
      let done = 0; const errors: string[] = []
      for (const r of valid) {
        try { await addByCodigo(r.codigo, r.qty) }
        catch (e: any) { errors.push(`Fila ${r.i + 2} (CODIGO=${r.codigo}): ${e?.message || "Error"}`) }
        finally { done++; setImportProgress({ done, total }) }
      }
      setImportErrors(errors)
    } catch (e: any) {
      setImportErrors([e?.message || "No se pudo leer el archivo"])
    } finally { setImporting(false) }
  }

  const exportArticlesExcel = async () => {
    if (!articles.length) {
      new Noty({ type: "warning", layout: "topRight", theme: "mint", text: "No hay artículos para exportar.", timeout: 1800 }).show()
      return
    }
    const data = [["CODIGO", "CANTIDAD"], ...articles.map(a => [a.codigo, a.quantity])]
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(data)
    // @ts-ignore
    ws["!cols"] = [{ wch: 16 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, "Articulos")
    const suc = (sucursalActual?.nombre || "sucursal").replace(/[^\w\-]+/g, "_")
    const fecha = new Date().toISOString().slice(0, 10)
    const filename = `articulos_codigos_${suc}_${fecha}.xlsx`
    XLSX.writeFile(wb, filename)
    new Noty({ type: "success", layout: "topRight", theme: "mint", text: "Excel descargado.", timeout: 1800 }).show()
  }

  // ====== IMPRESIÓN ======
  // Modal-only print para móvil (mantenemos el modal por si lo usas)
  const [printOpen, setPrintOpen] = useState(false)
  const printRef = useRef<HTMLDivElement | null>(null)

const handlePrintMobile = async () => {
  if (!articles.length) return
  try {
    const zpl = buildZplJobSmart(articles, template, 203) // ZQ511 = 203dpi
    await shareZplToZebra(zpl, "etiquetas.zpl")
    new Noty({ type: "success", layout: "topRight", theme: "mint",
      text: "Enviado a Zebra. Si PrintConnect tiene Auto Print, saldrá directo.", timeout: 2200 }).show()
  } catch (e:any) {
    new Noty({ type: "error", layout: "topRight", theme: "mint",
      text: `No se pudo compartir: ${e?.message || e}`, timeout: 3500 }).show()
  }
}



  // Tu impresión existente (iframe) – desktop (HTML->print)
  const handlePrint = () => {
    if (!articles.length) return
    const w = template.width
    const h = template.height
    const pad = template.id === "original-69x25" ? 3 : 0
    const labelsHTML = articles.flatMap(a => Array.from({ length: a.quantity }, () => template.renderHTML(a))).join("")
    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Etiquetas</title>
<style>
${template.css(w, h, pad)}
@media print {
  .p{ break-after: page; }
  .p:last-of-type{ break-after: auto; }
  *{ font-family: Arial, Helvetica, sans-serif; }
}
</style>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script>
  window.addEventListener('load', function(){
    try{
      document.querySelectorAll('.jsb').forEach(function(el){
        var code = el.getAttribute('data-code')||'';
        var box = el.closest('.bc-fit') || el.closest('.q3');
        var hPx = 80;
        if (box) { var r = box.getBoundingClientRect(); hPx = Math.max(20, Math.round(r.height)); }
        JsBarcode(el, code, { format:'CODE128', displayValue:false, margin:0, height:hPx });
        el.removeAttribute('width'); el.removeAttribute('height');
        el.style.width='100%'; el.style.height='100%';
      });
    }catch(e){}
    setTimeout(function(){ window.print(); }, 0);
  });
</script>
</head><body>${labelsHTML}</body></html>`
    const f = document.createElement("iframe")
    Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" })
    document.body.appendChild(f)
    const d = (f.contentDocument || (f as any).ownerDocument) as Document
    d.open(); d.write(html); d.close()
    const cleanup = () => { try { document.body.removeChild(f) } catch { } }
    setTimeout(cleanup, 10000)
      ; (f.contentWindow as any)?.addEventListener?.("afterprint", cleanup)
  }

  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false
    return (window.matchMedia?.("(pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent))
  }, [])

  const onPrintClick = () => {
    if (isMobile) handlePrintMobile()
    else handlePrint()
  }

  // Preview barcodes cuando lista/plantilla cambian
  useEffect(() => {
    (async () => {
      try { await ensureJsBarcodeLoaded(); renderAllBarcodes() } catch { }
    })()
  }, [articles, tplId])

  // ===== Modal buscar por ubicación + Cámara =====
  const [ubicModalOpen, setUbicModalOpen] = useState(false)
  const [ubicTab, setUbicTab] = useState<"manual" | "cam">("manual")
  const [ubicacion, setUbicacion] = useState("")
  const [buscandoUbic, setBuscandoUbic] = useState(false)
  const [ubicErr, setUbicErr] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<any>(null)

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  async function tryZXingOnce(video: HTMLVideoElement) {
    try {
      const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import("@zxing/library")
      const hints = new Map()
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
        BarcodeFormat.QR_CODE, BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
      ])
      hints.set(DecodeHintType.TRY_HARDER, true)
      const reader = new BrowserMultiFormatReader(hints, 500)
      try {
        const res = await reader.decodeOnceFromVideoDevice(undefined, video)
        return res?.getText?.() || ""
      } catch {
        return ""
      } finally {
        try { await reader.reset() } catch { }
      }
    } catch {
      return ""
    }
  }

  const startCamera = async () => {
    setUbicErr(null)
    try {
      stopCamera()
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      streamRef.current = s
      if (!videoRef.current) return
      videoRef.current.srcObject = s
      await videoRef.current.play()

      // BarcodeDetector nativo si existe
      // @ts-ignore
      if ("BarcodeDetector" in window) {
        // @ts-ignore
        detectorRef.current = new window.BarcodeDetector({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"]
        })
      } else {
        detectorRef.current = null
        new Noty({ type: "warning", layout: "topRight", theme: "mint", text: "Este navegador no soporta BarcodeDetector. Intentaré fallback con ZXing.", timeout: 2500 }).show()
      }

      let missCount = 0
      const tick = async () => {
        if (!videoRef.current) return
        let candidate = ""

        if (detectorRef.current) {
          try {
            const codes = await detectorRef.current.detect(videoRef.current)
            candidate = String(codes?.[0]?.rawValue || "")
          } catch { /* noop */ }
        }

        let normalized = normalizeCandidate(candidate)
        if (isLikelyUbic(normalized)) {
          setUbicacion(normalized)
          try { navigator.vibrate?.(80) } catch { }
          stopCamera()
          setUbicTab("manual")
          new Noty({ type: "success", layout: "topRight", theme: "mint", text: `Ubicación: ${normalized}`, timeout: 1800 }).show()
          return
        }

        // fallback periódico con ZXing (FIX: usar videoRef.current)
        if (++missCount % 10 === 0 && videoRef.current && videoRef.current.videoWidth > 0) {
          const z = await tryZXingOnce(videoRef.current)
          const n2 = normalizeCandidate(z)
          if (isLikelyUbic(n2)) {
            setUbicacion(n2)
            try { navigator.vibrate?.(80) } catch { }
            stopCamera()
            setUbicTab("manual")
            new Noty({ type: "success", layout: "topRight", theme: "mint", text: `Ubicación: ${n2}`, timeout: 1800 }).show()
            return
          }
        }

        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      setUbicErr(e?.message || "No se pudo acceder a la cámara")
    }
  }

  useEffect(() => () => stopCamera(), [])

  // Buscar artículos por ubicación (API tuya)
  const buscarPorUbicacion = async () => {
    const u = (ubicacion || "").trim()
    if (!u) { setUbicErr("Ingresa una ubicación válida"); return }
    if (!sucursalId) { setUbicErr("Selecciona una sucursal primero"); return }
    setBuscandoUbic(true); setUbicErr(null)
    try {
      const url = `/api/etiquetasPiso?ubicacion=${encodeURIComponent(u)}&almacen=${encodeURIComponent(sucursalId)}`
      const r = await fetch(url, { headers: { Accept: "application/json" } })
      const j = await r.json()
      if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo buscar por ubicación")
      const rows: any[] = Array.isArray(j.data) ? j.data : []
      if (!rows.length) throw new Error("Sin artículos en esa ubicación")

      let added = 0
      for (const row of rows) {
        const cod = String(row.codigo || row.CODIGO || row.id || "").trim()
        if (!cod) continue
        upsert({
          id: `${Date.now()}_${cod}_${Math.random().toString(36).slice(2)}`,
          codigo: cod,
          nombre: String(row.descripcion || row.DESCRIPCION || "").trim() || "SIN DESCRIPCIÓN",
          unidad: String(row.unidad_venta || row.UNIDAD || "-").trim(),
          precio: Number(row.precio_lista_iva ?? row.PRECIO ?? 0),
          distribuidor: Number(row.precio_mayor_iva ?? row.MAYOREO ?? 0),
          fecha: todayMX(),
          estatus: (row.estatus ?? row.ESTATUS ?? null) as string | null,
          inventarioMaximo: Number(row.inventario_maximo ?? row.INV_MAX ?? 0),
          quantity: 1,
        })
        added++
      }
      new Noty({ type: "success", layout: "topRight", theme: "mint", text: `Se agregaron ${added} artículos de la ubicación ${u}.`, timeout: 2500 }).show()
      setUbicModalOpen(false)
      setUbicacion("")
    } catch (e: any) {
      setUbicErr(e?.message || "Error al buscar por ubicación")
    } finally { setBuscandoUbic(false) }
  }

  const naturalW = mmToPx(template.width), naturalH = mmToPx(template.height)

  // ============= UI =============
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <style jsx global>{`
        input.no-spin::-webkit-outer-spin-button, input.no-spin::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }
        input.no-spin { -moz-appearance:textfield }
        @supports (-webkit-touch-callout: none) {
          input, select, textarea, button { font-size: 16px; }
        }
        /* ====== IMPRESIÓN SOLO DEL MODAL ====== */
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area { position: fixed; inset: 0; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Dialog sucursal */}
      <Dialog open={!sucursalId}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 w-full max-w-[95vw] sm:max-w-md">
          <DialogHeader><DialogTitle>Selecciona una sucursal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label className="text-gray-300">Sucursal / Almacén</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
                <SelectValue placeholder="Elige una sucursal" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {SCS.map((s) => (
                  <SelectItem className="text-white" key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full bg-purple-600 hover:bg-purple-700" disabled={!sucursalId}>Continuar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Buscar por ubicación */}
      <Dialog
        open={ubicModalOpen}
        onOpenChange={(open) => {
          setUbicModalOpen(open)
          if (!open) { stopCamera(); setUbicTab("manual"); setUbicErr(null) }
        }}
      >
        <DialogContent className="bg-gray-900 text-white border-gray-700 w-full max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-4 h-4" /> Buscar por ubicación
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={ubicTab === "manual" ? "default" : "outline"}
                className={ubicTab === "manual" ? "bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none" : "border-gray-700 flex-1 sm:flex-none"}
                onClick={() => { setUbicTab("manual"); stopCamera() }}
              >
                <Keyboard className="w-4 h-4 mr-2" /> Manual
              </Button>
              <Button
                variant={ubicTab === "cam" ? "default" : "outline"}
                className={ubicTab === "cam" ? "bg-purple-600 hover:bg-purple-700 flex-1 sm:flex-none" : "border-gray-700 flex-1 sm:flex-none"}
                onClick={() => { setUbicTab("cam"); startCamera() }}
              >
                <Camera className="w-4 h-4 mr-2" /> Cámara
              </Button>
            </div>

            {ubicTab === "manual" ? (
              <div className="space-y-3">
                <Label className="text-gray-100">Ubicación / Anaquel / Pasillo</Label>
                <Input
                  value={ubicacion}
                  onChange={(e) => setUbicacion(e.target.value)}
                  placeholder="Ej. P8-LD-A7"
                  className="bg-gray-800 border-gray-700 text-white"
                  onKeyDown={(e) => { if (e.key === "Enter") buscarPorUbicacion() }}
                />
                {ubicErr && (
                  <div className="px-3 py-2 text-sm text-red-300 flex items-center gap-2 bg-red-900/20 rounded">
                    <AlertCircle className="w-4 h-4" />{ubicErr}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <Button variant="outline" className="border-gray-700 w-full sm:w-auto" onClick={() => { setUbicModalOpen(false); stopCamera() }}>
                    Cancelar
                  </Button>
                  <Button className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto" onClick={buscarPorUbicacion} disabled={buscandoUbic}>
                    {buscandoUbic ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-6">
                <div className="relative aspect-[3/4] md:aspect-video w-full rounded-md overflow-hidden border border-gray-700 bg-black">
                  <video ref={videoRef} className="w-full h-full object-contain" muted playsInline />
                  {!streamRef.current && (
                    <div className="absolute inset-0 grid place-items-center text-gray-300 text-sm sm:text-base px-4 text-center">
                      <div>
                        <p>Activa la cámara para escanear el anaquel / código de ubicación.</p>
                        <p className="opacity-80 mt-2">Al detectar un código válido, lo copiaré arriba.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  <Button onClick={startCamera} className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto h-11">Iniciar cámara</Button>
                  <Button variant="outline" className="border-gray-700 w-full sm:w-auto h-11" onClick={stopCamera}>Detener</Button>
                </div>

                {ubicacion && (
                  <div className="text-sm sm:text-base text-gray-200">
                    Detectado: <span className="font-semibold text-purple-300 break-all">{ubicacion}</span>
                  </div>
                )}

                {ubicErr && (
                  <div className="px-3 py-2 text-sm sm:text-base text-red-300 flex items-start gap-2 bg-red-900/20 rounded">
                    <AlertCircle className="w-4 h-4 mt-0.5" />
                    <span className="flex-1">{ubicErr}</span>
                  </div>
                )}

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-700 w-full sm:w-auto h-11"
                    onClick={() => { setUbicModalOpen(false); stopCamera() }}
                  >
                    Cerrar
                  </Button>
                  <Button
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto h-11"
                    onClick={buscarPorUbicacion}
                    disabled={!ubicacion || buscandoUbic}
                  >
                    {buscandoUbic ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar con ubicación detectada"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Vista de impresión SOLO para móvil */}
      <Dialog open={printOpen} onOpenChange={setPrintOpen}>
        <DialogContent className="bg-white text-black border-gray-300 w-[96vw] max-w-[96vw] h-[90vh] sm:max-w-3xl overflow-hidden">
          <DialogHeader className="no-print">
            <DialogTitle>Vista de impresión</DialogTitle>
          </DialogHeader>

          {/* Área que SÍ se imprime */}
          <div id="print-area" ref={printRef} className="relative">
            {/* Se inyecta CSS + HTML dinámico en handlePrintMobile */}
            <div className="print-body p-2" />
          </div>

          {/* Controles que NO se imprimen */}
          <div className="no-print mt-3 flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setPrintOpen(false)}>Cerrar</Button>
            <Button onClick={() => window.print()} className="bg-purple-600 hover:bg-purple-700">
              <Printer className="w-4 h-4 mr-2" /> Imprimir
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contenido principal */}
      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-6 sm:mb-8">
            <p className="text-gray-200 text-base sm:text-lg">
              Sucursal actual:{" "}
              <span className="font-semibold text-purple-200">{sucursalActual ? sucursalActual.nombre : "—"}</span>
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch min-h-0">
            {/* Izquierda */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm h-full flex flex-col w-full">
              <CardHeader className="border-b border-gray-600 flex w-full justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-purple-300" />Configuración
                </CardTitle>
                <CardTitle className="flex items-center gap-2 text-white font-light text-xs">v2.3.4</CardTitle>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-6">
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4" />Tipo de etiqueta
                    </Label>
                    <Select value={tplId} onValueChange={setTplId}>
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
                        <SelectValue placeholder="Elige una plantilla" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {LABEL_TEMPLATES.map(t => (
                          <SelectItem className="text-white" key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-gray-400">Dimensiones fijas: {template.width} × {template.height} mm</p>
                  </div>

                  {/* Captura */}
                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-gray-100 font-medium">Código del artículo</Label>
                    <div className="flex gap-2 flex-wrap">
                      <Input
                        type="text"
                        placeholder={!sucursalId ? "Selecciona una sucursal…" : "Escanea o escribe el código…"}
                        value={codigo}
                        onChange={(e) => setCodigo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && codigo.trim() && sucursalId) {
                            e.preventDefault()
                            addByCodigo(codigo.trim(), Math.max(1, parseInt(quantity || "1", 10)))
                          }
                        }}
                        className="bg-gray-700 border-gray-500 text-white placeholder-gray-300 flex-1 min-w-[200px]"
                        disabled={!sucursalId}
                      />
                      <div className="w-full sm:w-36">
                        <NumberField value={quantity} onChange={setQuantity} min={1} step={1} ariaLabel="Número de impresiones" />
                      </div>
                      <Button
                        onClick={() => {
                          if (codigo.trim() && sucursalId) {
                            addByCodigo(codigo.trim(), Math.max(1, parseInt(quantity || "1", 10)))
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-full sm:w-auto"
                        disabled={!sucursalId || !codigo.trim() || loadingAdd}
                        title="Agregar etiqueta"
                      >
                        {loadingAdd ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </Button>
                    </div>
                    {addError && (
                      <div className="mt-2 px-3 py-2 text-sm text-red-300 flex items-center gap-2 bg-red-900/20 rounded">
                        <AlertCircle className="w-4 h-4" />{addError}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls,.csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      if (file.size > 10 * 1024 * 1024) {
                        new Noty({ type: "error", layout: "topRight", theme: "mint", text: "El archivo es muy grande (máx 10 MB).", timeout: 3000 }).show()
                        e.currentTarget.value = ""
                        return
                      }
                      try {
                        await importFromExcel(file)
                        new Noty({ type: "success", layout: "topRight", theme: "mint", text: "Importación completada.", timeout: 2500 }).show()
                      } catch (err: any) {
                        new Noty({ type: "error", layout: "topRight", theme: "mint", text: err?.message ?? "Error al importar el archivo.", timeout: 3000 }).show()
                      } finally {
                        e.currentTarget.value = ""
                      }
                    }}
                  />

                  <Button
                    onClick={onPrintClick}
                    className="col-span-full w-full justify-center h-11 bg-gray-600 hover:bg-gray-700 text-white border-0"
                    disabled={!sucursalId || articles.length === 0}
                    title="Imprimir etiquetas"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir ({totalLabels})
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center h-10 sm:h-11 border-gray-600 text-white"
                    onClick={downloadTemplate}
                    title="Descargar plantilla con solo CODIGO y CANTIDAD"
                  >
                    <Download className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span>Descargar plantilla</span>
                  </Button>

                  <Button
                    type="button"
                    className="w-full justify-center h-10 sm:h-11 bg-purple-600 hover:bg-purple-700 text-white border-0"
                    disabled={!sucursalId || importing}
                    onClick={() => fileRef.current?.click()}
                    title="Importar desde Excel o CSV"
                  >
                    {importing ? (
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    )}
                    <span className="text-center">
                      {importing
                        ? `Importando ${importProgress.done}/${importProgress.total}`
                        : "Importar Excel"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-center h-10 sm:h-11 border-gray-600 text-white"
                    onClick={() => setUbicModalOpen(true)}
                    title="Buscar por ubicación"
                  >
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                    <span>Buscar por ubicación</span>
                  </Button>
                </div>

                {(importing || importErrors.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {importing && (
                      <div className="px-3 py-2 rounded bg-gray-700/60 text-white text-sm">
                        Procesando… {importProgress.done}/{importProgress.total}
                      </div>
                    )}
                    {importErrors.length > 0 && (
                      <div className="px-3 py-2 rounded bg-red-900/30 border border-red-700 text-red-200 text-sm max-h-40 overflow-y-auto">
                        <div className="flex items-center gap-2 font-medium mb-1">
                          <AlertCircle className="w-4 h-4" />
                          Errores de importación ({importErrors.length})
                        </div>
                        <ul className="list-disc ml-5 space-y-1">
                          {importErrors.slice(0, 50).map((err, i) => (<li key={i}>{err}</li>))}
                        </ul>
                        {importErrors.length > 50 && <div className="mt-1 opacity-80">…y más</div>}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Derecha */}
            <div className="flex flex-col gap-4 sm:gap-6 h-full min-h-0">
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
                    <CardTitle className="text-white truncate">Artículos ({articles.length})</CardTitle>

                    <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto min-w-0">
                      <Button
                        type="button"
                        className="bg-gray-700 hover:bg-gray-600 text-white border-0 w-full sm:w-auto"
                        disabled={articles.length === 0}
                        onClick={exportArticlesExcel}
                        title="Exportar artículos (CODIGO, CANTIDAD)"
                      >
                        <Download className="w-4 h-4 mr-2 shrink-0" />
                        <span className="truncate">Exportar Excel</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={resetArticles}
                        disabled={articles.length === 0}
                        title="Eliminar todos los artículos"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>

                      <span className="text-sm text-purple-300 w-full sm:w-auto truncate">
                        Total: {totalLabels} etiquetas
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 max-w-full overflow-auto whitespace-wrap">
                  {articles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No hay artículos agregados</p>
                      <p className="text-sm">Escribe un código y presiona Enter o el botón +</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto max-h-[60vh] sm:max-h-[65vh]">
                      {articles.map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg gap-3 min-w-0">
                          <div className="flex-1 basis-0 min-w-0 overflow-hidden text-wrap sm:max-w-[100%] max-w-[300px]">
                            <p className="text-white font-medium truncate">{a.nombre}</p>
                            <p className="text-gray-300 text-xs sm:text-sm break-words">
                              Código: <span className="break-all">{a.codigo}</span> • Precio: {money(a.precio)} • Dist: {money(a.distribuidor)} •
                              Unidad: {a.unidad} • Fecha: {a.fecha} • Estatus: {a.estatus ?? "-"} • Inv. Máx: {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}
                            </p>
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

              {/* Preview */}
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0 max-w-[100%]">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Eye className="w-5 h-5 text-purple-300" />Vista Previa
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Dimensiones fijas: {template.width}mm × {template.height}mm</p>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden max-w-[100%]">
                  <div className="bg-gray-900/60 rounded-lg p-4 sm:p-8 flex-1 flex relative">
                    {articles.length === 0 ? (
                      <div className="m-auto text-center text-gray-400">
                        <p>Agrega artículos para ver la vista previa</p>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center items-center overflow-auto">
                        <div
                          className="bg-white rounded-md shadow-lg border-2 border-gray-300 text-black"
                          style={{
                            width: "100%",
                            maxWidth: naturalW,
                            height: "auto",
                            aspectRatio: `${naturalW} / ${naturalH}`,
                            padding: 6,
                            overflow: "hidden",
                          }}
                        >
                          {/* SVGs .jsb se renderizan con JsBarcode en useEffect */}
                          {template.preview(articles[0])}
                        </div>
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

// ====== NumberField (simple) ======
function NumberField({
  value, onChange, min = 0, max = Number.MAX_SAFE_INTEGER, step = 1, id, className = "", inputClassName = "", ariaLabel,
}: {
  value: string | number; onChange: (val: string) => void; min?: number; max?: number; step?: number; id?: string; className?: string; inputClassName?: string; ariaLabel?: string
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const parseVal = (v: string | number) => (typeof v === "number" ? v : parseFloat(v || "0")) || 0
  const bump = (d: 1 | -1) => onChange(String(clamp(parseVal(value) + d * step)))
  return (
    <div className={`flex items-stretch overflow-hidden rounded-md border border-gray-500 bg-gray-700 ${className}`}>
      <Button type="button" variant="ghost" className="px-3 border-r border-gray-600 rounded-none text-white hover:bg-gray-600" aria-label="disminuir" onClick={() => bump(-1)}>
        <Minus className="w-4 h-4" />
      </Button>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`no-spin bg-gray-700 border-0 text-white text-center focus-visible:ring-0 ${inputClassName}`}
        min={min} max={max} step={step} aria-label={ariaLabel}
      />
      <Button type="button" variant="ghost" className="px-3 border-l border-gray-600 rounded-none text-white hover:bg-gray-600" aria-label="aumentar" onClick={() => bump(1)}>
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  )
}
