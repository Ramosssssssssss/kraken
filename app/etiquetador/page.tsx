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

// ==== BrowserPrint helpers (SDK Zebra) ====
type BPDevice = any
/* ==================================================================== */
// ====== BrowserPrint (Android/Zebra) ======
declare global {
  interface Window {
    BrowserPrint?: any
    Zebra?: any
  }
}

async function ensureBrowserPrintLoaded(): Promise<void> {
  if (typeof window === "undefined") return
  if (window.BrowserPrint || (window as any).Zebra?.BrowserPrint) return

  const candidates = [
    "/browserprint/BrowserPrint-3.1.250.min.js",
    "/browserprint/BrowserPrint-Zebra-1.1.250.min.js",
  ]

  for (const src of candidates) {
    if (window.BrowserPrint || (window as any).Zebra?.BrowserPrint) return
    if (document.querySelector(`script[data-bp="${src}"]`)) continue

    await new Promise<void>((resolve) => {
      const s = document.createElement("script")
      s.async = true
      s.dataset.bp = src
      s.src = src
      s.onload = () => resolve()
      s.onerror = () => resolve()
      document.head.appendChild(s)
    })
  }

  if (!(window.BrowserPrint || (window as any).Zebra?.BrowserPrint)) {
    throw new Error("No se pudo cargar BrowserPrint (Zebra/legacy).")
  }
}

async function getBP(): Promise<any> {
  await ensureBrowserPrintLoaded()
  const BP = window.BrowserPrint || (window as any).Zebra?.BrowserPrint
  if (!BP) throw new Error("BrowserPrint no disponible")
  return BP
}

async function bpIsAvailable(): Promise<boolean> {
  try {
    const BP = await getBP()
    return await new Promise<boolean>((res) => {
      try {
        BP.getDefaultDevice("printer", (_d: any) => res(true), () => res(false))
      } catch { res(false) }
    })
  } catch { return false }
}

type ZebraDevice = {
  name: string
  deviceType: "printer"
  uid?: string
  connection?: string
  write: (data: string, onOk?: () => void, onErr?: (e: any) => void) => void
}

async function bpGetOrPickDevice(): Promise<ZebraDevice> {
  const BP = await getBP();

  const dflt: ZebraDevice | null = await new Promise((res) =>
    BP.getDefaultDevice("printer", (d: ZebraDevice | null) => res(d), () => res(null))
  );
  if (dflt) return dflt;

  const devices: ZebraDevice[] = await new Promise((res, rej) =>
    BP.getDevices((list: ZebraDevice[]) => res(list || []), (err: any) => rej(err), "printer")
  );

  const savedUid = localStorage.getItem("zebra_bp_uid");
  let dev = savedUid ? devices.find(d => d.uid && d.uid === savedUid) : undefined;
  if (!dev) dev = devices.find(d => /zq5|zebra|zq511/i.test(d.name || "")) || devices[0];

  if (!dev) throw new Error("No se encontró impresora en BrowserPrint");

  if (dev.uid && dev.uid !== savedUid) localStorage.setItem("zebra_bp_uid", dev.uid);
  return dev;
}

async function bpPrintZPL(zpl: string): Promise<void> {
  let firstAttempt = true;
  const tryOnce = async (): Promise<void> => {
    const dev = await bpGetOrPickDevice();

    const sendFn: (data: string, ok: () => void, err: (e: any) => void) => void =
      typeof (dev as any).send === "function"
        ? (data, ok, err) => (dev as any).send(data, ok, err)
        : (data, ok, err) => dev.write(data, ok, err);

    const payload = (zpl.endsWith("\r\n") ? zpl : zpl.replace(/\n/g, "\r\n") + "\r\n");
    const CHUNK = 8 * 1024;
    const parts: string[] = [];
    for (let i = 0; i < payload.length; i += CHUNK) parts.push(payload.slice(i, i + CHUNK));

    const maybeConnect = (cb: () => void, onErr: (e: any) => void) => {
      const fn = (dev as any).connect || (dev as any).open;
      if (typeof fn === "function") {
        try { fn.call(dev, cb, onErr); } catch (e) { onErr(e); }
      } else cb();
    };
    const maybeClose = () => {
      const fn = (dev as any).disconnect || (dev as any).close;
      try { if (typeof fn === "function") fn.call(dev, () => { }, () => { }); } catch { }
    };

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const done = (f: () => void) => { if (!settled) { settled = true; f(); } };

      const sendNext = (i: number) => {
        if (i >= parts.length) return done(() => { maybeClose(); resolve(); });
        sendFn(parts[i], () => sendNext(i + 1), (e: any) => done(() => { maybeClose(); reject(e); }));
      };

      try { sendFn("~HS\r\n", () => { }, () => { }); } catch { }
      maybeConnect(() => { sendNext(0); }, (e: any) => done(() => { maybeClose(); reject(e); }));

      setTimeout(() => done(() => { maybeClose(); reject(new Error("Timeout al enviar a BrowserPrint")); }), 15000);
    });
  };

  try {
    await tryOnce();
  } catch (e: any) {
    if (firstAttempt) {
      firstAttempt = false;
      localStorage.removeItem("zebra_bp_uid");
      await tryOnce();
    } else {
      throw e;
    }
  }
}




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
// ~96dpi aprox para preview
const mmToPx = (mm: number) => Math.max(1, Math.round(mm * 3.78))

// Límites físicos
const MAX_W_MM = 135
const MAX_H_MM = 300

const clampMm = (mm: number, max: number) =>
  Number.isFinite(mm) ? Math.max(1, Math.min(max, mm)) : 1

// …clampBarHeight, clampQrSize…

// mm — presets típicos
const SIZE_PRESETS = [
  { id: "25x25", name: "25 × 25 mm (1\"×1\")", w: 25, h: 25, m: 2, barH: 16, fontPx: 14 },
  { id: "50x25", name: "50 × 25 mm (2\"×1\")", w: 50, h: 25, m: 2, barH: 16, fontPx: 12 },
  { id: "70x25", name: "70 × 25 mm ", w: 70, h: 25, m: 2, barH: 16, fontPx: 12 },
  { id: "60x40", name: "60 × 40 mm", w: 60, h: 40, m: 2, barH: 20, fontPx: 14 },
  { id: "80x50", name: "80 × 50 mm", w: 80, h: 50, m: 3, barH: 22, fontPx: 16 },
  { id: "100x50", name: "100 × 50 mm (4\"×2\")", w: 100, h: 50, m: 3, barH: 24, fontPx: 18 },
  { id: "100x75", name: "100 × 75 mm (4\"×3\")", w: 100, h: 75, m: 3, barH: 28, fontPx: 20 },
  { id: "100x150", name: "100 × 150 mm (4\"×6\")", w: 100, h: 150, m: 4, barH: 40, fontPx: 22 },
];

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

// ==== ZPL builder (203 dpi) ====
// mm -> dots
function toDotsWithDpi(mm: number, dpi: number) {
  return Math.max(1, Math.round(mm * (dpi / 25.4)));
}

type ZplCfg = {
  width: string;        // mm
  height: string;       // mm
  margin: string;       // mm
  fontSize: string;     // px
  barHeightMm: string;  // mm
  font: string;
  showDesc?: boolean;
  descFontSize?: string; // px
  topShiftMm?: string;   // mm (puede ser negativo para subir)
};

function buildZplFromState(
  articles: { barcode: string; text: string; quantity: number; desc?: string }[],
  cfg: ZplCfg,
  format: "CODE128" | "CODE128B" | "QR",
  dpi: number
) {
  const toDots = (mm: number) => toDotsWithDpi(mm, dpi);

  const wmm = parseFloat(cfg.width || "50");
  const hmm = parseFloat(cfg.height || "25");
  const marginMm = Math.max(0, parseFloat(cfg.margin || "0"));
  const barHmm = Math.max(4, parseFloat(cfg.barHeightMm || "20"));
  const topShiftDots = toDots(parseFloat(cfg.topShiftMm ?? "0") || 0); // ⬅️ firmado

  const labelW = toDots(wmm);
  const labelH = toDots(hmm);
  const pad = toDots(marginMm);
  const barHd = toDots(barHmm);

  // Escalas aproximadas para fuente A0
  const textH = Math.max(10, Math.round(parseFloat(cfg.fontSize || "12") * 1.4));
  const descH = Math.max(8, Math.round(parseFloat(cfg.descFontSize || "12") * 1.3));
  const showDesc = !!cfg.showDesc;

  const usableW = Math.max(8, labelW - pad * 2);
  const usableH = Math.max(8, labelH - pad * 2);

  const gapDots = toDots(0.6); // gap pequeño

  // Estimación módulos Code128 con margen silencioso
  const estimateCode128Modules = (data: string) => {
    const len = Math.max(1, data.length);
    const base = 11 * (len + 2) + 13; // barras + start/cksum + stop
    const quiet = 24;                 // “quiet zone” a cada lado
    return base + quiet;
  };

  const out: string[] = [];

  for (const a of articles) {
    const copies = Math.max(1, Math.floor(a.quantity || 1));
    for (let i = 0; i < copies; i++) {
      // Altura total del bloque para centrar verticalmente
      let blockH = 0;
      if (format === "QR") {
        const qrSide = Math.min(usableW, usableH);
        blockH += qrSide;
      } else {
        blockH += barHd;
      }
      blockH += gapDots;          // separación bajo símbolo
      blockH += textH;            // línea principal
      if (showDesc && a.desc) blockH += gapDots + descH;

      // y inicial centrado + offset firmado
      let y = pad + Math.max(0, Math.floor((usableH - blockH) / 2)) + topShiftDots;

    let z = `^XA
^CI28
^MUd
^MNY
^PR4
^MD10
^PW${labelW}
^LL${labelH}
^LH0,0
`;


      if (format === "QR") {
        const qrSide = Math.min(usableW, usableH);
        const module = Math.max(2, Math.min(12, Math.floor(qrSide / 40)));
        const x = pad + Math.max(0, Math.floor((usableW - qrSide) / 2));
        z += `^FO${x},${y}^BQN,2,${module}^FDLA,${a.barcode}^FS\r\n`;
        y += qrSide + gapDots;
      } else {
        // CODE128 / CODE128B centrado horizontal
        const totalModules = estimateCode128Modules(a.barcode);

        // Límites por DPI: subir el mínimo para evitar barras ultra finas
        const MIN_MODULE = dpi >= 600 ? 4 : dpi >= 300 ? 3 : 2;
        const MAX_MODULE = dpi >= 600 ? 12 : dpi >= 300 ? 8 : 6;

        // cálculo automático según ancho disponible
        let moduleDots = Math.floor(usableW / totalModules);
        // clamp al rango por DPI
        moduleDots = Math.min(MAX_MODULE, Math.max(MIN_MODULE, moduleDots));

        const totalWidthDots = moduleDots * totalModules;
        const x = pad + Math.max(0, Math.floor((usableW - totalWidthDots) / 2));

        // ^BY: x-dimension = moduleDots, relación = 2, alto = barHd
        z += `^BY${moduleDots},2,${barHd}\r\n`;
        z += `^FO${x},${y}^BCN,${barHd},N,N,N^FD${a.barcode}^FS\r\n`;
        y += barHd + gapDots;
      }

      // Texto principal centrado
      z += `^FO${pad},${y}^FB${usableW},1,0,C,0^A0N,${textH},${textH}^FD${a.text}^FS\r\n`;
      y += textH;

      // Descripción opcional centrada
      if (showDesc && a.desc) {
        y += gapDots;
        z += `^FO${pad},${y}^FB${usableW},1,0,C,0^A0N,${descH},${descH}^FD${a.desc}^FS\r\n`;
      }

      z += "^XZ\r\n";
      out.push(z);
    }
  }

  return out.join("");
}



/*******************************************************/

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
    qrSizeMm: "16",
    xDimPx: "1.2",
    showDesc: true,
    descFontSize: "18",
    topShiftMm: "0",
  });

  const [barcodeFormat, setBarcodeFormat] =
    useState<"CODE128" | "CODE128B" | "QR">("CODE128");

  const [articles, setArticles] = useState<ArticleItem[]>([]);
  const [templates, setTemplates] = useState<LabelTemplate[]>([]);
  const [templateName, setTemplateName] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);

  // búsqueda
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // tamaños BD
  const [tamanos, setTamanos] = useState<TamanoEtiqueta[]>([]);
  const [isLoadingTamanos, setIsLoadingTamanos] = useState(false);
  const [tamanosError, setTamanosError] = useState<string | null>(null);
  const [selectedTamanoId, setSelectedTamanoId] = useState<string>("");
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  // DPI autodetectado
  const [printerDpi, setPrinterDpi] = useState<203 | 300 | 600>(203);
  const [dpiMsg, setDpiMsg] = useState<string>("Detectando DPI…");

  // ===== importación Excel =====
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  type ImportRow = { code: string; copies: number };
  function aplicarPreset(id: string) {
    const p = SIZE_PRESETS.find(x => x.id === id);
    if (!p) return;
    setLabelConfig(prev => ({
      ...prev,
      width: String(p.w),
      height: String(p.h),
      margin: String(p.m),
      barHeightMm: String(p.barH),
      fontSize: String(p.fontPx),
    }));
  }
  function normalizeRow(obj: any): ImportRow | null {
    const codeKeys = ["codigo", "código", "code", "clave", "clavearticulo", "clave_articulo"];
    const copiesKeys = ["copias", "copies", "cantidad", "qty", "cantidadcopias"];

    let code = "";
    let copiesRaw: any = undefined;
    for (const k of Object.keys(obj)) {
      const key = String(k).toLowerCase().replace(/\s|_/g, "");
      if (!code && codeKeys.includes(key)) code = String(obj[k] ?? "").trim();
      if (copiesRaw == null && copiesKeys.includes(key)) copiesRaw = obj[k];
    }

    if (!code && (obj.A != null || obj.B != null)) {
      code = String(obj.A ?? "").trim();
      copiesRaw = obj.B;
    }

    if (!code) return null;

    let copies = Number.parseInt(String(copiesRaw ?? "1"), 10);
    if (!Number.isFinite(copies) || copies < 1) copies = 1;
    return { code, copies };
  }

  async function handleExcelFile(file: File) {
    try {
      const XLSX = (await import("xlsx")).default ?? (await import("xlsx"));
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("La hoja 1 está vacía o no existe.");

      const rowsRaw: any[] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      if (rowsRaw.length === 0) throw new Error("No hay datos en el archivo.");

      const asObjects = XLSX.utils.sheet_to_json(ws, { defval: "" }) as any[];
      const normalizedA = asObjects
        .map(normalizeRow)
        .filter((r): r is ImportRow => !!r?.code);

      let normalized = normalizedA;
      if (normalized.length === 0) {
        const AisHeader = String(rowsRaw[0]?.[0] ?? "")
          .toLowerCase()
          .includes("odigo");
        const startIdx = AisHeader ? 1 : 0;
        const fromAB = rowsRaw
          .slice(startIdx)
          .map((arr) => {
            const code = String(arr?.[0] ?? "").trim();
            const copiesRaw = arr?.[1];
            if (!code) return null;
            let copies = Number.parseInt(String(copiesRaw ?? "1"), 10);
            if (!Number.isFinite(copies) || copies < 1) copies = 1;
            return { code, copies } as ImportRow;
          })
          .filter(Boolean) as ImportRow[];
        normalized = fromAB;
      }

      if (normalized.length === 0) {
        throw new Error(
          "No se pudieron interpretar filas válidas (se esperan columnas: código y copias)."
        );
      }

      mergeImportedArticles(normalized);
    } catch (err: any) {
      alert(err?.message || "Error al leer el archivo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function upsertArticleByCode(code: string, qty: number, desc?: string) {
    const clean = String(code || "").trim();
    const safeQty = Math.max(1, Math.floor(qty || 1));
    if (!clean) return;

    setArticles((prev) => {
      const idx = prev.findIndex((a) => a.barcode === clean);
      if (idx !== -1) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + safeQty,
          desc: next[idx].desc || desc,
        };
        return next;
      }
      return [
        ...prev,
        {
          id: `${Date.now()}_${clean}_${Math.random().toString(36).slice(2, 7)}`,
          text: clean,
          barcode: clean,
          quantity: safeQty,
          desc,
        },
      ];
    });
  }

  function mergeImportedArticles(rows: ImportRow[]) {
    for (const r of rows) {
      if (!r?.code) continue;
      upsertArticleByCode(r.code, r.copies);
    }
  }

  function onPickExcelClick() {
    fileInputRef.current?.click();
  }

  function onExcelInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleExcelFile(file);
  }

  function downloadTemplate() {
    const csv = "codigo,copias\nABC123,1\nXYZ001,3\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_importacion.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // Plantillas locales
  useEffect(() => {
    const savedTemplates = localStorage.getItem("labelTemplates");
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
  }, []);
  useEffect(() => {
    localStorage.setItem("labelTemplates", JSON.stringify(templates));
  }, [templates]);

  // Tamaños desde API
  useEffect(() => {
    const load = async () => {
      try {
        setIsLoadingTamanos(true);
        setTamanosError(null);
        const r = await fetch("/api/tamano_etiquetas", {
          headers: { Accept: "application/json" },
        });
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || "No se pudieron cargar los tamaños");
        setTamanos(Array.isArray(json.data) ? json.data : []);
      } catch (e: any) {
        setTamanosError(e?.message || "Error de red");
        setTamanos([]);
      } finally {
        setIsLoadingTamanos(false);
      }
    };
    load();
  }, []);

  // Autodetect DPI al montar
  useEffect(() => {
    (async () => {
      try {
        await ensureBrowserPrintLoaded();
        const available = await bpIsAvailable();
        if (!available) {
          setDpiMsg("Zebra no detectada (usando 203 DPI)");
          return;
        }
        setDpiMsg("Detectando DPI…");
        const dpi = await bpDetectPrinterDpi();
        setPrinterDpi(dpi);
        setDpiMsg(`DPI detectado: ${dpi}`);
      } catch {
        setDpiMsg("No se pudo detectar DPI (usando 203)");
      }
    })();
  }, []);
  async function bpDetectPrinterDpi(): Promise<203 | 300 | 600> {
    try {
      const BP = await getBP();
      const dev = await new Promise<any>((res) =>
        BP.getDefaultDevice("printer", (d: any) => res(d), () => res(null))
      );
      if (!dev) return 203;

      const send = (cmd: string) => new Promise<string>((resolve) => {
        // Algunos BrowserPrint tienen sendThenRead, otros solo send/read
        const tryRead = () => {
          try {
            if (typeof dev.read === "function") {
              dev.read((data: string) => resolve(String(data || "")), () => resolve(""));
            } else {
              resolve("");
            }
          } catch { resolve(""); }
        };
        try {
          if (typeof dev.sendThenRead === "function") {
            dev.sendThenRead(cmd, (data: string) => resolve(String(data || "")), () => resolve(""));
          } else if (typeof dev.send === "function") {
            dev.send(cmd, tryRead, tryRead);
          } else if (typeof dev.write === "function") {
            dev.write(cmd, tryRead, tryRead);
          } else {
            resolve("");
          }
        } catch { resolve(""); }
      });

      // ^HH devuelve configuración donde suele salir la resolución del cabezal
      const resp = await send("^XA^HH^XZ");
      const txt = resp.toUpperCase();

      // Intenta encontrar 203 / 300 / 600 en líneas típicas
      if (/203\s*DPI|DPI[:=]\s*203|RESOLUTION.*203/i.test(resp)) return 203;
      if (/300\s*DPI|DPI[:=]\s*300|RESOLUTION.*300/i.test(resp)) return 300;
      if (/600\s*DPI|DPI[:=]\s*600|RESOLUTION.*600/i.test(resp)) return 600;

      // Algunas ZQ devuelven el modelo; inferimos por nombre si no hay DPI textual
      const name = (dev?.name || "").toUpperCase();
      if (/ZQ5/.test(name)) {
        // ZQ511/521 suelen venir en 203 o 300; si no hubo match arriba, asumimos 203
        return 203;
      }
      return 203;
    } catch {
      return 203;
    }
  }

  // Config con límites
  const handleConfigChange = (key: string, value: string | boolean) => {
    setLabelConfig((prev) => {
      if (key === "width") {
        const w = clampMm(parseFloat(String(value)), MAX_W_MM);
        if (barcodeFormat === "QR") {
          const qr = clampQrSize(
            parseFloat(prev.qrSizeMm || "16"),
            w,
            parseFloat(prev.height || "25"),
            parseFloat(prev.margin || "0")
          );
          return { ...prev, width: String(w), qrSizeMm: String(qr) };
        }
        return { ...prev, width: String(w) };
      }

      if (key === "height") {
        const h = clampMm(parseFloat(String(value)), MAX_H_MM);
        const bar = clampBarHeight(
          parseFloat(prev.barHeightMm || "20"),
          h,
          parseFloat(prev.margin || "0")
        );
        if (barcodeFormat === "QR") {
          const qr = clampQrSize(
            parseFloat(prev.qrSizeMm || "16"),
            parseFloat(prev.width || "50"),
            h,
            parseFloat(prev.margin || "0")
          );
          return { ...prev, height: String(h), barHeightMm: String(bar), qrSizeMm: String(qr) };
        }
        return { ...prev, height: String(h), barHeightMm: String(bar) };
      }

      if (key === "margin") {
        const margin = Math.max(0, parseFloat(String(value)));
        const bar = clampBarHeight(
          parseFloat(prev.barHeightMm || "20"),
          parseFloat(prev.height || "25"),
          margin
        );
        if (barcodeFormat === "QR") {
          const qr = clampQrSize(
            parseFloat(prev.qrSizeMm || "16"),
            parseFloat(prev.width || "50"),
            parseFloat(prev.height || "25"),
            margin
          );
          return { ...prev, margin: String(margin), barHeightMm: String(bar), qrSizeMm: String(qr) };
        }
        return { ...prev, margin: String(margin), barHeightMm: String(bar) };
      }

      if (key === "barHeightMm") {
        const h = clampBarHeight(
          parseFloat(String(value)),
          parseFloat(prev.height || "25"),
          parseFloat(prev.margin || "0")
        );
        if (barcodeFormat === "QR") {
          const qr = clampQrSize(
            h,
            parseFloat(prev.width || "50"),
            parseFloat(prev.height || "25"),
            parseFloat(prev.margin || "0")
          );
          return { ...prev, barHeightMm: String(h), qrSizeMm: String(qr) };
        }
        return { ...prev, barHeightMm: String(h) };
      }

      return { ...prev, [key]: value };
    });
  };

  const aplicarTamanoBD = (t: TamanoEtiqueta) => {
    const w = clampMm(t.width, MAX_W_MM);
    const h = clampMm(t.height, MAX_H_MM);
    const m = Math.max(0, t.margen || 0);
    const bar = clampBarHeight(t.altoBarra ?? 20, h, m);

    setLabelConfig((prev) => ({
      ...prev,
      width: String(w),
      height: String(h),
      margin: String(m),
      fontSize: String(t.fontSizeClaveArticulo),
      barHeightMm: String(bar),
    }));
  };

  const saveTemplate = () => {
    if (!templateName.trim()) return;
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
    };
    setTemplates((prev) => [...prev, newTemplate]);
    setTemplateName("");
    setIsTemplateModalOpen(false);
  };

  const loadTemplate = (templateId: string) => {
    const t = templates.find((x) => x.id === templateId);
    if (!t) return;
    setLabelConfig((prev) => ({ ...prev, ...t.config }));
    setSelectedTemplate(templateId);
  };

  const deleteTemplate = (templateId: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
    if (selectedTemplate === templateId) setSelectedTemplate("");
  };

  const addArticle = (claveOverride?: string, descOverride?: string) => {
    const clave = (claveOverride ?? labelConfig.text).trim();
    if (!clave) return;
    const qty = Number.parseInt(labelConfig.quantity, 10) || 1;
    upsertArticleByCode(clave, qty, descOverride);
    setLabelConfig((prev) => ({ ...prev, text: "", quantity: "1" }));
    setSearchResults([]);
    setSearchError(null);
  };

  const removeArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id));
  };

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

  const isMobile = () => /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // === Impresión nativa del navegador (fallback) ===
  const handlePrint = () => {
    if (articles.length === 0) return;

    const labelW = clampMm(parseFloat(labelConfig.width), MAX_W_MM);
    const labelH = clampMm(parseFloat(labelConfig.height), MAX_H_MM);
    const padding = Math.max(0, parseFloat(labelConfig.margin));
    const barH = clampBarHeight(parseFloat(labelConfig.barHeightMm || "20"), labelH, padding);
    const fontPx = parseFloat(labelConfig.fontSize);
    const fontFamily = labelConfig.font;
    const fmt = barcodeFormat;
    const showDesc = !!labelConfig.showDesc;
    const descFontPx = Math.max(6, parseFloat(labelConfig.descFontSize || "12"));

    const esc = (s: string) =>
      String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const bodyHtml = articles
      .map((a) =>
        Array.from({ length: a.quantity }, () => `
      <div class="page">
        <div class="label ${fmt === "QR" ? "row" : "column"}">
          ${fmt === "QR"
            ? `<canvas class="qr-canvas" data-value="${a.barcode}"></canvas>`
            : `<svg class="barcode-svg" data-value="${a.barcode}" data-format="${fmt}"></svg>`
          }
          <div class="label-text">${esc(a.text)}</div>
          ${showDesc && a.desc ? `<div class="desc-text">${esc(a.desc)}</div>` : ""}
        </div>
      </div>`).join("")
      ).join("");

    const printHtml = `
<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Etiquetas</title>
<style>
  @page { size: ${labelW}mm ${labelH}mm; margin: 0; }
  html, body { margin: 0; padding: 0; width: ${labelW}mm; height: ${labelH}mm; font-family: ${fontFamily}; }
  *, *::before, *::after { box-sizing: border-box; }
  .page { width: ${labelW}mm; height: ${labelH}mm; padding: ${padding}mm; display:flex; align-items:center; justify-content:center; break-after:page; overflow:hidden; }
  .label { width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0; }
  .barcode-svg { width: 100%; height: ${barH}mm; }
  .qr-canvas { width: ${labelConfig.qrSizeMm}mm; height: ${labelConfig.qrSizeMm}mm; }
  .desc-text { font-size:${descFontPx}px; text-align:center; width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .label-text { width:100%; font-size:${fontPx}px !important; font-weight:600; text-align:center; word-break:break-word; }
  @media print { html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head><body>
${bodyHtml}
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
<script>
(function(){
  function render() {
    document.querySelectorAll('svg.barcode-svg').forEach(svg=>{
      try {
        JsBarcode(svg, svg.dataset.value, { format: svg.dataset.format, displayValue:false, margin:0, width:1.2 });
        svg.setAttribute('preserveAspectRatio','none');
      } catch(e){}
    });
    document.querySelectorAll('canvas.qr-canvas').forEach(c=>{
      try {
        const rect = c.getBoundingClientRect();
        const devicePx = Math.ceil(rect.width * 2);
        c.width = devicePx; c.height = devicePx;
        QRCode.toCanvas(c, c.dataset.value, { errorCorrectionLevel:"M", margin:0, width:devicePx });
        c.style.width = rect.width + 'px';
        c.style.height = rect.width + 'px';
      } catch(e){}
    });
  }
  window.addEventListener('load', ()=>{ render(); setTimeout(()=>{ window.print(); }, 200); });
  window.addEventListener('afterprint', ()=>{ try{ window.close(); }catch(e){} });
})();
</script>
</body></html>`;

    if (isMobile()) {
      const w = window.open("", "_blank", "noopener,noreferrer");
      if (!w) { alert("Activa las ventanas emergentes para imprimir las etiquetas."); return; }
      w.document.open(); w.document.write(printHtml); w.document.close();
    } else {
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed"; iframe.style.width = "0"; iframe.style.height = "0"; iframe.style.border = "0";
      document.body.appendChild(iframe);
      const doc = iframe.contentDocument!;
      doc.open(); doc.write(printHtml); doc.close();
      const cleanup = () => { try { document.body.removeChild(iframe); } catch { } };
      setTimeout(cleanup, 10000);
    }
  };

  // === Smart Print: BrowserPrint -> fallback navegador ===
  const handleSmartPrint = async () => {
    if (articles.length === 0) return;

    try { await ensureBrowserPrintLoaded(); } catch { }

    let okBP = false;
    try { okBP = await bpIsAvailable(); } catch { okBP = false; }

    if (okBP) {
      try {
        const zpl = buildZplFromState(
          articles.map(a => ({ barcode: a.barcode, text: a.text, quantity: a.quantity, desc: a.desc })),
          {
            width: labelConfig.width,
            height: labelConfig.height,
            margin: labelConfig.margin,
            fontSize: labelConfig.fontSize,
            barHeightMm: labelConfig.barHeightMm,
            font: labelConfig.font,
            showDesc: labelConfig.showDesc,
            descFontSize: labelConfig.descFontSize,
            topShiftMm: labelConfig.topShiftMm,   // ⬅️ usa el valor del estado
          },
          barcodeFormat,
          printerDpi
        );

        await bpPrintZPL(zpl);
        new Noty({ type: "success", layout: "topRight", theme: "mint", text: `Enviado a Zebra (${printerDpi} DPI).`, timeout: 2000 }).show();
        return;
      } catch (e: any) {
        console.warn("BrowserPrint falló:", e);
        new Noty({ type: "warning", layout: "topRight", theme: "mint", text: "No se pudo usar BrowserPrint; abriendo impresión del navegador…", timeout: 2200 }).show();
      }
    }

    handlePrint();
  };

  const totalLabels = useMemo(
    () => articles.reduce((s, a) => s + a.quantity, 0),
    [articles]
  );

  // búsqueda con debounce
  useEffect(() => {
    const q = labelConfig.text.trim();
    setSearchError(null);
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    if (q.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;

    const t = setTimeout(async () => {
      try {
        setIsSearching(true);

        const r = await fetch(`/api/articulos?q=${encodeURIComponent(q)}`, {
          method: "GET",
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });

        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || "Error buscando artículos");

        const results = Array.isArray(json.data) ? json.data : [];
        setSearchResults(results);

        // 🟡 Si no se encontró nada, mostrar alerta
        if (results.length === 0) {
          const confirmAdd = window.confirm(
            `No se encontró el código "${q}".\n¿Deseas agregarlo de todas formas a la lista?`
          );
          if (confirmAdd) {
            // Aquí puedes llamar a tu función de agregar manualmente
            // Ejemplo: addArticulo({ claveArticulo: q, nombre: q });
            console.log("Agregar manualmente:", q);
          }
        }

      } catch (err: any) {
        if (err?.name !== "AbortError") {
          setSearchError(err?.message || "Error de red");
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [labelConfig.text]);


  const onArticleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (searchResults.length > 0) {
        const first = searchResults[0];
        addArticle(first.claveArticulo, first.nombre);
      } else if (labelConfig.text.trim()) {
        addArticle();
      }
    }
  };

  // ===== Preview medidas =====
  const naturalW = mmToPx(parseFloat(labelConfig.width));
  const naturalH = mmToPx(parseFloat(labelConfig.height));
  const previewPad = Math.max(0, parseInt(labelConfig.margin));
  const previewBarHeightPx = mmToPx(parseFloat(labelConfig.barHeightMm || "20"));
  const previewScale = 1;
  const cellW = naturalW;
  const cellH = naturalH;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <style jsx global>{`
        input.no-spin::-webkit-outer-spin-button,
        input.no-spin::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
        input.no-spin { -moz-appearance: textfield; }
        @supports (-webkit-touch-callout: none) {
          input, select, textarea, button { font-size: 16px; }
        }
      `}</style>

      <div className="min-h-screen p-4 sm:p-6">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-stretch min-h-0">
            {/* Izquierda */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm h-full flex flex-col w-full">
              <CardHeader className="border-b border-gray-600 w-full">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <CardTitle className="flex items-center gap-2 text-white text-lg sm:text-xl">
                    <Settings className="w-5 h-5 text-purple-300" />
                    <span>Configuración</span>
                  </CardTitle>
                  <div className="flex items-center gap-3 text-white font-light text-xs sm:text-sm">
                    <span className="shrink-0">v1.4.2</span>
                    <span className="text-purple-300">{dpiMsg}</span>
                    <Link href="/actualizaciones" className="text-purple-300 hover:text-purple-200" title="Ver historial de actualizaciones">
                      <Info className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
                {/* Búsqueda / artículo */}
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
                        if (searchResults.length > 0) addArticle(searchResults[0].claveArticulo);
                        else if (labelConfig.text.trim()) addArticle();
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
                                setLabelConfig(prev => ({ ...prev, text: item.claveArticulo }));
                                addArticle(item.claveArticulo, item.nombre);
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

                {/* Tamaños BD */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium text-sm sm:text-base">
                    Tamaño típico (presets)
                  </Label>
                  <Select
                    value={selectedPresetId}
                    onValueChange={(id) => {
                      setSelectedPresetId(id);
                      aplicarPreset(id);
                      // opcional: limpia el tamaño BD seleccionado si quieres
                      setSelectedTamanoId("");
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-500 text-white w-full">
                      <SelectValue placeholder="Selecciona un tamaño típico" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-500 max-h-64 overflow-y-auto">
                      {SIZE_PRESETS.map(p => (
                        <SelectItem key={p.id} value={p.id} className="text-white">
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Formato */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium text-sm sm:text-base">Formato de código de barras</Label>
                  <Select
                    value={barcodeFormat}
                    onValueChange={(v: "CODE128" | "CODE128B" | "QR") => {
                      setBarcodeFormat(v);
                      if (v === "QR") {
                        setLabelConfig(prev => {
                          const qr = clampQrSize(
                            parseFloat(prev.barHeightMm || "20"),
                            parseFloat(prev.width || "50"),
                            parseFloat(prev.height || "25"),
                            parseFloat(prev.margin || "0")
                          );
                          return { ...prev, qrSizeMm: String(qr) };
                        });
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

                {/* Manual / Plantillas */}
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
                      <DialogHeader><DialogTitle className="text-white">Crear Nueva Plantilla</DialogTitle></DialogHeader>
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
                          <Button variant="ghost" onClick={() => setIsTemplateModalOpen(false)} className="text-gray-300 hover:text-white w-full sm:w-auto">Cancelar</Button>
                          <Button onClick={saveTemplate} disabled={!templateName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" /> Guardar
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Medidas */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Margen interno (mm)</Label>
                  <NumberField value={labelConfig.margin} onChange={(v) => handleConfigChange("margin", v)} min={3} step={0.5} ariaLabel="Margen interno en milímetros" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Ancho (mm)</Label>
                    <NumberField value={labelConfig.width} onChange={(v) => handleConfigChange("width", v)} min={1} max={135} step={1} ariaLabel="Ancho en milímetros" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Alto (mm)</Label>
                    <NumberField value={labelConfig.height} onChange={(v) => handleConfigChange("height", v)} min={1} max={300} step={1} ariaLabel="Alto en milímetros" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Alto barras (mm)</Label>
                  <NumberField value={labelConfig.barHeightMm} onChange={(v) => handleConfigChange("barHeightMm", v)} min={4} step={1} ariaLabel="Alto de las barras en milímetros" />
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Número de impresiones</Label>
                  <NumberField value={labelConfig.quantity} onChange={(v) => handleConfigChange("quantity", v)} min={1} step={1} ariaLabel="Número de impresiones" />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Tamaño del código (px)</Label>
                    <NumberField value={labelConfig.fontSize} onChange={(v) => handleConfigChange("fontSize", v)} min={6} step={1} ariaLabel="Tamaño de fuente en píxeles" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Fuente</Label>
                    <Select value={labelConfig.font} onValueChange={(value) => handleConfigChange("font", value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-500 text-white w-full"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-500">
                        <SelectItem value="Arial" className="text-white">Arial</SelectItem>
                        <SelectItem value="Helvetica" className="text-white">Helvetica</SelectItem>
                        <SelectItem value="Times" className="text-white">Times</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Descripción */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="showDesc" className="text-gray-100 font-medium">Mostrar descripción</Label>
                    <div className="flex items-center gap-2 bg-gray-700 border border-gray-500 rounded-md px-3 py-2">
                      <input id="showDesc" type="checkbox" checked={!!labelConfig.showDesc} onChange={(e) => handleConfigChange("showDesc", e.target.checked)} className="h-4 w-4 accent-purple-600" />
                      <span className="text-gray-200 text-sm">Imprimir texto debajo del código</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Tamaño descripción (px)</Label>
                    <NumberField
                      value={labelConfig.descFontSize}
                      onChange={(v) => handleConfigChange("descFontSize", v)}
                      min={6} step={1} ariaLabel="Tamaño de la descripción en píxeles"
                      className={labelConfig.showDesc ? "" : "opacity-50 pointer-events-none"}
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2 sm:pt-4 flex-col sm:flex-row">
                  <Button onClick={handleSmartPrint} className="bg-gray-600 hover:bg-gray-700 text-white border-0 w-full sm:flex-1" disabled={articles.length === 0}>
                    <Printer className="w-4 h-4 mr-2" /> Imprimir (Browser/Print)
                  </Button>
                </div>

                <div className="flex gap-3 pt-2 sm:pt-4 flex-col sm:flex-row">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white border-0 w-full sm:w-auto" onClick={onPickExcelClick} title="Importar desde Excel/CSV">
                    <Plus className="w-4 h-4 mr-2" /> Importar Excel
                  </Button>
                  <Button size="sm" variant="ghost" className="text-gray-300 hover:text-white w-full sm:w-auto" onClick={downloadTemplate} title="Descargar plantilla CSV">
                    Descargar plantilla
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Derecha: Tabla + Preview */}
            <div className="flex flex-col gap-4 sm:gap-6 h-full min-h-0">
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1 flex min-h-0">
                <CardHeader className="border-b border-gray-600 shrink-0">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <CardTitle className="text-white text-lg sm:text-xl">Artículos ({articles.length})</CardTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={onExcelInputChange} className="hidden" />
                      <Button size="sm" variant="ghost" onClick={resetArticles} disabled={articles.length === 0}
                        title="Eliminar todos los artículos"
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Eliminar todos los artículos">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-purple-300">Total: {totalLabels} etiquetas</span>
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
                            {a.desc && <p className="text-gray-300 text-xs truncate" title={a.desc}>{a.desc}</p>}
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
                      <div className="text-center text-gray-400"><p>Agrega artículos para ver la vista previa</p></div>
                    ) : (
                      <div className="grid gap-3 sm:gap-4 justify-center w-full"
                        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${cellW}px, 1fr))` }}>
                        {articles.slice(0, 1).map((a) => (
                          <div key={a.id} className="flex items-center justify-center"
                            style={{ width: `${cellW}px`, height: `${cellH}px`, overflow: "hidden" }}>
                            <div className="bg-white rounded-md shadow-lg border-2 border-gray-300 flex flex-col items-center justify-center relative"
                              style={{ width: `${naturalW}px`, height: `${naturalH}px`, transform: `scale(${previewScale})`, transformOrigin: "top left", padding: `${previewPad}px` }}>
                              {barcodeFormat === "QR" ? (
                                <QRCodeSVG value={a.barcode} sizePx={mmToPx(parseFloat(labelConfig.qrSizeMm))} />
                              ) : (
                                <BarcodeSVG
                                  value={a.barcode}
                                  format={barcodeFormat as "CODE128" | "CODE128B"}
                                  heightPx={previewBarHeightPx}
                                  fontFamily={labelConfig.font}
                                  fontSizePx={parseFloat(labelConfig.fontSize)}
                                />
                              )}

                              <div className="text-black text-center font-medium"
                                style={{ fontSize: `${Math.max(10, Number.parseInt(labelConfig.fontSize) * 0.8)}px`, marginTop: "6px", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                title={a.text}>
                                {a.text}
                              </div>
                              {labelConfig.showDesc && a.desc && (
                                <div className="text-black text-center"
                                  style={{ fontSize: `${Math.max(6, parseFloat(labelConfig.descFontSize || "12"))}px`, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                                  title={a.desc}>
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
  );
}

/****************************VERSION ESTABLE********************************/
