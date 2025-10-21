"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Printer, Eye } from "lucide-react";

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
    } catch {}
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
    } catch {}
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

  /* placeholders visuales */
  .left .ubicacion:empty::before, .left2 .ubicacion:empty::before { content:"Ubicación"; opacity:.6; }
  .right .valor:empty::before { content:"00"; opacity:.6; }

  /* placeholder visual de barcode */
  .bc.placeholder {
    width:100%; height:50px;
    background:repeating-linear-gradient(90deg,#ddd 0 2px,transparent 2px 4px);
  }
`;

function px(mm: number) {
  return Math.max(1, Math.round(mm * 3.78));
}

function escapeHtml(s: string) {
  return s.replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function EtiquetadorConPlantillas() {
  const [template, setTemplate] = useState<TemplateKey>("barcode-dos");
  const [texto, setTexto] = useState("");
  const [copias, setCopias] = useState(1);

  const W = TEMPLATES[template].width;
  const H = TEMPLATES[template].height;
  const boxW = useMemo(() => px(W), [W]);
  const boxH = useMemo(() => px(H), [H]);

  const barcodeValue = texto;
  const lastTwo = useMemo(() => {
    const lastToken = (texto || "").split(/[^A-Za-z0-9]+/).filter(Boolean).pop() || "";
    return lastToken.slice(-2);
  }, [texto]);

  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    Promise.all([ensureJsBarcodeLoaded(), ensureQrLoaded()]).then(() => {
      if (previewRef.current) {
        renderAllBarcodes(previewRef.current);
        renderAllQRs(previewRef.current);
      }
    });
  }, [barcodeValue, template, texto]);

  function renderTemplateHTML(innerText: string): string {
    const code = escapeHtml(barcodeValue || "");
    const escText = escapeHtml((innerText || "").trim());
    const escTwo = escapeHtml((lastTwo || "").trim());

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

  const handlePrint = () => {
    if (!texto.trim()) return;
    const inner = renderTemplateHTML(texto);
    const page = `<div class="page"><div class="label">${inner}</div></div>`;
    const pages = Array.from({ length: Math.max(1, copias) }, () => page).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>Etiqueta</title>
      <style>${cssForPrint(W, H)}</style>
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
    </head><body>${pages}</body></html>`;

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, { position: "fixed", right: "0", bottom: "0", width: "0", height: "0", border: "0", opacity: "0" });
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument!;
    doc.open();
    doc.write(html);
    doc.close();
    setTimeout(() => {
      try {
        iframe.remove();
      } catch {}
    }, 5000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <div className="min-h-screen p-6">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch">
          <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm">
            <CardHeader className="border-b border-gray-600">
              <CardTitle className="text-white">Etiquetador</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-1">
                <Label className="text-gray-100">Plantilla</Label>
                <Select value={template} onValueChange={(v) => setTemplate(v as TemplateKey)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handlePrint();
                  }}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-gray-100">Copias</Label>
                <Input
                  type="number"
                  min={1}
                  value={copias}
                  onChange={(e) => setCopias(Math.max(1, Number(e.target.value || 1)))}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handlePrint} className="bg-purple-600 hover:bg-purple-700 text-white border-0" disabled={!texto.trim()}>
                  <Printer className="w-4 h-4 mr-2" />
                  Imprimir
                </Button>
              </div>

              <p className="text-xs text-gray-300/80">
                Tamaño etiqueta: {W}×{H} mm. Plantilla: <em>{TEMPLATES[template].label}</em>.
              </p>
            </CardContent>
          </Card>

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
                    <div className="label" dangerouslySetInnerHTML={{ __html: renderTemplateHTML(texto) }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
