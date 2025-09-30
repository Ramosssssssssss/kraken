"use client"

import { useEffect, useMemo, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useCompany } from "@/lib/company-context"

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

  // Scanner
  const [scanValue, setScanValue] = useState("")
  const scannerRef = useRef<HTMLInputElement>(null)

  const focusScanner = useCallback(() => {
    setTimeout(() => scannerRef.current?.focus(), 30)
  }, [])

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

  // Progress
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
      return next
    })
    focusScanner()
  }

  const processScan = (raw: string) => {
    const code = (raw || "").trim().toUpperCase()
    if (!code) return

    const idx = detalles.findIndex(
      (d) => (d.codbar ?? "").toUpperCase() === code || (d.codigo ?? "").toUpperCase() === code,
    )

    if (idx >= 0) {
      setDetalles((prev) => {
        const next = [...prev]
        const item = next[idx]
        const req = item.unidades ?? 0
        const pk = item.packed ?? 0
        if (pk < req) {
          next[idx] = { ...item, packed: pk + 1 }
          playSound("check")
          showToast("Producto escaneado correctamente", "success")
        } else {
          playSound("wrong")
          showToast("Ya alcanzaste la cantidad requerida", "error")
        }
        return next
      })
    } else {
      playSound("wrong")
      showToast(`Código "${code}" no encontrado`, "error")
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg">Cargando orden...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Scanner Input (invisible) */}
      <input
        ref={scannerRef}
        type="text"
        value={scanValue}
        onChange={(e) => setScanValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            processScan(scanValue)
            setScanValue("")
            focusScanner()
          }
        }}
        onBlur={focusScanner}
        autoFocus
        className="absolute w-1 h-1 opacity-0 -z-10"
        style={{ caretColor: "transparent" }}
      />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-6 py-4 rounded-xl shadow-lg backdrop-blur-xl border animate-in slide-in-from-right ${
              toast.type === "success"
                ? "bg-emerald-500/90 border-emerald-400 text-white"
                : "bg-red-500/90 border-red-400 text-white"
            }`}
          >
            <p className="font-medium">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">¡Orden Completada!</h3>
              <p className="text-slate-600 mb-8">
                La orden <span className="font-bold">#{caratula?.folio ?? ordenData?.id}</span> fue confirmada
                exitosamente.
              </p>
              <button
                onClick={() => router.push("/ordenes-packing")}
                className="w-full py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
              >
                Volver a Órdenes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                Orden #{caratula?.folio ?? ordenData?.id ?? "—"}
              </h1>
              <p className="text-slate-600">Destino: {caratula?.destino ?? "—"}</p>
              <p className="text-slate-500 text-sm">Picker: {caratula?.picker ?? "—"}</p>
            </div>
            <button
              onClick={focusScanner}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 font-medium hover:bg-blue-100 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              Escáner activo
            </button>
          </div>

          {/* Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 font-medium">
                Líneas: {lineasCompletas}/{totalLineas} • Piezas: {totalEmpacadas}/{totalRequeridas}
              </span>
              <span className="text-slate-900 font-bold">{Math.round(progreso * 100)}%</span>
            </div>
            <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  todoListo
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600"
                    : "bg-gradient-to-r from-blue-500 to-blue-600"
                }`}
                style={{ width: `${progreso * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">
        {detalles.length === 0 ? (
          <p className="text-center text-slate-500 py-20">Sin artículos en esta orden.</p>
        ) : (
          detalles.map((item, index) => {
            const req = item.unidades ?? 0
            const pk = item.packed ?? 0
            const completa = pk >= req && req > 0
            return (
              <div
                key={`${item.articuloId}-${index}`}
                className={`bg-white/80 backdrop-blur-sm rounded-2xl p-6 border-2 transition-all ${
                  completa ? "border-emerald-500 shadow-lg shadow-emerald-500/20" : "border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className={`text-lg font-bold mb-1 ${completa ? "text-emerald-700" : "text-slate-900"}`}>
                      {item.codigo || item.codbar || `ART-${item.articuloId}`}
                    </h3>
                    {item.codbar && <p className="text-sm text-slate-500 mb-2">CB: {item.codbar}</p>}
                    <p className="text-sm text-slate-600">
                      Requerido: <span className="font-bold">{req}</span> • Empacado:{" "}
                      <span className="font-bold">{pk}</span>
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => dec(index)}
                        className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-300 flex items-center justify-center hover:bg-slate-200 transition-all"
                      >
                        <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                      </button>
                      <span className="text-2xl font-bold text-slate-900 w-12 text-center">{pk}</span>
                      <button
                        onClick={() => inc(index)}
                        onMouseDown={(e) => {
                          const timer = setTimeout(() => fillToRequired(index), 250)
                          const cleanup = () => {
                            clearTimeout(timer)
                            document.removeEventListener("mouseup", cleanup)
                          }
                          document.addEventListener("mouseup", cleanup)
                        }}
                        className="w-10 h-10 rounded-xl bg-blue-500 border border-blue-600 flex items-center justify-center hover:bg-blue-600 transition-all"
                      >
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-xs text-slate-400">Mantén + para llenar</p>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Confirm Button */}
      <div className="sticky bottom-0 bg-white/70 backdrop-blur-xl border-t border-slate-200/50 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={confirmarPacking}
            disabled={!todoListo}
            className={`w-full py-4 rounded-xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all ${
              todoListo
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg"
                : "bg-slate-300 cursor-not-allowed"
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Marcar como listo
          </button>
        </div>
      </div>
    </div>
  )
}
