"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowLeft,
  Package,
  MapPin,
  Barcode,
  ArrowRight,
  Box,
  Minus,
  Plus,
  Check,
  Send,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Edit3,
  Scan,
  ChevronRight,
} from "lucide-react"

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
  const [currentIndex, setCurrentIndex] = useState(0)
  const [confirmedCards, setConfirmedCards] = useState<number[]>([])
  const [listas, setListas] = useState<{ [index: number]: string[] }>({})
  const [inputValues, setInputValues] = useState<{ [index: number]: string }>({})
  const [scannerActivo, setScannerActivo] = useState(true)
  const [tempBarcode, setTempBarcode] = useState("")

  // Modals
  const [errorModal, setErrorModal] = useState(false)
  const [modalManualCantidad, setModalManualCantidad] = useState(false)
  const [manualCantidad, setManualCantidad] = useState("")
  const [manualIndex, setManualIndex] = useState<number | null>(null)
  const [modalExito, setModalExito] = useState(false)
  const [loadingEnvio, setLoadingEnvio] = useState(false)
  const [modalCodigos, setModalCodigos] = useState(false)

  // Refs
  const scannerRef = useRef<HTMLInputElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

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

  // Handle global barcode scan
  const handleGlobalBarcode = useCallback(
    (text: string) => {
      let matchFound = false

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

          matchFound = true
          break
        }
      }

      if (matchFound) {
        playSuccessSound()
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

      console.log("[v0] Response status:", response.status)
      const result = await response.json()
      console.log("[v0] Response data:", result)

      if (response.ok) {
        setModalExito(true)
      } else {
        alert(result.message || "No se pudo finalizar el traspaso.")
      }
    } catch (error) {
      console.error("[v0] Error al finalizar el traspaso:", error)
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  const currentArticulo = articulos[currentIndex]
  const isConfirmed = confirmedCards.includes(currentIndex)
  const codigosIngresados = listas[currentIndex]?.length || 0
  const allConfirmed = confirmedCards.length === articulos.length
  const progressPercent = (confirmedCards.length / articulos.length) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5">
      <input
        ref={scannerRef}
        type="text"
        value={tempBarcode}
        onChange={(e) => handleScannerChange(e.target.value)}
        className="absolute w-0 h-0 opacity-0 pointer-events-none"
        autoFocus
        style={{ position: "absolute", left: "-9999px" }}
      />

      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="font-medium">Traspasos</span>
            </button>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <div className="text-2xl font-bold">{limpiarFolio(folio)}</div>
                <div className="text-xs text-muted-foreground">Traspaso #{traspasoInId}</div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">Progreso general</span>
              <span className="font-semibold">
                {confirmedCards.length} / {articulos.length} artículos
              </span>
            </div>
            <div className="h-2 bg-secondary/30 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-primary to-accent"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-[380px_1fr] gap-8">
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Artículos ({articulos.length})
              </h3>
              <div className="space-y-2 max-h-[calc(100vh-300px)] overflow-y-auto">
                {articulos.map((art, idx) => {
                  const isActive = idx === currentIndex
                  const isDone = confirmedCards.includes(idx)
                  const count = listas[idx]?.length || 0

                  return (
                    <motion.button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                        isActive
                          ? "border-primary bg-primary/5"
                          : isDone
                            ? "border-accent/30 bg-accent/5"
                            : "border-border/30 bg-secondary/20 hover:border-border/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold truncate">{art.CLAVE_ARTICULO}</div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{art.NOMBRE}</div>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="text-xs font-medium">
                              {count} / {art.UNIDADES}
                            </div>
                            <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${isDone ? "bg-accent" : "bg-primary"}`}
                                style={{ width: `${(count / art.UNIDADES) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {isDone && (
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-4 h-4 text-accent-foreground" />
                          </div>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="glass-card p-8 relative"
              >
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 mb-4">
                      <MapPin className="w-4 h-4 text-accent" />
                      <span className="text-sm font-semibold">{currentArticulo.LOCALIZACION}</span>
                    </div>
                    <h2 className="text-3xl font-bold mb-2">{currentArticulo.NOMBRE}</h2>
                    <p className="text-muted-foreground">
                      Artículo {currentIndex + 1} de {articulos.length}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Barcode className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Clave</span>
                    </div>
                    <div className="font-semibold text-lg">{currentArticulo.CLAVE_ARTICULO}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <ArrowRight className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Destino</span>
                    </div>
                    <div className="font-semibold text-lg">{almacen}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Box className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Unidad</span>
                    </div>
                    <div className="font-semibold text-lg">{currentArticulo.UNIDAD_VENTA}</div>
                  </div>

                  <div className="p-4 rounded-xl bg-secondary/20 border border-border/20">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <Package className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-wider">Requeridas</span>
                    </div>
                    <div className="font-semibold text-lg">{currentArticulo.UNIDADES}</div>
                  </div>
                </div>

                <div className="mb-8">
                  <div className="text-center mb-6">
                    <div className="text-sm text-muted-foreground mb-2">Unidades escaneadas</div>
                    <div className="text-7xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
                      {codigosIngresados}
                    </div>
                    <div className="text-2xl text-muted-foreground mt-2">de {currentArticulo.UNIDADES}</div>
                  </div>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => {
                        const actuales = listas[currentIndex] || []
                        if (actuales.length > 0) {
                          const nuevos = actuales.slice(0, -1)
                          const nuevasListas = { ...listas, [currentIndex]: nuevos }
                          setListas(nuevasListas)

                          if (
                            confirmedCards.includes(currentIndex) &&
                            nuevos.length < Number(currentArticulo.UNIDADES)
                          ) {
                            setConfirmedCards(confirmedCards.filter((i) => i !== currentIndex))
                          }

                          playFailedSound()
                        }
                      }}
                      className="w-16 h-16 rounded-2xl bg-secondary/40 hover:bg-secondary/60 border border-border/20 hover:border-border/40 flex items-center justify-center transition-all hover:scale-105"
                    >
                      <Minus className="w-6 h-6" />
                    </button>

                    <button
                      onClick={() => {
                        setManualIndex(currentIndex)
                        setManualCantidad("")
                        setModalManualCantidad(true)
                      }}
                      className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border-2 border-primary/20 hover:border-primary/40 transition-all hover:scale-[1.02] font-semibold"
                    >
                      Agregar cantidad manual
                    </button>

                    <button
                      onClick={() => {
                        const actuales = listas[currentIndex] || []
                        const totalReq = Number(currentArticulo.UNIDADES)
                        if (actuales.length < totalReq) {
                          const nuevos = [...actuales, `MANUAL-${Date.now()}`]
                          const nuevasListas = { ...listas, [currentIndex]: nuevos }
                          setListas(nuevasListas)

                          if (nuevos.length === totalReq) {
                            setConfirmedCards([...confirmedCards, currentIndex])
                          }

                          playSuccessSound()
                        }
                      }}
                      className="w-16 h-16 rounded-2xl bg-secondary/40 hover:bg-secondary/60 border border-border/20 hover:border-border/40 flex items-center justify-center transition-all hover:scale-105"
                    >
                      <Plus className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-muted-foreground mb-2">
                    <Scan className="w-5 h-5" />
                    <span className="text-sm font-medium">Escanear o ingresar código</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Código de barras o clave del artículo"
                    value={inputValues[currentIndex] || ""}
                    disabled={isConfirmed}
                    onFocus={() => setScannerActivo(false)}
                    onBlur={() => setScannerActivo(true)}
                    onChange={(e) => setInputValues((prev) => ({ ...prev, [currentIndex]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const cleaned = (inputValues[currentIndex] || "").trim().replace(/\//g, "-")
                        if (cleaned) {
                          handleGlobalBarcode(cleaned)
                          setInputValues((prev) => ({ ...prev, [currentIndex]: "" }))
                        }
                      }
                    }}
                    className="w-full px-6 py-4 rounded-xl bg-secondary/20 border-2 border-border/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 disabled:opacity-50 transition-all text-lg"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => setModalCodigos(true)}
                      className="flex-1 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/20 hover:border-border/40 transition-all font-medium"
                    >
                      Vercódigos ({codigosIngresados})
                    </button>
                    {(inputValues[currentIndex] || "").trim() !== "" && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={() => {
                          const cleaned = (inputValues[currentIndex] || "").trim().replace(/\//g, "-")
                          if (cleaned) {
                            handleGlobalBarcode(cleaned)
                            setInputValues((prev) => ({ ...prev, [currentIndex]: "" }))
                          }
                        }}
                        disabled={isConfirmed}
                        className="px-8 py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                      >
                        Añadir
                      </motion.button>
                    )}
                  </div>
                </div>

                {isConfirmed && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 bg-accent/10 backdrop-blur-xl rounded-3xl flex flex-col items-center justify-center gap-6 border-2 border-accent/30"
                  >
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200 }}
                      className="w-24 h-24 rounded-full bg-accent flex items-center justify-center shadow-2xl"
                    >
                      <Check className="w-12 h-12 text-accent-foreground" />
                    </motion.div>
                    <div className="text-center">
                      <p className="text-2xl font-bold mb-2">Artículo completado</p>
                      <p className="text-muted-foreground">Todas las unidades han sido escaneadas</p>
                    </div>
                    <button
                      onClick={() => {
                        const updated = confirmedCards.filter((idx) => idx !== currentIndex)
                        setConfirmedCards(updated)
                      }}
                      className="flex items-center gap-2 px-6 py-3 rounded-xl bg-background/90 backdrop-blur-xl border-2 border-accent hover:bg-background transition-all font-semibold"
                    >
                      <Edit3 className="w-5 h-5" />
                      Editar
                    </button>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/20 hover:border-border/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
              >
                <ArrowLeft className="w-5 h-5" />
                Anterior
              </button>

              <div className="text-sm text-muted-foreground">
                Artículo {currentIndex + 1} de {articulos.length}
              </div>

              <button
                onClick={() => setCurrentIndex((prev) => Math.min(articulos.length - 1, prev + 1))}
                disabled={currentIndex === articulos.length - 1}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-secondary/40 hover:bg-secondary/60 border border-border/20 hover:border-border/40 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-medium"
              >
                Siguiente
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {allConfirmed && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 border-2 border-accent/30"
              >
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">¡Traspaso completo!</h3>
                    <p className="text-muted-foreground">Todos los artículos han sido procesados</p>
                  </div>
                </div>
                <button
                  onClick={finalizarTraspaso}
                  disabled={loadingEnvio}
                  className="w-full py-5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl hover:scale-[1.02]"
                >
                  {loadingEnvio ? (
                    "Enviando..."
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar traspaso completo
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {/* Error modal */}
        {errorModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass-card p-10 max-w-md w-full"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                <h3 className="text-2xl font-bold">Traspaso no disponible</h3>
                <p className="text-muted-foreground text-center">Este traspaso ya fue tomado o está en proceso.</p>
                <button
                  onClick={() => {
                    setErrorModal(false)
                    router.back()
                  }}
                  className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg"
                >
                  Volver
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Manual cantidad modal */}
        {modalManualCantidad && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass-card p-10 max-w-md w-full"
            >
              <h3 className="text-2xl font-bold mb-6">Cantidad a agregar</h3>
              <input
                type="number"
                value={manualCantidad}
                onChange={(e) => setManualCantidad(e.target.value)}
                placeholder="Ingresa la cantidad"
                className="w-full px-6 py-4 rounded-xl bg-secondary/20 border-2 border-border/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 mb-8 text-lg"
              />
              <div className="flex gap-4">
                <button
                  onClick={() => setModalManualCantidad(false)}
                  className="flex-1 py-4 rounded-xl bg-secondary/40 border border-border/20 font-semibold hover:bg-secondary/60 hover:border-border/40 transition-all"
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
                        playSuccessSound()
                      }
                    }
                    setModalManualCantidad(false)
                  }}
                  className="flex-1 py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg"
                >
                  Aceptar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Éxito modal */}
        {modalExito && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass-card p-10 max-w-md w-full"
            >
              <div className="flex flex-col items-center gap-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center"
                >
                  <CheckCircle2 className="w-10 h-10 text-accent" />
                </motion.div>
                <h3 className="text-2xl font-bold">¡Traspaso enviado!</h3>
                <p className="text-muted-foreground text-center">El traspaso se ha finalizado correctamente.</p>
                <button
                  onClick={() => {
                    setModalExito(false)
                    router.push("/traspasos")
                  }}
                  className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg"
                >
                  Volver a traspasos
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Códigos modal */}
        {modalCodigos && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/95 backdrop-blur-2xl flex items-center justify-center z-50 p-8"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="glass-card p-10 max-w-md w-full max-h-[80vh] overflow-y-auto"
            >
              <h3 className="text-2xl font-bold mb-8">Códigos escaneados</h3>
              <div className="space-y-3 mb-8">
                {(listas[currentIndex] || []).length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No hay códigos escaneados aún</p>
                ) : (
                  (listas[currentIndex] || []).map((codigo, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex items-center justify-between p-4 rounded-xl bg-secondary/20 border border-border/20"
                    >
                      <span className="text-sm font-mono">{codigo}</span>
                      <button
                        onClick={() => {
                          const nuevaLista = [...listas[currentIndex]]
                          nuevaLista.splice(i, 1)
                          const nuevasListas = {
                            ...listas,
                            [currentIndex]: nuevaLista,
                          }
                          setListas(nuevasListas)

                          if (
                            confirmedCards.includes(currentIndex) &&
                            nuevaLista.length < Number(articulos[currentIndex].UNIDADES)
                          ) {
                            setConfirmedCards(confirmedCards.filter((idx) => idx !== currentIndex))
                          }
                        }}
                        className="p-2 rounded-lg bg-destructive/20 hover:bg-destructive/30 transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
              <button
                onClick={() => setModalCodigos(false)}
                className="w-full py-4 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all shadow-lg"
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
