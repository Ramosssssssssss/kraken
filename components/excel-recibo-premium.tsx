"use client"

import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Scan, CheckCircle2, AlertCircle, Minus, Plus, Package, ClipboardCheck } from "lucide-react"

type ExcelDetalle = {
  CLAVE: string
  DESCRIPCION: string
  UMED: string
  CANTIDAD: number
  _key: string
  packed: number
  scanned: number
}

interface ExcelReciboProps {
  excelData: any[]
}

export default function ExcelReciboPremium({ excelData }: ExcelReciboProps) {
  const router = useRouter()
  const { apiUrl } = useCompany()

  const [detalles, setDetalles] = useState<ExcelDetalle[]>(() => {
    return excelData.map((item: any, idx: number) => ({
      CLAVE: item.CLAVE || "",
      DESCRIPCION: item.DESCRIPCION || "",
      UMED: item.UMED || "",
      CANTIDAD: Number(item.CANTIDAD) || 0,
      _key: `excel-${idx}`,
      packed: 0,
      scanned: 0,
    }))
  })

  const [requireScan, setRequireScan] = useState(true)
  const [autoFill, setAutoFill] = useState(false)
  const [scanValue, setScanValue] = useState("")
  const [scannerActive, setScannerActive] = useState(false)
  const [flashIndex, setFlashIndex] = useState<number | null>(null)
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const scannerRef = useRef<HTMLInputElement>(null)

  const baseURL = useMemo(() => (apiUrl || "").trim().replace(/\/+$/, ""), [apiUrl])

  useEffect(() => {
    if (!scannerActive) return

    const focusInterval = setInterval(() => {
      if (document.activeElement !== scannerRef.current) {
        scannerRef.current?.focus()
      }
    }, 100)

    // Initial focus
    scannerRef.current?.focus()

    return () => clearInterval(focusInterval)
  }, [scannerActive])

  const focusScanner = useCallback(() => {
    if (scannerActive) {
      requestAnimationFrame(() => scannerRef.current?.focus())
    }
  }, [scannerActive])

  const flashLine = (idx: number) => {
    setFlashIndex(idx)
    setTimeout(() => setFlashIndex(null), 220)
  }

  const caratula = useMemo(
    () => ({
      FECHA: new Date().toLocaleDateString(),
      FOLIO: `EXCEL-${Date.now()}`,
      ALMACEN: "ALMACEN PRINCIPAL",
      PROVEEDOR: "PROVEEDOR EXCEL",
      CLAVE_PROV: "PROV001",
    }),
    [],
  )

  const totalLineas = detalles.length
  const totalRequeridas = detalles.reduce((acc, d) => acc + d.CANTIDAD, 0)
  const lineasCompletas = detalles.filter((d) => {
    const req = d.CANTIDAD
    const ok = requireScan ? d.scanned >= req : d.packed >= req
    return req > 0 && ok
  }).length
  const totalHechas = detalles.reduce((acc, d) => {
    const val = requireScan ? d.scanned : d.packed
    return acc + val
  }, 0)
  const progreso = totalRequeridas > 0 ? Math.min(1, totalHechas / totalRequeridas) : 0
  const listo = totalLineas > 0 && lineasCompletas === totalLineas && totalHechas === totalRequeridas

  const inc = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.CANTIDAD
      const pk = d.packed
      if (pk < req) next[idx] = { ...d, packed: pk + 1 }
      return next
    })
    focusScanner()
  }

  const dec = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const pk = d.packed
      const sc = d.scanned
      if (pk > 0) next[idx] = { ...d, packed: pk - 1, scanned: Math.min(sc, pk - 1) }
      return next
    })
    focusScanner()
  }

  const fillToRequired = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.CANTIDAD
      next[idx] = { ...d, packed: req, scanned: requireScan ? d.scanned : req }
      return next
    })
    focusScanner()
  }

  const processScan = (raw: string) => {
    const code = (raw || "").trim().toUpperCase()
    if (!code) return

    const idx = detalles.findIndex((d) => d.CLAVE.toUpperCase() === code)

    if (idx >= 0) {
      setDetalles((prev) => {
        const next = [...prev]
        const item = next[idx]
        const req = item.CANTIDAD
        const pk = item.packed
        const sc = item.scanned

        let newPacked = pk
        let newScanned = sc

        if (autoFill) {
          newPacked = Math.min(req, req)
          newScanned = Math.min(req, req)
        } else {
          if (pk < req) newPacked = pk + 1
          if (sc < req) newScanned = sc + 1
        }

        next[idx] = { ...item, packed: newPacked, scanned: newScanned }
        return next
      })

      // Web Vibration API
      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
      flashLine(idx)
    } else {
      // Error vibration
      if (navigator.vibrate) {
        navigator.vibrate([0, 40, 40, 40])
      }
      alert(`No encontrado: El código "${code}" no coincide con ninguna línea.`)
    }
  }

  const recepcionar = useCallback(async () => {
    if (!listo) {
      alert(
        requireScan
          ? "Debes escanear todas las piezas requeridas para aplicar la recepción."
          : "Aún no completas todas las líneas.",
      )
      focusScanner()
      return
    }

    setIsProcessing(true)

    try {
      // Simulate API call for Excel reception
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setShowCompletionModal(true)
    } catch (error: any) {
      console.error("[v0] Error en recepcionar:", error)
      alert("Error de conexión: No se pudo conectar al servidor")
    } finally {
      setIsProcessing(false)
    }
  }, [listo, requireScan, focusScanner])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="glass-dark sticky top-0 z-50 border-b border-white/20">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white hover:bg-white/10">
              <ArrowLeft className="h-5 w-5" />
            </Button>

            <h1 className="text-lg font-semibold text-white">Recepción Excel</h1>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setScannerActive(!scannerActive)
                if (!scannerActive) {
                  setTimeout(() => focusScanner(), 100)
                }
              }}
              className={`text-white ${scannerActive ? "bg-cyan-500/30" : "hover:bg-white/10"}`}
            >
              <Scan className="h-4 w-4 mr-2" />
              {scannerActive ? "ON" : "OFF"}
            </Button>
          </div>
        </div>
      </div>

      {/* Hidden Scanner Input */}
      <input
        ref={scannerRef}
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            processScan(scanValue)
            setScanValue("")
            focusScanner()
          }
        }}
        className="absolute left-[-9999px] opacity-0 w-0 h-0"
        autoFocus={false}
      />

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-6">
        {/* Controls Row */}
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={requireScan}
              onChange={(e) => setRequireScan(e.target.checked)}
              className="w-5 h-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-cyan-900">Requerir escaneo</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoFill}
              onChange={(e) => setAutoFill(e.target.checked)}
              className="w-5 h-5 rounded border-cyan-300 text-cyan-600 focus:ring-cyan-500"
            />
            <span className="text-sm font-medium text-cyan-900">Auto-fill</span>
          </label>
        </div>

        {/* Caratula Card */}
        <Card className="glass border-white/40">
          <div className="p-6 space-y-3">
            <h3 className="text-xl font-bold text-cyan-900 flex items-center gap-2">
              <ClipboardCheck className="h-6 w-6 text-cyan-600" />
              Carátula Excel
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Folio</p>
                <p className="text-lg font-bold text-cyan-900">{caratula.FOLIO}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha</p>
                <p className="text-lg font-bold text-cyan-900">{caratula.FECHA}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Almacén</p>
                <p className="text-lg font-bold text-cyan-900">{caratula.ALMACEN}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Proveedor</p>
                <p className="text-lg font-bold text-cyan-900">{caratula.PROVEEDOR}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Progress Card */}
        {detalles.length > 0 && (
          <Card className="glass border-white/40">
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-cyan-900">
                  Líneas: {lineasCompletas}/{totalLineas} • Piezas: {totalHechas}/{totalRequeridas}{" "}
                  {requireScan ? "(escaneadas)" : ""}
                </p>
                <p className="text-sm font-bold text-cyan-700">{Math.round(progreso * 100)}%</p>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${listo ? "bg-gradient-to-r from-cyan-500 to-cyan-600" : "bg-gradient-to-r from-cyan-400 to-blue-500"}`}
                  style={{ width: `${progreso * 100}%` }}
                />
              </div>
            </div>
          </Card>
        )}

        {/* Detalle List */}
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-cyan-900 flex items-center gap-2">
            <Package className="h-6 w-6 text-cyan-600" />
            Detalle Excel ({detalles.length} líneas)
          </h3>

          {detalles.length === 0 ? (
            <Card className="glass border-white/40">
              <div className="p-12 text-center">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No hay datos del Excel para procesar.</p>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {detalles.map((item, index) => {
                const req = item.CANTIDAD
                const pk = item.packed
                const sc = item.scanned
                const okLinea = requireScan ? sc >= req : pk >= req
                const isFlash = flashIndex === index

                return (
                  <Card
                    key={item._key}
                    className={`transition-all duration-200 ${
                      okLinea ? "glass-dark border-cyan-400 shadow-lg shadow-cyan-500/30" : "glass border-white/40"
                    } ${isFlash ? "ring-2 ring-cyan-400 scale-[1.02]" : ""}`}
                  >
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        {/* Left: Product Info */}
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            {okLinea && <CheckCircle2 className="h-5 w-5 text-cyan-400 flex-shrink-0" />}
                            <p className={`font-bold text-lg ${okLinea ? "text-white" : "text-cyan-900"}`}>
                              {item.CLAVE}
                            </p>
                          </div>
                          <p className={`text-sm ${okLinea ? "text-cyan-100" : "text-gray-700"}`}>{item.DESCRIPCION}</p>
                          <p className={`text-xs ${okLinea ? "text-cyan-200" : "text-gray-500"}`}>UM: {item.UMED}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                            <span className={okLinea ? "text-cyan-100" : "text-gray-700"}>
                              Requerido: <span className="font-bold">{req}</span>
                            </span>
                            <span className={okLinea ? "text-cyan-100" : "text-gray-700"}>
                              Empacado: <span className="font-bold">{pk}</span>
                            </span>
                            <span className={okLinea ? "text-cyan-200" : "text-cyan-700"}>
                              Escaneado: <span className="font-bold">{sc}</span>
                            </span>
                          </div>
                        </div>

                        {/* Right: Quantity Controls */}
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => dec(index)}
                              disabled={requireScan || pk === 0}
                              className={`h-9 w-9 ${requireScan ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="text-xl font-bold text-cyan-900 min-w-[40px] text-center">{pk}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => inc(index)}
                              onMouseDown={(e) => {
                                if (e.button === 0) {
                                  const timer = setTimeout(() => fillToRequired(index), 250)
                                  const cleanup = () => {
                                    clearTimeout(timer)
                                    document.removeEventListener("mouseup", cleanup)
                                  }
                                  document.addEventListener("mouseup", cleanup)
                                }
                              }}
                              disabled={requireScan || pk >= req}
                              className={`h-9 w-9 ${requireScan ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                          <p className={`text-xs text-center ${requireScan ? "text-gray-400" : "text-gray-600"}`}>
                            {requireScan ? "Escanea para avanzar" : "Mantén + para llenar"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Action Button */}
        <Button
          onClick={recepcionar}
          disabled={!listo || isProcessing}
          className={`w-full py-6 text-lg font-bold ${
            listo
              ? "bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white shadow-lg shadow-cyan-500/50"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isProcessing ? (
            <>Procesando...</>
          ) : listo ? (
            <>
              <CheckCircle2 className="h-5 w-5 mr-2" />
              Aplicar recepción Excel
            </>
          ) : (
            <>
              <AlertCircle className="h-5 w-5 mr-2" />
              Completa todas las líneas
            </>
          )}
        </Button>
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <Card className="glass-dark max-w-md w-full border-cyan-400 shadow-2xl">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-white">Recepción Completada</h2>

              <p className="text-cyan-100">
                Folio: {caratula.FOLIO}
                <br />
                Líneas procesadas: {lineasCompletas}
              </p>

              <Button
                onClick={() => {
                  setShowCompletionModal(false)
                  router.push("/modulos")
                }}
                className="w-full py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-cyan-700 shadow-lg"
              >
                Aceptar
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
