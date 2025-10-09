"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { printLabels } from "@/lib/etiquetador-utils"

type DetalleItem = {
  articuloId: number
  codigo?: string | null
  codbar?: string | null
  unidades?: number | null
  packed?: number
}

type Caratula = {
  folio?: string | null
  fecha?: string | null
  destino?: string | null
  picker?: string | null
}

type Toast = {
  id: number
  message: string
  type: "success" | "error"
}

type Caja = {
  CAJA_ID: number
  NOMBRE: string
  TIPO: string
  CODIGO: string
  CANT_USOS: number
}

type CajaInstancia = {
  instanciaId: string // Unique ID for each physical box instance
  CAJA_ID: number
  NOMBRE: string
  TIPO: string
  CODIGO: string
  CANT_USOS: number
}

type ArticuloEnCaja = {
  articuloId: number
  codigo: string
  cantidad: number
}

export default function DetalleOrden() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { apiUrl } = useCompany()

  const doctoId = searchParams.get("doctoId")
  const sistema = searchParams.get("sistema")
  const orden = searchParams.get("orden")

  const ordenData = useMemo(() => {
    try {
      return orden ? JSON.parse(orden) : null
    } catch {
      return null
    }
  }, [orden])

  const [loading, setLoading] = useState(true)
  const [caratula, setCaratula] = useState<Caratula | null>(null)
  const [detalles, setDetalles] = useState<DetalleItem[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])
  const [showCompletionModal, setShowCompletionModal] = useState(false)
  const [lastScannedIndex, setLastScannedIndex] = useState<number | null>(null)
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [scannerValue, setScannerValue] = useState("")

  const [cajasSeleccionadas, setCajasSeleccionadas] = useState<CajaInstancia[]>([])
  const [esperandoCaja, setEsperandoCaja] = useState(true)
  const [modoAgregarCaja, setModoAgregarCaja] = useState(false)

  const [cajaActivaId, setCajaActivaId] = useState<string | null>(null)
  const [articulosEnCajas, setArticulosEnCajas] = useState<{ [instanciaId: string]: ArticuloEnCaja[] }>({})

  const [modalCajaId, setModalCajaId] = useState<string | null>(null)
  const scanningRef = useRef(false)
  const [isPrinting, setIsPrinting] = useState(false)

  const scannerRef = useRef<HTMLInputElement>(null)

  const focusScanner = useCallback(() => {
    setTimeout(() => {
      scannerRef.current?.focus()
      scannerRef.current?.select()
    }, 10)
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      if (document.activeElement !== scannerRef.current && !showCompletionModal) {
        focusScanner()
      }
    }, 100)

    const handleClick = () => {
      if (!showCompletionModal) {
        focusScanner()
      }
    }

    const handleVisibilityChange = () => {
      if (!document.hidden && !showCompletionModal) {
        focusScanner()
      }
    }

    document.addEventListener("click", handleClick)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    window.addEventListener("focus", focusScanner)

    return () => {
      clearInterval(interval)
      document.removeEventListener("click", handleClick)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("focus", focusScanner)
    }
  }, [focusScanner, showCompletionModal])

  const baseURL = useMemo(() => (apiUrl || "").trim().replace(/\/+$/, ""), [apiUrl])

  const showToast = (message: string, type: "success" | "error") => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 1000)
  }

  const playSound = (type: "check" | "wrong" | "success") => {
    const audio = new Audio(`/sounds/${type}.mp3`)
    audio.play().catch(() => {})
  }

  const validarCaja = async (codigo: string) => {
    try {
      const url = `${baseURL}/validar-caja`
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ CODIGO: codigo }),
      })
      const json = await resp.json()

      if (!resp.ok || !json?.ok) {
        playSound("wrong")
        showToast(json?.message || "Código de caja no encontrado", "error")
        return
      }

      const caja = json.caja

      const nuevaInstancia: CajaInstancia = {
        instanciaId: `${caja.CAJA_ID}-${Date.now()}`,
        CAJA_ID: caja.CAJA_ID,
        NOMBRE: caja.NOMBRE,
        TIPO: caja.TIPO,
        CODIGO: caja.CODIGO,
        CANT_USOS: caja.CANT_USOS,
      }

      setCajasSeleccionadas((prev) => {
        playSound("success")
        const count = prev.filter((c) => c.CAJA_ID === caja.CAJA_ID).length + 1
        showToast(`${caja.NOMBRE} x${count}`, "success")

        if (prev.length === 0) {
          setCajaActivaId(nuevaInstancia.instanciaId)
        }

        return [...prev, nuevaInstancia]
      })

      setEsperandoCaja(false)
      setModoAgregarCaja(false)
    } catch (e: any) {
      console.error("❌ validarCaja:", e)
      playSound("wrong")
      showToast(e?.message || "Error al validar caja", "error")
    }
  }

  const fetchCaratula = useCallback(async () => {
    const url = `${baseURL}/caratula?doctoId=${encodeURIComponent(String(doctoId))}&sistema=${encodeURIComponent(String(sistema))}`
    const resp = await fetch(url)
    const json = await resp.json()
    if (!resp.ok || !json?.ok) throw new Error(json?.error || "Error al obtener carátula")
    const row = (json.caratula || [])[0] || {}
    setCaratula({
      folio: row.R_FOLIO ?? ordenData?.id ?? "",
      fecha: row.R_FECHA ?? ordenData?.fecha ?? "",
      destino: row.R_DESTINO ?? ordenData?.cliente ?? "",
      picker: row.R_PICKER ?? "",
    })
  }, [baseURL, doctoId, sistema, ordenData])

  const fetchDetalles = useCallback(async () => {
    const url = `${baseURL}/detalles?doctoId=${encodeURIComponent(String(doctoId))}&sistema=${encodeURIComponent(String(sistema))}`
    const resp = await fetch(url)
    const json = await resp.json()
    if (!resp.ok || !json?.ok) throw new Error(json?.error || "Error al obtener detalles")
    const items: DetalleItem[] = (json.detalles || []).map((r: any) => ({
      articuloId: Number(r.R_ARTICULO_ID ?? 0),
      codigo: r.R_CODIGO ?? null,
      codbar: r.R_CODBAR ?? null,
      unidades: r.R_UNIDADES ?? 0,
      packed: 0,
    }))
    setDetalles(items)
  }, [baseURL, doctoId, sistema])

  const loadAll = useCallback(async () => {
    if (!doctoId || !sistema) {
      showToast("Faltan parámetros para consultar la orden", "error")
      return
    }
    setLoading(true)
    try {
      await Promise.all([fetchCaratula(), fetchDetalles()])
    } catch (e: any) {
      console.error("❌ detalleOrden loadAll:", e)
      showToast(e?.message || "No se pudo cargar la orden", "error")
    } finally {
      setLoading(false)
      focusScanner()
    }
  }, [doctoId, sistema, fetchCaratula, fetchDetalles, focusScanner])

  useEffect(() => {
    loadAll()
  }, [loadAll])

  const totalLineas = detalles.length
  const lineasCompletas = detalles.filter((d) => (d.unidades ?? 0) > 0 && (d.packed ?? 0) >= (d.unidades ?? 0)).length
  const totalRequeridas = detalles.reduce((acc, d) => acc + (d.unidades ?? 0), 0)
  const totalEmpacadas = detalles.reduce((acc, d) => acc + (d.packed ?? 0), 0)
  const progreso = totalRequeridas > 0 ? Math.min(1, totalEmpacadas / totalRequeridas) : 0
  const todoListo = totalLineas > 0 && lineasCompletas === totalLineas && totalEmpacadas === totalRequeridas

  const inc = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.unidades ?? 0
      const pk = d.packed ?? 0
      if (pk < req) {
        next[idx] = { ...d, packed: pk + 1 }
        setLastScannedIndex(idx)
        playSound("check")
      } else {
        playSound("wrong")
        showToast("Ya alcanzaste la cantidad requerida", "error")
      }
      return next
    })
    focusScanner()
  }

  const dec = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const pk = d.packed ?? 0
      if (pk > 0) next[idx] = { ...d, packed: pk - 1 }
      return next
    })
    focusScanner()
  }

  const fillToRequired = (idx: number) => {
    setDetalles((prev) => {
      const next = [...prev]
      const d = next[idx]
      const req = d.unidades ?? 0
      next[idx] = { ...d, packed: req }
      setLastScannedIndex(idx)
      return next
    })
    focusScanner()
  }

  const processScan = (raw: string) => {
    if (scanningRef.current) return

    const code = (raw || "").trim().toUpperCase()
    if (!code) return

    if (esperandoCaja || modoAgregarCaja) {
      validarCaja(code)
      return
    }

    scanningRef.current = true

    const idx = detalles.findIndex(
      (d) => (d.codbar ?? "").toUpperCase() === code || (d.codigo ?? "").toUpperCase() === code,
    )

    if (idx >= 0) {
      const item = detalles[idx]
      const req = item.unidades ?? 0
      const pk = item.packed ?? 0

      if (pk < req) {
        setDetalles((prev) => {
          const next = [...prev]
          next[idx] = { ...item, packed: pk + 1 }
          return next
        })

        setLastScannedIndex(idx)

        if (cajaActivaId !== null) {
          setArticulosEnCajas((prev) => {
            const updated = { ...prev }
            if (!updated[cajaActivaId]) {
              updated[cajaActivaId] = []
            }
            const existingArticle = updated[cajaActivaId].find((a) => a.articuloId === item.articuloId)
            if (existingArticle) {
              existingArticle.cantidad += 1
            } else {
              updated[cajaActivaId].push({
                articuloId: item.articuloId,
                codigo: item.codigo || item.codbar || "Sin código",
                cantidad: 1,
              })
            }
            return updated
          })
        }

        playSound("check")
        showToast("Producto escaneado correctamente", "success")
      } else {
        playSound("wrong")
        showToast("Ya alcanzaste la cantidad requerida", "error")
      }
    } else {
      playSound("wrong")
      showToast(`Código "${code}" no encontrado`, "error")
    }

    setTimeout(() => {
      scanningRef.current = false
    }, 300)
  }

  const confirmarPacking = async () => {
    if (!todoListo) {
      showToast("Aún no completas todas las líneas o piezas requeridas", "error")
      focusScanner()
      return
    }
    try {
      const url = `${baseURL}/disponible?doctoId=${encodeURIComponent(String(doctoId))}&sistema=${encodeURIComponent(String(sistema))}`
      const resp = await fetch(url)
      const json = await resp.json()
      if (!resp.ok || !json?.ok) throw new Error(json?.error || "Error al verificar disponibilidad")
      if (!json.disponible) {
        showToast("Esta orden no está lista para empaque", "error")
        return
      }

      playSound("success")
      setShowCompletionModal(true)
    } catch (e: any) {
      console.error("❌ confirmarPacking:", e)
      showToast(e?.message || "No se pudo confirmar", "error")
    }
  }

  const handleRecibir = async () => {
    if (!caratula?.folio) {
      showToast("No se encontró el folio de la orden", "error")
      return
    }

    if (cajasSeleccionadas.length === 0) {
      showToast("No hay cajas seleccionadas", "error")
      return
    }

    setIsPrinting(true)

    try {
      // Fetch folio data from API
      const folioResp = await fetch(`/api/buscar_folio?folio=${encodeURIComponent(caratula.folio)}`)
      const folioJson = await folioResp.json()

      if (!folioResp.ok || !folioJson?.ok) {
        throw new Error(folioJson?.error || "No se pudo obtener los datos del folio")
      }

      const folioData = Array.isArray(folioJson.data) ? folioJson.data[0] : folioJson.data
      const tipoDetectado = folioJson.tipo || "factura"

      // Print labels for each box
      await printLabels({
        folio: caratula.folio,
        folioData,
        tipoDetectado,
        totalBoxes: cajasSeleccionadas.length,
      })

      playSound("success")
      showToast("Etiquetas impresas correctamente", "success")

      // Close modal and redirect after successful print
      setTimeout(() => {
        setShowCompletionModal(false)
        router.push("/packing")
      }, 1500)
    } catch (e: any) {
      console.error("❌ handleRecibir:", e)
      showToast(e?.message || "Error al imprimir etiquetas", "error")
    } finally {
      setIsPrinting(false)
    }
  }

  const productosVisibles = useMemo(() => {
    if (!showOnlyMissing) return detalles
    return detalles.filter((item) => {
      const req = item.unidades ?? 0
      const pk = item.packed ?? 0
      return pk < req
    })
  }, [detalles, showOnlyMissing])

  const lastScannedItem = lastScannedIndex !== null ? detalles[lastScannedIndex] : null

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Cargando orden...</p>
        </div>
      </div>
    )
  }

  if (esperandoCaja) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <input
          ref={scannerRef}
          type="text"
          value={scannerValue}
          onChange={(e) => setScannerValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              processScan(scannerValue)
              setScannerValue("")
              focusScanner()
            }
          }}
          onBlur={focusScanner}
          autoFocus
          autoComplete="off"
          className="absolute w-1 h-1 opacity-0 -z-10"
          style={{ caretColor: "transparent" }}
        />

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border-2 animate-in slide-in-from-right ${
                toast.type === "success"
                  ? "bg-emerald-500/90 border-emerald-400/50 text-white"
                  : "bg-red-500/90 border-red-400/50 text-white"
              }`}
            >
              <p className="font-semibold">{toast.message}</p>
            </div>
          ))}
        </div>

        <div className="glass border border-white/20 rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center bg-black/40 backdrop-blur-xl">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-500/50 animate-pulse">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Escanea una Caja</h2>
          <p className="text-xl text-slate-300 mb-8">
            Antes de comenzar el empaque, escanea el código QR de la caja que utilizarás
          </p>
          <div className="flex items-center justify-center gap-3 text-purple-300">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div
              className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
          <p className="text-sm text-slate-400 mt-8">Escáner activo - Esperando código...</p>
        </div>
      </div>
    )
  }

  if (modoAgregarCaja) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <input
          ref={scannerRef}
          type="text"
          value={scannerValue}
          onChange={(e) => setScannerValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              processScan(scannerValue)
              setScannerValue("")
              focusScanner()
            }
          }}
          onBlur={focusScanner}
          autoFocus
          autoComplete="off"
          className="absolute w-1 h-1 opacity-0 -z-10"
          style={{ caretColor: "transparent" }}
        />

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border-2 animate-in slide-in-from-right ${
                toast.type === "success"
                  ? "bg-emerald-500/90 border-emerald-400/50 text-white"
                  : "bg-red-500/90 border-red-400/50 text-white"
              }`}
            >
              <p className="font-semibold">{toast.message}</p>
            </div>
          ))}
        </div>

        <div className="glass border border-white/20 rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center bg-black/40 backdrop-blur-xl">
          <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-purple-500/50 animate-pulse">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Escanea Otra Caja</h2>
          <p className="text-xl text-slate-300 mb-8">Escanea el código QR de la caja adicional</p>
          <div className="flex items-center justify-center gap-3 text-purple-300 mb-8">
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div
              className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "150ms" }}
            ></div>
            <div
              className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "300ms" }}
            ></div>
          </div>
          <button
            onClick={() => {
              setModoAgregarCaja(false)
              focusScanner()
            }}
            className="px-8 py-3 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-2xl transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100 flex flex-col overflow-hidden">
      <input
        ref={scannerRef}
        type="text"
        value={scannerValue}
        onChange={(e) => setScannerValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            processScan(scannerValue)
            setScannerValue("")
            focusScanner()
          }
        }}
        onBlur={focusScanner}
        autoFocus
        autoComplete="off"
        className="absolute w-1 h-1 opacity-0 -z-10"
        style={{ caretColor: "transparent" }}
      />

      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border-2 animate-in slide-in-from-right ${
              toast.type === "success"
                ? "bg-emerald-500/90 border-emerald-400/50 text-white"
                : "bg-red-500/90 border-red-400/50 text-white"
            }`}
          >
            <p className="font-semibold">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-8 pb-4">
        <div className="glass border border-slate-300/60 rounded-3xl p-8 shadow-xl bg-white/40">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-slate-800 mb-3">
                Orden #{caratula?.folio ?? ordenData?.id ?? "—"}
              </h1>
              <p className="text-slate-600 text-lg">Destino: {caratula?.destino ?? "—"}</p>
              <p className="text-slate-500">Picker: {caratula?.picker ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-semibold transition-all shadow-lg ${
                  showOnlyMissing
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-2 border-amber-400/50"
                    : "glass border-2 border-slate-300/60 text-slate-700 hover:bg-slate-200/50"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                  />
                </svg>
                {showOnlyMissing ? "Ver Todos" : "Ver Faltantes"}
              </button>
              <button
                onClick={focusScanner}
                className="flex items-center gap-2 px-5 py-3 glass border-2 border-blue-400/60 rounded-2xl text-blue-700 font-semibold hover:bg-blue-100/50 transition-all shadow-lg"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Escáner activo
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 px-8 pb-8 overflow-y-auto">
          <div className="space-y-4">
            {productosVisibles.map((item, idx) => {
              const realIdx = detalles.indexOf(item)
              const req = item.unidades ?? 0
              const pk = item.packed ?? 0
              const isComplete = pk >= req && req > 0
              const isLastScanned = realIdx === lastScannedIndex
              const progress = req > 0 ? (pk / req) * 100 : 0

              return (
                <div
                  key={realIdx}
                  className={`glass border-2 rounded-3xl p-6 shadow-xl transition-all duration-300 ${
                    isLastScanned
                      ? "border-emerald-400 bg-emerald-50/50 shadow-emerald-400/30 scale-[1.02]"
                      : isComplete
                        ? "border-green-400/60 bg-green-50/30"
                        : "border-slate-300/60 bg-white/40"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-slate-800">
                          {item.codigo || item.codbar || "Sin código"}
                        </span>
                        {isComplete && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded-full text-sm font-semibold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Completo
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span>Artículo ID: {item.articuloId}</span>
                        {item.codbar && <span>Código de barras: {item.codbar}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => dec(realIdx)}
                        disabled={pk === 0}
                        className="w-12 h-12 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xl shadow-lg transition-all"
                      >
                        −
                      </button>
                      <div className="text-center min-w-[100px]">
                        <div className="text-4xl font-bold text-slate-800">
                          {pk} / {req}
                        </div>
                        <div className="text-sm text-slate-500">empacadas</div>
                      </div>
                      <button
                        onClick={() => inc(realIdx)}
                        disabled={pk >= req}
                        className="w-12 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xl shadow-lg transition-all"
                      >
                        +
                      </button>
                      <button
                        onClick={() => fillToRequired(realIdx)}
                        disabled={pk >= req}
                        className="px-4 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg transition-all"
                      >
                        Llenar
                      </button>
                    </div>
                  </div>

                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isComplete
                          ? "bg-gradient-to-r from-green-500 to-emerald-600"
                          : "bg-gradient-to-r from-blue-500 to-blue-600"
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-1/4 min-w-[320px] p-8 pl-0 space-y-6 overflow-y-auto bg-gradient-to-b from-slate-100/50 to-gray-100/50">
          <div className="glass border border-slate-300/60 rounded-3xl p-8 text-center shadow-xl bg-white/40">
            <div className="text-7xl font-bold text-slate-800 mb-3">{Math.round(progreso * 100)}%</div>
            <p className="text-slate-600 text-lg font-semibold mb-6">Progreso Total</p>
            <div className="flex items-center justify-between text-sm text-slate-500 mb-2">
              <span>{lineasCompletas} completadas</span>
              <span>{totalLineas} total</span>
            </div>
            <div className="h-3 bg-slate-300/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500 shadow-lg shadow-blue-500/50"
                style={{ width: `${progreso * 100}%` }}
              />
            </div>
          </div>

          {cajasSeleccionadas.length > 0 && (
            <div className="glass border border-purple-400/60 rounded-3xl p-6 shadow-xl shadow-purple-400/20 bg-white/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Cajas Seleccionadas</h3>
              </div>

              <div className="space-y-3 mb-4">
                {(() => {
                  const grouped = cajasSeleccionadas.reduce(
                    (acc, caja) => {
                      if (!acc[caja.CAJA_ID]) {
                        acc[caja.CAJA_ID] = []
                      }
                      acc[caja.CAJA_ID].push(caja)
                      return acc
                    },
                    {} as { [key: number]: CajaInstancia[] },
                  )

                  return Object.values(grouped).map((group) => {
                    const firstCaja = group[0]
                    const count = group.length

                    return (
                      <div key={firstCaja.CAJA_ID} className="space-y-2">
                        <div className="flex items-center justify-between px-3 py-2 bg-purple-100 rounded-lg">
                          <span className="font-bold text-slate-800">{firstCaja.NOMBRE}</span>
                          <span className="text-purple-700 font-bold">x{count}</span>
                        </div>
                        {group.map((caja, idx) => {
                          const isActive = cajaActivaId === caja.instanciaId
                          const articulosEnCaja = articulosEnCajas[caja.instanciaId] || []
                          const totalArticulos = articulosEnCaja.reduce((sum, a) => sum + a.cantidad, 0)

                          return (
                            <div
                              key={caja.instanciaId}
                              onClick={() => setCajaActivaId(caja.instanciaId)}
                              className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                isActive
                                  ? "bg-purple-100 border-purple-500 shadow-lg shadow-purple-500/30"
                                  : "bg-purple-50 border-purple-200 hover:border-purple-300"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {isActive && <div className="w-2 h-2 bg-purple-600 rounded-full animate-pulse"></div>}
                                  <span className="text-slate-700 font-semibold">
                                    {firstCaja.TIPO} #{idx + 1}
                                  </span>
                                </div>
                                <span className="text-slate-600 text-sm">{totalArticulos} arts.</span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setModalCajaId(caja.instanciaId)
                                }}
                                className="w-full py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                                  />
                                </svg>
                                Ver Material
                              </button>

                              {isActive && (
                                <div className="mt-2 text-xs text-purple-600 font-semibold flex items-center gap-1">
                                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Caja activa
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })
                })()}
              </div>

              <button
                onClick={() => setModoAgregarCaja(true)}
                className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir Otra Caja
              </button>
            </div>
          )}

          {lastScannedItem && (
            <div className="glass border border-emerald-400/60 rounded-3xl p-6 shadow-xl shadow-emerald-400/20 bg-white/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Último Escaneado</h3>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-emerald-700">
                  {lastScannedItem.codigo || lastScannedItem.codbar}
                </div>
                <div className="text-sm text-slate-600">Artículo ID: {lastScannedItem.articuloId}</div>
                <div className="text-3xl font-bold text-slate-800 mt-3">
                  {lastScannedItem.packed} / {lastScannedItem.unidades}
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleRecibir}
            disabled={!todoListo}
            className={`w-full py-6 rounded-3xl font-bold text-xl shadow-2xl transition-all ${
              todoListo
                ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-emerald-500/50"
                : "bg-slate-300 text-slate-500 cursor-not-allowed"
            }`}
          >
            {todoListo ? "✓ Confirmar Packing" : "Completa el empaque"}
          </button>
        </div>
      </div>

      {modalCajaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass border border-purple-400/60 rounded-3xl shadow-2xl max-w-2xl w-full p-8 bg-white/95">
            {(() => {
              const caja = cajasSeleccionadas.find((c) => c.instanciaId === modalCajaId)
              const articulosEnCaja = articulosEnCajas[modalCajaId] || []
              const totalArticulos = articulosEnCaja.reduce((sum, a) => sum + a.cantidad, 0)

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/50">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-slate-800">{caja?.NOMBRE}</h3>
                        <p className="text-sm text-slate-600">Tipo: {caja?.TIPO}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setModalCajaId(null)}
                      className="w-10 h-10 rounded-full bg-slate-200 hover:bg-slate-300 flex items-center justify-center transition-all"
                    >
                      <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-4 p-4 bg-purple-50 rounded-2xl border border-purple-200">
                    <div className="text-sm text-slate-600 mb-1">Total de artículos en esta caja:</div>
                    <div className="text-3xl font-bold text-purple-700">{totalArticulos}</div>
                  </div>

                  {articulosEnCaja.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {articulosEnCaja.map((art) => (
                        <div
                          key={art.articuloId}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 shadow-sm"
                        >
                          <div>
                            <div className="font-bold text-slate-800">{art.codigo}</div>
                            <div className="text-sm text-slate-500">ID: {art.articuloId}</div>
                          </div>
                          <div className="text-2xl font-bold text-purple-600">x{art.cantidad}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-400">
                      <svg
                        className="w-16 h-16 mx-auto mb-4 opacity-50"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                        />
                      </svg>
                      <p className="text-lg">Esta caja aún no tiene artículos</p>
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass border border-emerald-400/60 rounded-3xl shadow-2xl max-w-2xl w-full p-12 text-center bg-white/95">
            <div className="w-32 h-32 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg shadow-emerald-500/50 animate-pulse">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-slate-800 mb-4">¡Empaque Completado!</h2>
            <p className="text-xl text-slate-600 mb-8">Todas las líneas han sido empacadas correctamente</p>
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 rounded-2xl">
                <div className="text-sm text-slate-600 mb-1">Orden</div>
                <div className="text-2xl font-bold text-slate-800">{caratula?.folio}</div>
              </div>
              <div className="p-4 bg-purple-100 rounded-2xl">
                <div className="text-sm text-slate-600 mb-1">Total de cajas</div>
                <div className="text-2xl font-bold text-purple-700">{cajasSeleccionadas.length}</div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  focusScanner()
                }}
                disabled={isPrinting}
                className="flex-1 py-4 bg-slate-300 hover:bg-slate-400 disabled:bg-slate-200 disabled:cursor-not-allowed text-slate-700 font-bold text-lg rounded-2xl transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecibir}
                disabled={isPrinting}
                className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-bold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                {isPrinting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Imprimiendo...
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                    Recibir e Imprimir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
