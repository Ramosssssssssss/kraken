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
import pLimit from "p-limit"
import Noty from "noty"
import "noty/lib/noty.css"
import "noty/lib/themes/mint.css"


// ===== Types & utils =====
type ArticleItem = {
  id: string
  codigo: string
  nombre: string
  precio: number
  distribuidor: number
  unidad: string
  fecha: string
  estatus: string | null
  inventarioMaximo: number
  quantity: number
}


const SCS = [
  { id: "19", nombre: "TOTOLCINGO" },
  { id: "9603355", nombre: "VIA MORELOS" },
  { id: "7506737", nombre: "TEPEXPAN" },
  { id: "9604500", nombre: "VALLEJO" },
  { id: "94274615", nombre: "TEXCOCO" },
  { id: "188104", nombre: "CEDIS" },
]


const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78))
const money = (n: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(Number.isFinite(n) ? n : 0)
const todayMX = () => new Date().toLocaleDateString("es-MX", { timeZone: "America/Mexico_City", year: "numeric", month: "2-digit", day: "2-digit" })


// ===== JsBarcode support =====
declare global { interface Window { JsBarcode?: any } }


async function ensureJsBarcodeLoaded(): Promise<void> {
  if (typeof window === "undefined") return
  if (window.JsBarcode) return
  await new Promise<void>((resolve, reject) => {
    const existing = document.getElementById("jsbarcode-cdn") as HTMLScriptElement | null
    if (existing && (window as any).JsBarcode) return resolve()
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
    } catch { }
  }
}

// =============== PLANTILLAS ESTÁTICAS (incluye tu diseño original) ===============
// Cada plantilla define: id, nombre, tamaño fijo, CSS y HTML de impresión, y vista previa.
const LABEL_TEMPLATES = [
  {
    id: "original-69x25",
    name: "Estandar (69.8×25.4 )",
    width: 69.8,
    height: 25.4,
    css: (w: number, h: number, pad: number) => `
      @page{size:${w}mm ${h}mm;margin:0}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
      .p:last-child{page-break-after:auto}
      .l{width:${w}mm;height:${h}mm;padding:${pad}mm;display:flex}
      .g{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));gap:3px 8px;font-size:11px;line-height:1.05; font-weight:bold;}
      .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:12px;line-height:1.2;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center}
      .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:3/2/4/4;text-align:right}
      .pm{grid-area:4/2/6/4;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:35px}
      .pl{grid-area:6/2/7/4;text-align:right;font-weight:600}.b{font-weight:600}
    `,
    renderHTML: (a: ArticleItem) => `
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
    preview: (a: ArticleItem) => (
      <div className="w-full h-full grid bg-[#d2c600]" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "3px 8px", fontSize: 12, lineHeight: 1.05 }}>
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
  },
  {
    id: "25x25",
    name: "Pequeñas (25×25 mm)",
    width: 25,
    height: 25,
    css: (w: number, h: number) => `
      @page{size:${w}mm ${h}mm;margin:0}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
      .p:last-child{page-break-after:auto}
      .l{width:${w}mm;height:${h}mm;display:flex; flex: 1;}

      .g{width:${w}mm;height:${h}mm;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6, 0fr));
      gap:1px;font-size:8px;font-weight: bold; padding:1mm;}

      .desc{grid-area: 1/1/2/4;
  font-weight: bold;
  text-align: left;
  font-size: 8px;
  display:flex;
  margin-top:1.5mm;
  justify-content:center;
  line-height: 1.05;
  text-overflow: ellipsis;       
  white-space: no-wrap;         
  word-break: keep-all;              
 
 
      }

      .im{grid-area: 4 / 1 / 5 / 2;}.es{grid-area: 5 / 3 / 6 / 4;}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:4 / 3 / 5 / 4;text-align:right}
      
      .pm{ grid-area: 2 / 1 /3 / 4;display:flex;align-items:center;justify-content:flex-end;font-weight:bold;font-size:15px}

      .pl{grid-area:6/2/7/4;text-align:right;}
      .b{font-weight:bold font-size: 7px;}
    `,
    renderHTML: (a: ArticleItem) => `
      <div class="p"><div class="l"><div class="g">
        <div class="desc">${escapeHTML(a.nombre)}</div>
        <div class="im"><span class="b">G - ${Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
        <div class="es"><span class="b">${escapeHTML(a.estatus ?? "-")}</span></div>
        <div class="un"><span class="b">${escapeHTML(a.unidad)}</span></div>
        <div class="co"><span class="b">${escapeHTML(a.codigo)}</span></div>
        <div class="fe"><span class="b">${escapeHTML(a.fecha)}</span></div>
        <div class="pm">${escapeHTML(money(a.precio))}</div>
        <div class="pl">Dis: ${escapeHTML(money(a.distribuidor))}</div>
      </div></div></div>`,
    preview: (a: ArticleItem) => (
      <div className="w-full h-full grid bg-[#d2c600]" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "3px 8px", lineHeight: 1.05 }}>
        <div className="col-[1/4] row-[1/3] font-bold flex items-center text-[5px]">{a.nombre}</div>
        <div className="col-[1/2] row-[3/4]"><span className="font-semibold text-[5px]">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
        <div className="col-[1/2] row-[4/5]"><span className="font-semibold text-[5px]">{a.estatus ?? "-"}</span></div>
        <div className="col-[1/2] row-[5/6]"><span className="font-semibold text-[5px]">{a.unidad}</span></div>
        <div className="col-[1/2] row-[6/7]"><span className="font-semibold text-[5px]">{a.codigo}</span></div>
        <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold text-[5px]">{a.fecha}</span></div>
        <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[15px]">{money(a.precio)}</div>
        <div className="col-[2/4] row-[6/7] text-right font-semibold text-[6px]">Distribuidor: {money(a.distribuidor)}</div>
      </div>
    )
  },
  {
    id: "cola-raton",
    name: "Cola de ratón (60×25.4 mm)",
    width: 60,
    height: 25.4,
    css: (w: number, h: number) => `
    @page{size:${w}mm ${h}mm; margin: 0; padding: 0;}

    html,body{}
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family: "Arial";-webkit-print-color-adjust:exact;print-color-adjust:exact}

    .p{
      width:${w}mm;height:${h}mm;
      padding-top:1mm;
      page-break-after:always;
      display:grid;
      grid-template-columns:repeat(2,1fr);
      grid-template-rows:repeat(2,1fr);
      font-size:8px;
      align-items:stretch;justify-items:stretch;
    }
    .p:last-child{page-break-after:auto}

    /* Q1 arriba derecha; Q3 abajo derecha (ajusta si lo quieres en otra celda) */
    .q1{
      grid-area:1 / 2 / 2 / 3;
      width:30mm;height:10.7mm;
    }
    
    /* Área del código de barras */
    .q3{
      grid-area:2 / 2 / 3 / 3;
      margin:0 auto;
      width:26mm;
      height:10.7; 
      margin-top:2mm;                /* <- más alto que antes */
      display:flex;
      align-items:center;
      justify-content:center;
      overflow:hidden;

    }

    /* Contenedor fill */
    .bc-fit{
      width:100%;
      height:100%;
      display:flex;
      align-items:center;
      justify-content:center;
    }
.desc{

text-align:left;
grid-area:1/1/3/4; 
font-size:7px;
margin-top:0mm; 
}
    /* SVG ocupa todo el contenedor */
    .bc{
      display:flex;
      width:100%;
      height:100%;
    

    }
  `,
    renderHTML: (a: ArticleItem) => `
    <div class="p">
      <div class="q1" style="display:grid;grid-template-columns:repeat(3,1fr);padding: 1mm; gap:.5mm;">
        <div class="desc">${escapeHTML(a.nombre)}</div>

        <div style="font-weight:bold;text-align:left;font-size:6px;grid-area:3/1/4/2; margin:0; padding:0; letter-spacing.5px;">${escapeHTML(a.codigo)}</div>

        <div style="font-weight:700;text-align:left;font-size:6px;grid-area:4/1/5/2; margin:0; padding:0;">${escapeHTML(a.unidad)}</div>

        <div style="font-weight:800;text-align:left;font-size:6px;grid-area:5/1/6/2; margin:0; padding:0;">${escapeHTML(a.estatus ?? "-")}</div>

        <div style="font-weight:700;text-align:right;font-size:6px;grid-area:3/2/4/4; margin:0; padding:0;">${escapeHTML(a.fecha)}</div>
        <div style="font-weight:800;text-align:center;grid-area:4/2/5/4; margin:0; padding:0;">${escapeHTML(money(a.precio))}</div>
        <div style="font-weight:800;text-align:right;font-size:6px;grid-area:5/2/6/4; margin:0; padding:0;"> Distr: ${escapeHTML(money(a.distribuidor))}</div>
      </div>

       <div class="q3">
        <div class="bc-fit">
          <svg class="bc jsb" data-code="${escapeHTML(a.codigo)}" style="width:100%; height:100%;"></svg>
        </div>
      </div>
    </div>`,
    preview: (a: ArticleItem) => (
      <div className="w-full h-full grid grid-cols-2 grid-rows-2 text-[8px]">
        <div className="flex flex-col items-center justify-center q1">
          <div className="font-bold text-left truncate w-full">{a.nombre}</div>
          <div className="text-left">{a.codigo}</div>
          <div className="text-left">{a.unidad}</div>
          <div className="text-left">{a.estatus ?? "-"}</div>
          <div className="text-right">{a.fecha}</div>
          <div className="font-extrabold text-center">{money(a.precio)}</div>
          <div className="text-right">{money(a.distribuidor)}</div>
        </div>
        <div></div>
        <div className="flex items-center justify-center q3">
          <div className="bc-fit w-full h-full flex items-center justify-center">
            {/* SVG vacío que JsBarcode llenará en preview */}
            <svg className="bc jsb" data-code={a.codigo} />
          </div>
        </div>
        <div></div>
      </div>
    )
  },
  {
    id: "blanca-40x22",
    name: "Etiqueta blanca (40×22.7 )",
    width: 39.9,
    height: 23.8,
    css: (w: number, h: number, pad: number) => `
      @page{size:${w}mm ${h}mm;margin:0}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
      .p:last-child{page-break-after:auto}
      .l{width:${w}mm;height:${h}mm;display:flex}
      .g{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));font-size:7px; gap:3px 8px;
      line-height:1.07; padding: 2mm;}

      .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:8px;line-height:1.03;white-space:normal;overflow-wrap:break-word;display:flex;align-items:center;}

      .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:3/2/4/4;text-align:right}

      .pm{grid-area:4/2/6/4;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:20px}
      .pl{grid-area:6/2/7/4;text-align:right;font-weight:600}.b{font-weight:600}
    `,
    renderHTML: (a: ArticleItem) => `
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
    preview: (a: ArticleItem) => (
      <div className="w-full h-full grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "1px", fontSize: 7, lineHeight: 1.07 }}>
        <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
        <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
        <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
        <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>
        <div className="col-[1/2] row-[6/7]"><span className="font-semibold">{a.codigo}</span></div>
        <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>
        <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[25px]">{money(a.precio)}</div>
        <div className="col-[2/4] row-[6/7] text-right font-semibold">Dist: {money(a.distribuidor)}</div>
      </div>
    )
  },
  {
    id: "Chica-50x25",
    name: "Chica Totolcingo (50×25.4 )",
    width: 49,
    height: 25.4,
    css: (w: number, h: number, pad: number) => `
      @page{size:${w}mm ${h}mm;margin:0}
      *{box-sizing:border-box;margin:0;padding:0}
      body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
      .p{width:${w}mm;height:${h}mm;page-break-after:always;display:flex;align-items:center;justify-content:center}
      .p:last-child{page-break-after:auto}
      .l{width:${w}mm;height:${h}mm;padding:${pad}mm;display:flex}

      .g{width:100%;height:100%;display:grid;grid-template-columns:repeat(3,1fr);grid-template-rows:repeat(6,minmax(0,auto));gap:1px;font-size:9px;line-height:1.05; padding:1mm;}

      .desc{grid-area:1/1/3/4;font-weight:700;text-align:left;font-size:9px;line-height:1;white-space:normal;overflow-wrap:break-word;display:flex;align-items:start}

      .im{grid-area:3/1/4/2}.es{grid-area:4/1/5/2}.un{grid-area:5/1/6/2}.co{grid-area:6/1/7/2}.fe{grid-area:3/2/4/4;text-align:right}

      .pm{grid-area:4/2/6/4;display:flex;align-items:center;justify-content:flex-end;font-weight:700;font-size:25px}

      .pl{grid-area:6/2/7/4;text-align:right;font-weight:600}.b{font-weight:600}
    `,
    renderHTML: (a: ArticleItem) => `
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
    preview: (a: ArticleItem) => (
      <div className="w-full h-full grid bg-[#d2c600]" style={{ gridTemplateColumns: "repeat(3, 1fr)", gridTemplateRows: "repeat(6, minmax(0, auto))", gap: "1px", fontSize: 9, lineHeight: 1.05 }}>
        <div className="col-[1/4] row-[1/3] font-bold flex items-center">{a.nombre}</div>
        <div className="col-[1/2] row-[3/4]"><span className="font-semibold">G - {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}</span></div>
        <div className="col-[1/2] row-[4/5]"><span className="font-semibold">{a.estatus ?? "-"}</span></div>
        <div className="col-[1/2] row-[5/6]"><span className="font-semibold">{a.unidad}</span></div>
        <div className="col-[1/2] row-[6/7]"><span className="font-semibold">{a.codigo}</span></div>
        <div className="col-[2/4] row-[3/4] text-right"><span className="font-semibold">{a.fecha}</span></div>
        <div className="col-[2/4] row-[4/6] flex items-center justify-end font-extrabold text-[25px]">{money(a.precio)}</div>
        <div className="col-[2/4] row-[6/7] text-right font-semibold">Distribuidor: {money(a.distribuidor)}</div>
      </div>
    )
  },

] as const

type Template = typeof LABEL_TEMPLATES[number]

function escapeHTML(s: string) { return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string)) }

export default function LabelGenerator() {
  // Sucursal con persistencia simple
  const [sucursalId, setSucursalId] = useState<string>("")
  useEffect(() => setSucursalId(localStorage.getItem("almacenId") || ""), [])
  useEffect(() => { if (sucursalId) localStorage.setItem("almacenId", sucursalId) }, [sucursalId])
  const sucursalActual = useMemo(() => SCS.find((s) => s.id === sucursalId) || null, [sucursalId])

  // Plantilla seleccionada (por defecto la primera)
  const [tplId, setTplId] = useState<Template["id"]>(LABEL_TEMPLATES?.[0]?.id ?? "original-69x25")
  const template = useMemo(
    () => LABEL_TEMPLATES.find(t => t.id === tplId) || LABEL_TEMPLATES[0],
    [tplId]
  )

  // Artículos y captura
  const [articles, setArticles] = useState<ArticleItem[]>([])
  const [quantity, setQuantity] = useState("1")
  const [codigo, setCodigo] = useState("")
  const [loadingAdd, setLoadingAdd] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const resetArticles = () => {
    if (articles.length === 0) return
    setArticles([])
    new Noty({
      type: "success",
      layout: "topRight",
      theme: "mint",
      text: "Se eliminaron todos los artículos",
      timeout: 2500,
      progressBar: true,
    }).show()
  }

  const upsert = (item: ArticleItem) => setArticles((prev) => {
    const i = prev.findIndex((a) => a.codigo === item.codigo)
    if (i !== -1) {
      const next = [...prev]
      next[i] = { ...next[i], quantity: next[i].quantity + item.quantity }
      return next
    }
    return [...prev, item]
  })

  const addByCodigo = async (cod: string, qtyOverride?: number) => {
    const clean = (cod || "").trim(); if (!clean || !sucursalId) return
    const qty = Number.isFinite(qtyOverride as number) && (qtyOverride as number) > 0
      ? (qtyOverride as number)
      : Math.max(1, parseInt(quantity || "1", 10))
    setLoadingAdd(true); setAddError(null)
    try {
      const r = await fetch(`/api/etiquetasPiso?codigo=${encodeURIComponent(clean)}&almacen=${encodeURIComponent(sucursalId)}`, { headers: { Accept: "application/json" } })
      const j = await r.json(); if (!r.ok || !j?.ok) throw new Error(j?.error || "No se pudo obtener el artículo.")
      const row = Array.isArray(j.data) ? j.data[0] : null; if (!row) throw new Error("Sin resultados para ese código en el almacén seleccionado.")
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

  const removeArticle = (id: string) => setArticles((p) => p.filter((a) => a.id !== id))
  const totalLabels = useMemo(() => articles.reduce((s, a) => s + a.quantity, 0), [articles])

  // ====== Importación Excel mínima ======
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement | null>(null)

  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([["CODIGO", "CANTIDAD"], ["12500", 2], ["12501", 1]])
      // @ts-ignore
      ; (ws as any)["!cols"] = [{ wch: 12 }, { wch: 10 }]
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
      const limit = pLimit(4)
      let done = 0; const errors: string[] = []
      await Promise.all(valid.map((r) => limit(async () => {
        try { await addByCodigo(r.codigo, r.qty) }
        catch (e: any) { errors.push(`Fila ${r.i + 2} (CODIGO=${r.codigo}): ${e?.message || "Error"}`) }
        finally { done++; setImportProgress({ done, total }) }
      })))
      setImportErrors(errors)
    } catch (e: any) {
      setImportErrors([e?.message || "No se pudo leer el archivo"])
    } finally { setImporting(false) }
  }
  const exportArticlesExcel = async () => {
    if (articles.length === 0) {
      new Noty({
        type: "warning",
        layout: "topRight",
        theme: "mint",
        text: "No hay artículos para exportar.",
        timeout: 2000,
      }).show()
      return
    }

    // Construir datos [ [CODIGO, CANTIDAD], ... ]
    const data = [
      ["CODIGO", "CANTIDAD"],
      ...articles.map(a => [a.codigo, a.quantity]),
    ]

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(data)
    // Ancho de columnas
    // @ts-ignore
    ws["!cols"] = [{ wch: 16 }, { wch: 10 }]
    XLSX.utils.book_append_sheet(wb, ws, "Articulos")

    // Nombre de archivo
    const suc = (sucursalActual?.nombre || "sucursal").replace(/[^\w\-]+/g, "_")
    const fecha = new Date().toISOString().slice(0, 10)
    const filename = `articulos_codigos_${suc}_${fecha}.xlsx`

    try {
      // Intentar compartir (Web Share API con archivos)
      const ab = XLSX.write(wb, { bookType: "xlsx", type: "array" })
      const blob = new Blob([ab], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
      const file = new File([blob], filename, { type: blob.type })

      // @ts-ignore
      if (navigator?.canShare && navigator.canShare({ files: [file] })) {
        // @ts-ignore
        await navigator.share({
          files: [file],
          title: "Artículos (CODIGO, CANTIDAD)",
          text: `Exportado ${articles.length} artículo(s) desde ${suc}.`
        })
        new Noty({
          type: "success",
          layout: "topRight",
          theme: "mint",
          text: "Archivo compartido correctamente.",
          timeout: 2000,
        }).show()
      } else {
        // Fallback: descarga directa
        XLSX.writeFile(wb, filename)
        new Noty({
          type: "success",
          layout: "topRight",
          theme: "mint",
          text: "Excel descargado.",
          timeout: 2000,
        }).show()
      }
    } catch (err: any) {
      // Si el usuario cancela compartir, no mostramos error ruidoso; si es otro error, hacemos fallback a descarga
      if (err?.name !== "AbortError") {
        try {
          XLSX.writeFile(wb, filename)
          new Noty({
            type: "success",
            layout: "topRight",
            theme: "mint",
            text: "Excel descargado.",
            timeout: 2000,
          }).show()
        } catch (e) {
          new Noty({
            type: "error",
            layout: "topRight",
            theme: "mint",
            text: "No se pudo exportar el Excel.",
            timeout: 2500,
          }).show()
        }
      }
    }
  }

  // ====== Print (usa la plantilla seleccionada) ======
  const handlePrint = () => {
    if (!articles.length) return

    const w = template.width
    const h = template.height
    const pad = template.id === "original-69x25" ? 3 : 0

    // 1) Generar todo el HTML de etiquetas SIN comas
    const labelsHTML = articles
      .flatMap(a => Array.from({ length: a.quantity }, () => template.renderHTML(a)))
      .join("")

    // 2) Documento de impresión
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Etiquetas</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&display=swap" rel="stylesheet">

  <!-- CSS de la plantilla -->
  <style>
    ${template.css(w, h, pad)}
    @media print {
      .p{ break-after: page; }
      .p:last-of-type{ break-after: auto; }
      *{
        font-family: "DM Sans", sans-serif;
        font-weight: 700;
        font-style: normal;
      }
    }
  </style>

  <!-- JsBarcode -->
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

  <script>
    window.addEventListener('load', function () {
      try {
        document.querySelectorAll('.jsb').forEach(function (el) {
          var code = el.getAttribute('data-code') || '';
          var box = el.closest('.bc-fit') || el.closest('.q3');
          var hPx = 80;
          if (box) {
            var rect = box.getBoundingClientRect();
            hPx = Math.max(20, Math.round(rect.height));
          }
          JsBarcode(el, code, { format: 'CODE128', displayValue: false, margin: 0, height: hPx });
          el.removeAttribute('width');
          el.removeAttribute('height');
          el.style.width = '100%';
          el.style.height = '100%';
        });
      } catch (e) {}
      setTimeout(function () { window.print(); }, 0);
    });
  </script>
</head>
<body>
  ${labelsHTML}
</body>
</html>`

    // 3) Abrir en iframe invisible y lanzar impresión
    const f = document.createElement("iframe")
    Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" })
    document.body.appendChild(f)

    const d = (f.contentDocument || (f as any).ownerDocument) as Document
    d.open()
    d.write(html)
    d.close()

    const cleanup = () => { try { document.body.removeChild(f) } catch { } }
    setTimeout(cleanup, 10000)
      ; (f.contentWindow as any)?.addEventListener?.("afterprint", cleanup)
  }

  const naturalW = mmToPx(template.width), naturalH = mmToPx(template.height)

  // Renderizar códigos de barras en la vista previa cuando cambian artículos/plantilla
  useEffect(() => {
    (async () => {
      try {
        await ensureJsBarcodeLoaded()
        renderAllBarcodes()
      } catch { }
    })()
  }, [articles, tplId])

  // ===== Modal: Buscar por ubicación =====
  const [ubicModalOpen, setUbicModalOpen] = useState(false)
  const [ubicTab, setUbicTab] = useState<"manual" | "cam">("manual")
  const [ubicacion, setUbicacion] = useState("")
  const [buscandoUbic, setBuscandoUbic] = useState(false)
  const [ubicErr, setUbicErr] = useState<string | null>(null)

  // Cámara / escáner
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const detectorRef = useRef<any>(null) // BarcodeDetector si está disponible

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const startCamera = async () => {
    setUbicErr(null)
    try {
      stopCamera()
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false })
      streamRef.current = s
      if (!videoRef.current) return
      videoRef.current.srcObject = s
      await videoRef.current.play()

      // Detector nativo si existe
      // @ts-ignore
      if ("BarcodeDetector" in window) {
        // @ts-ignore
        detectorRef.current = new window.BarcodeDetector({
          formats: ["code_128", "code_39", "ean_13", "ean_8", "upc_a", "upc_e", "qr_code"]
        })
      } else {
        detectorRef.current = null
        new Noty({
          type: "warning",
          layout: "topRight",
          theme: "mint",
          text: "Este navegador no soporta BarcodeDetector. Puedes escribir el código manualmente.",
          timeout: 3000
        }).show()
      }

      const tick = async () => {
        if (!videoRef.current) return
        if (detectorRef.current) {
          try {
            const codes = await detectorRef.current.detect(videoRef.current)
            if (codes && codes.length) {
              const val = (codes[0].rawValue || "").trim()
              if (val) {
                setUbicacion(val)
                try { navigator.vibrate?.(100) } catch { }
                stopCamera()
                setUbicTab("manual")
                new Noty({
                  type: "success",
                  layout: "topRight",
                  theme: "mint",
                  text: `Ubicación detectada: ${val}`,
                  timeout: 2000
                }).show()
                return
              }
            }
          } catch { }
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (e: any) {
      setUbicErr(e?.message || "No se pudo acceder a la cámara")
    }
  }

  useEffect(() => { return () => stopCamera() }, [])

  const buscarPorUbicacion = async () => {
    const u = (ubicacion || "").trim()
    if (!u) { setUbicErr("Ingresa una ubicación válida"); return }
    if (!sucursalId) { setUbicErr("Selecciona una sucursal primero"); return }

    setBuscandoUbic(true); setUbicErr(null)
    try {
      // 👉 Ajusta este endpoint a tu backend real
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

      new Noty({
        type: "success", layout: "topRight", theme: "mint",
        text: `Se agregaron ${added} artículos de la ubicación ${u}.`, timeout: 2500
      }).show()
      setUbicModalOpen(false)
      setUbicacion("")
    } catch (e: any) {
      setUbicErr(e?.message || "Error al buscar por ubicación")
    } finally {
      setBuscandoUbic(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <style jsx global>{`
        input.no-spin::-webkit-outer-spin-button, input.no-spin::-webkit-inner-spin-button { -webkit-appearance:none; margin:0 }
        input.no-spin { -moz-appearance:textfield }
      `}</style>

      {/* Dialog sucursal */}
      <Dialog open={!sucursalId}>
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-md">
          <DialogHeader><DialogTitle>Selecciona una sucursal</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Label className="text-gray-300">Sucursal / Almacén</Label>
            <Select value={sucursalId} onValueChange={setSucursalId}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue placeholder="Elige una sucursal" /></SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                {SCS.map((s) => (<SelectItem className="text-white" key={s.id} value={s.id}>{s.nombre}</SelectItem>))}
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
        <DialogContent className="bg-gray-900 text-white border-gray-700 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="w-4 h-4" /> Buscar por ubicación
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            {/* Tabs simples */}
            <div className="flex gap-2">
              <Button
                variant={ubicTab === "manual" ? "default" : "outline"}
                className={ubicTab === "manual" ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700"}
                onClick={() => { setUbicTab("manual"); stopCamera() }}
              >
                <Keyboard className="w-4 h-4 mr-2" /> Manual
              </Button>
              <Button
                variant={ubicTab === "cam" ? "default" : "outline"}
                className={ubicTab === "cam" ? "bg-purple-600 hover:bg-purple-700" : "border-gray-700"}
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
                  placeholder="Ej. A-12-03"
                  className="bg-gray-800 border-gray-700 text-white"
                  onKeyDown={(e) => { if (e.key === "Enter") buscarPorUbicacion() }}
                />
                {ubicErr && (
                  <div className="px-3 py-2 text-sm text-red-300 flex items-center gap-2 bg-red-900/20 rounded">
                    <AlertCircle className="w-4 h-4" />{ubicErr}
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" className="border-gray-700" onClick={() => { setUbicModalOpen(false); stopCamera() }}>Cancelar</Button>
                  <Button className="bg-purple-600 hover:bg-purple-700" onClick={buscarPorUbicacion} disabled={buscandoUbic}>
                    {buscandoUbic ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buscar"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 p-4 sm:p-6">
                {/* Contenedor de video: vertical en móvil, 16:9 en desktop */}
                <div className="relative aspect-[3/4] md:aspect-video w-full rounded-md overflow-hidden border border-gray-700 bg-black">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-contain"
                    muted
                    playsInline
                  />
                  {!streamRef.current && (
                    <div className="absolute inset-0 grid place-items-center text-gray-300 text-sm sm:text-base px-4 text-center">
                      <div>
                        <p>Activa la cámara para escanear el anaquel / código de ubicación.</p>
                        <p className="opacity-80 mt-2">Al detectar un código válido, lo copiaré arriba.</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Controles cámara: columna en móvil, fila en pantallas más grandes */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                  <Button
                    onClick={startCamera}
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto h-11"
                  >
                    Iniciar cámara
                  </Button>
                  <Button
                    variant="outline"
                    className="border-gray-700 w-full sm:w-auto h-11"
                    onClick={stopCamera}
                  >
                    Detener
                  </Button>
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

                {/* Acciones finales: columna (con botón principal al final) en móvil */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                  <Button
                    variant="outline"
                    className="border-gray-700 w-full sm:w-auto h-11"
                    onClick={() => {
                      setUbicModalOpen(false);
                      stopCamera();
                    }}
                  >
                    Cerrar
                  </Button>

                  <Button
                    className="bg-purple-600 hover:bg-purple-700 w-full sm:w-auto h-11"
                    onClick={buscarPorUbicacion}
                    disabled={!ubicacion || buscandoUbic}
                  >
                    {buscandoUbic ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Buscar con ubicación detectada"
                    )}
                  </Button>
                </div>
              </div>

            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-gray-200 text-lg">
              Sucursal actual:{" "}
              <span className="font-semibold text-purple-200">{sucursalActual ? sucursalActual.nombre : "—"}</span>
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-stretch min-h-0">
            {/* Izquierda */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm h-full flex flex-col w-full">
              <CardHeader className="border-b border-gray-600 flex w-full justify-between">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-purple-300" />Configuración
                </CardTitle>
                <CardTitle className="flex items-center gap-2 text-white font-light text-xs">v2.3.0</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Selector de plantilla */}
                <div className="grid sm:grid-cols-2 gap-4 items-end">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4" />Tipo de etiqueta
                    </Label>
                    <Select value={tplId} onValueChange={setTplId} >
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
                        className="bg-gray-700 border-gray-500 text-white placeholder-gray-300 flex-1"
                        disabled={!sucursalId}
                      />
                      <div className="w-36">
                        <NumberField value={quantity} onChange={setQuantity} min={1} step={1} ariaLabel="Número de impresiones" />
                      </div>
                      <Button
                        onClick={() => {
                          if (codigo.trim() && sucursalId) {
                            addByCodigo(codigo.trim(), Math.max(1, parseInt(quantity || "1", 10)))
                          }
                        }}
                        className="bg-purple-600 hover:bg-purple-700 text-white border-0"
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


                  {/* Input oculto para subir Excel/CSV */}
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
                    onClick={handlePrint}
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
            <div className="flex flex-col gap-6 h-full min-h-0">
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap min-w-0">
                    <CardTitle className="text-white truncate">Artículos ({articles.length})</CardTitle>

                    {/* Controles: columna en móvil */}
                    <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto min-w-0">
                      <Button
                        type="button"
                        className="bg-gray-700 hover:bg-gray-600 text-white border-0 w-full sm:w-auto"
                        disabled={articles.length === 0}
                        onClick={exportArticlesExcel}
                        title="Exportar artículos cargados (CODIGO, CANTIDAD) para compartir"
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

                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 max-w-full overflow-hidden">
                  {articles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No hay artículos agregados</p>
                      <p className="text-sm">Escribe un código y presiona Enter o el botón +</p>
                    </div>
                  ) : (
                    <div className="space-y-2 flex-1 overflow-y-auto">
                      {articles.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg gap-3 min-w-0"  // 👈 min-w-0 en la fila
                        >
                          {/* Columna izquierda: puede encogerse y envolver */}
                          <div className="flex-1 basis-0 min-w-0 overflow-hidden">  {/* 👈 basis-0 + min-w-0 */}
                            <p className="text-white font-medium truncate">{a.nombre}</p>

                            <p className="text-gray-300 text-xs sm:text-sm break-words"> {/* 👈 wrap por defecto */}
                              Código: <span className="break-all">{a.codigo}</span> • Precio: <span className="break-words">{money(a.precio)}</span> •
                              Dist: <span className="break-words">{money(a.distribuidor)}</span> •
                              Unidad: <span className="break-words">{a.unidad}</span> •
                              Fecha: <span className="break-words">{a.fecha}</span> •
                              Estatus: <span className="break-words">{a.estatus ?? "-"}</span> •
                              Inv. Máx: <span className="break-words">
                                {Number.isFinite(a.inventarioMaximo) ? a.inventarioMaximo : 0}
                              </span>
                            </p>
                          </div>

                          {/* Columna derecha: no se encoge, pero no desborda */}
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-purple-300 font-medium">{a.quantity}x</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeArticle(a.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                  )}
                </CardContent>
              </Card>

              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Eye className="w-5 h-5 text-purple-300" />Vista Previa
                  </CardTitle>
                  <p className="text-gray-300 text-sm">Dimensiones fijas: {template.width}mm × {template.height}mm</p>
                </CardHeader>

                <CardContent className="p-4 sm:p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
                  <div className="bg-gray-900/60 rounded-lg p-4 sm:p-8 flex-1 flex relative">
                    {articles.length === 0 ? (
                      <div className="m-auto text-center text-gray-400">
                        <p>Agrega artículos para ver la vista previa</p>
                      </div>
                    ) : (
                      // En móvil permitimos scroll horizontal si el naturalW supera el viewport
                      <div className="w-full flex justify-center items-center">
                        <div
                          className="bg-white rounded-md shadow-lg border-2 border-gray-300 text-black"
                          style={{
                            width: "100%",              // ocupa el ancho disponible
                            maxWidth: naturalW,         // nunca más grande que su tamaño real
                            height: "auto",             // se ajusta proporcionalmente
                            aspectRatio: `${naturalW} / ${naturalH}`, // mantiene proporción
                            padding: 6,
                            overflow: "hidden",
                          }}
                        >
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

// ====== NumberField ======
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