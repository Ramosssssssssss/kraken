"use client";
import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Printer, Eye } from "lucide-react";

const TEMPLATE_MM = { width: 101, height: 25.4 };

// Cargar JsBarcode en cliente (CDN)
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

function renderAllBarcodes(root: Document | HTMLElement = document) {
    // @ts-ignore
    if (!("JsBarcode" in window)) return;
    const els = Array.from(root.querySelectorAll<SVGSVGElement>(".bc"));
    // @ts-ignore
    const JB = (window as any).JsBarcode;
    for (const el of els) {
        const code = el.getAttribute("data-code") || "";
        try {
            JB(el, code, { format: "CODE128", displayValue: false, margin: 0, height: 50 });
        } catch { }
        el.removeAttribute("width"); el.removeAttribute("height");
        (el as any).style.width = "100%"; (el as any).style.height = "100%";
    }
}

const cssForPrint = (w: number, h: number) => `
  @page{ size:${w}mm ${h}mm; margin:0 }
  *{ box-sizing:border-box; }
  html,body{ margin:0; padding:0; }
  body{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }

  .page{ width:${w}mm; height:${h}mm; page-break-after:always; display:flex; align-items:center; justify-content:center; }
  .label{
    width: 100%;
    height: 100%;
    display:flex; align-items:center; justify-content:center;
    font-family: Arial, Helvetica, sans-serif;
    text-align:center;
    padding: 2mm;
  }

  /* Grid 2 columnas: izquierda (barcode+ubicación) | derecha (últimos dos) */
  .grid2 {
    display: grid;
    grid-template-columns: 1fr 22mm;
    grid-template-rows: auto; gap: 1mm;
    width: 100%; height: 100%;
    align-items: center;
  }

.left {
  display: grid;
  grid-template-rows: 15mm auto; /* <-- barcode alto fijo */
  align-items: center;
  height: 100%;
  padding-right: 2mm;
}
.left .barcodeBox {
  width: 100%;
  height: 100%;
  display: flex; align-items: center; justify-content: center;
}

  .left .ubicacion {
    font-size: 20px; line-height: 1.1; font-weight: 900; word-break: break-word;
  }

  .right {
    height: 100%;
    display: grid;

   justify-items: center;
    align-items: center;
    justify-content: center;
    align-content: center;
    padding-left: 2mm;
  }

  .right .valor  { font-size: 40px; font-weight: 800; line-height: 1; }


  .muted { opacity: .7; }
`;

function px(mm: number) { return Math.max(1, Math.round(mm * 3.78)); }

export default function EtiquetadorSimple() {
    const [texto, setTexto] = useState("");
    const [copias, setCopias] = useState(1);

    const W = TEMPLATE_MM.width;
    const H = TEMPLATE_MM.height;
    const boxW = useMemo(() => px(W), [W]);
    const boxH = useMemo(() => px(H), [H]);

    // Últimos 2 dígitos (solo para mostrar en la columna derecha)
    const lastTwo = useMemo(() => {
        const digits = (texto.match(/\d+/g) || []).join("");
        return digits.slice(-2);
    }, [texto]);

    // El código de barras SIEMPRE usa lo que está en el input:
    const barcodeValue = texto;

    // Render barcodes cuando cambia el valor que alimenta al <svg>
    React.useEffect(() => { ensureJsBarcodeLoaded().then(() => renderAllBarcodes()); }, [barcodeValue]);

    const handlePrint = () => {
        if (!texto.trim()) return;

        const page = `
      <div class="page">
        <div class="label">
          <div class="grid2">
            <div class="left">
              <div class="barcodeBox">
                <svg class="bc" data-code="${escapeHtml(barcodeValue)}"></svg>
              </div>
              <div class="ubicacion">${escapeHtml(texto || "—")}</div>
            </div>
            <div class="right">
              <div class="valor">${escapeHtml(lastTwo || "—")}</div>
            </div>
          </div>
        </div>
      </div>`;

        const pages = Array.from({ length: Math.max(1, copias) }, () => page).join("");

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
      <title>Etiqueta</title>
      <style>${cssForPrint(W, H)}</style>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
      <script>
        window.addEventListener('load',function(){
          try{
            document.querySelectorAll('.bc').forEach(function(el){
              var c=el.getAttribute('data-code')||'';
              JsBarcode(el,c,{format:'CODE128',displayValue:false,margin:0,height:50});
              el.removeAttribute('width'); el.removeAttribute('height');
              el.style.width='100%'; el.style.height='100%';
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
        doc.open(); doc.write(html); doc.close();

        // 🔧 Importante: YA NO disparamos print desde el padre para que no se duplique.
        // setTimeout(() => { iframe.contentWindow?.print(); }, 0);

        // Limpieza del iframe
        setTimeout(() => { try { iframe.remove(); } catch { } }, 5000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
            <div className="min-h-screen p-6">
                <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-8 items-stretch">

                    {/* Panel izquierdo */}
                    <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm">
                        <CardHeader className="border-b border-gray-600">
                            <CardTitle className="text-white">Etiquetador</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-1">
                                <Label className="text-gray-100">Ubicación</Label>
                                <Input
                                    value={texto}
                                    onChange={(e) => setTexto(e.target.value)}
                                    placeholder="Escribe la ubicación o código"
                                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                                    onKeyDown={(e) => { if (e.key === "Enter") handlePrint(); }}
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
                                <Button
                                    onClick={handlePrint}
                                    className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                                    disabled={!texto.trim()}
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Imprimir
                                </Button>
                            </div>

                            <p className="text-xs text-gray-300/80">
                                Tamaño etiqueta: {W}×{H} mm. Diseño: <em>CÓDIGO DE BARRAS | ÚLTIMOS DOS</em> / <em>UBICACIÓN | DÍGITOS</em>.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Panel derecho: Preview */}
                    <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm min-h-[320px]">
                        <CardHeader className="border-b border-gray-600">
                            <CardTitle className="flex items-center gap-2 text-white">
                                <Eye className="w-5 h-5 text-purple-300" /> Vista previa
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-center mx-auto" style={{ width: boxW, height: boxH }}>
                                <div className="bg-white text-black rounded-md shadow-lg border-2 border-gray-300 w-full h-full p-2">
                                    {/* Mismo layout que impresión */}
                                    <div className="grid" style={{ gridTemplateColumns: "1fr 22mm", height: "100%", gap: "1mm" }}>
                                        {/* Izquierda */}
                                        <div className="grid" style={{ gridTemplateRows: "1fr auto", height: "100%", paddingRight: "2mm", borderRight: "1px dashed #000" }}>
                                            <div style={{ width: "100%", height: "20mm", display: "flex", alignItems: "center", justifyContent: "center" }}>
                                                <svg className="bc" data-code={barcodeValue || ""} />
                                            </div>

                                            <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.1, paddingTop: "1mm", wordBreak: "break-word" }}>
                                                {texto || "—"}
                                            </div>
                                        </div>
                                        {/* Derecha */}
                                        <div className="grid" style={{ gridTemplateRows: "auto 1fr auto", justifyItems: "center", alignItems: "center", paddingLeft: "2mm" }}>
                                            <div style={{ fontSize: 9, opacity: .7, letterSpacing: ".5px" }}>ÚLTIMOS DOS</div>
                                            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>
                                                {(() => {
                                                    const digits = (texto.match(/\d+/g) || []).join("");
                                                    return digits.slice(-2) || "—";
                                                })()}
                                            </div>
                                            <div style={{ fontSize: 9, opacity: .7, letterSpacing: ".5px" }}>DÍGITOS</div>
                                        </div>
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

function escapeHtml(s: string) {
    return s.replace(/[&<>\"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}
