"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Package, Minus, Plus, Send, AlertCircle, CheckCircle2, Trash2, Scan, Target } from "lucide-react"

interface Articulo {
  ARTICULO_ID: number
  CLAVE_ARTICULO: string
  CODBAR: string
  NOMBRE: string
  LOCALIZACION: string
  UNIDAD_VENTA: string
  UNIDADES: number
}

export default function TraspasoDetailPage({
  params,
}: {
  params: { traspasoInId: string }
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { apiUrl } = useCompany()

  // Parse URL params
  const traspasoInId = params.traspasoInId
  const folio = searchParams.get("folio") || ""
  const almacen = searchParams.get("almacen") || ""
  const articulosEncoded = searchParams.get("articulos") || ""
  const pikerId = searchParams.get("pikerId") || ""

  // Decode articulos
  const [articulos, setArticulos] = useState<Articulo[]>([])

  useEffect(() => {
    if (articulosEncoded) {
      try {
        const decoded = atob(articulosEncoded)
        const parsed = JSON.parse(decoded)
        setArticulos(parsed)
      } catch (error) {
        console.error("Error parsing articulos:", error)
      }
    }
  }, [articulosEncoded])

  // State
  const [confirmedCards, setConfirmedCards] = useState<number[]>([])
  const [listas, setListas] = useState<{ [index: number]: string[] }>({})
  const [inputValues, setInputValues] = useState<{ [index: number]: string }>({})
  const [scannerActivo, setScannerActivo] = useState(true)
  const [tempBarcode, setTempBarcode] = useState("")
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product: Articulo
    index: number
    timestamp: Date
  } | null>(null)

  // Modals
  const [errorModal, setErrorModal] = useState(false)
  const [modalManualCantidad, setModalManualCantidad] = useState(false)
  const [manualCantidad, setManualCantidad] = useState("")
  const [manualIndex, setManualIndex] = useState<number | null>(null)
  const [modalExito, setModalExito] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [modalCodigos, setModalCodigos] = useState(false)
  const [selectedCodigoIndex, setSelectedCodigoIndex] = useState<number | null>(null)

  // Refs
  const scannerRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const flashIndex = useRef<number | null>(null)

  // Focus scanner
  useEffect(() => {
    if (scannerActivo) {
      const focusScanner = () => {
        scannerRef.current?.focus()
      }

      const interval = setInterval(focusScanner, 500)
      focusScanner()

      return () => clearInterval(interval)
    }
  }, [scannerActivo])

  // Verificar estatus del traspaso
  useEffect(() => {
    const verificarEstatus = async () => {
      try {
        const res = await fetch(`${apiUrl}/tras-detalle`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ traspasoInId }),
        })
        if (res.status === 403) setErrorModal(true)
      } catch {
        setErrorModal(true)
      }
    }

    verificarEstatus()
  }, [traspasoInId, apiUrl])

  // Play sounds
  const playSuccessSound = useCallback(() => {
    const audio = new Audio("/sounds/success.mp3")
    audio.play().catch(() => {})
  }, [])

  const playFailedSound = useCallback(() => {
    const audio = new Audio("/sounds/error.mp3")
    audio.play().catch(() => {})
  }, [])

  const flashLine = (idx: number) => {
    flashIndex.current = idx
    setTimeout(() => {
      flashIndex.current = null
    }, 220)
  }

  // Handle global barcode scan
  const handleGlobalBarcode = useCallback(
    (text: string) => {
      let matchFound = false
      let matchedIndex = -1

      for (let i = 0; i < articulos.length; i++) {
        const art = articulos[i]
        const actuales = listas[i] || []

        const expectedClave = (art.CLAVE_ARTICULO || "").replace(/\//g, "-")
        const expectedCodbar = (art.CODBAR || "").replace(/\//g, "-")

        const isMatch =
          (text === expectedClave || text === expectedCodbar) &&
          !confirmedCards.includes(i) &&
          actuales.length < Number(art.UNIDADES)

        if (isMatch) {
          const nuevas = { ...listas, [i]: [...actuales, text] }
          setListas(nuevas)

          if (nuevas[i].length === art.UNIDADES) {
            setConfirmedCards((prev) => [...prev, i])
          }

          setLastScannedProduct({
            product: art,
            index: i,
            timestamp: new Date(),
          })

          matchFound = true
          matchedIndex = i
          break
        }
      }

      if (matchFound && matchedIndex !== -1) {
        flashLine(matchedIndex)
        playSuccessSound()

        const element = document.getElementById(`product-${matchedIndex}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      } else {
        playFailedSound()
      }
    },
    [articulos, listas, confirmedCards, playSuccessSound, playFailedSound],
  )

  // Handle scanner input change
  const handleScannerChange = (text: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setTempBarcode(text)

    timeoutRef.current = setTimeout(() => {
      const cleaned = text.trim().replace(/\//g, "-")
      if (cleaned) {
        handleGlobalBarcode(cleaned)
        setTempBarcode("")
        if (scannerRef.current) {
          scannerRef.current.value = ""
        }
      }
    }, 150)
  }

  // Finalizar traspaso
  const finalizarTraspaso = async () => {
    setLoadingEnvio(true)

    try {
      const response = await fetch(`${apiUrl}/traspaso-enviado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traspasoId: traspasoInId,
          nuevoEstatus: "S",
          productos: articulos.map((item, index) => ({
            ARTICULO_ID: item.ARTICULO_ID,
            CLAVE_ARTICULO: item.CLAVE_ARTICULO,
            UNIDADES: Number(item.UNIDADES),
            SURTIDAS: listas[index]?.length || 0,
          })),
        }),
      })

      const result = await response.json()

      if (response.ok) {
        setModalExito(true)
      } else {
        alert(result.message || "No se pudo finalizar el traspaso.")
      }
    } catch (error) {
      console.error("Error al finalizar el traspaso:", error)
      alert("Error al finalizar el traspaso.")
    } finally {
      setLoadingEnvio(false)
    }
  }

  // Limpiar folio
  const limpiarFolio = (folio: string) => {
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/)
    if (match) {
      return `${match[1]}${match[2]}`
    }
    return folio
  }

  if (articulos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Cargando...</div>
      </div>
    )
  }

  const allConfirmed = confirmedCards.length === articulos.length
  const progressPercent = (confirmedCards.length / articulos.length) * 100
  const totalRequeridas = articulos.reduce((acc, art) => acc + art.UNIDADES, 0)
  const totalEscaneadas = Object.values(listas).reduce((acc, lista) => acc + lista.length, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 font-sans">
      <input
        ref={scannerRef}
        type="text"
        value={tempBarcode}
        onChange={(e) => handleScannerChange(e.target.value)}
        className="fixed -left-[9999px] -top-[9999px] w-1 h-1 opacity-0 pointer-events-none"
        autoComplete="off"
        tabIndex={-1}
      />

      <div className="glass sticky top-0 z-50 border-b border-white/10 backdrop-blur-xl bg-slate-900/80">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 flex items-center justify-center shadow-sm hover:bg-white/10 transition-all duration-200"
                onClick={() => router.back()}
              >
                <ArrowLeft className="w-5 h-5 text-slate-300" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center shadow-lg">
                  <Package className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-white">Traspaso de Mercancía</h1>
                  <p className="text-sm text-slate-400">Gestión de Traspasos</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="w-10 h-10 rounded-xl border transition-all duration-200 flex items-center justify-center bg-slate-700 border-slate-600 text-white shadow-lg">
                <Scan className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 w-3/4 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="glass rounded-2xl p-6 mb-8 border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">Orden: {limpiarFolio(folio)}</h2>
                  <p className="text-slate-400">
                    Destino: {almacen} • Traspaso #{traspasoInId}
                  </p>
                </div>
              </div>
            </div>

            <div className="glass rounded-2xl p-6 mb-8 border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-slate-400 font-medium">Progreso de escaneo</span>
                <span className="font-bold text-white">
                  {totalEscaneadas} / {totalRequeridas} unidades
                </span>
              </div>
              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(totalEscaneadas / totalRequeridas) * 100}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={`h-full rounded-full transition-all duration-500 ${
                    allConfirmed
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : "bg-gradient-to-r from-emerald-500 to-green-400"
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-white mb-4">Productos</h3>
              {articulos.map((item, index) => {
                const req = item.UNIDADES
                const escaneado = listas[index]?.length || 0
                const okLinea = escaneado >= req
                const isFlash = flashIndex.current === index

                return (
                  <div
                    key={index}
                    id={`product-${index}`}
                    className={`glass rounded-xl p-4 border transition-all duration-300 ${
                      okLinea
                        ? "border-green-500/50 bg-gradient-to-r from-green-500/10 to-emerald-500/10"
                        : "border-white/10 bg-white/5"
                    } ${isFlash ? "ring-2 ring-emerald-400 bg-emerald-500/20" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className={`font-bold text-sm ${okLinea ? "text-green-300" : "text-white"}`}>
                            {item.CLAVE_ARTICULO || "—"}
                          </h4>
                          {okLinea && (
                            <div className="flex items-center gap-1 bg-green-500 text-white text-xs px-2 py-1 rounded-md">
                              <CheckCircle2 className="w-3 h-3" />
                              Completo
                            </div>
                          )}
                        </div>

                        {item.NOMBRE && <p className="text-slate-300 text-sm mb-2 leading-relaxed">{item.NOMBRE}</p>}

                        <div className="flex flex-wrap gap-4 text-xs text-slate-400 mb-3">
                          {item.UNIDAD_VENTA && <span>UM: {item.UNIDAD_VENTA}</span>}
                          {item.CODBAR && <span>CB: {item.CODBAR}</span>}
                          {item.LOCALIZACION && <span>LOC: {item.LOCALIZACION}</span>}
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-slate-400">Requerido:</span>
                            <span className="font-bold text-white ml-1">{req}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Escaneado:</span>
                            <span className={`font-bold ml-1 ${okLinea ? "text-green-400" : "text-white"}`}>
                              {escaneado}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3 ml-6">
                        <div className="flex items-center gap-2">
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                            onClick={() => {
                              const actuales = listas[index] || []
                              if (actuales.length > 0) {
                                const nuevos = actuales.slice(0, -1)
                                const nuevasListas = { ...listas, [index]: nuevos }
                                setListas(nuevasListas)

                                if (confirmedCards.includes(index) && nuevos.length < Number(item.UNIDADES)) {
                                  setConfirmedCards(confirmedCards.filter((i) => i !== index))
                                }

                                playFailedSound()
                              }
                            }}
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <span className="font-bold text-lg text-white min-w-8 text-center">{escaneado}</span>

                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 bg-slate-700 text-white hover:bg-slate-600 shadow-sm"
                            onClick={() => {
                              const actuales = listas[index] || []
                              const totalReq = Number(item.UNIDADES)
                              if (actuales.length < totalReq) {
                                const nuevos = [...actuales, `MANUAL-${Date.now()}`]
                                const nuevasListas = { ...listas, [index]: nuevos }
                                setListas(nuevasListas)

                                if (nuevos.length === totalReq) {
                                  setConfirmedCards([...confirmedCards, index])
                                }

                                setLastScannedProduct({
                                  product: item,
                                  index,
                                  timestamp: new Date(),
                                })

                                playSuccessSound()
                              }
                            }}
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setSelectedCodigoIndex(index)
                            setModalCodigos(true)
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          Ver códigos
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {!allConfirmed && (
              <div className="sticky bottom-6 mt-8">
                <button
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-slate-500 to-slate-600 cursor-not-allowed"
                  disabled
                >
                  <AlertCircle className="w-5 h-5" />
                  Completa el escaneo para continuar
                </button>
              </div>
            )}

            {allConfirmed && (
              <div className="sticky bottom-6 mt-8">
                <button
                  className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  onClick={finalizarTraspaso}
                  disabled={loadingEnvio}
                >
                  {loadingEnvio ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Procesando traspaso...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar Traspaso Completo
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/4 border-l border-white/10 bg-gradient-to-b from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
          <div className="p-6 h-full flex flex-col">
            <div className="glass rounded-xl p-4 mb-6 border border-white/10 bg-white/5 backdrop-blur-xl">
              <div className="text-center mb-4">
                <div className="text-6xl font-bold text-white mb-2">{Math.round(progressPercent)}%</div>
                <p className="text-sm font-medium text-slate-400">Progreso Total</p>
              </div>

              <div className="relative h-3 bg-white/5 rounded-full overflow-hidden mb-3 border border-white/10">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ${
                    allConfirmed
                      ? "bg-gradient-to-r from-green-500 to-emerald-500"
                      : "bg-gradient-to-r from-emerald-500 to-green-400"
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-slate-400">
                <span>{confirmedCards.length} completadas</span>
                <span>{articulos.length} total</span>
              </div>
            </div>

            {lastScannedProduct && (
              <div className="glass rounded-xl p-4 mb-6 border border-green-500/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10 animate-fade-in-up backdrop-blur-xl">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                    <Target className="w-3 h-3 text-white" />
                  </div>
                  <h4 className="font-semibold text-green-300 text-sm">Último Escaneado</h4>
                </div>

                <div className="space-y-2">
                  <div>
                    <p className="text-xs font-medium text-green-400 uppercase tracking-wide">Clave</p>
                    <p className="font-bold text-green-200 text-sm">{lastScannedProduct.product.CLAVE_ARTICULO}</p>
                  </div>

                  {lastScannedProduct.product.NOMBRE && (
                    <div>
                      <p className="text-xs font-medium text-green-400 uppercase tracking-wide">Producto</p>
                      <p className="text-green-200 text-xs leading-tight">{lastScannedProduct.product.NOMBRE}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-2">
                    <div className="bg-white/10 rounded-lg p-2 border border-green-500/30">
                      <p className="text-xs font-medium text-green-400">Escaneado</p>
                      <p className="text-lg font-bold text-green-200">
                        {listas[lastScannedProduct.index]?.length || 0}
                      </p>
                    </div>
                    <div className="bg-white/10 rounded-lg p-2 border border-green-500/30">
                      <p className="text-xs font-medium text-green-400">Requerido</p>
                      <p className="text-lg font-bold text-green-200">{lastScannedProduct.product.UNIDADES}</p>
                    </div>
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-green-400">Completado</span>
                      <span className="text-sm font-bold text-green-200">
                        {Math.round(
                          ((listas[lastScannedProduct.index]?.length || 0) /
                            (lastScannedProduct.product.UNIDADES || 1)) *
                            100,
                        )}
                        %
                      </span>
                    </div>
                    <div className="h-2 bg-green-900/30 rounded-full overflow-hidden border border-green-500/30">
                      <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, ((listas[lastScannedProduct.index]?.length || 0) / (lastScannedProduct.product.UNIDADES || 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-green-500/30">
                    <p className="text-xs text-green-400">
                      Escaneado hace {Math.floor((Date.now() - lastScannedProduct.timestamp.getTime()) / 1000)}s
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="glass rounded-xl p-4 border border-white/10 bg-white/5 backdrop-blur-xl mt-auto">
              <h4 className="font-semibold text-white text-sm mb-3">Información del Traspaso</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Folio:</span>
                  <span className="text-white font-semibold">{limpiarFolio(folio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Destino:</span>
                  <span className="text-white font-semibold">{almacen}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Artículos:</span>
                  <span className="text-white font-semibold">{articulos.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Unidades:</span>
                  <span className="text-white font-semibold">{totalRequeridas}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {errorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass rounded-3xl p-10 max-w-md w-full border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/30">
                  <AlertCircle className="w-10 h-10 text-red-400" />
                </div>
                <h3 className="text-2xl font-bold text-white">Traspaso no disponible</h3>
                <p className="text-slate-300 text-center">Este traspaso ya fue tomado o está en proceso.</p>
                <button
                  onClick={() => {
                    setErrorModal(false)
                    router.back()
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-red-500 to-red-600 text-white font-bold hover:from-red-600 hover:to-red-700 transition-all shadow-lg"
                >
                  Volver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {modalManualCantidad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass rounded-3xl p-10 max-w-md w-full border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-6 text-white">Cantidad a agregar</h3>
              <input
                type="number"
                value={manualCantidad}
                onChange={(e) => setManualCantidad(e.target.value)}
                placeholder="Ingresa la cantidad"
                className="w-full px-6 py-4 rounded-xl glass bg-white/5 border-2 border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 mb-8 text-lg backdrop-blur-sm"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setModalManualCantidad(false)}
                  className="flex-1 py-4 rounded-xl glass bg-white/5 border border-white/10 font-bold hover:bg-white/10 hover:border-white/20 transition-all text-white"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if (manualIndex !== null) {
                      const cantidad = Number.parseInt(manualCantidad, 10)
                      if (!isNaN(cantidad) && cantidad > 0) {
                        const actuales = listas[manualIndex] || []
                        const totalReq = Number(articulos[manualIndex].UNIDADES)
                        const restantes = totalReq - actuales.length
                        const agregar = Math.min(restantes, cantidad)
                        const nuevos = Array(agregar)
                          .fill(null)
                          .map(() => `MANUAL-${Date.now()}-${Math.random()}`)

                        const nuevasListas = {
                          ...listas,
                          [manualIndex]: [...actuales, ...nuevos],
                        }
                        setListas(nuevasListas)

                        if (actuales.length + agregar >= totalReq) {
                          setConfirmedCards([...confirmedCards, manualIndex])
                        }

                        setLastScannedProduct({
                          product: articulos[manualIndex],
                          index: manualIndex,
                          timestamp: new Date(),
                        })

                        playSuccessSound()
                      }
                    }
                    setModalManualCantidad(false)
                  }}
                  className="flex-1 py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {modalExito && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass rounded-3xl p-10 max-w-md w-full border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl"
            >
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-2xl"
                >
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </motion.div>
                <h3 className="text-2xl font-bold text-white">¡Traspaso enviado!</h3>
                <p className="text-slate-300 text-center">El traspaso se ha finalizado correctamente.</p>
                <button
                  onClick={() => {
                    setModalExito(false)
                    router.push("/traspasos")
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg"
                >
                  Volver a traspasos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {modalCodigos && selectedCodigoIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass rounded-3xl p-10 max-w-md w-full max-h-[80vh] overflow-y-auto border border-white/10 bg-slate-900/90 backdrop-blur-xl shadow-2xl"
            >
              <h3 className="text-2xl font-bold mb-8 text-white">Códigos escaneados</h3>
              <div className="space-y-3 mb-8">
                {(listas[selectedCodigoIndex] || []).length === 0 ? (
                  <p className="text-slate-400 text-center py-8">No hay códigos escaneados aún</p>
                ) : (
                  (listas[selectedCodigoIndex] || []).map((codigo, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl glass bg-white/5 border border-white/10 backdrop-blur-sm"
                    >
                      <span className="text-sm font-mono text-white">{codigo}</span>
                      <button
                        onClick={() => {
                          const nuevaLista = [...listas[selectedCodigoIndex]]
                          nuevaLista.splice(i, 1)
                          const nuevasListas = {
                            ...listas,
                            [selectedCodigoIndex]: nuevaLista,
                          }
                          setListas(nuevasListas)

                          if (
                            confirmedCards.includes(selectedCodigoIndex) &&
                            nuevaLista.length < Number(articulos[selectedCodigoIndex].UNIDADES)
                          ) {
                            setConfirmedCards(confirmedCards.filter((idx) => idx !== selectedCodigoIndex))
                          }
                        }}
                        className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 transition-all border border-red-500/30"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
              <button
                onClick={() => {
                  setModalCodigos(false)
                  setSelectedCodigoIndex(null)
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white font-bold hover:from-emerald-600 hover:to-green-600 transition-all shadow-lg"
              >
                Cerrar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
