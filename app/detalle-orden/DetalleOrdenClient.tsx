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
  instanciaId: string
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
    if (scanningRef.current) {
      console.log("[v0] Scan blocked - already processing")
      return
    }

    const code = (raw || "").trim().toUpperCase()
    if (!code) return

    if (esperandoCaja || modoAgregarCaja) {
      validarCaja(code)
      return
    }

    console.log("[v0] Processing scan:", code)
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

            const existingIndex = updated[cajaActivaId].findIndex((a) => a.articuloId === item.articuloId)

            if (existingIndex >= 0) {
              console.log("[v0] Incrementing existing article:", updated[cajaActivaId][existingIndex].codigo)
              updated[cajaActivaId] = updated[cajaActivaId].map((a, i) =>
                i === existingIndex ? { ...a, cantidad: a.cantidad + 1 } : a,
              )
            } else {
              console.log("[v0] Adding new article to box:", item.codigo || item.codbar)
              updated[cajaActivaId] = [
                ...updated[cajaActivaId],
                {
                  articuloId: item.articuloId,
                  codigo: item.codigo || item.codbar || "Sin código",
                  cantidad: 1,
                },
              ]
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
      console.log("[v0] Scan lock released")
    }, 100)
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
      const folioResp = await fetch(`/api/buscar_folio?folio=${encodeURIComponent(caratula.folio)}`)
      const folioJson = await folioResp.json()

      if (!folioResp.ok || !folioJson?.ok) {
        throw new Error(folioJson?.error || "No se pudo obtener los datos del folio")
      }

      const folioData = Array.isArray(folioJson.data) ? folioJson.data[0] : folioJson.data
      const tipoDetectado = folioJson.tipo || "factura"

      await printLabels({
        folio: caratula.folio,
        folioData,
        tipoDetectado,
        totalBoxes: cajasSeleccionadas.length,
      })

      playSound("success")
      showToast("Etiquetas impresas correctamente", "success")

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando orden...</p>
        </div>
      </div>
    )
  }

  if (esperandoCaja) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
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
              className={`px-6 py-4 rounded-xl shadow-lg border animate-in slide-in-from-right ${
                toast.type === "success"
                  ? "bg-white border-gray-900 text-gray-900"
                  : "bg-gray-900 border-gray-900 text-white"
              }`}
            >
              <p className="font-semibold">{toast.message}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-2xl w-full p-12 text-center">
          <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Escanea una Caja</h2>
          <p className="text-xl text-gray-600 mb-8">
            Antes de comenzar el empaque, escanea el código QR de la caja que utilizarás
          </p>
          <div className="flex items-center justify-center gap-3 text-gray-400">
            <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
          <p className="text-sm text-gray-500 mt-8">Escáner activo - Esperando código...</p>
        </div>
      </div>
    )
  }

  if (modoAgregarCaja) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
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
              className={`px-6 py-4 rounded-xl shadow-lg border animate-in slide-in-from-right ${
                toast.type === "success"
                  ? "bg-white border-gray-900 text-gray-900"
                  : "bg-gray-900 border-gray-900 text-white"
              }`}
            >
              <p className="font-semibold">{toast.message}</p>
            </div>
          ))}
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl shadow-xl max-w-2xl w-full p-12 text-center">
          <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
              />
            </svg>
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Escanea Otra Caja</h2>
          <p className="text-xl text-gray-600 mb-8">Escanea el código QR de la caja adicional</p>
          <div className="flex items-center justify-center gap-3 text-gray-400 mb-8">
            <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>
          <button
            onClick={() => {
              setModoAgregarCaja(false)
              focusScanner()
            }}
            className="px-8 py-3 bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold rounded-xl transition-all shadow-sm"
          >
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
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
            className={`px-6 py-4 rounded-xl shadow-lg border animate-in slide-in-from-right ${
              toast.type === "success"
                ? "bg-white border-gray-900 text-gray-900"
                : "bg-gray-900 border-gray-900 text-white"
            }`}
          >
            <p className="font-semibold">{toast.message}</p>
          </div>
        ))}
      </div>

      <div className="flex-shrink-0 p-8 pb-4">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-3">
                Orden #{caratula?.folio ?? ordenData?.id ?? "—"}
              </h1>
              <p className="text-gray-600 text-lg">Destino: {caratula?.destino ?? "—"}</p>
              <p className="text-gray-500">Picker: {caratula?.picker ?? "—"}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOnlyMissing(!showOnlyMissing)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all shadow-sm ${
                  showOnlyMissing
                    ? "bg-gray-900 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                    clipRule="evenodd"
                  />
                </svg>
                {showOnlyMissing ? "Ver Todos" : "Ver Faltantes"}
              </button>
              <button
                onClick={focusScanner}
                className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 rounded-xl text-gray-700 font-semibold hover:bg-gray-50 transition-all shadow-sm"
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
                  className={`bg-white border-2 rounded-2xl p-6 shadow-md transition-all duration-300 ${
                    isLastScanned ? "border-gray-900 scale-[1.02]" : isComplete ? "border-gray-400" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl font-bold text-gray-900">
                          {item.codigo || item.codbar || "Sin código"}
                        </span>
                        {isComplete && (
                          <div className="flex items-center gap-1 px-3 py-1 bg-gray-900 text-white rounded-full text-sm font-semibold">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            Completo
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Artículo ID: {item.articuloId}</span>
                        {item.codbar && <span>Código de barras: {item.codbar}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => dec(realIdx)}
                        disabled={pk === 0}
                        className="w-12 h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xl shadow-md transition-all"
                      >
                        −
                      </button>
                      <div className="text-center min-w-[100px]">
                        <div className="text-4xl font-bold text-gray-900">
                          {pk} / {req}
                        </div>
                        <div className="text-sm text-gray-500">empacadas</div>
                      </div>
                      <button
                        onClick={() => inc(realIdx)}
                        disabled={pk >= req}
                        className="w-12 h-12 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-xl shadow-md transition-all"
                      >
                        +
                      </button>
                      <button
                        onClick={() => fillToRequired(realIdx)}
                        disabled={pk >= req}
                        className="px-4 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-md transition-all"
                      >
                        Llenar
                      </button>
                    </div>
                  </div>

                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${isComplete ? "bg-gray-900" : "bg-gray-600"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="w-1/4 min-w-[320px] p-8 pl-0 space-y-6 overflow-y-auto">
          {/* Progress card */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-lg">
            <div className="text-7xl font-bold text-gray-900 mb-3">{Math.round(progreso * 100)}%</div>
            <p className="text-gray-600 text-lg font-semibold mb-6">Progreso Total</p>
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>{lineasCompletas} completadas</span>
              <span>{totalLineas} total</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gray-900 transition-all duration-500 shadow-sm"
                style={{ width: `${progreso * 100}%` }}
              />
            </div>
          </div>

          {/* Boxes section */}
          {cajasSeleccionadas.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Cajas Seleccionadas</h3>
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
                        <div className="flex items-center justify-between px-3 py-2 bg-gray-100 rounded-lg">
                          <span className="font-bold text-gray-900">{firstCaja.NOMBRE}</span>
                          <span className="text-gray-700 font-bold">x{count}</span>
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
                                  ? "bg-gray-100 border-gray-900 shadow-md"
                                  : "bg-gray-50 border-gray-200 hover:border-gray-300"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  {isActive && <div className="w-2 h-2 bg-gray-900 rounded-full"></div>}
                                  <span className="text-gray-900 font-semibold">
                                    {firstCaja.TIPO} #{idx + 1}
                                  </span>
                                </div>
                                <span className="text-gray-600 text-sm">{totalArticulos} arts.</span>
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setModalCajaId(caja.instanciaId)
                                }}
                                className="w-full py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 shadow-sm"
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
                                <div className="mt-2 text-xs text-gray-600 font-semibold flex items-center gap-1">
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
                className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl transition-all shadow-md flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Añadir Otra Caja
              </button>
            </div>
          )}

          {/* Last scanned item */}
          {lastScannedItem && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">Último Escaneado</h3>
              </div>
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900">
                  {lastScannedItem.codigo || lastScannedItem.codbar}
                </div>
                <div className="text-sm text-gray-600">Artículo ID: {lastScannedItem.articuloId}</div>
                <div className="text-3xl font-bold text-gray-900 mt-3">
                  {lastScannedItem.packed} / {lastScannedItem.unidades}
                </div>
              </div>
            </div>
          )}

          {/* Confirm button */}
          <button
            onClick={handleRecibir}
            disabled={!todoListo}
            className={`w-full py-6 rounded-2xl font-bold text-xl shadow-lg transition-all ${
              todoListo ? "bg-gray-900 hover:bg-gray-800 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {todoListo ? "✓ Confirmar Packing" : "Completa el empaque"}
          </button>
        </div>
      </div>

      {modalCajaId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-2xl w-full p-8">
            {(() => {
              const caja = cajasSeleccionadas.find((c) => c.instanciaId === modalCajaId)
              const articulosEnCaja = articulosEnCajas[modalCajaId] || []
              const totalArticulos = articulosEnCaja.reduce((sum, a) => sum + a.cantidad, 0)

              return (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-900 rounded-full flex items-center justify-center shadow-md">
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
                        <h3 className="text-2xl font-bold text-gray-900">{caja?.NOMBRE}</h3>
                        <p className="text-sm text-gray-600">Tipo: {caja?.TIPO}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setModalCajaId(null)}
                      className="w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-all"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="mb-4 p-4 bg-gray-100 rounded-xl border border-gray-200">
                    <div className="text-sm text-gray-600 mb-1">Total de artículos en esta caja:</div>
                    <div className="text-3xl font-bold text-gray-900">{totalArticulos}</div>
                  </div>

                  {articulosEnCaja.length > 0 ? (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {articulosEnCaja.map((art) => (
                        <div
                          key={art.articuloId}
                          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm"
                        >
                          <div>
                            <div className="font-bold text-gray-900">{art.codigo}</div>
                            <div className="text-sm text-gray-500">ID: {art.articuloId}</div>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">x{art.cantidad}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl max-w-2xl w-full p-12 text-center">
            <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
              <svg className="w-16 h-16 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">¡Empaque Completado!</h2>
            <p className="text-xl text-gray-600 mb-8">Todas las líneas han sido empacadas correctamente</p>
            <div className="space-y-4">
              <div className="p-4 bg-gray-100 rounded-xl">
                <div className="text-sm text-gray-600 mb-1">Orden</div>
                <div className="text-2xl font-bold text-gray-900">{caratula?.folio}</div>
              </div>
              <div className="p-4 bg-gray-100 rounded-xl">
                <div className="text-sm text-gray-600 mb-1">Total de cajas</div>
                <div className="text-2xl font-bold text-gray-900">{cajasSeleccionadas.length}</div>
              </div>
            </div>
            <div className="flex gap-4 mt-8">
              <button
                onClick={() => {
                  setShowCompletionModal(false)
                  focusScanner()
                }}
                disabled={isPrinting}
                className="flex-1 py-4 bg-gray-200 hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-900 font-bold text-lg rounded-xl transition-all shadow-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleRecibir}
                disabled={isPrinting}
                className="flex-1 py-4 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
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
