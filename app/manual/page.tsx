"use client"

import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { Input } from "@/components/ui/input"
import {
  ArrowLeft,
  Plus,
  Scan,
  CheckCircle,
  AlertCircle,
  Package,
  Minus,
  X,
  Loader2,
  Clock,
  CheckCircle2,
} from "lucide-react"

type ManualDetalle = {
  CLAVE: string
  DESCRIPCION: string
  UMED: string | null
  CANTIDAD: number
  _key: string
  packed: number
  scanned: number
}

interface Toast {
  id: string
  type: "error" | "success"
  message: string
  autoClose?: boolean
}

export default function ManualReciboPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [detalles, setDetalles] = useState<ManualDetalle[]>([])
  const [requireScan, setRequireScan] = useState(true)
  const [autoFill, setAutoFill] = useState(false)

  const [showAddForm, setShowAddForm] = useState(false)
  const [newClave, setNewClave] = useState("")
  const [newDescripcion, setNewDescripcion] = useState("")
  const [newCantidad, setNewCantidad] = useState("")
  const [searchingArticle, setSearchingArticle] = useState(false)

  const [searchResults, setSearchResults] = useState<Array<{ CLAVE_ARTICULO: string; NOMBRE: string }>>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchingDescription, setSearchingDescription] = useState(false)

  const [scanValue, setScanValue] = useState("")
  const scannerRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const claveInputRef = useRef<HTMLInputElement>(null)
  const descripcionInputRef = useRef<HTMLInputElement>(null)
  const cantidadInputRef = useRef<HTMLInputElement>(null)

  const [toasts, setToasts] = useState<Toast[]>([])
  const [timerStarted, setTimerStarted] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [lastScannedProduct, setLastScannedProduct] = useState<{
    product: ManualDetalle
    timestamp: Date
  } | null>(null)

  const { apiUrl } = useCompany()
  const baseURL = useMemo(() => (apiUrl || "").trim().replace(/\/+$/, ""), [apiUrl])

  const focusScanner = useCallback(() => {
    requestAnimationFrame(() => {
      if (
        scannerRef.current &&
        document.activeElement !== claveInputRef.current &&
        document.activeElement !== descripcionInputRef.current &&
        document.activeElement !== cantidadInputRef.current
      ) {
        scannerRef.current.focus()
      }
    })
  }, [])

  useEffect(() => {
    // Initial focus
    focusScanner()

    // Very aggressive focus check every 50ms
    const focusInterval = setInterval(() => {
      focusScanner()
    }, 50)

    // Event listeners for all possible interactions
    const handleInteraction = () => {
      setTimeout(focusScanner, 5)
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        target !== claveInputRef.current &&
        target !== descripcionInputRef.current &&
        target !== cantidadInputRef.current &&
        !target.closest('input[type="text"]') &&
        !target.closest('input[type="number"]')
      ) {
        handleInteraction()
      }
    }

    document.addEventListener("click", handleClick, true)
    document.addEventListener("mousedown", handleInteraction, true)
    document.addEventListener("touchstart", handleInteraction, true)
    document.addEventListener("scroll", handleInteraction, true)
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) {
        setTimeout(focusScanner, 10)
      }
    })
    document.addEventListener("focusout", handleInteraction, true)
    document.addEventListener("keydown", handleInteraction, true)
    document.addEventListener("mousemove", () => setTimeout(focusScanner, 50))
    window.addEventListener("focus", focusScanner)

    return () => {
      clearInterval(focusInterval)
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("mousedown", handleInteraction, true)
      document.removeEventListener("touchstart", handleInteraction, true)
      document.removeEventListener("scroll", handleInteraction, true)
      document.removeEventListener("visibilitychange", handleInteraction)
      document.removeEventListener("focusout", handleInteraction, true)
      document.removeEventListener("keydown", handleInteraction, true)
      document.removeEventListener("mousemove", handleInteraction)
      window.removeEventListener("focus", focusScanner)
    }
  }, [focusScanner])

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

  const [flashIndex, setFlashIndex] = useState<number | null>(null)
  const flashLine = (idx: number) => {
    setFlashIndex(idx)
    setTimeout(() => setFlashIndex(null), 220)
  }

  const scrollToItem = useCallback(
    (index: number) => {
      if (listRef.current && index >= 0 && index < detalles.length) {
        const element = document.getElementById(`product-${index}`)
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "center" })
        }
      }
    },
    [detalles.length],
  )

  const caratula = {
    FECHA: new Date().toLocaleDateString(),
    FOLIO: searchParams.get("folio") || `MANUAL-${Date.now()}`,
    ALMACEN: "ALMACEN PRINCIPAL",
    PROVEEDOR: "ENTRADA MANUAL",
    CLAVE_PROV: "MAN001",
    DOCTO_CM_ID: Date.now(),
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

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`
  }

  const searchAndAddArticle = async (clave: string) => {
    setSearchingArticle(true)
    try {
      const response = await fetch(`${baseURL}/buscar-articulo-recibo?clave=${encodeURIComponent(clave)}`)
      const data = await response.json()

      if (data.ok && data.articulo) {
        const newItem: ManualDetalle = {
          CLAVE: clave.toUpperCase(),
          DESCRIPCION: data.articulo.NOMBRE,
          UMED: data.articulo.UMED || null,
          CANTIDAD: 1,
          _key: `manual-${Date.now()}`,
          packed: 1,
          scanned: 1,
        }

        setDetalles((prev) => {
          const updated = [...prev, newItem]
          setTimeout(() => scrollToItem(updated.length - 1), 100)
          return updated
        })

        showToast(`Artículo agregado: ${data.articulo.NOMBRE}`, "success")
      } else {
        const shouldAdd = confirm(`El código "${clave}" no existe en la base de datos. ¿Deseas agregarlo manualmente?`)
        if (shouldAdd) {
          setNewClave(clave)
          setNewDescripcion("")
          setNewCantidad("1")
          setShowAddForm(true)
        }
      }
    } catch (error) {
      showToast("Error al buscar el artículo en la base de datos")
    } finally {
      setSearchingArticle(false)
    }
  }

  const addManualItem = () => {
    if (!newClave.trim() || !newDescripcion.trim() || !newCantidad.trim()) {
      showToast("Completa todos los campos")
      return
    }

    const cantidad = Number(newCantidad)
    if (cantidad <= 0) {
      showToast("La cantidad debe ser mayor a 0")
      return
    }

    const existingIndex = detalles.findIndex((d) => d.CLAVE.toUpperCase() === newClave.toUpperCase())
    if (existingIndex >= 0) {
      showToast("Ya existe un artículo con esa clave")
      return
    }

    const newItem: ManualDetalle = {
      CLAVE: newClave.toUpperCase(),
      DESCRIPCION: newDescripcion,
      UMED: null,
      CANTIDAD: cantidad,
      _key: `manual-${Date.now()}`,
      packed: 0,
      scanned: 0,
    }

    setDetalles((prev) => {
      const updated = [...prev, newItem]
      setTimeout(() => scrollToItem(updated.length - 1), 100)
      return updated
    })
    setNewClave("")
    setNewDescripcion("")
    setNewCantidad("")
    setShowAddForm(false)

    showToast("Artículo agregado correctamente", "success")
    focusScanner()
  }

  const inc = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.CANTIDAD
      const pk = d.packed
      if (pk < req) next[idx] = { ...d, packed: pk + 1 }
      return next
    })
    setTimeout(focusScanner, 50)
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
    setTimeout(focusScanner, 50)
  }

  const fillToRequired = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.CANTIDAD
      next[idx] = { ...d, packed: req, scanned: requireScan ? d.scanned : req }
      return next
    })
    setTimeout(focusScanner, 50)
  }

  const processScan = (raw: string) => {
    // Replace apostrophes with dashes (scanner issue) and any other special characters
    const sanitized = (raw || "").trim().replace(/'/g, "-").replace(/`/g, "-").toUpperCase()
    const code = sanitized

    if (!code) return

    console.log(`[v0] Scanned code: "${raw}" -> Sanitized: "${code}"`)

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
        let newRequired = req

        if (autoFill) {
          newPacked = Math.min(req, req)
          newScanned = Math.min(req, req)
        } else {
          if (pk >= req && sc >= req) {
            newRequired = req + 1
            newPacked = pk + 1
            newScanned = sc + 1
          } else {
            if (pk < req) newPacked = pk + 1
            if (sc < req) newScanned = sc + 1
          }
        }

        next[idx] = { ...item, CANTIDAD: newRequired, packed: newPacked, scanned: newScanned }

        setLastScannedProduct({
          product: next[idx],
          timestamp: new Date(),
        })

        return next
      })

      flashLine(idx)
      setTimeout(() => scrollToItem(idx), 150)
      showToast(`Escaneado: ${code}`, "success")
    } else {
      console.log(`[v0] Code not found in detalles, searching in database: ${code}`)
      searchAndAddArticle(code)
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

    try {
      console.log("🚀 Preparando payload de recepción XML...")

      const detallesComp = detalles
        .map((d) => ({
          CLAVE: d.CLAVE,
          CANTIDAD: requireScan ? d.scanned : d.packed,
          COSTO_UNITARIO: 0,
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
      console.log("🌐 POST URL:", fullURL)
      console.log("📦 Payload:", payload)

      const resp = await fetch(fullURL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      console.log("📡 Status de respuesta:", resp.status)
      const data = await resp.json()
      console.log("📥 Data recibida:", data)

      if (!resp.ok || !data.ok) {
        console.error("❌ Error del servidor:", data?.message)
        showToast(data?.message || "Error al aplicar recepción")
        return
      }

      showToast(
        `✅ Recepción completada\nFolio: ${data.folio || "N/A"}\nDOCTO_IN_ID: ${data.doctoId}\nLíneas insertadas: ${data.inserted}`,
        "success",
        false,
      )
    } catch (error: any) {
      console.error("❌ Error en recepcionar:", error)
      showToast("Error de conexión: No se pudo conectar al servidor")
    }
  }, [listo, requireScan, focusScanner, detalles, baseURL, showToast])

  const searchArticleByClave = async (clave: string) => {
    if (!clave.trim()) return

    setSearchingArticle(true)
    try {
      const response = await fetch(`${baseURL}/buscar-articulo-recibo?clave=${encodeURIComponent(clave)}`)
      const data = await response.json()

      if (data.ok && data.articulo) {
        setNewDescripcion(data.articulo.NOMBRE)
        showToast(`Artículo encontrado: ${data.articulo.NOMBRE}`, "success")
      }
    } catch (error) {
      showToast("Error al buscar el artículo en la base de datos")
    } finally {
      setSearchingArticle(false)
    }
  }

  const searchArticlesByDescription = async (descripcion: string) => {
    if (!descripcion.trim() || descripcion.length < 3) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setSearchingDescription(true)
    try {
      const response = await fetch(`${baseURL}/buscar-por-descripcion?descripcion=${encodeURIComponent(descripcion)}`)
      const data = await response.json()

      if (data.success && data.data && data.data.length > 0) {
        setSearchResults(data.data)
        setShowSearchResults(true)

        if (data.count === 1) {
          const result = data.data[0]
          setNewClave(result.CLAVE_ARTICULO)
          setNewDescripcion(result.NOMBRE)
          setShowSearchResults(false)
          showToast(`Artículo encontrado: ${result.NOMBRE}`, "success")
        } else {
          showToast(`Se encontraron ${data.count} artículos. Selecciona uno de la lista.`, "success", false)
        }
      } else {
        setSearchResults([])
        setShowSearchResults(false)
      }
    } catch (error) {
      setSearchResults([])
      setShowSearchResults(false)
    } finally {
      setSearchingDescription(false)
    }
  }

  const selectSearchResult = (result: { CLAVE_ARTICULO: string; NOMBRE: string }) => {
    setNewClave(result.CLAVE_ARTICULO)
    setNewDescripcion(result.NOMBRE)
    setSearchResults([])
    setShowSearchResults(false)
    showToast(`Artículo seleccionado: ${result.NOMBRE}`, "success")
  }

  const handleClaveChange = (text: string) => {
    setNewClave(text)

    if (text.length >= 4) {
      const timeoutId = setTimeout(() => {
        searchArticleByClave(text.toUpperCase())
      }, 500)

      return () => clearTimeout(timeoutId)
    }
  }

  const handleDescripcionChange = (text: string) => {
    setNewDescripcion(text)

    if (text.length >= 3) {
      const timeoutId = setTimeout(() => {
        searchArticlesByDescription(text.toUpperCase())
      }, 500)

      return () => clearTimeout(timeoutId)
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans overflow-x-hidden">
      <input
        ref={scannerRef}
        type="text"
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            processScan(scanValue)
            setScanValue("")
          }
        }}
        onBlur={() => {
          setTimeout(focusScanner, 5)
        }}
        autoComplete="off"
        autoFocus
        tabIndex={0}
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          opacity: 0,
          zIndex: -1,
          left: "0px",
          top: "0px",
        }}
      />

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
                <AlertCircle className="w-5 h-5 text-white" />
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

      <div className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-full mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm hover:bg-white/90 transition-all duration-200"
                onClick={() => {
                  router.replace("/dashboard")
                  setTimeout(focusScanner, 100)
                }}
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Recepción Manual</h1>
                  <p className="text-md text-slate-500">Entrada de Mercancía Manual</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {timerStarted && (
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

              <button
                className="w-10 h-10 rounded-xl bg-slate-900 border-slate-800 text-white shadow-lg hover:bg-slate-800 transition-all duration-200 flex items-center justify-center"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Original scanner input removed as it's replaced by the new one above */}

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-3xl bg-white/80 p-8 max-w-lg w-full border border-white/20 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Agregar Artículo Manual</h2>
              <button
                onClick={() => {
                  setShowAddForm(false)
                  setNewClave("")
                  setNewDescripcion("")
                  setNewCantidad("")
                  setSearchResults([])
                  setShowSearchResults(false)
                  setTimeout(focusScanner, 100)
                }}
                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Clave del artículo</label>
                <Input
                  ref={claveInputRef}
                  value={newClave}
                  onChange={(e) => handleClaveChange(e.target.value)}
                  placeholder="Escribe la clave..."
                  className={`text-black ${searchingArticle ? "border-slate-600 bg-slate-50 " : ""}`}
                />
                {searchingArticle && (
                  <div className="absolute right-3 top-9 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <span className="text-xs text-slate-600">Buscando...</span>
                  </div>
                )}
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Descripción</label>
                <Input
                  ref={descripcionInputRef}
                  value={newDescripcion}
                  onChange={(e) => handleDescripcionChange(e.target.value)}
                  placeholder="Escribe para buscar..."
                  disabled={searchingArticle}
                  className={`text-black  ${searchingDescription ? "border-slate-600 bg-slate-50" : ""}`}
                />
                {searchingDescription && (
                  <div className="absolute right-3 top-9 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-slate-600" />
                    <span className="text-xs text-slate-600">Buscando...</span>
                  </div>
                )}
              </div>

              {showSearchResults && searchResults.length > 0 && (
                <div className="glass rounded-xl border border-white/20 bg-white/60 max-h-48 overflow-y-auto">
                  <p className="text-sm font-semibold text-slate-900 p-3 border-b border-slate-200">
                    Resultados encontrados ({searchResults.length}):
                  </p>
                  {searchResults.map((item) => (
                    <button
                      key={item.CLAVE_ARTICULO}
                      onClick={() => selectSearchResult(item)}
                      className="w-full text-left p-3 hover:bg-slate-100 border-b border-slate-200 last:border-0 transition-colors"
                    >
                      <p className="text-sm font-bold text-slate-900">{item.CLAVE_ARTICULO}</p>
                      <p className="text-xs text-slate-600">{item.NOMBRE}</p>
                    </button>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Cantidad</label>
                <Input
                  ref={cantidadInputRef}
                  value={newCantidad}
                  onChange={(e) => setNewCantidad(e.target.value)}
                  placeholder="Cantidad"
                  type="number"
                  className="text-black"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 py-3 rounded-xl font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                onClick={() => {
                  setShowAddForm(false)
                  setNewClave("")
                  setNewDescripcion("")
                  setNewCantidad("")
                  setSearchResults([])
                  setShowSearchResults(false)
                  setTimeout(focusScanner, 100)
                }}
              >
                Cancelar
              </button>
              <button
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 transition-all shadow-lg"
                onClick={addManualItem}
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 w-3/4 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Folio: .? </h2>
                  <p className="text-slate-600">
                    {caratula.PROVEEDOR} • {caratula.ALMACEN}
                  </p>
                </div>
              </div>
            </div>

            {detalles.length > 0 ? (
              <div ref={listRef} className="space-y-3">
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
                                if (!requireScan) {
                                  dec(index)
                                }
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
                                if (!requireScan) {
                                  inc(index)
                                }
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
            ) : (
              <div className="text-center py-16">
                <Scan className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-600 mb-2">Escanea para comenzar</h3>
                <p className="text-slate-500">El scanner está activo. Escanea cualquier código para agregarlo</p>
              </div>
            )}

            {detalles.length > 0 && (
              <div className="sticky bottom-6 mt-8">
                <button
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                    listo
                      ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                      : "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (listo) {
                      recepcionar()
                    }
                  }}
                  disabled={!listo}
                >
                  {listo ? (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Aplicar Recepción Manual
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-5 h-5" />
                      Completa el escaneo para continuar
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="w-1/4 border-l border-white/20 bg-gradient-to-b from-slate-50/80 to-white/80 backdrop-blur-sm">
          <div className="p-6 h-full flex flex-col">
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

            {lastScannedProduct && (
              <div className="glass rounded-xl p-4 mb-6 border border-green-200/50 bg-gradient-to-br from-green-50/80 to-emerald-50/80 animate-fade-in-up">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 bg-green-500 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-3 h-3 text-white" />
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

                  <div className="pt-2 border-t border-green-200/50">
                    <p className="text-xs text-green-600">
                      Escaneado hace {Math.floor((Date.now() - lastScannedProduct.timestamp.getTime()) / 1000)}s
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
