// app/page.tsx
"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Eye, Settings, Download, Printer, Plus, Trash2, Save, BookOpen, Loader2, AlertCircle } from "lucide-react"

interface ArticleItem {
  id: string
  text: string
  quantity: number
  barcode: string
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
    ;(async () => {
      const mod: any = await import("jsbarcode")
      if (!mounted || !ref.current) return
      const JsBarcode = mod.default || mod
      try {
        JsBarcode(ref.current, value, {
          format,
          displayValue: false, // sin texto dentro del código en preview
          font: fontFamily,
          fontSize: Math.max(8, Math.round(fontSizePx * 0.8)),
          textMargin: 2,
          margin: 0,
        })
        ref.current.setAttribute("preserveAspectRatio", "none")
        ref.current.style.width = "100%"
        ref.current.style.height = `${heightPx}px`
      } catch {}
    })()
    return () => { mounted = false }
  }, [value, format, heightPx, fontFamily, fontSizePx])

  return <svg ref={ref} className="barcode-svg" />
}

export default function LabelGenerator() {
  const [labelConfig, setLabelConfig] = useState({
    size: "custom",
    margin: "0",
    width: "50",
    height: "25",
    text: "",
    fontSize: "12",
    font: "Arial",
    quantity: "1",
    barHeightMm: "20",
  })

  const [barcodeFormat, setBarcodeFormat] = useState<"CODE128" | "CODE128B">("CODE128")

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

  const handleConfigChange = (key: string, value: string | boolean) => {
    setLabelConfig((prev) => ({ ...prev, [key]: value }))
  }

  const aplicarTamanoBD = (t: TamanoEtiqueta) => {
    setLabelConfig(prev => ({
      ...prev,
      width: String(t.width),
      height: String(t.height),
      margin: String(t.margen),
      fontSize: String(t.fontSizeClaveArticulo),
      barHeightMm: String(t.altoBarra),
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

  // Agregar artículo (clave = texto y barcode)
  const addArticle = (claveOverride?: string) => {
    const clave = (claveOverride ?? labelConfig.text).trim()
    if (!clave) return
    const newArticle: ArticleItem = {
      id: Date.now().toString(),
      text: clave,
      quantity: Number.parseInt(labelConfig.quantity) || 1,
      barcode: clave,
    }
    setArticles((prev) => [...prev, newArticle])
    setLabelConfig((prev) => ({ ...prev, text: "", quantity: "1" }))
    setSearchResults([])
    setSearchError(null)
  }

  const removeArticle = (id: string) => {
    setArticles((prev) => prev.filter((a) => a.id !== id))
  }

  // 👉 Imprime en la MISMA pestaña (iframe oculto). Papel = etiqueta exacta.
 const handlePrint = () => {
  if (articles.length === 0) return

  const labelW = parseFloat(labelConfig.width)      // mm
  const labelH = parseFloat(labelConfig.height)     // mm
  const padding = parseFloat(labelConfig.margin)    // mm
  const barH = parseFloat(labelConfig.barHeightMm || "20") // mm
  const fontPx = parseFloat(labelConfig.fontSize)
  const fontFamily = labelConfig.font
  const fmt = barcodeFormat

  const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Etiquetas</title>
  <style>
    /* Tamaño físico exacto de la página */
    @page { 
    size: ${labelW}mm ${labelH}mm; 
    margin: 0; 
    padding: 0px;
    }

    html, body { margin: 0; padding: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${fontFamily}, Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }

    /* Una página = una etiqueta centrada */
    .page {
      width: ${labelW}mm;
      height: ${labelH}mm;
      display: grid;
      place-items: center;       /* centra en ambos ejes */
      page-break-after: always;
      overflow: hidden;          /* evita cualquier desborde visual */
      background: #fff;
    }
    .page:last-child { page-break-after: auto; }

    .label {
      width: ${labelW}mm;
      height: ${labelH}mm;
      padding: ${padding}mm;
      display: flex;
      flex-direction: column;
      align-items: center;       /* centra horizontal */
      justify-content: center;   /* centra vertical */
      overflow: hidden;
    }

    .barcode-svg {
      width: 100%;
      height: ${barH}mm;
    }

    .label-text {
      width: 100%;
      font-size: ${fontPx}px;
      text-align: center;
      font-weight: bold;
      margin-top: 4px;           /* texto debajo de las barras */
    }
  </style>
</head>
<body>
  ${
    articles.map(a =>
      Array.from({ length: a.quantity }, () => `
        <div class="page">
          <div class="label">
            <svg class="barcode-svg" data-value="${a.barcode}" data-format="${fmt}"></svg>
            <div class="label-text">${a.text}</div>
          </div>
        </div>
      `).join("")
    ).join("")
  }

  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
  <script>
    (function () {
      function render() {
        var svgs = document.querySelectorAll('svg.barcode-svg');
        for (var i = 0; i < svgs.length; i++) {
          var svg = svgs[i];
          var val = svg.getAttribute('data-value') || '';
          var format = svg.getAttribute('data-format') || 'CODE128';
          try {
            JsBarcode(svg, val, {
              format: format,
              displayValue: false,   // solo barras, sin texto
              margin: 0
            });
            svg.setAttribute('preserveAspectRatio', 'none'); // que se estire a 100% del ancho
          } catch(e) {}
        }
      }
      window.addEventListener('load', function () {
        render();
        setTimeout(function () { window.focus(); window.print(); }, 0);
      });
      window.onafterprint = function () {
        try { parent.postMessage({ type: '__PRINT_DONE__' }, '*'); } catch(e) {}
      };
    })();
  </script>
</body>
</html>`

  // Imprimir en la MISMA pestaña con iframe oculto
  const iframe = document.createElement('iframe')
  iframe.style.position = 'fixed'
  iframe.style.right = '0'
  iframe.style.bottom = '0'
  iframe.style.width = '0'
  iframe.style.height = '0'
  iframe.style.border = '0'
  iframe.style.opacity = '0'
  document.body.appendChild(iframe)

  const cleanup = () => {
    window.removeEventListener('message', onMessage)
    try { document.body.removeChild(iframe) } catch {}
  }
  const onMessage = (ev: MessageEvent) => {
    if (ev?.data?.type === '__PRINT_DONE__') cleanup()
  }
  window.addEventListener('message', onMessage)

  const doc = iframe.contentDocument || iframe.ownerDocument
  doc.open(); doc.write(printHtml); doc.close()
}


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
      if (searchResults.length > 0) addArticle(searchResults[0].claveArticulo)
      else if (labelConfig.text.trim()) addArticle()
    }
  }

  // ===== PREVIEW que nunca se desborda =====
  // Tamaño "natural" de la etiqueta en px (doble para legibilidad, como tenías)
  const naturalW = mmToPx(parseFloat(labelConfig.width) * 2)
  const naturalH = mmToPx(parseFloat(labelConfig.height) * 2)
  const previewPad = Math.max(0, parseInt(labelConfig.margin))
  const previewBarHeightPx = mmToPx(parseFloat(labelConfig.barHeightMm || "20"))

  // Límite máximo visible de cada celda (ajustable)
  const PREVIEW_MAX_W = 280 // px
  const PREVIEW_MAX_H = 180 // px

  // Escala para que quepa siempre; nunca agranda (<=1)
  const previewScale = Math.min(PREVIEW_MAX_W / naturalW, PREVIEW_MAX_H / naturalH, 1)

  // Dimensiones de la "cajita" contenedora
  const cellW = Math.min(naturalW, PREVIEW_MAX_W)
  const cellH = Math.min(naturalH, PREVIEW_MAX_H)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-purple-900">
      <div className="min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">
              Generador de <span className="text-purple-300">Etiquetas</span>
            </h1>
            <p className="text-gray-200 text-lg">Crea e imprime etiquetas personalizadas con códigos de barras</p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Panel de Configuración */}
            <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm">
              <CardHeader className="border-b border-gray-600">
                <CardTitle className="flex items-center gap-2 text-white">
                  <Settings className="w-5 h-5 text-purple-300" />
                  Configuración
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {/* Tamaño guardado (BD) */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Tamaño guardado (BD)</Label>
                  <Select
                    value={selectedTamanoId}
                    onValueChange={(value) => {
                      setSelectedTamanoId(value)
                      const t = tamanos.find(x => String(x.id) === value)
                      if (t) aplicarTamanoBD(t)
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-500 text-white">
                      <SelectValue placeholder={isLoadingTamanos ? "Cargando..." : "Selecciona un tamaño"} />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-500">
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
                  <Label className="text-gray-100 font-medium">Formato de código de barras</Label>
                  <Select value={barcodeFormat} onValueChange={(v: "CODE128" | "CODE128B") => setBarcodeFormat(v)}>
                    <SelectTrigger className="bg-gray-700 border-gray-500 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-500">
                      <SelectItem value="CODE128" className="text-white">CODE128</SelectItem>
                      <SelectItem value="CODE128B" className="text-white">CODE128B</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Plantillas locales */}
                <div className="flex justify-between items-center">
                  <Label className="text-gray-100 font-medium">Plantillas locales</Label>
                  <Dialog open={isTemplateModalOpen} onOpenChange={setIsTemplateModalOpen}>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700 text-white border-0">
                        <BookOpen className="w-4 h-4 mr-2" />
                        Crear Plantilla
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-gray-800 border-gray-600 text-white">
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
                        <div className="bg-gray-700/50 p-4 rounded-lg">
                          <Label className="text-gray-200 text-sm">Configuración actual:</Label>
                          <div className="mt-2 space-y-1 text-sm text-gray-300">
                            <p>Tamaño: {labelConfig.width}mm × {labelConfig.height}mm</p>
                            <p>Margen: {labelConfig.margin}mm</p>
                            <p>Fuente: {labelConfig.font}, {labelConfig.fontSize}px</p>
                            <p>Alto barras: {labelConfig.barHeightMm}mm</p>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button variant="ghost" onClick={() => setIsTemplateModalOpen(false)} className="text-gray-300 hover:text-white">
                            Cancelar
                          </Button>
                          <Button onClick={saveTemplate} disabled={!templateName.trim()} className="bg-purple-600 hover:bg-purple-700 text-white">
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
                  <Input type="number" value={labelConfig.margin} onChange={(e) => handleConfigChange("margin", e.target.value)} className="bg-gray-700 border-gray-500 text-white placeholder-gray-300" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Ancho (mm)</Label>
                    <Input type="number" value={labelConfig.width} onChange={(e) => handleConfigChange("width", e.target.value)} className="bg-gray-700 border-gray-500 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Alto (mm)</Label>
                    <Input type="number" value={labelConfig.height} onChange={(e) => handleConfigChange("height", e.target.value)} className="bg-gray-700 border-gray-500 text-white" />
                  </div>
                </div>

                {/* Alto de barras */}
                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Alto barras (mm)</Label>
                  <Input type="number" value={labelConfig.barHeightMm} onChange={(e) => handleConfigChange("barHeightMm", e.target.value)} className="bg-gray-700 border-gray-500 text-white" />
                </div>

                {/* Campo de artículo con búsqueda */}
                <div className="space-y-2 relative">
                  <Label className="text-gray-100 font-medium">Artículo (clave)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Busca por clave o nombre…"
                      value={labelConfig.text}
                      onChange={(e) => handleConfigChange("text", e.target.value)}
                      onKeyDown={onArticleKeyDown}
                      className="bg-gray-700 border-gray-500 text-white placeholder-gray-300 flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (searchResults.length > 0) addArticle(searchResults[0].claveArticulo)
                        else if (labelConfig.text.trim()) addArticle()
                      }}
                      className="bg-purple-600 hover:bg-purple-700 text-white border-0"
                      disabled={!labelConfig.text.trim()}
                      title="Agregar artículo"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  {(isSearching || searchError || searchResults.length > 0) && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border border-gray-600 bg-gray-800 shadow-lg">
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
                        <ul className="max-h-56 overflow-y-auto">
                          {searchResults.map((item, idx) => (
                            <li
                              key={`${item.claveArticulo}-${idx}`}
                              className="px-3 py-2 text-sm text-gray-100 hover:bg-gray-700 cursor-pointer flex justify-between"
                              onClick={() => {
                                setLabelConfig(prev => ({ ...prev, text: item.claveArticulo }))
                                addArticle(item.claveArticulo)
                              }}
                            >
                              <span className="truncate">{item.nombre}</span>
                              <span className="text-purple-300 ml-2 shrink-0">{item.claveArticulo}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-100 font-medium">Número de impresiones</Label>
                  <div className="flex gap-2">
                    <Input type="number" value={labelConfig.quantity} onChange={(e) => handleConfigChange("quantity", e.target.value)} className="bg-gray-700 border-gray-500 text-white flex-1" min="1" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Tamaño fuente (px)</Label>
                    <Input type="number" value={labelConfig.fontSize} onChange={(e) => handleConfigChange("fontSize", e.target.value)} className="bg-gray-700 border-gray-500 text-white" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-100 font-medium">Fuente</Label>
                    <Select value={labelConfig.font} onValueChange={(value) => handleConfigChange("font", value)}>
                      <SelectTrigger className="bg-gray-700 border-gray-500 text-white">
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

                <div className="flex gap-3 pt-4">
                  <Button className="flex-1 bg-purple-600 hover:bg-purple-700 text-white border-0" disabled={articles.length === 0}>
                    <Download className="w-4 h-4 mr-2" />
                    Descargar
                  </Button>
                  <Button onClick={handlePrint} className="flex-1 bg-gray-600 hover:bg-gray-700 text-white border-0" disabled={articles.length === 0}>
                    <Printer className="w-4 h-4 mr-2" />
                    Imprimir
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabla + Preview */}
            <div className="space-y-6">
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-600">
                  <CardTitle className="flex items-center justify-between text-white">
                    <span>Artículos ({articles.length})</span>
                    <span className="text-sm text-purple-300">Total: {totalLabels} etiquetas</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {articles.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <p>No hay artículos agregados</p>
                      <p className="text-sm">Busca y agrega un artículo para comenzar</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {articles.map((a) => (
                        <div key={a.id} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg">
                          <div className="flex-1">
                            <p className="text-white font-medium">{a.text}</p>
                            <p className="text-gray-300 text-sm">Código: {a.barcode}</p>
                          </div>
                          <div className="flex items-center gap-3">
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
              <Card className="bg-gray-800/80 border-gray-600 backdrop-blur-sm">
                <CardHeader className="border-b border-gray-600">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Eye className="w-5 h-5 text-purple-300" />
                    Vista Previa
                  </CardTitle>
                  <p className="text-gray-300 text-sm">
                    Dimensiones: {labelConfig.width}mm × {labelConfig.height}mm — Alto barras: {labelConfig.barHeightMm}mm — Formato: {barcodeFormat}
                  </p>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="bg-gray-900/60 rounded-lg p-8 min-h-[300px] flex items-center justify-center relative overflow-auto">
                    {articles.length === 0 ? (
                      <div className="text-center text-gray-400">
                        <p>Agrega artículos para ver la vista previa</p>
                      </div>
                    ) : (
                      <div
                        className="grid gap-4 justify-center"
                        style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${cellW}px, 1fr))` }}
                      >
                        {articles.slice(0, 6).map((a) => (
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
                              <BarcodeSVG
                                value={a.barcode}
                                format={barcodeFormat}
                                heightPx={previewBarHeightPx}
                                fontFamily={labelConfig.font}
                                fontSizePx={parseFloat(labelConfig.fontSize)}
                              />
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
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {articles.length > 6 && (
                      <div className="absolute bottom-4 right-4 bg-purple-600 text-white px-3 py-1 rounded-full text-sm">
                        +{articles.length - 6} más
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
