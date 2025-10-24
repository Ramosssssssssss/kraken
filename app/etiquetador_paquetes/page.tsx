// app/etiquetador_paquetes/page.tsx
"use client"
import Link from "next/link"
import React, { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Eye, Settings, Printer, Plus, Trash2, Minus, Loader2, AlertCircle, Upload, ArrowLeft, RotateCcw } from "lucide-react"
import * as XLSX from "xlsx"
import pLimit from "p-limit"
// si TypeScript se queja por tipos, ver nota de TS más abajo
import Noty from "noty";
import "noty/lib/noty.css";
import "noty/lib/themes/mint.css";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"


// Select UI
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// ====== Types & consts ======
type TipoApi = "factura" | "traspaso" | "puntoVenta"
type TipoEtiqueta = "Factura" | "Traspaso" | "Ruta"

const TIPO_API_TO_UI: Record<TipoApi, { label: TipoEtiqueta; badgeClass: string }> = {
    factura: { label: "Factura", badgeClass: "bg-emerald-500/15 border border-emerald-500/40 text-emerald-300" },
    traspaso: { label: "Traspaso", badgeClass: "bg-sky-500/15 border border-sky-500/40 text-sky-300" },
    puntoVenta: { label: "Ruta", badgeClass: "bg-amber-500/15 border border-amber-500/40 text-amber-300" },
}

type PaqItem = {
    id: string
    folio: string
    cliente: string
    direccion: string
    colonia: string
    ciudad: string
    cp: string
    peso: number
    fecha: string
    quantity: number
    sucursal: string
    // NUEVO: tipo detectado y plantilla asignada
    tipo: TipoEtiqueta
    tipoClass: string
    templateId: Template["id"]
}

type Template = {
    id: string
    name: string
    width: number
    height: number
    css: (w: number, h: number) => string
    renderHTML: (a: PaqItem, partIndex?: number, partTotal?: number) => string
    preview: (a: PaqItem, partIndex?: number, partTotal?: number) => React.ReactNode
}

const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78))
const todayMX = () =>
    new Date().toLocaleDateString("es-MX", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    })

// ====== Soporte de JsBarcode (preview + impresión) ======
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
            window.JsBarcode(el, code, {
                format: "CODE128",
                displayValue: false,
                height: 30,
                margin: 0,
            })
        } catch { /* noop */ }
    }
}

function escapeHTML(s: string) {
    return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))
}

// =============== PLANTILLAS ===============
const baseTemplate: Template = {
    id: "etiqueta_facturas",
    name: "Factura",
    width: 101,
    height: 101,
    css: (w: number, h: number) => `
     @page{size:${w}mm ${h}mm;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .p{
    width:${w}mm;height:${h}mm;
    display:block;
    page-break-after:always; break-after:page;
    page-break-inside:avoid; break-inside:avoid;
  }
  .p:last-child{page-break-after:auto}

  .l{width:${w}mm;height:${h}mm;padding:2mm;display:flex}
  .g{
    width:100%;height:100%;
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    /* Alturas medibles para evitar “auto” expansivo */
    grid-template-rows:
      14mm   /* cabecera */
      14mm    /* cliente */
      14mm   /* direccion (se expande lo necesario) */
      14mm    /* info/peso + badge */
      30mm;  /* barcode/zona folio */
    gap:2px 6px;
    font-size: 4mm;     /* ~9–10pt, mucho más razonable que 20px */
    line-height: 1.15;
    position:relative;
    align-content:start;  /* evita centrado vertical implícito */
  }

  /* ===== Cabecera ===== */
  .cabecera{
    grid-area:1 / 1 / 2 / 4;
    display:flex; align-items:center; justify-content:space-between; gap:4mm;
    border-bottom:1px dashed #000; padding-bottom:1mm;
  }
  .cabecera img{ height:10mm; max-width:48%; object-fit:contain; display:block; }
  .fecha{ font-size:3mm; }

  /* ===== Bloques de texto ===== */
  .cliente{
    grid-area:2 / 1 / 3 / 4;
    font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        padding: 1mm;
  }
  .dir{
    grid-area:3 / 1 / 4 / 4;
    white-space:normal; overflow:hidden; text-overflow:ellipsis;
    line-height:1.15;
    padding: 1mm;
  }

  /* Fila de peso + badge */
  .peso{
  padding-right: 2mm;
    grid-area:4 / 3 / 5 / 4;
    align-self:center; justify-self:end;
    display:flex; flex-direction: column; justify-content:end;
    font-weight:700;
       span{
    text-align: right;
    font-size: 13px;
    }
  }

  /* Badge "Paquetes X/N" en misma fila, col 3 */
  .paq{
   grid-area:4 / 1 / 5 / 3;
    justify-self:start; align-self:center;
    font-size:3mm; font-weight:700; padding:1mm 2mm;
    display:flex; flex-direction: column; justify-content:center;
    
    border-radius:2px; line-height:1;

    span{
    text-align: center;
    font-size: 25px;
    }
  }

  /* ===== Zona Folio + Código de barras ===== */
  .FolioQR{
    grid-area:5 / 1 / 6 / 4;   /* última fila completa */
    padding-top:1mm;
    display:flex; 
    flex-direction:column; 
    gap:2mm;
    justify-content: center;
    width: 90mm;
    margin: 0 auto;
  }

  .folio{
    /* OJO: quitamos el margin-top de 40mm */
    width:100%;
    font-weight:bold; font-size:4mm; text-align:center;
    display:flex; flex-direction:row; justify-content:space-between; align-items:center;
  }

  .ruta,.anden{
    border:1px solid #000; width:10mm; height:10mm;
    font-size:4mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
  }
  .ruta strong,.anden strong{ font-size:2.2mm; }

  /* Código de barras con altura fija para que no “estire” la fila */
  .bc{
    width:100%;
    height:18mm;      /* ajusta a tu impresora/lector: 16–24mm suele ir bien */
    display:block;
  }
  `,
    renderHTML: (a: PaqItem, partIndex = 1, partTotal = 1) => `
    <div class="p"><div class="l"><div class="g" style="border:1px solid #000; margin-top:2mm;">
      <div class="cabecera" style="border-bottom:1px dashed #000;display:flex;flex-direction:row;align-items:center;position:relative;">
        
        <img src="/Fyttsa/FYTTSA APLICACIONES LOGO (2)-06.png" alt="Logo derecha" style="height:60px;"/>
       <span style="font-size:10px;">CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO, ACOLMAN, 55885</span>
      </div>
      
      <div class="cliente">${escapeHTML(a.cliente)}</div>
      <div class="dir">${escapeHTML(a.direccion)} ${escapeHTML(`${a.ciudad}${a.cp ? " CP " + a.cp : ""}`)}</div>
      <div class="peso"><span>Peso</span><span>${escapeHTML(a.peso ? `${a.peso} kg` : "")}</span></div>
      <div class="SD" style="grid-area: 4 / 2 / 5 / 3; font-size:30px; text-align:center; display:flex; justify-content:center; align-items:center;">SD</div>
    <div class="paq"><span >PAQ: </span>
    <span>${partIndex}/${partTotal}</span></div>
      <div class="FolioQR">
        <div class="folio">
          <div class="anden"><span></span><strong></strong></div>
          <span style="font-size:35px;">${escapeHTML(a.folio)}</span>
          <div class="ruta"><span></span><strong></strong></div>
        </div>
        <svg class="bc jsb" data-code="${escapeHTML(a.folio)}"></svg>
         <div class="footer" style="width:95%; display: flex; flex-direction: row;justify-content: space-between !important;align-items: center; position:absolute; bottom:1mm;"> 
      <img src="/powered by.png" alt="Logo izquierda" style="height:15px;"/>
       <div class="fecha">${escapeHTML(a.fecha)}</div>
      </div>
      </div>
     
    </div></div></div>
  `,
    preview: (a: PaqItem, partIndex = 1, partTotal = 1) => (
        <div
            className="w-full h-full grid relative"
            style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "12mm repeat(6, minmax(0, auto))",
                gap: "2px 6px",
                fontSize: 10,
                lineHeight: 1.05,
            }}
        >
            {/* Badge */}
            <div className="absolute top-1 left-1 border border-black rounded px-2 py-1 text-[9px] font-bold bg-white">
                <span>Paquetes</span>
                <span>{partIndex}/{partTotal}</span>
            </div>

            {/* Cabecera preview */}
            <div className="col-[1/4] row-[1/2] flex items-center justify-between gap-3">
                <img src="/logos/izq.png" alt="Logo izquierda" style={{ height: "10mm", maxWidth: "48%", objectFit: "contain" }} />
                <img src="/logos/der.png" alt="Logo derecha" style={{ height: "10mm", maxWidth: "48%", objectFit: "contain" }} />
            </div>

            <div className="col-[1/4] row-[2/3] font-bold truncate">{a.cliente}</div>
            <div className="col-[1/4] row-[3/4] truncate">{a.direccion}</div>
            <div className="col-[1/3] row-[4/5] truncate">{a.ciudad}{a.cp ? ` CP ${a.cp}` : ""}</div>
            <div className="col-[3/4] row-[4/5] text-right font-bold">{a.peso ? `${a.peso} kg` : ""}</div>
            <div className="col-[1/2] row-[5/6] font-bold">{a.folio}</div>
            <div className="col-[2/4] row-[5/6] text-right">{a.fecha}</div>
            <svg className="col-[1/4] row-[6/8] jsb" data-code={a.folio} />
        </div>
    ),
}


const baseTemplate2: Template = {
    id: "etiqueta_traspaso",
    name: "Traspaso",
    width: 101,
    height: 101,
    css: (w: number, h: number) => `
     @page{size:${w}mm ${h}mm;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .p{
    width:${w}mm;height:${h}mm;
    display:block;
    page-break-after:always; break-after:page;
    page-break-inside:avoid; break-inside:avoid;
  }
  .p:last-child{page-break-after:auto}

  .l{width:${w}mm;height:${h}mm;padding:2mm;display:flex}
  .g{
    width:100%;height:100%;
    display:grid;
    grid-template-columns: 1fr 1fr 1fr;
    /* Alturas medibles para evitar “auto” expansivo */
    grid-template-rows:
      14mm   /* cabecera */
      14mm    /* cliente */
      14mm   /* direccion (se expande lo necesario) */
      14mm    /* info/peso + badge */
      30mm;  /* barcode/zona folio */
    gap:2px 6px;
    font-size: 4mm; 
    line-height: 1.15;
    position:relative;
    align-content:start;  /* evita centrado vertical implícito */
  }

  /* ===== Cabecera ===== */
  .cabecera{
    grid-area:1 / 1 / 2 / 4;
    display:flex; align-items:center; justify-content:space-between; gap:4mm;
    border-bottom:1px dashed #000; padding-bottom:1mm;
  }
  .cabecera img{ height:10mm; max-width:48%; object-fit:contain; display:block; }
  .fecha{ font-size:3mm; }

  /* ===== Bloques de texto ===== */
  .cliente{
    grid-area:2 / 1 / 3 / 4;
    font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        padding: 1mm;
  }
  .dir{
    grid-area:3 / 1 / 4 / 4;
    white-space:normal; overflow:hidden; text-overflow:ellipsis;
    line-height:1.15;
    padding: 1mm;
  }

  /* Fila de peso + badge */
  .peso{
  padding-right: 2mm;
    grid-area:4 / 3 / 5 / 4;
    align-self:center; justify-self:end;
    display:flex; flex-direction: column; justify-content:end;
    font-weight:700;
       span{
    text-align: right;
    font-size: 13px;
    }
  }

  /* Badge "Paquetes X/N" en misma fila, col 3 */
  .paq{
   grid-area:4 / 1 / 5 / 3;
    justify-self:start; align-self:center;
    font-size:3mm; font-weight:700; padding:1mm 2mm;
    display:flex; flex-direction: column; justify-content:center;
    
    border-radius:2px; line-height:1;

    span{
    text-align: center;
    font-size: 25px;
    }
  }

  /* ===== Zona Folio + Código de barras ===== */
  .FolioQR{
    grid-area:5 / 1 / 6 / 4;   /* última fila completa */
    padding-top:1mm;
    display:flex; 
    flex-direction:column; 
    gap:2mm;
    justify-content: center;
    width: 90mm;
    margin: 0 auto;
  }

  .folio{
    /* OJO: quitamos el margin-top de 40mm */
    width:100%;
    font-weight:bold; font-size:4mm; text-align:center;
    display:flex; flex-direction:row; justify-content:space-between; align-items:center;
  }

  .ruta,.anden{
    border:1px solid #000; width:10mm; height:10mm;
    font-size:4mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
  }
  .ruta strong,.anden strong{ font-size:2.2mm; }

  /* Código de barras con altura fija para que no “estire” la fila */
  .bc{
    width:100%;
    height:18mm;      /* ajusta a tu impresora/lector: 16–24mm suele ir bien */
    display:block;
  }
  `,
    renderHTML: (a: PaqItem, partIndex = 1, partTotal = 1) => `
    <div class="p"><div class="l"><div class="g" style="border:1px solid #000; margin-top:2mm;">
      <div class="cabecera" style="border-bottom:1px dashed #000;display:flex;flex-direction:row;align-items:center;position:relative;">
        
        <img src="/Fyttsa/FYTTSA APLICACIONES LOGO (2)-06.png" alt="Logo derecha" style="height:60px;"/>
       <span style="font-size:10px;">CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO, ACOLMAN, 55885</span>
      </div>
      
      <div class="cliente">${escapeHTML(a.sucursal)}</div>
      <div class="dir">${escapeHTML(a.direccion)} ${escapeHTML(`${a.ciudad}${a.cp ? " CP " + a.cp : ""}`)}</div>
      <div class="peso"><span>Peso</span><span>${escapeHTML(a.peso ? `${a.peso} kg` : "")}</span></div>
      <div class="SD" style="grid-area: 4 / 2 / 5 / 3; font-size:30px; text-align:center; display:flex; justify-content:center; align-items:center;">SD</div>
    <div class="paq"><span >PAQ: </span>
    <span>${partIndex}/${partTotal}</span></div>
      <div class="FolioQR">
        <div class="folio">
          <div class="anden"><span></span><strong></strong></div>
          <span style="font-size:35px;">${escapeHTML(a.folio)}</span>
          <div class="ruta"><span></span><strong></strong></div>
        </div>
        <svg class="bc jsb" data-code="${escapeHTML(a.folio)}"></svg>
         <div class="footer" style="width:95%; display: flex; flex-direction: row;justify-content: space-between !important;align-items: center; position:absolute; bottom:1mm;"> 
      <img src="/powered by.png" alt="Logo izquierda" style="height:15px;"/>
       <div class="fecha">${escapeHTML(a.fecha)}</div>
      </div>
      </div>
     
    </div></div></div>
  `,
    preview: (a: PaqItem, partIndex = 1, partTotal = 1) => (
        <div
            className="w-full h-full grid relative"
            style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "12mm repeat(6, minmax(0, auto))",
                gap: "2px 6px",
                fontSize: 10,
                lineHeight: 1.05,
            }}
        >
            {/* Badge */}
            <div className="absolute top-1 left-1 border border-black rounded px-2 py-1 text-[9px] font-bold bg-white">
                <span>Paquetes</span>
                <span>{partIndex}/{partTotal}</span>
            </div>

            {/* Cabecera preview */}
            <div className="col-[1/4] row-[1/2] flex items-center justify-between gap-3">
                <img src="/logos/izq.png" alt="Logo izquierda" style={{ height: "10mm", maxWidth: "48%", objectFit: "contain" }} />
                <img src="/logos/der.png" alt="Logo derecha" style={{ height: "10mm", maxWidth: "48%", objectFit: "contain" }} />
            </div>

            <div className="col-[1/4] row-[2/3] font-bold truncate">{a.cliente}</div>
            <div className="col-[1/4] row-[3/4] truncate">{a.direccion}</div>
            <div className="col-[1/3] row-[4/5] truncate">{a.ciudad}{a.cp ? ` CP ${a.cp}` : ""}</div>
            <div className="col-[3/4] row-[4/5] text-right font-bold">{a.peso ? `${a.peso} kg` : ""}</div>
            <div className="col-[1/2] row-[5/6] font-bold">{a.folio}</div>
            <div className="col-[2/4] row-[5/6] text-right">{a.fecha}</div>
            <svg className="col-[1/4] row-[6/8] jsb" data-code={a.folio} />
        </div>
    ),
}


const baseTemplate3: Template = {
    id: "etiqueta_puntoVenta",
    name: "Ruta",
    width: 101,
    height: 101,
    css: (w: number, h: number) => `
     @page{size:${w}mm ${h}mm;margin:0}
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial, Helvetica, sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}

  .p{
    width:${w}mm;height:${h}mm; display:block; page-break-after:always; break-after:page; page-break-inside:avoid; break-inside:avoid;
  }
  .p:last-child{page-break-after:auto}

  .l{width:${w}mm;height:${h}mm;padding:2mm;display:flex}
  .g{ width:100%;height:100%; display:grid; grid-template-columns: 1fr 1fr 1fr; grid-template-rows:
      14mm   
      14mm 
      14mm   
      14mm  
      30mm; gap:2px 6px; font-size: 4mm; line-height: 1.15; position:relative; align-content:start;
  }

  /* ===== Cabecera ===== */
  .cabecera{
    grid-area:1 / 1 / 2 / 4; display:flex; align-items:center; justify-content:space-between; gap:4mm; border-bottom:1px dashed #000; padding-bottom:1mm;
  }
  .cabecera img{ height:10mm; max-width:48%; object-fit:contain; display:block; }
  .fecha{ font-size:3mm; }

  /* ===== Bloques de texto ===== */
  .cliente{
    grid-area:2 / 1 / 3 / 4; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
        padding: 1mm;
  }
  .dir{
  grid-area: 3 / 1 / 4 / 4; width: 100%; padding: 1mm; line-height: 1.15; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 3; overflow: hidden;
  white-space: normal; word-break: break-word; hyphens: auto;
  }

  /* Fila de peso + badge */
  .peso{
  padding-right: 2mm;
    grid-area:4 / 3 / 5 / 4;
    align-self:center; justify-self:end;
    display:flex; flex-direction: column; justify-content:end;
    font-weight:700;
       span{
    text-align: right;
    font-size: 13px;
    }
  }

  /* Badge "Paquetes X/N" en misma fila, col 3 */
  .paq{
   grid-area:4 / 1 / 5 / 3;
    justify-self:start; align-self:center;
    font-size:3mm; font-weight:700; padding:1mm 2mm;
    display:flex; flex-direction: column; justify-content:center;
    
    border-radius:2px; line-height:1;

    span{
    text-align: center;
    font-size: 25px;
    }
  }

  /* ===== Zona Folio + Código de barras ===== */
  .FolioQR{
    grid-area:5 / 1 / 6 / 4;   /* última fila completa */
    padding-top:1mm;
    display:flex; 
    flex-direction:column; 
    gap:2mm;
    justify-content: center;
    width: 90mm;
    margin: 0 auto;
  }

  .folio{
    /* OJO: quitamos el margin-top de 40mm */
    width:100%;
    font-weight:bold; font-size:4mm; text-align:center;
    display:flex; flex-direction:row; justify-content:space-between; align-items:center;
  }

  .ruta,.anden{
    border:1px solid #000; width:10mm; height:10mm;
    font-size:4mm; display:flex; flex-direction:column; align-items:center; justify-content:center;
  }
  .ruta strong,.anden strong{ font-size:2.2mm; }

  /* Código de barras con altura fija para que no “estire” la fila */
  .bc{
    width:100%;
    height:18mm;      /* ajusta a tu impresora/lector: 16–24mm suele ir bien */
    display:block;
  }
  `,
    renderHTML: (a: PaqItem, partIndex = 1, partTotal = 1) => `
    <div class="p"><div class="l"><div class="g" style="border:1px solid #000; margin-top:2mm;">
      <div class="cabecera" style="border-bottom:1px dashed #000;display:flex;flex-direction:row;align-items:center;position:relative;">
        
        <img src="/Fyttsa/FYTTSA APLICACIONES LOGO (2)-06.png" alt="Logo derecha" style="height:60px;"/>
       <span style="font-size:10px;">CARRETERA (CARR.) FEDERAL MÉXICO TEPEXPAN KM 32.5 INT:1, LOS ÁNGELES TOTOLCINGO, ACOLMAN, 55885</span>
      </div>
      
      <div class="cliente">${escapeHTML(a.cliente)}</div>
      <div class="dir">${escapeHTML(a.direccion)}, ${escapeHTML(`${a.ciudad}${a.cp ? " CP " + a.cp : ""}`)}</div>
      <div class="peso"><span>Peso</span><span>${escapeHTML(a.peso ? `${a.peso} kg` : "")}</span></div>
      <div class="SD" style="grid-area: 4 / 2 / 5 / 3; font-size:30px; text-align:center; display:flex; justify-content:center; align-items:center;">SD</div>
    <div class="paq"><span >PAQ: </span>
    <span>${partIndex}/${partTotal}</span></div>
      <div class="FolioQR">
        <div class="folio">
          <div class="anden"><span></span><strong></strong></div>
          <span style="font-size:35px;">${escapeHTML(a.folio)}</span>
          <div class="ruta"><span></span><strong></strong></div>
        </div>
        <svg class="bc jsb" data-code="${escapeHTML(a.folio)}"></svg>
         <div class="footer" style="width:95%; display: flex; flex-direction: row;justify-content: space-between !important;align-items: center; position:absolute; bottom:1mm;"> 
      <img src="/powered by.png" alt="Logo izquierda" style="height:15px;"/>
       <div class="fecha">${escapeHTML(a.fecha)}</div>
      </div>
      </div>
     
    </div></div></div>
  `,
    preview: (a: PaqItem, partIndex = 1, partTotal = 1) => (
        <div
            className="w-full h-full grid relative"
            style={{
                gridTemplateColumns: "repeat(3, 1fr)",
                gridTemplateRows: "12mm repeat(6, minmax(0, auto))",
                gap: "2px 6px",
                fontSize: 10,
                lineHeight: 1.05,
            }}
        >
            {/* Badge */}
            <div className="absolute top-1 left-1 border border-black rounded px-2 py-1 text-[9px] font-bold bg-white">
                <span>Paquetes</span>
                <span>{partIndex}/{partTotal}</span>
            </div>

            {/* Cabecera preview */}
            <div className="col-[1/4] row-[1/2] flex items-center justify-between gap-3">
                <img src="/logos/izq.png" alt="Logo izquierda" style={{ height: "10mm", maxWidth: "48%", objectFit: "contain" }} />
                <img src="/logos/der.png" alt="Logo derecha" style={{ height: "10mm", maxWidth: "48%", objectFit: "contain" }} />
            </div>

            <div className="col-[1/4] row-[2/3] font-bold truncate">{a.cliente}</div>
            <div className="col-[1/4] row-[3/4] truncate">{a.direccion}</div>
            <div className="col-[1/3] row-[4/5] truncate">{a.ciudad}{a.cp ? ` CP ${a.cp}` : ""}</div>
            <div className="col-[3/4] row-[4/5] text-right font-bold">{a.peso ? `${a.peso} kg` : ""}</div>
            <div className="col-[1/2] row-[5/6] font-bold">{a.folio}</div>
            <div className="col-[2/4] row-[5/6] text-right">{a.fecha}</div>
            <svg className="col-[1/4] row-[6/8] jsb" data-code={a.folio} />
        </div>
    ),
}
// Clones para otros tipos (mismo layout por ahora)
const LABEL_TEMPLATES: Template[] = [
    baseTemplate,
    baseTemplate2,
    baseTemplate3
]

const TIPO_TO_TEMPLATE_ID: Record<TipoEtiqueta, Template["id"]> = {
    Factura: "etiqueta_facturas",
    Traspaso: "etiqueta_traspaso",
    Ruta: "etiqueta_puntoVenta",
}
// Borra todos los folios sin preguntar


// ====== Page ======
export default function EtiquetadorPaquetes() {
    // inicia con el primer template disponible
    const [tplId, setTplId] = useState<Template["id"]>(LABEL_TEMPLATES[0].id)
    const template = useMemo(() => LABEL_TEMPLATES.find(t => t.id === tplId) || LABEL_TEMPLATES[0], [tplId])

    // Datos
    const [items, setItems] = useState<PaqItem[]>([])
    const [folio, setFolio] = useState("")
    const [paquetes, setPaquetes] = useState("1")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showConfirm, setShowConfirm] = useState(false)
    const [busyConfirm, setBusyConfirm] = useState(false)


    // Reemplaza tu upsert actual por este:
    const upsert = (it: PaqItem) =>
        setItems(prev => {
            // normaliza para que no fallen mayúsculas/espacios
            const norm = (s: string) => s.trim().toUpperCase();

            const idx = prev.findIndex(x => norm(x.folio) === norm(it.folio));
            // 👉 si prefieres acumular solo si también coincide el tipo/plantilla:
            // const idx = prev.findIndex(x => norm(x.folio) === norm(it.folio) && x.templateId === it.templateId);

            if (idx !== -1) {
                const next = [...prev];
                const antes = next[idx].quantity;
                next[idx] = { ...next[idx], quantity: antes + it.quantity };

                // feedback opcional
                new Noty({
                    type: "success",
                    layout: "topRight",
                    theme: "mint",
                    text: `Folio ${it.folio}: +${it.quantity} (total ${antes + it.quantity})`,
                    timeout: 1800,
                    progressBar: true,
                }).show();

                return next;
            }

            return [...prev, it];
        });

    const totalLabels = useMemo(() => items.reduce((s, a) => s + a.quantity, 0), [items])

    // ====== Importación Excel (opcional) ======
    const [importing, setImporting] = useState(false)
    const [importProgress, setImportProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 })
    const [importErrors, setImportErrors] = useState<string[]>([])
    const fileRef = useRef<HTMLInputElement | null>(null)

    const importFromExcel = async (file: File) => {
        setImporting(true); setImportErrors([]); setImportProgress({ done: 0, total: 0 })
        try {
            const wb = XLSX.read(await file.arrayBuffer(), { type: "array" })
            const ws = wb.Sheets[wb.SheetNames[0]]
            const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, blankrows: false }) as any[][]
            // Espera columnas: FOLIO | PAQUETES
            const data = rows.slice(1).map((r, i) => ({
                folio: String(r[0] || "").trim(),
                paquetes: Math.max(1, parseInt(String(r[1] ?? "1"), 10)),
                i
            }))
            const valid = data.filter(r => r.folio)
            const total = valid.length; setImportProgress({ done: 0, total })
            const limit = pLimit(4)
            let done = 0; const errors: string[] = []
            await Promise.all(valid.map(r => limit(async () => {
                try { await addByFolio(r.folio, r.paquetes) } catch (e: any) {
                    errors.push(`Fila ${r.i + 2} (FOLIO=${r.folio}): ${e?.message || "Error"}`)
                } finally { done++; setImportProgress({ done, total }) }
            })))
            setImportErrors(errors)
        } catch (e: any) {
            setImportErrors([e?.message || "No se pudo leer el archivo"])
        } finally { setImporting(false) }
    }

    const resetFolios = () => {
        if (items.length === 0) return;

        setItems([]);
        new Noty({
            type: "success",
            layout: "topRight",
            theme: "mint",
            text: "Se eliminaron todos los folios",
            timeout: 2500,
            progressBar: true,
        }).show();
    };

    // ====== Conexión al API /api/buscar_folio ======
    async function addByFolio(folioRaw: string, paquetesOverride?: number) {
        const clean = (folioRaw || "").trim()
        if (!clean) return
        const qty = Number.isFinite(paquetesOverride as number) && (paquetesOverride as number) > 0
            ? (paquetesOverride as number)
            : Math.max(1, parseInt(paquetes || "1", 10))

        setLoading(true); setError(null)
        try {
            const r = await fetch(`/api/buscar_folio?folio=${encodeURIComponent(clean)}`, { headers: { Accept: "application/json" } })
            const j = await r.json()
            if (!r.ok || !j?.ok) throw new Error(j?.error || "No se encontró el folio.")

            const row = Array.isArray(j.data) ? j.data[0] : j.data
            if (!row) throw new Error("Respuesta sin datos.")

            const tipoApi = (j.tipo || "factura") as TipoApi
            const ui = TIPO_API_TO_UI[tipoApi] ?? TIPO_API_TO_UI.factura
            const tipoUI: TipoEtiqueta = ui.label
            const templateId = TIPO_TO_TEMPLATE_ID[tipoUI] || LABEL_TEMPLATES[0].id


            const dir = [
                (row.CALLE || row.nombre_calle || "").toString().trim(),
                (row.COLONIA || row.colonia || "Sin información").toString().trim(),
            ].filter(Boolean).join(", ")

            const ciudad = (row.CIUDAD || row.ciudad || "").toString().trim()
            const cp = (row.CODIGO_POSTAL || row.codigo_postal || "").toString().trim()
            const colonia = (row.COLONIA || row.colonia || "").toString().trim()

            const sucursal = (row.SUCURSAL || row.sucursal || "Sin información").toString().trim()
            const it: PaqItem = {
                id: `${Date.now()}_${clean}`,
                folio: (row.FOLIO || row.folio || clean).toString().trim(),
                cliente: (row.CLIENTE || row.cliente || "CLIENTE").toString().trim(),
                direccion: dir,
                ciudad,
                cp,
                colonia,
                sucursal,
                peso: Number(row.PESO_EMBARQUE ?? row.peso_embarque ?? 0) || 0,
                fecha: todayMX(),
                quantity: qty,
                tipo: tipoUI,              // 👈 UI label ya mapeado
                tipoClass: ui.badgeClass,  // 👈 clases de color para el badge
                templateId,
            }

            upsert(it)

            // auto-seleccionar la plantilla del tipo detectado
            setTplId(templateId)

            setFolio("")
            setPaquetes("1")
        } catch (e: any) {
            setError(e?.message || "Error al buscar el folio.")
        } finally {
            setLoading(false)
        }
    }

    async function logConteoPaq(rows: { folio: string; paquetes: number }[]) {
        const r = await fetch("/api/conteo_paq", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ rows }),
        })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j?.error || "No se pudo registrar el conteo")
        return j
    }
    async function handleConfirmModal() {
        if (!items.length) return
        try {
            setBusyConfirm(true)
            const rows = items.map(i => ({ folio: i.folio, paquetes: i.quantity }))
            await logConteoPaq(rows)
            new Noty({ type: "success", layout: "topRight", theme: "mint", text: "Registro guardado.", timeout: 1400 }).show()
        } catch (e: any) {
            new Noty({ type: "error", layout: "topRight", theme: "mint", text: `No se pudo registrar: ${e.message}`, timeout: 2600 }).show()
        } finally {
            setBusyConfirm(false)
            setShowConfirm(false)
            handlePrint()
        }
    }

    function ConfirmPrintModal({
        open, onOpenChange, items, busy, onConfirm,
    }: {
        open: boolean
        onOpenChange: (v: boolean) => void
        items: PaqItem[]
        busy: boolean
        onConfirm: () => void
    }) {
        const total = items.reduce((s, x) => s + x.quantity, 0)

        // Enter confirma
        function onKeyDown(e: React.KeyboardEvent) {
            if (e.key === "Enter" && !busy) {
                e.preventDefault()
                onConfirm()
            }
        }

        return (
            <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
                <DialogContent
                    className="sm:max-w-[560px] border border-white/10 bg-gradient-to-b from-[#101426] to-[#1a1f35] text-zinc-100 shadow-2xl"
                    onKeyDown={onKeyDown}
                >
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-zinc-50">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-yellow-500/20 text-yellow-300">!</span>
                            Confirmar impresión
                            <span className="ml-2 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/30 rounded-full px-2 py-0.5">
                                {items.length} folio(s)
                            </span>
                        </DialogTitle>
                        <DialogDescription className="text-zinc-400">
                            Se enviará a la impresora y se registrará en <b className="text-zinc-200">CONTEO_PAQ</b>.
                            Presiona <b>Enter</b> para confirmar o <b>Esc</b> para cancelar.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Lista de folios */}
                    <div className="mt-3 rounded-lg border border-white/10 bg-white/5 max-h-64 overflow-auto">
                        {items.map((i) => (
                            <div key={i.id} className="flex items-center justify-between px-3 py-2 border-b border-white/5 last:border-b-0">
                                <div className="font-semibold text-zinc-100 tracking-wide truncate">{i.folio}</div>
                                <div className="text-xs text-zinc-100 bg-zinc-700/40 border border-zinc-500/40 rounded-md px-2 py-0.5">
                                    {i.quantity} paquete(s)
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Total */}
                    <div className="mt-3 flex items-center justify-between rounded-lg border border-white/10 bg-gradient-to-r from-violet-500/10 to-zinc-500/10 px-3 py-2">
                        <span className="font-medium text-zinc-200">Total de paquetes</span>
                        <span className="font-bold text-zinc-50">{total}</span>
                    </div>

                    <DialogFooter className="mt-2">
                        <button
                            type="button"
                            className="inline-flex items-center rounded-lg border border-white/15 bg-transparent px-4 py-2 font-semibold text-zinc-100 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-60"
                            onClick={() => onOpenChange(false)}
                            disabled={busy}
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={busy}
                            className="inline-flex items-center rounded-lg bg-gradient-to-tr from-violet-500 to-violet-700 px-4 py-2 font-bold text-white shadow-[0_6px_18px_rgba(139,92,246,0.35)] hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-violet-500/60 disabled:opacity-70"
                        >
                            {busy && (
                                <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                    <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-90" d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" />
                                </svg>
                            )}
                            Imprimir y registrar
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        )
    }



    // ====== Print (usa la plantilla seleccionada actual)
    // Imprimir TODO junto respetando el formato de cada plantilla (mismo tamaño)
    const handlePrint = () => {
        if (!items.length) return

        // 1) Tamaño del job: como todas son iguales, usa el de la primera plantilla
        const firstTpl =
            LABEL_TEMPLATES.find(t => t.id === (items[0]?.templateId || tplId)) ||
            LABEL_TEMPLATES[0]
        const jobW = firstTpl.width
        const jobH = firstTpl.height

        // 2) Juntamos los CSS de cada plantilla PERO sin sus @page
        const stripAtPage = (css: string) => css.replace(/@page\s*\{[^}]*\}\s*/g, "")
        const usedTplIds = Array.from(new Set(items.map(i => i.templateId)))
        const cssBlocks = usedTplIds.map(tid => {
            const tpl = LABEL_TEMPLATES.find(t => t.id === tid) || LABEL_TEMPLATES[0]
            return stripAtPage(tpl.css(tpl.width, tpl.height))
        })

        // 3) Construir las páginas en el orden original (sin escalado porque todas miden igual)
        const pagesHTML = items.flatMap(a => {
            const tpl = LABEL_TEMPLATES.find(t => t.id === a.templateId) || LABEL_TEMPLATES[0]
            return Array.from({ length: a.quantity }, (_, idx) => tpl.renderHTML(a, idx + 1, a.quantity))
        }).join("")

        const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiquetas (Trabajo combinado)</title>

  <style>
    /* ---- @page única para todo el trabajo ---- */
    @page { size: ${jobW}mm ${jobH}mm; margin: 0; }

    /* Reset básico del job */
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* (Opcional) si tus plantillas no añaden cortes por página, forzarlos aquí:
       .p { page-break-after: always; break-after: page; }
       .p:last-child { page-break-after: auto; }
    */

    /* ---- CSS de cada plantilla sin @page ---- */
    ${cssBlocks.join("\n\n")}
  </style>

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    window.addEventListener('load', function () {
      try {
        document.querySelectorAll('.jsb').forEach(function (el) {
          var code = el.getAttribute('data-code') || '';
          JsBarcode(el, code, { format: 'CODE128', displayValue: false, margin: 0, height: 48 });
          el.removeAttribute('width'); el.removeAttribute('height');
          el.style.width = '100%'; el.style.height = '100%';
        });
      } catch (e) {}
      setTimeout(function(){ window.print(); }, 0);
    });
  </script>
</head>
<body>
  ${pagesHTML}
</body>
</html>`;

        const f = document.createElement("iframe")
        Object.assign(f.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" })
        document.body.appendChild(f)

        const d = (f.contentDocument || (f as any).ownerDocument) as Document
        d.open(); d.write(html); d.close()

        const cleanup = () => { try { document.body.removeChild(f) } catch { } }
        setTimeout(cleanup, 10000)
            ; (f.contentWindow as any)?.addEventListener?.("afterprint", cleanup)
    }


    const naturalW = mmToPx(template.width), naturalH = mmToPx(template.height)

    // Render barcodes en preview
    useEffect(() => { (async () => { try { await ensureJsBarcodeLoaded(); renderAllBarcodes() } catch { } })() }, [items, tplId])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
            <div className="min-h-screen p-6">
                <div className="max-w-7xl mx-auto">
                    {/* <div className="flex items-center justify-between mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-white">Etiquetador de <span className="text-purple-300">Paquetes</span></h1>
                            <p className="text-gray-300">Imprime una etiqueta por paquete con código de barras del folio.</p>
                        </div>
                        <Link href="/etiquetador_hub" className="flex items-center gap-2 text-purple-300 hover:text-purple-200">
                            <ArrowLeft className="w-4 h-4" /> Volver
                        </Link>
                    </div> */}

                    <div className="grid lg:grid-cols-2 gap-8 items-stretch min-h-0">
                        {/* Izquierda */}
                        <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl h-full flex flex-col w-full">
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
                            <CardHeader className="relative border-b border-white/5 flex w-full justify-between">
                                <CardTitle className="flex items-center gap-2 text-white">
                                    <Settings className="w-5 h-5 text-purple-300" /> Configuración
                                </CardTitle>
                                <span className="text-xs text-gray-400">v2.3.1</span>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-gray-100 font-medium">Folio</Label>
                                        <Input
                                            type="text"
                                            placeholder="Ej. FCT20179"
                                            value={folio}
                                            onChange={(e) => setFolio(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && folio.trim()) {
                                                    e.preventDefault()
                                                    addByFolio(folio.trim())
                                                }
                                            }}
                                            className="bg-white/5 border-white/10 text-white placeholder-gray-400 focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-gray-100 font-medium">Paquetes</Label>
                                        <NumberField
                                            value={paquetes}
                                            onChange={setPaquetes}
                                            min={1}
                                            step={1}
                                            ariaLabel="Número de paquetes (etiquetas)"
                                        />
                                    </div>

                                    {/* Selector manual de plantilla (puede cambiar al vuelo) */}
                                    {/* <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-gray-100 font-medium">Plantilla</Label>
                                        <Select value={tplId} onValueChange={(v) => setTplId(v as any)}>
                                            <SelectTrigger className="bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
                                                <SelectValue placeholder="Selecciona plantilla" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-black/80 backdrop-blur-xl border-white/10 text-white">
                                                {LABEL_TEMPLATES.map(t => (
                                                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <p className="text-xs text-gray-400 mt-1">
                                            Al agregar un folio, se selecciona automáticamente la plantilla según el tipo detectado por el backend.
                                        </p>
                                    </div> */}
                                </div>

                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => { if (folio.trim()) addByFolio(folio.trim()) }}
                                        className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white border-0 shadow-lg shadow-purple-500/20 rounded-xl transition-all duration-200"
                                        disabled={loading || !folio.trim()}
                                        title="Agregar etiqueta(s) por folio"
                                    >
                                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                        <span className="ml-2">Agregar</span>
                                    </Button>

                                    <Button
                                        onClick={() => setShowConfirm(true)}
                                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-white transition-colors"
                                        disabled={items.length === 0}
                                    >
                                        <Printer className="w-4 h-4 mr-2" />
                                        Imprimir ({totalLabels})
                                    </Button>

                                </div>

                                {error && (
                                    <div className="mt-2 px-3 py-2 text-sm text-red-300 flex items-center gap-2 bg-red-900/20 rounded">
                                        <AlertCircle className="w-4 h-4" /> {error}
                                    </div>
                                )}

                                {/* Importar Excel (opcional) */}
                                <div className="pt-4 border-t border-gray-700">
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept=".xlsx,.xls,.csv"
                                        className="hidden"
                                        onChange={(e) => { const f = e.target.files?.[0]; if (f) importFromExcel(f) }}
                                    />
                                    <Button
                                        type="button"
                                        className="bg-gradient-to-br from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white border-0 shadow-lg shadow-purple-500/20 rounded-xl transition-all duration-200"
                                        disabled={importing}
                                        onClick={() => fileRef.current?.click()}
                                        title="Importar FOLIO y PAQUETES desde Excel (2 columnas)"
                                    >
                                        {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                                        {importing
                                            ? `Importando ${importProgress.done}/${importProgress.total}`
                                            : "Importar Excel"}
                                    </Button>

                                    {(importing || importErrors.length > 0) && (
                                        <div className="mt-3 space-y-2">
                                            {importing && (<div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm">Procesando… {importProgress.done}/{importProgress.total}</div>)}
                                            {importErrors.length > 0 && (
                                                <div className="px-3 py-2 rounded bg-red-900/30 border border-red-700 text-red-200 text-sm max-h-40 overflow-y-auto">
                                                    <div className="flex items-center gap-2 font-medium mb-1">
                                                        <AlertCircle className="w-4 h-4" /> Errores de importación ({importErrors.length})
                                                    </div>
                                                    <ul className="list-disc ml-5 space-y-1">
                                                        {importErrors.slice(0, 50).map((err, i) => (<li key={i}>{err}</li>))}
                                                    </ul>
                                                    {importErrors.length > 50 && <div className="mt-1 opacity-80">…y más</div>}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Derecha */}
                        <div className="flex flex-col gap-6 h-full min-h-0">
                            <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl flex-1 flex min-h-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                                <CardHeader className="relative border-b border-white/5 shrink-0">
                                    <div className="flex items-center justify-between gap-3">
                                        <CardTitle className="text-white">Folios agregados ({items.length})</CardTitle>
                                        <CardTitle className="flex items-center">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={resetFolios}
                                                disabled={items.length === 0}
                                                title="Eliminar todos los folios"
                                                className="text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                            >
                                                <RotateCcw className="w-4 h-4" />
                                            </Button>

                                            <span className="text-sm text-purple-300">Total: {totalLabels} etiquetas</span>
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 flex flex-col min-h-0">
                                    {items.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <p>No hay folios agregados</p>
                                            <p className="text-sm">Escribe un folio y presiona Enter o “Agregar”.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2 flex-1 overflow-y-auto">
                                            {items.map((a) => (
                                                <div key={a.id} className="flex items-center justify-between bg-white/5 hover:bg-white/10 transition-colors p-3 rounded-lg border border-white/5">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-white font-medium truncate">{a.cliente}</p>
                                                        <p className="text-gray-300 text-sm">
                                                            <span className={`inline-flex items-center px-2 py-0.5 rounded mr-2 ${a.tipoClass}`}>
                                                                {a.tipo}
                                                            </span>
                                                            Folio: {a.folio} • {a.direccion} • {a.ciudad}{a.cp ? ` CP ${a.cp}` : ""} • Peso: {a.peso || 0} kg • Fecha: {a.fecha}
                                                        </p>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-purple-300 font-medium">{a.quantity}x</span>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => setItems(prev => prev.filter(x => x.id !== a.id))}
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

                            <Card className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 shadow-2xl flex-1 flex min-h-0">
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-blue-500/5 pointer-events-none" />
                                <CardHeader className="relative border-b border-white/5 shrink-0">
                                    <CardTitle className="flex items-center gap-2 text-white">
                                        <Eye className="w-5 h-5 text-purple-300" /> Vista Previa
                                    </CardTitle>
                                    <p className="text-gray-300 text-sm">Dimensiones: {template.width} × {template.height} mm</p>
                                </CardHeader>
                                <CardContent className="p-6 flex-1 flex flex-col min-h-0">
                                    <div className="bg-black/40 backdrop-blur-sm rounded-lg p-8 min-h-[100%] flex-1 flex items-center justify-center relative overflow-auto border border-white/5">
                                        {items.length === 0 ? (
                                            <div className="text-center text-gray-400">Agrega folios para ver la vista previa</div>
                                        ) : (
                                            <div className="flex items-center justify-center" style={{ width: `${naturalW}px`, height: `${naturalH}px` }}>
                                                <div className="bg-white rounded-md shadow-lg border-2 border-gray-300 text-black" style={{ width: naturalW, height: naturalH, padding: 6, overflow: "hidden" }}>
                                                    {template.preview(items[0], 1, items[0].quantity)}
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
            <ConfirmPrintModal
                open={showConfirm}
                onOpenChange={setShowConfirm}
                items={items}
                busy={busyConfirm}
                onConfirm={handleConfirmModal}
            />
        </div >
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
        <div className={`flex items-stretch overflow-hidden rounded-xl border border-white/10 bg-white/5 ${className}`}>
            <Button type="button" variant="ghost" className="px-3 border-r border-white/10 rounded-none text-white hover:bg-white/10 transition-colors" aria-label="disminuir" onClick={() => bump(-1)}>
                <Minus className="w-4 h-4" />
            </Button>
            <Input id={id} type="number" inputMode="decimal" value={value}
                onChange={(e) => onChange(e.target.value)}
                className={`no-spin bg-transparent border-0 text-white text-center focus-visible:ring-0 ${inputClassName}`}
                min={min} max={max} step={step} aria-label={ariaLabel}
            />
            <Button type="button" variant="ghost" className="px-3 border-l border-white/10 rounded-none text-white hover:bg-white/10 transition-colors" aria-label="aumentar" onClick={() => bump(1)}>
                <Plus className="w-4 h-4" />
            </Button>
        </div>
    )
}
