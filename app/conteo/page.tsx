"use client"

import { useState, useCallback, useRef, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
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

type InventarioDetalle = {
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

export default function InventarioFisicoPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [folioGenerado, setFolioGenerado] = useState<string | null>(null)
  const [doctoInvfisId, setDoctoInvfisId] = useState<number | null>(null)

  const router = useRouter()

  const [detalles, setDetalles] = useState<InventarioDetalle[]>([])
  const [sucursalesAlmacenes, setSucursalesAlmacenes] = useState<any[]>([])
  const [selectedSucursal, setSelectedSucursal] = useState<number | null>(null)
  const [availableAlmacenes, setAvailableAlmacenes] = useState<any[]>([])
  const [selectedAlmacen, setSelectedAlmacen] = useState<number | null>(null)
  const [scannerEnabled, setScannerEnabled] = useState(false)
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
    product: InventarioDetalle
    timestamp: Date
  } | null>(null)
  const [successModal, setSuccessModal] = useState<null | { folio?: string; doctoInvfisId?: number | null; inserted?: number }>(null)

  const { apiUrl, userData } = useCompany()
    const usuario = userData?.nombre ?? userData?.user ?? "desconocido"

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast("Folio copiado al portapapeles", "success")
    } catch (e) {
      showToast("No se pudo copiar el folio", "error")
    }
  }
 
  // Formato de fecha DD/MM/YYYY (zona horaria de México)
  const fechaActual = new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Mexico_City",
  })
    const descripcion = `CICLÍCO\nEnviado por: ${usuario}\nFecha: ${fechaActual}`

  const baseURL = useMemo(() => (apiUrl || "").trim().replace(/\/+$/, ""), [apiUrl])

  // Fetch sucursales+almacenes on mount
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const resp = await fetch(`${baseURL}/sucursales-almacenes`)
        const j = await resp.json()
        if (!mounted) return
        if (j?.ok && Array.isArray(j.data)) {
          setSucursalesAlmacenes(j.data)
          // set defaults if only one sucursal
          const sucursales = Array.from(new Map(j.data.map((r: any) => [r.SUCURSAL_ID, r.NOMBRE_SUCURSAL]))).map(([id, name]) => ({ id, name }))
          if (sucursales.length === 1) setSelectedSucursal(Number(sucursales[0].id))
        }
      } catch (e) {
        console.warn("Error fetching sucursales-almacenes", e)
      }
    })()
    return () => { mounted = false }
  }, [baseURL])

  // When selectedSucursal changes, compute available almacenes
  useEffect(() => {
    if (!selectedSucursal) {
      setAvailableAlmacenes([])
      setSelectedAlmacen(null)
      return
    }
    const filtered = sucursalesAlmacenes.filter((r: any) => Number(r.SUCURSAL_ID) === Number(selectedSucursal))
    const unique = Array.from(new Map(filtered.map((r: any) => [r.ALMACEN_ID, r.NOMBRE_ALMACEN]))).map(([id, name]) => ({ id, name }))
    setAvailableAlmacenes(unique)
    if (unique.length === 1) setSelectedAlmacen(Number(unique[0].id))
  }, [selectedSucursal, sucursalesAlmacenes])

  const focusScanner = useCallback(() => {
    requestAnimationFrame(() => {
      if (
        scannerRef.current &&
        scannerEnabled &&
        document.activeElement !== claveInputRef.current &&
        document.activeElement !== descripcionInputRef.current &&
        document.activeElement !== cantidadInputRef.current
      ) {
        scannerRef.current.focus()
      }
    })
  }, [])

  // Only enable scanner focus and listeners when scannerEnabled === true
  useEffect(() => {
    if (!scannerEnabled) return

    focusScanner()
    const focusInterval = setInterval(() => {
      focusScanner()
    }, 50)

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
        !target.closest('input[type="number"]') &&
        !target.closest('select') &&
        !target.closest('option') &&
        !target.closest('button') &&
        !target.closest('textarea')
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
  }, [focusScanner, scannerEnabled])

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
  // Modificación: El botón siempre estará activo, independientemente de si el inventario está completo
  const listo = true

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
      const normalizedClave = String(data.articulo.CLAVE_ARTICULO).trim().toUpperCase()

      const newItem: InventarioDetalle = {
        CLAVE: normalizedClave,
        DESCRIPCION: data.articulo.NOMBRE,
        UMED: data.articulo.UMED || null,
        CANTIDAD: 1,
        _key: `inv-${Date.now()}`,
        packed: 1,
        scanned: 1,
      }

      setDetalles(prev => {
        const idx = prev.findIndex(d => String(d.CLAVE).toUpperCase() === normalizedClave)
        if (idx !== -1) {
          const updated = [...prev]
          const cur = updated[idx]
          updated[idx] = {
            ...cur,
            CANTIDAD: (cur.CANTIDAD ?? 0) + 1,
            packed: (cur.packed ?? 0) + 1,
            scanned: (cur.scanned ?? 0) + 1,
          }
          setTimeout(() => scrollToItem(idx), 100)
          return updated
        } else {
          const updated = [...prev, newItem]
          setTimeout(() => scrollToItem(updated.length - 1), 100)
          return updated
        }
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
  } catch {
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
    // Modificación: Permitir cantidad 0
    if (cantidad < 0) {
      showToast("La cantidad no puede ser negativa")
      return
    }

    const existingIndex = detalles.findIndex((d) => d.CLAVE.toUpperCase() === newClave.toUpperCase())
    if (existingIndex >= 0) {
      showToast("Ya existe un artículo con esa clave")
      return
    }

    const newItem: InventarioDetalle = {
      CLAVE: newClave.toUpperCase(),
      DESCRIPCION: newDescripcion,
      UMED: null,
      CANTIDAD: cantidad,
      _key: `inv-${Date.now()}`,
      // Nuevo comportamiento: al agregar manualmente, marcamos packed y scanned igual a la cantidad
      packed: cantidad,
      scanned: cantidad,
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

  const removeItem = (idx: number) => {
    const item = detalles[idx]
    const confirmDelete = confirm(
      `¿Eliminar artículo ${item?.CLAVE ?? ""} - ${item?.DESCRIPCION ?? ""}? Esta acción no se puede deshacer.`,
    )
    if (!confirmDelete) {
      focusScanner()
      return
    }

    setDetalles((prev) => {
      const next = [...prev]
      next.splice(idx, 1)
      return next
    })

    showToast("Artículo eliminado", "success")
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

  const resetInventario = useCallback(() => {
    // Al resetear después de aplicar, borramos completamente las líneas
    setDetalles([])
    // conservamos folioGenerado temporalmente para mostrar en la alerta; el caller puede limpiarlo si desea
    setDoctoInvfisId(null)
    focusScanner()
  }, [focusScanner])

  const aplicarInventario = useCallback(async () => {
    if (isSubmitting) return

    // Modificación: Eliminar la validación que comprueba si el inventario está completo
    // if (!listo) {
    //   showToast(
    //     requireScan
    //       ? "Debes escanear todas las piezas requeridas para aplicar el inventario."
    //       : "Aún no completas todas las líneas.",
    //   )
    //   focusScanner()
    //   return
    // }

    if (!baseURL) {
      showToast("No se encontró la URL de tu empresa")
      return
    }

    if (detalles.length === 0) {
      showToast("No hay productos en el inventario")
      return
    }

    setIsSubmitting(true)
    try {
      // Modificación: Incluir productos con cantidad 0
      const detallesComp = detalles
        .map((d) => ({
          CLAVE: d.CLAVE,
          CANTIDAD: requireScan ? d.scanned : d.packed,
        }))
        // Eliminar el filtro que excluye productos con cantidad <= 0
        // .filter((x) => Number(x.CANTIDAD) > 0)

      const payload: any = {
        P_DESCRIPCION: descripcion,
        P_USUARIO: usuario,
        P_SUCURSAL_ID: selectedSucursal,
        P_ALMACEN_ID: selectedAlmacen,
        detalles: detallesComp,
      }

      const resp = await fetch(`${baseURL}/inventario-fisico`, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await resp.json()

      if (!resp.ok || !data.ok) {
        showToast(data?.message || "Error al aplicar inventario físico")
        return
      }

      setFolioGenerado(data.folio)
      setDoctoInvfisId(data.doctoInvfisId)

      // Mostrar modal bonito y formateado con la info del folio
      setSuccessModal({ folio: data.folio, doctoInvfisId: data.doctoInvfisId, inserted: data.inserted })

      // Borrar todas las líneas para comenzar limpio
      setDetalles([])
    } catch (error) {
      console.error("❌ Error en aplicarInventario:", error)
      showToast("Error de conexión: No se pudo conectar al servidor")
    } finally {
      setIsSubmitting(false)
    }
  }, [isSubmitting, listo, requireScan, detalles, baseURL, showToast, focusScanner, resetInventario])

  const searchArticleByClave = async (clave: string) => {
    if (!clave.trim()) return

    setSearchingArticle(true)
    try {
      const response = await fetch(`${baseURL}/buscar-articulo-recibo?clave=${encodeURIComponent(clave)}`)
      const data = await response.json()

      if (data.ok && data.articulo) {
        setNewClave(data.articulo.CLAVE_ARTICULO)
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
      {/* Selection modal: require sucursal + almacen before starting conteo */}
      {!selectedAlmacen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/60">
          <div className="glass rounded-2xl p-6 max-w-lg w-full border border-white/20">
            <h3 className="text-xl font-semibold text-slate-900">Seleccione Sucursal y Almacén</h3>
            <p className="text-sm text-slate-600">Antes de iniciar el conteo selecciona la sucursal y el almacén donde se realizará.</p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-slate-700 mb-2">Sucursal</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedSucursal ?? ""}
                  onChange={(e) => {
                    const v = e.target.value
                    setSelectedSucursal(v ? Number(v) : null)
                  }}
                >
                  <option value="">-- Seleccione --</option>
                  {Array.from(new Map(sucursalesAlmacenes.map((r: any) => [r.SUCURSAL_ID, r.NOMBRE_SUCURSAL]))).map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-700 mb-2">Almacén</label>
                <select
                  className="w-full p-2 border rounded-md"
                  value={selectedAlmacen ?? ""}
                  onChange={(e) => setSelectedAlmacen(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">-- Seleccione --</option>
                  {availableAlmacenes.map((a: any) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => {
                    // if user wants to proceed without selection allow only when almacen selected
                    if (selectedAlmacen) {
                      // simply close modal by leaving selectedAlmacen set
                      setTimeout(() => focusScanner(), 50)
                    }
                  }}
                  disabled={!selectedAlmacen}
                  className={`px-4 py-2 rounded-lg font-semibold text-white ${selectedAlmacen ? 'bg-teal-600 hover:bg-teal-700' : 'bg-slate-300 text-slate-600 cursor-not-allowed'}`}
                >
                  Iniciar conteo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            <p
              className={`flex-1 text-sm font-medium whitespace-pre-line ${toast.type === "error" ? "text-red-900" : "text-green-900"}`}
            >
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
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-teal-700 to-cyan-500 flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Inventario Físico</h1>
                  <p className="text-md text-slate-500">Conteo de Inventario</p>
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
                    ? "bg-teal-700 border-teal-700 text-white shadow-lg"
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
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-600 to-cyan-500 text-white shadow-lg hover:from-teal-700 transition-all duration-200 flex items-center justify-center"
                onClick={() => setShowAddForm(true)}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 animate-fade-in">
          <div className="glass rounded-3xl bg-white/80 p-8 max-w-lg w-full border border-white/20 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Agregar Artículo</h2>
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

            <form
              onSubmit={(e) => {
                e.preventDefault()
                addManualItem()
              }}
              className="space-y-4"
            >
              <div className="relative">
                <label className="block text-sm font-medium text-slate-700 mb-2">Clave del artículo</label>
                <Input
                  ref={claveInputRef}
                  value={newClave}
                  onChange={(e) => handleClaveChange(e.target.value)}
                  placeholder="Escribe la clave..."
                  className={`text-black ${searchingArticle ? "border-teal-400 bg-teal-50 " : ""}`}
                />
                {searchingArticle && (
                  <div className="absolute right-3 top-9 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span className="text-xs text-teal-600">Buscando...</span>
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
                  className={`text-black  ${searchingDescription ? "border-teal-400 bg-teal-50" : ""}`}
                />
                {searchingDescription && (
                  <div className="absolute right-3 top-9 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                    <span className="text-xs text-teal-600">Buscando...</span>
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
                  placeholder="Cantidad (puede ser 0)"
                  type="number"
                  className="text-black"
                />
                <p className="text-xs text-slate-500 mt-1">Puedes agregar productos con cantidad 0</p>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
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
                  type="submit"
                  className="flex-1 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 transition-all shadow-lg"
                >
                  Agregar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex h-[calc(100vh-80px)]">
        <div className="flex-1 w-3/4 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-8">
            <div className="glass rounded-2xl p-6 mb-8 border border-white/20">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 mb-1">Folio: {folioGenerado || "Pendiente"}</h2>
                  <p className="text-slate-600">Inventario Físico • Almacén 19</p>
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
                  // Modificación: Considerar completas las líneas con cantidad 0
                  const okLinea = req === 0 || (requireScan ? sc >= req : pk >= req)
                  const isFlash = flashIndex === index

                  return (
                    <div
                      key={item._key}
                      id={`product-${index}`}
                      className={`glass rounded-xl p-4 border transition-all duration-300 ${
                        okLinea
                          ? "border-green-200/50 bg-gradient-to-r from-green-50/80 to-emerald-50/80"
                          : "border-white/20 bg-white/40"
                      } ${isFlash ? "ring-2 ring-teal-300 bg-teal-50/80" : ""}`}
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
                                {req === 0 ? "Cantidad 0" : "Completo"}
                              </div>
                            )}
                          </div>

                          <p className="text-slate-700 text-sm mb-2 leading-relaxed">{item.DESCRIPCION}</p>

                          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mb-3">
                            <span>UM: {item.UMED || "N/A"}</span>
                          </div>

                                      <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div>
                                          <span className="text-slate-500">Escaneado:</span>
                                          <span className={`font-bold ml-1 ${okLinea ? "text-green-700" : "text-slate-900"}`}>
                                            {sc}
                                          </span>
                                        </div>
                                      </div>
                        </div>

                        <div className="flex flex-col items-center gap-3 ml-6">
                          <div className="text-center">
                            <div className="text-xl font-bold text-slate-900">{sc}</div>
                            <div className="text-xs text-slate-500">Escaneado</div>
                          </div>

                          <button
                            className="mt-2 text-xs text-red-600 hover:underline"
                            onClick={() => removeItem(index)}
                          >
                            Eliminar artículo
                          </button>
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
              <div className="fixed bottom-6 left-0 right-80 bg-gradient-to-t from-white via-white to-transparent pt-4 pb-6 px-6">
                <div className="flex justify-center">
                  <button
                    className={`max-w-[420px] w-full sm:w-auto flex items-center gap-3 px-6 py-3 rounded-2xl font-semibold text-white transition-all duration-200 shadow-lg hover:shadow-xl ${
                      !isSubmitting
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600"
                        : "bg-gradient-to-r from-slate-400 to-slate-500 cursor-not-allowed"
                    }`}
                    onClick={() => {
                      if (!isSubmitting) aplicarInventario()
                    }}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Aplicando Inventario...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5" />
                        Completar Inventario
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <aside className="w-80 border-l border-white/10 bg-gradient-to-b from-slate-50/90 to-white/90 backdrop-blur-sm shadow-inner">
          <div className="p-5 h-full flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Usuario</p>
                <p className="font-semibold text-slate-900">{usuario}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Tiempo</p>
                <p className="font-semibold text-slate-900">{formatTime(elapsedSeconds)}</p>
              </div>
            </div>

            <div className="bg-white/60 rounded-xl p-4 border border-white/20 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-teal-600 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {Math.round(progreso * 100)}%
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Progreso Total</p>
                  <p className="text-xs text-slate-500">{totalHechas} de {totalRequeridas}</p>
                </div>
              </div>

                <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-500" style={{ width: `${progreso * 100}%` }} />
              </div>
            </div>

            {lastScannedProduct && (
              <div className="bg-white/60 rounded-xl p-3 border border-teal-200/30">
                <h5 className="text-xs text-teal-700 font-semibold mb-2">Último escaneado</h5>
                <p className="font-bold text-slate-900 text-sm">{lastScannedProduct.product.CLAVE}</p>
                <p className="text-xs text-slate-600 mb-2 truncate">{lastScannedProduct.product.DESCRIPCION}</p>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <p className="text-xs text-teal-600">Escaneado</p>
                    <p className="font-bold text-teal-900">{lastScannedProduct.product.scanned}</p>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-teal-600">Completado</p>
                    <div className="h-2 bg-teal-50 rounded-full overflow-hidden mt-1">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full" style={{ width: `${lastScannedProduct.product.CANTIDAD === 0 ? 100 : Math.min(100, ((lastScannedProduct.product.scanned || 0) / (lastScannedProduct.product.CANTIDAD || 1)) * 100)}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-auto text-xs text-slate-500">
              <p>Consejo: Usa el scanner o el botón + para agregar artículos.</p>
            </div>
          </div>
        </aside>
      </div>
      {successModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
          <div className="glass max-w-md w-full p-6 rounded-2xl bg-white/95 border border-white/20 shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Inventario aplicado</h3>
                <p className="text-sm text-slate-600 mt-1">Se registró correctamente en el sistema.</p>
              </div>
              <button className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center" onClick={() => setSuccessModal(null)}>
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>

            <div className="mt-4 bg-slate-50 rounded-lg p-4 border border-slate-100">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-slate-500">Folio</p>
                  <p className="font-mono font-semibold text-slate-900">{successModal.folio ?? "N/A"}</p>
                </div>
                <div>
                  <button
                    onClick={() => copyToClipboard(String(successModal.folio ?? ""))}
                    className="px-3 py-2 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
          
                <div>
                  <p className="text-xs text-slate-500">Líneas insertadas</p>
                  <p className="font-semibold text-slate-900">{successModal.inserted ?? 0}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setSuccessModal(null)
                }}
                className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  setSuccessModal(null)
                  setTimeout(() => focusScanner(), 50)
                }}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md hover:from-teal-600 hover:to-cyan-600"
              >
                Nuevo conteo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

  