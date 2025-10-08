"use client"

import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import {
  Scan,
  Plus,
  Minus,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Package,
  CheckCircle2,
  Loader2,
  Clock,
  X,
  XCircle,
  Target,
  List,
} from "lucide-react"

type XmlDetalle = {
  CLAVE: string
  DESCRIPCION: string
  UMED: string | null
  CANTIDAD: number
  VALOR_UNITARIO?: number
  IMPORTE?: number
  NO_IDENTIFICACION?: string
  _key: string
  packed: number
  scanned: number
}

interface XmlReciboProps {
  xmlData: any[]
  folio: string
}

export default function XmlReciboPremium({ xmlData, folio }: XmlReciboProps) {
  const router = useRouter()
  const { apiUrl } = useCompany()

  const [detalles, setDetalles] = useState<XmlDetalle[]>(() => {
    return xmlData.map((item: any, idx: number) => ({
      CLAVE: item.CLAVE || "",
      DESCRIPCION: item.DESCRIPCION || "",
      UMED: item.UMED || null,
      CANTIDAD: Number(item.CANTIDAD) || 0,
      VALOR_UNITARIO: item.VALOR_UNITARIO,
      IMPORTE: item.IMPORTE,
      NO_IDENTIFICACION: item.NO_IDENTIFICACION,
      _key: `xml-${idx}`,
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
  const [completionMessage, setCompletionMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const [timerStarted, setTimerStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [finalTime, setFinalTime] = useState<number | null>(null)
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product: XmlDetalle
    timestamp: Date
  } | null>(null)
  const [toasts, setToasts] = useState<any[]>([])
  const [showMissingModal, setShowMissingModal] = useState(false)
  const [receptionComplete, setReceptionComplete] = useState(false)

  const scannerRef = useRef<HTMLInputElement>(null)

  const baseURL = useMemo(() => (apiUrl || "").trim().replace(/\/+$/, ""), [apiUrl])

  const focusScanner = useCallback(() => {
    if (scannerActive) {
      requestAnimationFrame(() => scannerRef.current?.focus())
    }
  }, [scannerActive])

  const flashLine = (idx: number) => {
    setFlashIndex(idx)
    setTimeout(() => setFlashIndex(null), 220)
  }

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

  const showToast = useCallback((message: string, type: "error" | "success" = "error", autoClose = true) => {
    const id = `toast-${Date.now()}-${Math.random()}`
    setToasts((prev) => [...prev, { id, type, message, autoClose }])

    if (autoClose) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 1000)
    }
  }, [])

  const closeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
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

        setLastScannedProduct({
          product: next[idx],
          timestamp: new Date(),
        })

        return next
      })

      if (navigator.vibrate) {
        navigator.vibrate(30)
      }
      flashLine(idx)
    } else {
      if (navigator.vibrate) {
        navigator.vibrate([0, 40, 40, 40])
      }
      showToast(`El código "${code}" no se encontró en este recibo`, "error", true)
    }
  }

  const recepcionar = useCallback(async () => {
    if (!listo) {
      showToast(
        requireScan
          ? "Debes escanear todas las piezas requeridas para aplicar la recepción."
          : "Aún no completas todas las líneas.",
      )
      focusScanner()
      return
    }

    if (!baseURL) {
      showToast("No se encontró la URL de tu empresa")
      return
    }

    setIsProcessing(true)

    try {
      const detallesComp = detalles
        .map((d) => ({
          CLAVE: d.CLAVE,
          CANTIDAD: requireScan ? d.scanned : d.packed,
        }))
        .filter((x) => Number(x.CANTIDAD) > 0)

      const payload = {
        P_SISTEMA: "IN",
        P_CONCEPTO_ID: 27,
        P_SUCURSAL_ID: 384,
        P_ALMACEN_ID: 19,
        P_DESCRIPCION: "ENTRADA DE GOUMAM",
        P_NATURALEZA_CONCEPTO: "E",
        detalles: detallesComp,
      }

      const fullURL = `${baseURL}/recibo/xml`
      const resp = await fetch(fullURL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = await resp.json()

      if (!resp.ok || !data.ok) {
        showToast(data?.message || "Error al aplicar recepción")
        return
      }

      setTimerStarted(false)
      setFinalTime(elapsedSeconds)
      setReceptionComplete(true)

      setCompletionMessage(
        `Recepción completada\n\nFolio: ${data.folio || "N/A"}\nDOCTO_IN_ID: ${data.doctoId}\nLíneas insertadas: ${data.inserted}\nTiempo: ${formatTime(elapsedSeconds)}`,
      )
      setShowCompletionModal(true)
    } catch (error: any) {
      showToast("Error de conexión: No se pudo conectar al servidor")
    } finally {
      setIsProcessing(false)
    }
  }, [listo, requireScan, focusScanner, detalles, baseURL, elapsedSeconds, showToast])

  useEffect(() => {
    if (!scannerActive) return

    const focusInterval = setInterval(() => {
      if (document.activeElement !== scannerRef.current) {
        scannerRef.current?.focus()
      }
    }, 100)

    scannerRef.current?.focus()

    return () => clearInterval(focusInterval)
  }, [scannerActive])

  useEffect(() => {
    if (!timerStarted || !startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      setElapsedSeconds(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [timerStarted, startTime])

  useEffect(() => {
    const totalScanned = detalles.reduce((sum, d) => sum + d.scanned, 0)
    if (totalScanned > 0 && !timerStarted && detalles.length > 0) {
      setTimerStarted(true)
      setStartTime(Date.now())
    }
  }, [detalles, timerStarted])

  const missingItems = detalles.filter((item) => {
    const required = item.CANTIDAD
    const scanned = requireScan ? item.scanned : item.packed
    return scanned < required
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-[100] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`glass rounded-xl p-4 border shadow-lg animate-slide-in-right flex items-center gap-3 min-w-[320px] ${
              toast.type === "error" ? "border-red-200/50 bg-red-50/90" : "border-green-200/50 bg-green-50/90"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                toast.type === "error" ? "bg-red-500" : "bg-green-500"
              }`}
            >
              {toast.type === "error" ? (
                <XCircle className="w-5 h-5 text-white" />
              ) : (
                <CheckCircle className="w-5 h-5 text-white" />
              )}
            </div>
            <p className={`flex-1 text-sm font-medium ${toast.type === "error" ? "text-red-900" : "text-green-900"}`}>
              {toast.message}
            </p>
            {!toast.autoClose && (
              <button
                onClick={() => closeToast(toast.id)}
                className="w-6 h-6 rounded-lg hover:bg-white/50 flex items-center justify-center transition-colors flex-shrink-0"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Premium Header */}
      <div className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm hover:bg-white/90 transition-all duration-200"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Recepción XML</h1>
                  <p className="text-md text-slate-500">Gestión de Entradas desde XML</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {missingItems.length > 0 && (
                <button
                  onClick={() => setShowMissingModal(true)}
                  className="text-md bg-orange-100 text-orange-700 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors"
                >
                  Ver Faltantes ({missingItems.length})
                </button>
              )}
              {timerStarted && !receptionComplete && (
                <div className="glass rounded-xl px-8 py-4 border border-white/20 flex items-center gap-2 animate-fade-in">
                  <Clock className="w-8 h-8 text-slate-600" />
                  <div className="text-right">
                    <div className="text-md text-slate-500 leading-none mb-0.5">Tiempo</div>
                    <div className="text-xl font-bold text-slate-900 leading-none tabular-nums">
                      {formatTime(elapsedSeconds)}
                    </div>
                  </div>
                </div>
              )}

              <button
                className={`w-10 h-10 rounded-xl border transition-all duration-200 flex items-center justify-center ${
                  requireScan
                    ? "bg-slate-900 border-slate-800 text-white shadow-lg"
                    : "bg-white/80 border-white/20 text-slate-600 hover:bg-white/90"
                }`}
                onClick={() => {
                  setRequireScan(!requireScan)
                  setTimeout(focusScanner, 50)
                }}
              >
                <Scan className="w-4 h-4" />
              </button>
            </div>
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
        className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none"
        autoComplete="off"
        tabIndex={-1}
      />
{/* diseño a todos los recibos */}
      <div className="flex h-[calc(90vh-80px)]">
        {/* Main Content - 75% */}
        {/* mejor diseño scroll */}
        <div className="flex-1 w-3/4 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 pt-8 pb-0">
            {/* Products List */}
            {detalles.length > 0 && !receptionComplete && (
              <div className="space-y-3 pb-24">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Productos</h3>
                {detalles.map((item, index) => {
                  const req = item.CANTIDAD
                  const pk = item.packed
                  const sc = item.scanned
                  const okLinea = requireScan ? sc >= req : pk >= req
                  const isFlash = flashIndex === index

                  return (
                    <div
                      key={item._key}
                      id={`product-${index}`}
                      className={`glass rounded-xl p-4 border transition-all duration-300 ${
                        okLinea
                          ? "border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/80"
                          : "border-white/20 bg-white/40"
                      } ${isFlash ? "ring-2 ring-blue-400 bg-blue-50/80" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className={`font-bold text-sm ${okLinea ? "text-green-900" : "text-slate-900"}`}>
                              {item.CLAVE}
                            </h4>
                            {okLinea && (
                              <div className="flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-md">
                                <CheckCircle className="w-3 h-3" />
                                Completo
                              </div>
                            )}
                          </div>

                          <p className="text-slate-700 text-sm mb-2 leading-relaxed">{item.DESCRIPCION}</p>

                          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
                            <span>UM: {item.UMED || "N/A"}</span>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-slate-500">Requerido:</span>
                              <span className="font-bold text-slate-900 ml-1">{req}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Empacado:</span>
                              <span className="font-bold text-slate-900 ml-1">{pk}</span>
                            </div>
                            <div>
                              <span className="text-slate-500">Escaneado:</span>
                              <span className={`font-bold ml-1 ${okLinea ? "text-green-700" : "text-slate-900"}`}>
                                {sc}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 ml-6">
                          <div className="flex items-center gap-2">
                            <button
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                requireScan
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                              }`}
                              onClick={() => {
                                if (!requireScan) dec(index)
                              }}
                              disabled={requireScan}
                            >
                              <Minus className="w-4 h-4" />
                            </button>

                            <span className="font-bold text-lg text-slate-900 min-w-8 text-center">{pk}</span>

                            <button
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                requireScan
                                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                                  : "bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                              }`}
                              onClick={() => {
                                if (!requireScan) inc(index)
                              }}
                              onMouseDown={(e) => {
                                if (!requireScan) {
                                  const timer = setTimeout(() => fillToRequired(index), 250)
                                  const handleMouseUp = () => {
                                    clearTimeout(timer)
                                    document.removeEventListener("mouseup", handleMouseUp)
                                  }
                                  document.addEventListener("mouseup", handleMouseUp)
                                }
                              }}
                              disabled={requireScan}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>

                          <p
                            className={`text-xs text-center leading-tight ${
                              requireScan ? "text-slate-400" : "text-slate-600"
                            }`}
                          >
                            {requireScan ? "Escanea para avanzar" : "Mantén + para llenar"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - 25% */}
        {!receptionComplete && (
          <div className="w-1/4 border-l border-white/20 bg-gradient-to-b from-slate-50/80 to-white/80 backdrop-blur-sm">
            <div className="p-6 h-full flex flex-col">
              {/* Overall Progress */}
              {detalles.length > 0 && (
                <div className="glass rounded-xl p-4 mb-6 border border-white/20">
                  <div className="text-center mb-4">
                    <div className="text-6xl font-bold text-slate-900 mb-2">{Math.round(progreso * 100)}%</div>
                    <p className="text-sm font-medium text-slate-600">Progreso Total</p>
                  </div>

                  <div className="relative h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                    <div
                      className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                        listo
                          ? "bg-gradient-to-r from-green-500 to-emerald-500"
                          : "bg-gradient-to-r from-blue-500 to-indigo-600"
                      }`}
                      style={{ width: `${progreso * 100}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{totalHechas} completadas</span>
                    <span>{totalRequeridas} total</span>
                  </div>
                </div>
              )}

              {/* Last Scanned Product */}
              {lastScannedProduct && (
                <div className="glass rounded-xl p-4 mb-6 border border-green-200/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                      <Target className="w-3 h-3 text-white" />
                    </div>
                    <h4 className="font-semibold text-green-900 text-sm">Último Escaneado</h4>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Clave</p>
                      <p className="font-bold text-green-900 text-sm">{lastScannedProduct.product.CLAVE}</p>
                    </div>

                    <div>
                      <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Producto</p>
                      <p className="text-green-800 text-xs leading-tight">{lastScannedProduct.product.DESCRIPCION}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-white/60 rounded-lg p-2 border border-green-200/50">
                        <p className="text-xs font-medium text-green-700">Escaneado</p>
                        <p className="text-lg font-bold text-green-900">{lastScannedProduct.product.scanned}</p>
                      </div>
                      <div className="bg-white/60 rounded-lg p-2 border border-green-200/50">
                        <p className="text-xs font-medium text-green-700">Requerido</p>
                        <p className="text-lg font-bold text-green-900">{lastScannedProduct.product.CANTIDAD}</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium text-green-700">Completado</span>
                        <span className="text-sm font-bold text-green-900">
                          {Math.round(
                            ((lastScannedProduct.product.scanned || 0) / (lastScannedProduct.product.CANTIDAD || 1)) *
                              100,
                          )}
                          %
                        </span>
                      </div>
                      <div className="h-2 bg-green-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, ((lastScannedProduct.product.scanned || 0) / (lastScannedProduct.product.CANTIDAD || 1)) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Info */}
              <div className="glass rounded-2xl p-6 mb-6 border border-white/20">
                <h2 className="text-xl font-bold text-slate-900 mb-1">Orden: {folio}</h2>
                <p className="text-slate-600">Recepción desde archivo XML</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Missing Items Modal */}
      {showMissingModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                  <List className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Artículos Faltantes</h3>
                  <p className="text-sm text-slate-600">{missingItems.length} productos pendientes</p>
                </div>
              </div>
              <button
                onClick={() => setShowMissingModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="space-y-3">
              {missingItems.map((item, index) => {
                const required = item.CANTIDAD
                const scanned = requireScan ? item.scanned : item.packed
                const missing = required - scanned

                return (
                  <div
                    key={item._key || `missing-${index}`}
                    className="glass rounded-lg p-4 border border-orange-200/50 bg-orange-50/50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{item.CLAVE}</h4>
                        <p className="text-sm text-slate-600 mb-2">{item.DESCRIPCION}</p>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>Requerido: {required}</span>
                          <span>Escaneado: {scanned}</span>
                          <span className="text-orange-600 font-medium">Faltan: {missing}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-orange-600">{missing}</div>
                        <div className="text-xs text-slate-500">faltantes</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowMissingModal(false)}
                className="w-full py-3 bg-slate-600 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-3xl bg-white/80 p-8 max-w-lg w-full border border-white/20 shadow-2xl animate-scale-in">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>

              <h2 className="text-3xl font-bold text-slate-900 mb-4">¡Recepción Completada!</h2>

              <p className="text-slate-700 text-lg leading-relaxed mb-8 whitespace-pre-line">{completionMessage}</p>

              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  router.push("/modulos")
                }}
                className="w-full py-4 rounded-xl font-bold text-white text-lg bg-gradient-to-r from-green-500 to-emerald-500 hover:shadow-xl transition-all duration-200 shadow-lg"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Button */}
      {!receptionComplete && (
        <div className="fixed bottom-6 left-0 right-1/4 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-0 px-6 ">
          <div className="max-w-5xl mx-auto">
            <button
              className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                listo
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  : "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed"
              }`}
              onClick={() => {
                if (listo) recepcionar()
              }}
              disabled={!listo || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Procesando recepción...
                </>
              ) : listo ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Aplicar Recepción
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5" />
                  Completa el escaneo para continuar
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
