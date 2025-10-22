"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Eye, Upload, Download, Trash2, Plus, RotateCcw } from "lucide-react";

// ====== Constantes ======
const TEMPLATES = {
  "barcode-dos": { label: "Gabeta grande 101x25", width: 101, height: 25.4 },
  "barcode-dos-mini": { label: "Gabeta Pequeña 50×25", width: 50, height: 25 },
} as const;

type TemplateKey = keyof typeof TEMPLATES;

// ====== Utilidades ======
function ensureJsBarcodeLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // @ts-ignore
  if (window.JsBarcode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("jsbarcode-cdn") as HTMLScriptElement | null;
    // @ts-ignore
    if (existing && window.JsBarcode) return resolve();
    const s = document.createElement("script");
    s.id = "jsbarcode-cdn";
    s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar JsBarcode"));
    document.head.appendChild(s);
  });
}
function uuid(): string {
  // Soporte nativo
  if (typeof crypto !== "undefined" && typeof (crypto as any).randomUUID === "function") {
    return (crypto as any).randomUUID();
  }
  // RFC4122 v4 con getRandomValues
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40; // versión 4
    b[8] = (b[8] & 0x3f) | 0x80; // variante
    const hex = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Fallback por Math.random (menos robusto, pero suficiente para IDs UI)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


function ensureQrLoaded(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  // @ts-ignore
  if ((window as any).QRCode) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("qrcode-cdn") as HTMLScriptElement | null;
    // @ts-ignore
    if (existing && (window as any).QRCode) return resolve();
    const s = document.createElement("script");
    s.id = "qrcode-cdn";
    s.src = "https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No se pudo cargar QRCode"));
    document.head.appendChild(s);
  });
}

function renderAllBarcodes(root: Document | HTMLElement = document) {
  // @ts-ignore
  if (!("JsBarcode" in window)) return;
  const els = Array.from(root.querySelectorAll<SVGSVGElement>(".bc"));
  // @ts-ignore
  const JB = (window as any).JsBarcode;
  for (const el of els) {
    const code = el.getAttribute("data-code") || "";
    if (!code) continue;
    try {
      JB(el, code, { format: "CODE128", displayValue: false, margin: 0, height: 50 });
    } catch { }
    el.removeAttribute("width");
    el.removeAttribute("height");
    (el as any).style.width = "100%";
    (el as any).style.height = "100%";
  }
}

function renderAllQRs(root: Document | HTMLElement = document) {
  // @ts-ignore
  if (!((window as any).QRCode)) return;
  const els = Array.from(root.querySelectorAll<HTMLCanvasElement>(".qr"));
  // @ts-ignore
  const QR = (window as any).QRCode;
  for (const cv of els) {
    const val = cv.getAttribute("data-value") || "";
    if (!val) continue;
    try {
      QR.toCanvas(cv, val, { errorCorrectionLevel: "M", margin: 0, width: px(14) });
    } catch { }
  }
}

const cssForPrint = (w: number, h: number) => `
  @page{ size:${w}mm ${h}mm; margin:0 }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  .page{ width:${w}mm; height:${h}mm; page-break-after:always; display:flex; align-items:center; justify-content:center; background:#fff; }
  .label{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; font-family: Arial, Helvetica, sans-serif; text-align:center; padding: 2mm; }
  .grid2{ display:grid; grid-template-columns: 1fr 22mm; gap:1mm; width:100%; height:100%; align-items:center; overflow:hidden; }
  .left{ display:grid; grid-template-rows: 15mm auto; align-items:center; height:100%; padding-right: 2mm; overflow:hidden; }
  .left2{ display:flex; flex-direction:column; align-items:center; height:100%; padding-right: 2mm; overflow:hidden; }
  .left .barcodeBox, .left2 .barcodeBox{ width:100%; height:100%; display:flex; align-items:center; justify-content:center; }
  .left .ubicacion, .left2 .ubicacion{
    font-size:20px; line-height:1.1; font-weight:900; color:#000;
    overflow:hidden; text-overflow:ellipsis;
    display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;
    word-break:break-word; hyphens:none;
  }
  .right{ height:100%; display:grid; justify-items:center; align-items:center; justify-content:center; align-content:center; padding-left:2mm; }
  .right .valor{
    font-size: clamp(24px, 5vw, 40px);
    font-weight:800; line-height:1; color:#000;
    max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
  }
  .left .ubicacion:empty::before, .left2 .ubicacion:empty::before { content:"Ubicación"; opacity:.6; }
  .right .valor:empty::before { content:"00"; opacity:.6; }
  .bc.placeholder { width:100%; height:50px; background:repeating-linear-gradient(90deg,#ddd 0 2px,transparent 2px 4px); }
`;

function px(mm: number) { return Math.max(1, Math.round(mm * 3.78)); }

function escapeHtml(s: string) {
  return s.replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

// ====== NUEVO: tipos y helpers Excel ======
type ExcelRow = { ubicacion: string; cantidad: number };
function normHeader(h: string) { return h.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim(); }
function pick(headers: string[], target: string) {
  const idx = headers.findIndex((h) => normHeader(h) === target);
  return idx >= 0 ? idx : -1;
}

// ====== NUEVO: tipo de item en cola ======
type QueueItem = { id: string; texto: string; copias: number };

export default function EtiquetadorConPlantillas() {
  const [template, setTemplate] = useState<TemplateKey>("barcode-dos");
  const [texto, setTexto] = useState("");
  const [copias, setCopias] = useState(1);

  // ====== NUEVO: cola de impresión ======
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const W = TEMPLATES[template].width;
  const H = TEMPLATES[template].height;
  const boxW = useMemo(() => px(W), [W]);
  const boxH = useMemo(() => px(H), [H]);

  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([ensureJsBarcodeLoaded(), ensureQrLoaded()]).then(() => {
      if (previewRef.current) {
        renderAllBarcodes(previewRef.current);
        renderAllQRs(previewRef.current);
      }
    });
  }, [template, texto, queue]); // re-render por si quieres ver sample

  function renderTemplateHTML(innerText: string): string {
    const code = escapeHtml(innerText || "");
    const escText = escapeHtml((innerText || "").trim());
    const lastToken = (innerText || "").split(/[^A-Za-z0-9]+/).filter(Boolean).pop() || "";
    const escTwo = escapeHtml(lastToken.slice(-2));

    switch (template) {
      case "barcode-dos":
        return `
          <div class="grid2">
            <div class="left">
              <div class="barcodeBox">
                ${code ? `<svg class="bc" data-code="${code}"></svg>` : `<div class="bc placeholder"></div>`}
              </div>
              <div class="ubicacion">${escText}</div>
            </div>
            <div class="right">
              <div class="valor">${escTwo}</div>
            </div>
          </div>`;
      case "barcode-dos-mini":
        return `
          <div class="grid2">
            <div class="left2">
              <div class="barcodeBox">
                ${code ? `<canvas class="qr" data-value="${code}"></canvas>` : `<div class="bc placeholder"></div>`}
              </div>
              <div class="ubicacion" style="font-size:12px">${escText}</div>
            </div>
            <div class="right">
              <div class="valor" style="font-size:32px">${escTwo}</div>
            </div>
          </div>`;
    }
  }

  // ====== NUEVO: agregar a cola desde campos manuales
  const addToQueue = () => {
    const t = (texto || "").trim();
    if (!t) return;

    const c = Math.max(1, +copias || 1);

    setQueue((q) => {
      // Buscar si ya existe el mismo texto en la cola
      const existing = q.find((item) => item.texto.toLowerCase() === t.toLowerCase());
      if (existing) {
        // Si existe, aumentar las copias
        return q.map((item) =>
          item.texto.toLowerCase() === t.toLowerCase()
            ? { ...item, copias: item.copias + c }
            : item
        );
      } else {
        // Si no existe, agregar nuevo
        return [{ id: uuid(), texto: t, copias: c }, ...q];
      }
    });

    setTexto(""); // limpiar campo después de agregar
  };



  // ====== NUEVO: eliminar item de la cola
  const removeFromQueue = (id: string) => setQueue((q) => q.filter((i) => i.id !== id));

  // ====== NUEVO: vaciar cola
  const clearQueue = () => setQueue([]);

  // ====== NUEVO: imprimir TODO lo de la cola (un solo botón)
  const printAll = () => {
    if (!queue.length) return;
    const pagesHtml = queue
      .flatMap((item) => {
        const inner = renderTemplateHTML(item.texto);
        const page = `<div class="page"><div class="label">${inner}</div></div>`;
        return Array.from({ length: Math.max(1, item.copias) }, () => page);
      })
      .join("");
    openPrintHtml(pagesHtml, W, H);
  };

  // Mantengo esta función reutilizable
  function openPrintHtml(pagesHtml: string, widthMm: number, heightMm: number) {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>Etiquetas</title>
      <style>${cssForPrint(widthMm, heightMm)}</style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
      <script>
        function mmToPx(mm){ return Math.max(1, Math.round(mm * 3.78)); }
        window.addEventListener('load',function(){
          try{
            document.querySelectorAll('.bc').forEach(function(el){
              var c=el.getAttribute('data-code')||'';
              if(!c) return;
              JsBarcode(el,c,{format:'CODE128',displayValue:false,margin:0,height:50});
              el.removeAttribute('width'); el.removeAttribute('height');
              el.style.width='100%'; el.style.height='100%';
            });
          }catch(e){}
          try{
            document.querySelectorAll('.qr').forEach(function(cv){
              var v=cv.getAttribute('data-value')||'';
              if(!v) return;
              QRCode.toCanvas(cv,v,{ errorCorrectionLevel:'M', margin:0, width:mmToPx(14) });
            });
          }catch(e){}
          setTimeout(function(){ window.print(); }, 0);
        });
      <\/script>
    </head><body>${pagesHtml}</body></html>`;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => { try { iframe.remove(); } catch { } }, 5000);
  }

  // ====== NUEVO: descarga de plantilla CSV
  function downloadTemplate() {
    const csv = "ubicacion,cantidad\nA1-01,2\nB2-15,1\n";
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_ubicaciones.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ====== NUEVO: importar Excel/CSV directo a la cola
  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImportError(null);
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const xlsxMod = await import("xlsx");
      const XLSX: any = (xlsxMod as any).default ?? xlsxMod;
      if (!XLSX?.read) throw new Error("No se pudo cargar 'xlsx' (read no disponible).");

      const data = await f.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const wsName = wb.SheetNames?.[0];
      if (!wsName) throw new Error("El archivo no contiene hojas.");
      const ws = wb.Sheets[wsName];
      const json = XLSX.utils.sheet_to_json<any>(ws, { header: 1, defval: "" }) as (string | number)[][];

      if (!json.length) throw new Error("El archivo está vacío.");
      const headers = (json[0] as any[]).map((x) => String(x ?? ""));
      const iUb = pick(headers, "ubicacion"); // acepta "ubicación"
      const iCant = pick(headers, "cantidad");
      if (iUb < 0 || iCant < 0) throw new Error(`Encabezados: "ubicacion" y "cantidad". Recibidos: ${headers.join(", ")}`);

      const imported: QueueItem[] = json.slice(1).flatMap((row) => {
        const r = row as any[];
        const ubicacion = String(r[iUb] ?? "").trim();
        const cantidad = Number(r[iCant] ?? 0);
        if (!ubicacion || !Number.isFinite(cantidad) || cantidad <= 0) return [];
        return [{ id: uuid(), texto: ubicacion, copias: cantidad }];

      });

      if (!imported.length) throw new Error("No se encontraron filas válidas (ubicacion/cantidad>0).");

      setQueue((q) => [...imported, ...q]);
    } catch (err: any) {
      setImportError(err?.message || "No se pudo leer el archivo.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  // ========== PREVIEW ==========
  const sampleForPreview = queue[0]?.texto ?? texto; // muestra el primero de la cola, o el texto actual

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <div className="min-h-screen p-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-8 items-start">

          {/* 🟣 COLUMNA IZQUIERDA: Configuración */}
          <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm xl:col-span-1 h-full">
            <CardHeader className="border-b border-gray-600">
              <CardTitle className="text-white">Etiquetador</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-gray-100">Plantilla</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white w-full">
                    <SelectValue placeholder="Elige la plantilla" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TEMPLATES).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-gray-100">Texto</Label>
                <Input
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  placeholder="Escribe el código o ubicación"
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                  onKeyDown={(e) => { if (e.key === "Enter") addToQueue(); }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-100">Copias</Label>

                <div className="flex items-center gap-2">
                  {/* Stepper estilo compacto */}
                  <div className="flex items-center rounded-md border border-gray-600 overflow-hidden w-full">
                    <button
                      type="button"
                      onClick={() => setCopias((prev) => Math.max(1, prev - 1))}
                      className="w-10 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-200 text-lg font-semibold transition-colors"
                    >
                      −
                    </button>

                    <input
                      type="number"
                      min={1}
                      value={copias}
                      onChange={(e) => setCopias(Math.max(1, Number(e.target.value || 1)))}
                      className="w-full h-9 text-center bg-gray-800 text-white border-x border-gray-600 focus:outline-none focus:ring-0 font-semibold appearance-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />


                    <button
                      type="button"
                      onClick={() => setCopias((prev) => prev + 1)}
                      className="w-10 h-9 flex items-center justify-center bg-gray-800 hover:bg-gray-700 text-gray-200 text-lg font-semibold transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Botón para agregar */}
                  <Button
                    size="sm"
                    className="flex items-center justify-center bg-purple-600 hover:bg-purple-700 text-white border-0 px-3"
                    onClick={addToQueue}
                    title="Agregar a la cola"
                    disabled={!texto.trim()}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <Button
                onClick={printAll}
                className="w-full hover:bg-purple-400/30 text-purple-500 border border-purple-500 bg-transparent hover:text-white "
                disabled={!queue.length}
                title="Imprimir todos los elementos de la cola">
                <Printer className="w-4 h-4 mr-2" /> Imprimir todo
              </Button>

              {/* Acciones */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-gray-300 hover:text-white transition-colors border border-gray-700 hover:bg-gray-600 "
                  onClick={downloadTemplate}
                  title="Descargar plantilla CSV"
                >
                  <Download className="w-4 h-4 mr-2" /> Descargar plantilla
                </Button>

                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full bg-slate-600 hover:bg-slate-500 text-white"
                  onClick={() => fileInputRef.current?.click()}
                  title="Importar desde Excel/CSV"
                >
                  <Upload className="w-4 h-4 mr-2" /> Importar Excel/CSV
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={onFileChange}
                />
              </div>



              {importError && <div className="text-sm text-red-300">{importError}</div>}

              <p className="text-xs text-gray-300/80">
                Tamaño etiqueta: {W}×{H} mm. Plantilla: <em>{TEMPLATES[template].label}</em>.
              </p>
            </CardContent>
          </Card>

          {/* 🟢 COLUMNA DERECHA: Cola de impresión (arriba) y preview (abajo) */}
          <div className="flex flex-col gap-8">
            {/* Cola de impresión */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm flex-1">
              <CardHeader className="border-b border-gray-600">
                <CardTitle className="text-white flex items-center justify-between">
                  Cola de impresión

                  <div className="flex items-center">
                    <span className="text-sm text-gray-300 font-normal">
                      {queue.length} item(s)
                    </span>

                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-auto bg-transparent text-red-500 hover:bg-red-500/40 hover:text-white"
                      onClick={clearQueue}
                      title="Vaciar cola de impresión"
                      disabled={!queue.length}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>

                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {queue.length === 0 ? (
                  <div className="text-gray-300/80 text-sm">No hay elementos en la cola.</div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-auto pr-1">
                    {queue.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-2xl border border-slate-700/60 bg-slate-800/70 px-4 py-3
                 hover:bg-slate-700/60 transition-colors"
                      >
                        {/* Izquierda: título y subtítulo */}
                        <div className="min-w-0">
                          <div className="text-white font-semibold tracking-[0.2px] truncate">
                            {item.texto}
                          </div>
                          <div className="text-[13px] text-slate-300/85">
                            Código: {item.texto}
                          </div>
                        </div>

                        {/* Derecha: cantidad morada y eliminar */}
                        <div className="flex items-center gap-4 pl-4 shrink-0">
                          <span className="text-violet-300 font-medium select-none">
                            {item.copias}x
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="text-rose-400 hover:text-rose-300 hover:bg-transparent"
                            onClick={() => removeFromQueue(item.id)}
                            title="Eliminar"
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

            {/* Vista previa */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm min-h-[320px]">
              <CardHeader className="border-b border-gray-600">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Eye className="w-5 h-5 text-purple-300" /> Vista previa
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="flex items-center justify-center mx-auto" style={{ width: boxW, height: boxH }}>
                  <div ref={previewRef} style={{ width: "100%", height: "100%" }}>
                    <style>{cssForPrint(W, H)}</style>
                    <div className="page">
                      <div
                        className="label"
                        dangerouslySetInnerHTML={{ __html: renderTemplateHTML(sampleForPreview) }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );

}
