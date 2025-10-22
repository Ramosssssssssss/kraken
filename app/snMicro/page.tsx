"use client"

import type React from "react"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { FileText, FileSpreadsheet, Edit3, Upload, CheckCircle2, ArrowLeft, Scan, DollarSign } from "lucide-react"
import * as XLSX from "xlsx"

interface ExcelProduct {
  clave: string
  descripcion: string
  umed: string
  cantidad: number
}

interface XmlProduct {
  clave: string
  descripcion: string
  cantidad: number
  valorUnitario: number
  importe: number
  noIdentificacion?: string
  groupSize?: number
  resolvedClave?: string
  resolvedRole?: number
}

export default function SeleccionTipoPremium() {
  const router = useRouter()
  const { companyData, apiUrl } = useCompany()
  const [selectedType, setSelectedType] = useState<"MANUAL" | "XML" | "EXCEL" | null>(null)
  const [folio, setFolio] = useState("")
  const [providerModalOpen, setProviderModalOpen] = useState(false)
  const [selectedProvider, setSelectedProvider] = useState<"Grupo Panam Mexico" | "KRKN" | "Grupo El Cachorro" | null>(null)
  const [scannerActive, setScannerActive] = useState(false)
  const [scannedData, setScannedData] = useState("")
  const [excelProducts, setExcelProducts] = useState<ExcelProduct[]>([])
  const [isProcessingExcel, setIsProcessingExcel] = useState(false)
  const [xmlProducts, setXmlProducts] = useState<XmlProduct[]>([])
  const [xmlDuplicates, setXmlDuplicates] = useState<{ noIdentificacion: string; count: number }[]>([])
  const [isProcessingXml, setIsProcessingXml] = useState(false)
  const [excelFileName, setExcelFileName] = useState("")
  const [xmlFileName, setXmlFileName] = useState("")
  const [xmlMeta, setXmlMeta] = useState<{
    serie?: string
    folio?: string
    receptor?: string
    emisor?: string
    total?: number
  } | null>(null)

  const scannerInputRef = useRef<HTMLInputElement>(null)
  const excelInputRef = useRef<HTMLInputElement>(null)
  const xmlInputRef = useRef<HTMLInputElement>(null)

  const handleScannerToggle = () => {
    setScannerActive(!scannerActive)
    if (!scannerActive) {
      setTimeout(() => scannerInputRef.current?.focus(), 100)
    }
  }

  const handleScannerInput = (text: string) => {
    setScannedData(text)
    if (text.length > 0) {
      console.log("[v0] Scanned data:", text)
      setScannedData("")
    }
  }

  const handleExcelFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setExcelFileName(file.name)
    setIsProcessingExcel(true)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: "array" })
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

      let headerRowIndex = -1
      let claveIndex = -1,
        descripcionIndex = -1,
        umedIndex = -1,
        cantidadIndex = -1

      // Find header row
      for (let i = 0; i < Math.min(5, jsonData.length); i++) {
        const row = jsonData[i]
        if (row && row.length > 0) {
          for (let j = 0; j < row.length; j++) {
            const cellValue = String(row[j] || "")
              .toUpperCase()
              .trim()
            if (cellValue === "CLAVE") claveIndex = j
            if (cellValue === "DESCRIPCION") descripcionIndex = j
            if (cellValue === "UMED") umedIndex = j
            if (cellValue === "CANTIDAD") cantidadIndex = j
          }

          if (claveIndex >= 0 && descripcionIndex >= 0 && umedIndex >= 0 && cantidadIndex >= 0) {
            headerRowIndex = i
            break
          }
        }
      }

      if (headerRowIndex === -1) {
        throw new Error("No se encontraron las columnas requeridas: CLAVE, DESCRIPCION, UMED, CANTIDAD")
      }

      // Extract products
      const products: ExcelProduct[] = []
      for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (row && row.length > Math.max(claveIndex, descripcionIndex, umedIndex, cantidadIndex)) {
          const clave = String(row[claveIndex] || "").trim()
          const descripcion = String(row[descripcionIndex] || "").trim()
          const umed = String(row[umedIndex] || "").trim()
          const cantidad = Number(row[cantidadIndex]) || 0

          if (clave && descripcion && umed && cantidad > 0) {
            products.push({ clave, descripcion, umed, cantidad })
          }
        }
      }

      if (products.length === 0) {
        throw new Error("No se encontraron productos válidos en el archivo Excel")
      }

      setExcelProducts(products)
    } catch (error) {
      console.error("[v0] Excel processing error:", error)
      alert(error instanceof Error ? error.message : "No se pudo procesar el archivo Excel")
    } finally {
      setIsProcessingExcel(false)
    }
  }

  const handleXmlFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setXmlFileName(file.name)
    setIsProcessingXml(true)

    try {
      const xmlText = await file.text()

      // Extract comprobante metadata: serie, folio, total, emisor and receptor
      const comprobanteMatch = xmlText.match(/<cfdi:Comprobante[^>]*>/i)
      let extractedFolio = ""
      let extractedSerie = ""
      let extractedTotal: number | undefined = undefined
      let extractedEmisor = ""
      let extractedReceptor = ""

      if (comprobanteMatch) {
        const cmp = comprobanteMatch[0]
        const serieMatch = cmp.match(/Serie="([^"]*)"/i)
        const folioMatch = cmp.match(/Folio="([^"]*)"/i)
        const totalMatch = cmp.match(/Total="([^"]*)"/i)

        if (serieMatch) extractedSerie = serieMatch[1]
        if (folioMatch) extractedFolio = folioMatch[1]
        if (totalMatch) extractedTotal = Number(totalMatch[1]) || undefined

        if (extractedFolio) {
          setFolio(extractedFolio)
        }
      }

      // Emisor / Receptor
      const emisorMatch = xmlText.match(/<cfdi:Emisor[^>]*>/i)
      const receptorMatch = xmlText.match(/<cfdi:Receptor[^>]*>/i)
      if (emisorMatch) {
        const nm = emisorMatch[0].match(/Nombre="([^"]*)"/i)
        if (nm) extractedEmisor = nm[1]
      }
      if (receptorMatch) {
        const nm = receptorMatch[0].match(/Nombre="([^"]*)"/i)
        if (nm) extractedReceptor = nm[1]
      }

  // Extract products
  let products: XmlProduct[] = []
      const conceptoRegex = /<cfdi:Concepto[^>]*>/g
      const matches = xmlText.match(conceptoRegex)

      if (matches) {
        matches.forEach((match) => {
          const claveMatch = match.match(/ClaveProdServ="([^"]*)"/i)
          const descripcionMatch = match.match(/Descripcion="([^"]*)"/i)
          const cantidadMatch = match.match(/Cantidad="([^"]*)"/i)
          const valorUnitarioMatch = match.match(/ValorUnitario="([^"]*)"/i)
          const importeMatch = match.match(/Importe="([^"]*)"/i)
          const noIdentificacionMatch = match.match(/NoIdentificacion="([^"]*)"/i)

          if (claveMatch && descripcionMatch && cantidadMatch && valorUnitarioMatch && importeMatch) {
            const clave = claveMatch[1].trim()
            const descripcion = descripcionMatch[1].trim()
            const cantidad = Number(cantidadMatch[1]) || 0
            const valorUnitario = Number(valorUnitarioMatch[1]) || 0
            const importe = Number(importeMatch[1]) || 0
            const noIdentificacion = noIdentificacionMatch ? noIdentificacionMatch[1].trim() : undefined

            if (clave && descripcion && cantidad > 0 && valorUnitario > 0) {
              products.push({
                clave,
                descripcion,
                cantidad,
                valorUnitario,
                importe,
                noIdentificacion,
              })
            }
          }
        })
      }

      // Special-case: if provider is "Grupo El Cachorro", only keep first 8 chars of NoIdentificacion
      // and aggregate quantities by that truncated key (so scanner will start with that code)
      const isCachorro = (selectedProvider || "").toString().toLowerCase().includes("cachorro")

      if (isCachorro) {
        const agg = new Map<string, XmlProduct>()
        products.forEach((p) => {
          const raw = (p.noIdentificacion || p.clave || "").toString().trim()
          const key = raw ? raw.substring(0, 8) : ""
          if (!key) return
          const existing = agg.get(key)
          if (existing) {
            existing.cantidad = (existing.cantidad || 0) + (p.cantidad || 0)
            existing.importe = (existing.importe || 0) + (p.importe || 0)
          } else {
            // create a new aggregated product; use the truncated key as clave and noIdentificacion
            agg.set(key, {
              clave: key,
              descripcion: p.descripcion || "",
              cantidad: p.cantidad || 0,
              valorUnitario: p.valorUnitario || 0,
              importe: p.importe || 0,
              noIdentificacion: key,
            })
          }
        })

        products = Array.from(agg.values())
      }

      if (products.length === 0) {
        throw new Error("No se encontraron conceptos válidos en el archivo XML")
      }

      // detect groups by NoIdentificacion
      const groups: Record<string, XmlProduct[]> = {}
      products.forEach((p) => {
        const key = (p.noIdentificacion || p.clave || "__NOID__").trim()
        if (!groups[key]) groups[key] = []
        groups[key].push(p)
      })

      const duplicates = Object.entries(groups)
        .filter(([, arr]) => arr.length > 1)
        .map(([noIdentificacion, arr]) => ({ noIdentificacion, count: arr.length }))


      // annotate products with groupSize for UI
      let annotated = products.map((p) => {
        const key = (p.noIdentificacion || p.clave || "__NOID__").trim()
        const groupSize = groups[key] ? groups[key].length : 1
        return { ...p, groupSize }
      })

      try {
        const isPanam = (selectedProvider || "").toString().toLowerCase().includes("panam")
        if (isPanam) {
          // build unique keys to resolve
          const unique = Array.from(new Set(annotated.map((p) => (p.noIdentificacion || p.clave || "").trim()).filter(Boolean)))

          if (unique.length > 0) {
            // prefer companyData.apiUrl if available, otherwise internal API route
            const base = (companyData && companyData.apiUrl) ? companyData.apiUrl.replace(/\/+$/, "") : ""
            const endpoint = base ? `${base}/resolve-role` : `/resolve-role`

            const resolves = await Promise.all(unique.map(async (key) => {
              try {
                const url = `${endpoint}?noid=${encodeURIComponent(key)}&provider=panam`
                const resp = await fetch(url, { method: "GET", headers: { Accept: "application/json" } })
                if (!resp.ok) return { key, ok: false }
                const j = await resp.json()
                if (j?.ok && j?.data) return { key, ok: true, data: j.data }
                return { key, ok: false }
              } catch (e) {
                return { key, ok: false }
              }
            }))

            const map = new Map<string, { claveArticulo?: string; role?: number }>()
            resolves.forEach((r) => {
              if (r.ok && r.data) map.set(r.key, { claveArticulo: r.data.claveArticulo, role: r.data.role })
            })

            // apply resolved values
            annotated = annotated.map((p) => {
              const key = (p.noIdentificacion || p.clave || "").trim()
              const found = map.get(key)
              if (found) {
                return { ...p, resolvedClave: found.claveArticulo || undefined, resolvedRole: typeof found.role === "number" ? found.role : undefined }
              }
              return p
            })
          }
        }
      } catch (e) {
        console.warn("Error resolving NoIdentificacion -> claveArticulo:", e)
      }

      setXmlProducts(annotated)
      setXmlDuplicates(duplicates)

      if (duplicates.length > 0) {
        const msg = `Se encontraron ${duplicates.length} NoIdentificacion(s) repetidos:\n` +
          duplicates.map((d) => `• ${d.noIdentificacion} (${d.count})`).join("\n")
        alert(msg)
      }

      setXmlMeta({
        serie: extractedSerie || undefined,
        folio: extractedFolio || undefined,
        receptor: extractedReceptor || undefined,
        emisor: extractedEmisor || undefined,
        total: extractedTotal,
      })

      const totalImporte = products.reduce((sum, p) => sum + p.importe, 0)
      const folioMessage = extractedFolio ? `\nFolio extraído: ${extractedFolio}` : ""
      alert(
        `XML Procesado\n\nSe encontraron ${products.length} conceptos en el archivo${folioMessage}\nTotal: $${totalImporte.toFixed(2)}`,
      )
    } catch (error) {
      console.error("[v0] XML processing error:", error)
      alert(error instanceof Error ? error.message : "No se pudo procesar el archivo XML")
    } finally {
      setIsProcessingXml(false)
    }
  }

  const handleTypeSelection = (type: "MANUAL" | "XML" | "EXCEL") => {
    setSelectedType(type)

    if (type === "MANUAL") {
      router.push(`/manual?folio=${folio}`)
    } else if (type === "EXCEL") {
      excelInputRef.current?.click()
    } else if (type === "XML") {
      // Open provider selection modal before opening file picker
      setProviderModalOpen(true)
    }
  }

  const handleContinue = () => {
    if (!selectedType) {
      alert("Selecciona un tipo de procesamiento")
      return
    }

    if (!folio.trim()) {
      alert("Ingresa un folio válido")
      return
    }

    if (selectedType === "EXCEL" && excelProducts.length === 0) {
      alert("Selecciona y procesa un archivo Excel primero")
      return
    }

    if (selectedType === "XML" && xmlProducts.length === 0) {
      alert("Selecciona y procesa un archivo XML primero")
      return
    }

    if (selectedType === "EXCEL") {
      const excelData = excelProducts.map((product) => ({
        CLAVE: product.clave,
        DESCRIPCION: product.descripcion,
        UMED: product.umed,
        CANTIDAD: product.cantidad,
      }))

      sessionStorage.setItem("excelReciboData", JSON.stringify(excelData))
      sessionStorage.setItem("excelReciboFolio", folio)

      router.push(`/excel`)
    } else if (selectedType === "XML") {
      const xmlData = xmlProducts.map((product) => ({
        // canonical uppercase CLAVE used by XmlReciboPremium
        CLAVE: (product.resolvedClave || product.clave || "") as string,
        // also include a camelCase resolvedClave for other code paths
        resolvedClave: product.resolvedClave || undefined,
        DESCRIPCION: product.descripcion,
        UMED: null,
        CANTIDAD: product.cantidad,
        VALOR_UNITARIO: product.valorUnitario,
        IMPORTE: product.importe,
        NO_IDENTIFICACION: product.noIdentificacion,
        RESOLVED_ROLE: product.resolvedRole ?? null,
      }))

      const payload = {
        products: xmlData,
        meta: {
          ...(xmlMeta || { folio, serie: undefined }),
          provider: selectedProvider,
          duplicates: xmlDuplicates,
        },
      }

      try {
        sessionStorage.setItem("xmlReciboData", JSON.stringify(payload))
        sessionStorage.setItem("xmlReciboFolio", folio)
      } catch (e) {
        console.warn("Could not persist xml recibo payload", e)
      }

      router.push(`/xml`)
    }
  }

  const handleProviderSelect = (provider: "Grupo Panam Mexico" | "KRKN"| "Grupo El Cachorro") => {
    setSelectedProvider(provider)
    try {
      sessionStorage.setItem("snmicro_selected_provider", provider)
    } catch (e) {
    }
    setProviderModalOpen(false)
    setTimeout(() => xmlInputRef.current?.click(), 160)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>

            <h1 className="text-xl font-bold text-white">Selección de Tipo</h1>

            <button
              onClick={handleScannerToggle}
              className={`px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 ${
                scannerActive 
                  ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30 text-white shadow-lg" 
                  : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10"
              }`}
            >
              <Scan className="h-5 w-5" />
              {scannerActive ? "ON" : "OFF"}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Selecciona el Tipo de Procesamiento</h2>
            <p className="text-gray-400">Elige cómo deseas ingresar los datos</p>
          </div>

          {/* Type Selection Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* MANUAL */}
            <div
              className={`cursor-pointer transition-all duration-300 hover:scale-105 rounded-2xl p-6 backdrop-blur-xl border ${
                selectedType === "MANUAL"
                  ? "bg-gradient-to-br from-purple-500/20 to-blue-500/20 border-purple-500/30 shadow-lg shadow-purple-500/20"
                  : "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-purple-500/30"
              }`}
              onClick={() => handleTypeSelection("MANUAL")}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedType === "MANUAL" 
                    ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30" 
                    : "bg-white/5"
                }`}>
                  <Edit3 className={`h-8 w-8 ${selectedType === "MANUAL" ? "text-white" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${selectedType === "MANUAL" ? "text-white" : "text-gray-300"}`}>
                    MANUAL
                  </h3>
                  <p className={`text-sm ${selectedType === "MANUAL" ? "text-purple-200" : "text-gray-400"}`}>
                    Ingreso manual de datos
                  </p>
                </div>
                {selectedType === "MANUAL" && (
                  <div className="bg-gradient-to-r from-purple-400 to-blue-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    SELECCIONADO
                  </div>
                )}
              </div>
            </div>

            {/* XML */}
            <div
              className={`cursor-pointer transition-all duration-300 hover:scale-105 rounded-2xl p-6 backdrop-blur-xl border ${
                selectedType === "XML"
                  ? "bg-gradient-to-br from-purple-500/20 to-pink-500/20 border-purple-500/30 shadow-lg shadow-purple-500/20"
                  : "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-purple-500/30"
              }`}
              onClick={() => handleTypeSelection("XML")}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedType === "XML" 
                    ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                    : "bg-white/5"
                }`}>
                  <FileText className={`h-8 w-8 ${selectedType === "XML" ? "text-white" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${selectedType === "XML" ? "text-white" : "text-gray-300"}`}>
                    XML
                  </h3>
                  <p className={`text-sm ${selectedType === "XML" ? "text-purple-200" : "text-gray-400"}`}>
                    Procesamiento de archivo XML
                  </p>
                </div>
                {selectedType === "XML" && (
                  <div className="bg-gradient-to-r from-purple-400 to-pink-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    SELECCIONADO
                  </div>
                )}
              </div>
            </div>

            {/* EXCEL */}
            <div
              className={`cursor-pointer transition-all duration-300 hover:scale-105 rounded-2xl p-6 backdrop-blur-xl border ${
                selectedType === "EXCEL"
                  ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/30 shadow-lg shadow-green-500/20"
                  : "bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 hover:border-green-500/30"
              }`}
              onClick={() => handleTypeSelection("EXCEL")}
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${
                  selectedType === "EXCEL" 
                    ? "bg-gradient-to-br from-green-500 to-emerald-500" 
                    : "bg-white/5"
                }`}>
                  <FileSpreadsheet className={`h-8 w-8 ${selectedType === "EXCEL" ? "text-white" : "text-gray-400"}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${selectedType === "EXCEL" ? "text-white" : "text-gray-300"}`}>
                    EXCEL
                  </h3>
                  <p className={`text-sm ${selectedType === "EXCEL" ? "text-green-200" : "text-gray-400"}`}>
                    Procesamiento de archivo Excel
                  </p>
                </div>
                {selectedType === "EXCEL" && (
                  <div className="bg-gradient-to-r from-green-400 to-emerald-400 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    SELECCIONADO
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* XML File Status */}
          {selectedType === "XML" && (
            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {xmlProducts.length > 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-purple-400" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-white">Archivo XML</h3>
                </div>

                {xmlProducts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-purple-400 font-medium">✓ {xmlProducts.length} conceptos encontrados</p>
                    <p className="text-sm text-gray-400">{xmlFileName}</p>
                    <button
                      onClick={() => xmlInputRef.current?.click()}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Seleccionar otro archivo
                    </button>

                    {xmlDuplicates.length > 0 && (
                      <div className="mt-3 p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl text-sm">
                        <div className="font-semibold text-orange-400 mb-2">Advertencia: NoIdentificacion(s) repetidos</div>
                        <div className="space-y-1">
                          {xmlDuplicates.map((d) => (
                            <div key={d.noIdentificacion} className="flex items-center justify-between text-gray-300">
                              <div>{d.noIdentificacion}</div>
                              <div className="font-medium text-orange-400">{d.count} veces</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">No se ha seleccionado ningún archivo XML</p>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
                        <div className="text-sm text-gray-400">Proveedor: </div>
                        <div className="text-sm font-semibold text-white">{selectedProvider ?? "(No seleccionado)"}</div>
                      </div>

                      <div className="grid grid-cols-1 gap-2">
                        <button
                          onClick={() => {
                            if (!selectedProvider) setProviderModalOpen(true)
                            else xmlInputRef.current?.click()
                          }}
                          disabled={isProcessingXml}
                          className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Upload className="h-4 w-4" />
                          {isProcessingXml ? "Procesando..." : "Seleccionar Archivo XML"}
                        </button>

                        <button
                          onClick={() => setProviderModalOpen(true)}
                          className="w-full px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                        >
                          Cambiar Proveedor
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Provider Selection Modal */}
          {providerModalOpen && (
            <div
              className="fixed inset-0 z-60 flex items-center justify-center px-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="provider-modal-title"
            >
              <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setProviderModalOpen(false)} />

              <div className="z-70 max-w-xl w-full p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/10 shadow-2xl transform transition-all duration-150 scale-100">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">S</div>
                  </div>

                  <div className="flex-1">
                    <h3 id="provider-modal-title" className="text-xl font-bold text-white mb-2">¿De dónde viene el XML?</h3>
                    <p className="text-sm text-gray-300">Selecciona el proveedor que generó el XML. Esto nos permite elegir el parser correcto.</p>

                    <div className="mt-6 grid gap-3">
                      <button
                        onClick={() => handleProviderSelect("Grupo Panam Mexico")}
                        className="group bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between transition-all duration-200"
                        aria-label="Seleccionar Grupo Panam Mexico"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-sm font-bold text-white">GP</div>
                          <div className="text-left">
                            <div className="font-semibold text-white">Grupo Panam Mexico</div>
                            <div className="text-sm text-gray-400">Formato: Panam / Mexico</div>
                          </div>
                        </div>
                        <div className="text-sm text-purple-400 group-hover:text-purple-300">Seleccionar →</div>
                      </button>
       <button
                        onClick={() => handleProviderSelect("Grupo El Cachorro")}
                        className="group bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between transition-all duration-200"
                        aria-label="Seleccionar Grupo El Cachorro"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-sm font-bold text-white">GC</div>
                          <div className="text-left">
                            <div className="font-semibold text-white">Grupo El Cachorro</div>
                            <div className="text-sm text-gray-400">Formato: El Cachorro / Mexico</div>
                          </div>
                        </div>
                        <div className="text-sm text-green-400 group-hover:text-green-300">Seleccionar →</div>
                      </button>
                      <button
                        onClick={() => handleProviderSelect("KRKN")}
                        className="group bg-gradient-to-br from-white/5 to-white/[0.02] hover:from-white/10 hover:to-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between transition-all duration-200"
                        aria-label="Seleccionar KRKN"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white">KK</div>
                          <div className="text-left">
                            <div className="font-semibold text-white">KRKN</div>
                            <div className="text-sm text-gray-400">Formato: KRKN</div>
                          </div>
                        </div>
                        <div className="text-sm text-purple-400 group-hover:text-purple-300">Seleccionar →</div>
                      </button>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10">
                      <button 
                        onClick={() => setProviderModalOpen(false)} 
                        className="w-full px-4 py-2 rounded-xl text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* EXCEL File Status */}
          {selectedType === "EXCEL" && (
            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  {excelProducts.length > 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  ) : (
                    <FileSpreadsheet className="h-6 w-6 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-white">Archivo Excel</h3>
                </div>

                {excelProducts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-green-400 font-medium">✓ {excelProducts.length} productos encontrados</p>
                    <p className="text-sm text-gray-400">{excelFileName}</p>
                    <button
                      onClick={() => excelInputRef.current?.click()}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-all duration-200 flex items-center justify-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Seleccionar otro archivo
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-400 text-sm">No se ha seleccionado ningún archivo</p>
                    <button
                      onClick={() => excelInputRef.current?.click()}
                      disabled={isProcessingExcel}
                      className="w-full px-4 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold transition-all duration-200 shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Upload className="h-4 w-4" />
                      {isProcessingExcel ? "Procesando..." : "Seleccionar Archivo Excel"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial Summary for XML */}
          {selectedType === "XML" && xmlProducts.length > 0 && (
            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Resumen Financiero XML</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Conceptos</p>
                    <p className="text-2xl font-bold text-white">{xmlProducts.length}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Total Cantidad</p>
                    <p className="text-2xl font-bold text-white">
                      {xmlProducts.reduce((sum, p) => sum + p.cantidad, 0)} pzs
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Total Importe</p>
                    <p className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                      ${xmlProducts.reduce((sum, p) => sum + p.importe, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                    <p className="text-sm text-gray-400 mb-1">Precio Promedio</p>
                    <p className="text-2xl font-bold text-white">
                      ${(xmlProducts.reduce((sum, p) => sum + p.valorUnitario, 0) / xmlProducts.length).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Folio Input */}
          {selectedType && (
            <div className="rounded-2xl p-6 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">Ingresa el Folio</h3>

                <input
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  placeholder="Folio del documento"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all duration-200"
                />

                <button
                  onClick={handleContinue}
                  disabled={
                    !selectedType ||
                    !folio.trim() ||
                    (selectedType === "EXCEL" && excelProducts.length === 0) ||
                    (selectedType === "XML" && xmlProducts.length === 0)
                  }
                  className="w-full px-6 py-4 rounded-xl bg-gradient-to-r from-purple-500/30 to-blue-500/30 hover:from-purple-500/40 hover:to-blue-500/40 text-white font-bold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden Inputs */}
      <input
        ref={scannerInputRef}
        value={scannedData}
        onChange={(e) => handleScannerInput(e.target.value)}
        className="absolute left-[-9999px] opacity-0"
        autoFocus={false}
      />
      <input ref={excelInputRef} type="file" accept=".xlsx,.xls" onChange={handleExcelFileSelect} className="hidden" />
      <input ref={xmlInputRef} type="file" accept=".xml" onChange={handleXmlFileSelect} className="hidden" />
    </div>
  )
}
