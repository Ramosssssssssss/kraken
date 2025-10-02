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
}

export default function SeleccionTipoPremium() {
  const router = useRouter()
  const { companyData, apiUrl } = useCompany()
  const [selectedType, setSelectedType] = useState<"MANUAL" | "XML" | "EXCEL" | null>(null)
  const [folio, setFolio] = useState("")
  const [scannerActive, setScannerActive] = useState(false)
  const [scannedData, setScannedData] = useState("")
  const [excelProducts, setExcelProducts] = useState<ExcelProduct[]>([])
  const [isProcessingExcel, setIsProcessingExcel] = useState(false)
  const [xmlProducts, setXmlProducts] = useState<XmlProduct[]>([])
  const [isProcessingXml, setIsProcessingXml] = useState(false)
  const [excelFileName, setExcelFileName] = useState("")
  const [xmlFileName, setXmlFileName] = useState("")

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

      // Extract folio
      const comprobanteMatch = xmlText.match(/<cfdi:Comprobante[^>]*>/i)
      let extractedFolio = ""

      if (comprobanteMatch) {
        const serieMatch = comprobanteMatch[0].match(/Serie="([^"]*)"/i)
        const folioMatch = comprobanteMatch[0].match(/Folio="([^"]*)"/i)

        if (serieMatch && folioMatch) {
          extractedFolio = `${serieMatch[1]}-${folioMatch[1]}`
        } else if (folioMatch) {
          extractedFolio = folioMatch[1]
        }

        if (extractedFolio) {
          setFolio(extractedFolio)
        }
      }

      // Extract products
      const products: XmlProduct[] = []
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

      if (products.length === 0) {
        throw new Error("No se encontraron conceptos válidos en el archivo XML")
      }

      setXmlProducts(products)

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
      xmlInputRef.current?.click()
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
        CLAVE: product.clave,
        DESCRIPCION: product.descripcion,
        UMED: null,
        CANTIDAD: product.cantidad,
        VALOR_UNITARIO: product.valorUnitario,
        IMPORTE: product.importe,
        NO_IDENTIFICACION: product.noIdentificacion,
      }))

      router.push(`/xml?folio=${folio}&data=${encodeURIComponent(JSON.stringify(xmlData))}`)
    }
  }

  return (
    <div className="min-h-screen bg-black from-black-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="glass-dark sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/modulos")}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold text-white">Selección de Tipo</h1>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleScannerToggle}
              className={`text-white ${scannerActive ? "bg-black-500/30" : "hover:bg-white/10"}`}
            >
              <Scan className="h-4 w-4 mr-2" />
              {scannerActive ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Title */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-black-900 mb-2">Selecciona el Tipo de Procesamiento</h2>
            <p className="text-black-700">Elige cómo deseas ingresar los datos</p>
          </div>

          {/* Type Selection Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            {/* MANUAL */}
            <Card
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedType === "MANUAL"
                  ? "glass-dark border-black-400 shadow-lg shadow-black-500/50"
                  : "glass border-white/40 hover:border-black-300"
              }`}
              onClick={() => handleTypeSelection("MANUAL")}
            >
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${selectedType === "MANUAL" ? "bg-black-500" : "bg-black-100"}`}>
                  <Edit3 className={`h-8 w-8 ${selectedType === "MANUAL" ? "text-white" : "text-black-700"}`} />
                </div>
                <div>
                  <h3
                    className={`text-xl font-bold mb-2 ${selectedType === "MANUAL" ? "text-white" : "text-black-900"}`}
                  >
                    MANUAL
                  </h3>
                  <p className={`text-sm ${selectedType === "MANUAL" ? "text-black-100" : "text-black-700"}`}>
                    Ingreso manual de datos
                  </p>
                </div>
                {selectedType === "MANUAL" && (
                  <div className="bg-black-400 text-black-900 px-3 py-1 rounded-full text-xs font-semibold">
                    SELECCIONADO
                  </div>
                )}
              </div>
            </Card>

            {/* XML */}
            <Card
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedType === "XML"
                  ? "glass-dark border-black-400 shadow-lg shadow-black-500/50"
                  : "glass border-white/40 hover:border-black-300"
              }`}
              onClick={() => handleTypeSelection("XML")}
            >
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${selectedType === "XML" ? "bg-black-500" : "bg-black-100"}`}>
                  <FileText className={`h-8 w-8 ${selectedType === "XML" ? "text-white" : "text-black-700"}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${selectedType === "XML" ? "text-white" : "text-black-900"}`}>
                    XML
                  </h3>
                  <p className={`text-sm ${selectedType === "XML" ? "text-black-100" : "text-black-700"}`}>
                    Procesamiento de archivo XML
                  </p>
                </div>
                {selectedType === "XML" && (
                  <div className="bg-black-400 text-black-900 px-3 py-1 rounded-full text-xs font-semibold">
                    SELECCIONADO
                  </div>
                )}
              </div>
            </Card>

            {/* EXCEL */}
            <Card
              className={`cursor-pointer transition-all duration-300 hover:scale-105 ${
                selectedType === "EXCEL"
                  ? "glass-dark border-black-400 shadow-lg shadow-black-500/50"
                  : "glass border-white/40 hover:border-black-300"
              }`}
              onClick={() => handleTypeSelection("EXCEL")}
            >
              <div className="p-6 flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-full ${selectedType === "EXCEL" ? "bg-black-500" : "bg-black-100"}`}>
                  <FileSpreadsheet className={`h-8 w-8 ${selectedType === "EXCEL" ? "text-white" : "text-black-700"}`} />
                </div>
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${selectedType === "EXCEL" ? "text-white" : "text-black-900"}`}>
                    EXCEL
                  </h3>
                  <p className={`text-sm ${selectedType === "EXCEL" ? "text-black-100" : "text-black-700"}`}>
                    Procesamiento de archivo Excel
                  </p>
                </div>
                {selectedType === "EXCEL" && (
                  <div className="bg-black-400 text-black-900 px-3 py-1 rounded-full text-xs font-semibold">
                    SELECCIONADO
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* XML File Status */}
          {selectedType === "XML" && (
            <Card className="glass border-white/40">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  {xmlProducts.length > 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-black-500" />
                  ) : (
                    <FileText className="h-6 w-6 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-black-900">Archivo XML</h3>
                </div>

                {xmlProducts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-black-600 font-medium">✓ {xmlProducts.length} conceptos encontrados</p>
                    <p className="text-sm text-gray-600">{xmlFileName}</p>
                    <Button
                      variant="outline"
                      onClick={() => xmlInputRef.current?.click()}
                      className="w-full border-black-300 text-black-700 hover:bg-black-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar otro archivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-600 text-sm">No se ha seleccionado ningún archivo XML</p>
                    <Button
                      onClick={() => xmlInputRef.current?.click()}
                      disabled={isProcessingXml}
                      className="w-full bg-black-600 hover:bg-black-700 text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isProcessingXml ? "Procesando..." : "Seleccionar Archivo XML"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* EXCEL File Status */}
          {selectedType === "EXCEL" && (
            <Card className="glass border-white/40">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  {excelProducts.length > 0 ? (
                    <CheckCircle2 className="h-6 w-6 text-black-500" />
                  ) : (
                    <FileSpreadsheet className="h-6 w-6 text-gray-400" />
                  )}
                  <h3 className="text-lg font-semibold text-black-900">Archivo Excel</h3>
                </div>

                {excelProducts.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-black-600 font-medium">✓ {excelProducts.length} productos encontrados</p>
                    <p className="text-sm text-gray-600">{excelFileName}</p>
                    <Button
                      variant="outline"
                      onClick={() => excelInputRef.current?.click()}
                      className="w-full border-black-300 text-black-700 hover:bg-black-50"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Seleccionar otro archivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-gray-600 text-sm">No se ha seleccionado ningún archivo</p>
                    <Button
                      onClick={() => excelInputRef.current?.click()}
                      disabled={isProcessingExcel}
                      className="w-full bg-black-600 hover:bg-black-700 text-white"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isProcessingExcel ? "Procesando..." : "Seleccionar Archivo Excel"}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Financial Summary for XML */}
          {selectedType === "XML" && xmlProducts.length > 0 && (
            <Card className="glass border-black-300">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-6 w-6 text-black-600" />
                  <h3 className="text-lg font-semibold text-black-900">Resumen Financiero XML</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Conceptos</p>
                    <p className="text-xl font-bold text-black-700">{xmlProducts.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Total Cantidad</p>
                    <p className="text-xl font-bold text-black-700">
                      {xmlProducts.reduce((sum, p) => sum + p.cantidad, 0)} pzs
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Total Importe</p>
                    <p className="text-xl font-bold text-black-700">
                      ${xmlProducts.reduce((sum, p) => sum + p.importe, 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-gray-600">Precio Promedio</p>
                    <p className="text-xl font-bold text-black-700">
                      ${(xmlProducts.reduce((sum, p) => sum + p.valorUnitario, 0) / xmlProducts.length).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Folio Input */}
          {selectedType && (
            <Card className="glass border-white/40">
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-black-900">Ingresa el Folio</h3>

                <Input
                  value={folio}
                  onChange={(e) => setFolio(e.target.value)}
                  placeholder="Folio del documento"
                  className="border-black-300 focus:border-black-500 focus:ring-black-500"
                />

                <Button
                  onClick={handleContinue}
                  disabled={
                    !selectedType ||
                    !folio.trim() ||
                    (selectedType === "EXCEL" && excelProducts.length === 0) ||
                    (selectedType === "XML" && xmlProducts.length === 0)
                  }
                  className="w-full bg-black-600 hover:bg-black-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
                >
                  Continuar
                </Button>
              </div>
            </Card>
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
