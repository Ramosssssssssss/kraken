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
  const [lastScannedIndex, setLastScannedIndex] = useState<number | null>(null)
  const [showOnlyMissing, setShowOnlyMissing] = useState(false)
  const [scannerValue, setScannerValue] = useState("")

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
          setLastScannedIndex(idx)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-gray-100">
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

      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="glass border border-white/20 rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/50">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">¡Orden Completada!</h3>
              <p className="text-slate-300 mb-8">
                La orden <span className="font-bold text-emerald-400">#{caratula?.folio ?? ordenData?.id}</span> fue
                confirmada exitosamente.
              </p>
              <button
                onClick={() => router.push("/ordenes-packing")}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-2xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-emerald-500/30"
              >
                Volver a Órdenes
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-h-screen">
        <div className="flex-1 w-3/4 p-8 space-y-6 overflow-y-auto">
          <div className="glass border border-slate-300/60 rounded-3xl p-8 shadow-xl bg-white/40">
            <div className="flex items-start justify-between mb-6">
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
            </div>
          </div>

          <div className="flex items-center justify-between px-2">
            <h2 className="text-2xl font-bold text-slate-800">Productos</h2>
            {showOnlyMissing && (
              <span className="text-sm text-slate-600 font-medium">
                {productosVisibles.length} faltante{productosVisibles.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {productosVisibles.length === 0 ? (
            <div className="glass border border-slate-300/60 rounded-3xl p-12 text-center bg-white/40">
              <p className="text-slate-500 text-lg">
                {showOnlyMissing ? "¡Todos los productos están completos!" : "Sin artículos en esta orden."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {productosVisibles.map((item, index) => {
                const req = item.unidades ?? 0
                const pk = item.packed ?? 0
                const completa = pk >= req && req > 0
                const itemProgreso = req > 0 ? (pk / req) * 100 : 0
                const realIndex = detalles.findIndex((d) => d.articuloId === item.articuloId)

                return (
                  <div
                    key={`${item.articuloId}-${index}`}
                    className={`glass border-2 rounded-3xl p-6 transition-all shadow-xl bg-white/40 ${
                      completa
                        ? "border-emerald-400/60 shadow-emerald-400/20"
                        : "border-slate-300/60 hover:border-slate-400/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-6">
                      <div className="flex-1 space-y-2">
                        <h3 className={`text-2xl font-bold ${completa ? "text-emerald-600" : "text-slate-800"}`}>
                          {item.codigo || item.codbar || `ART-${item.articuloId}`}
                        </h3>
                        {item.codbar && <p className="text-sm text-slate-500">CB: {item.codbar}</p>}
                        <div className="flex items-center gap-6 text-sm">
                          <p className="text-slate-600">
                            Requerido: <span className="font-bold text-slate-800">{req}</span>
                          </p>
                          <p className="text-slate-600">
                            Empacado: <span className="font-bold text-blue-600">{pk}</span>
                          </p>
                          <p className="text-slate-600">
                            Escaneado: <span className="font-bold text-emerald-600">{pk}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => dec(realIndex)}
                            className="w-12 h-12 rounded-2xl glass border-2 border-slate-300/60 flex items-center justify-center hover:bg-slate-200/50 transition-all bg-white/40"
                          >
                            <svg
                              className="w-6 h-6 text-slate-700"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                          </button>
                          <span className="text-3xl font-bold text-slate-800 w-16 text-center">{pk}</span>
                          <button
                            onClick={() => inc(realIndex)}
                            onMouseDown={(e) => {
                              const timer = setTimeout(() => fillToRequired(realIndex), 250)
                              const cleanup = () => {
                                clearTimeout(timer)
                                document.removeEventListener("mouseup", cleanup)
                              }
                              document.addEventListener("mouseup", cleanup)
                            }}
                            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 border-2 border-blue-400/60 flex items-center justify-center hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg shadow-blue-500/30"
                          >
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-slate-500">Escanea para avanzar</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="sticky bottom-0 left-0 right-0 pt-6">
            <button
              onClick={confirmarPacking}
              disabled={!todoListo}
              className={`w-full py-5 rounded-3xl font-bold text-white text-lg flex items-center justify-center gap-3 transition-all shadow-2xl ${
                todoListo
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 shadow-emerald-500/30 border-2 border-emerald-400/50"
                  : "glass border-2 border-slate-300/60 cursor-not-allowed opacity-50 bg-slate-300/40"
              }`}
            >
              {todoListo ? (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Marcar como listo
                </>
              ) : (
                <>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  Completa el escaneo para continuar
                </>
              )}
            </button>
          </div>
        </div>

        <div className="w-1/4 min-w-[320px] p-8 space-y-6 border-l border-slate-300/50 overflow-y-auto bg-gradient-to-b from-slate-100/50 to-gray-100/50">
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

          {lastScannedItem && (
            <div className="glass border border-emerald-400/60 rounded-3xl p-6 shadow-xl shadow-emerald-400/20 bg-white/40">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/50">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800">Último Escaneado</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center w-full h-32 glass border border-slate-300/60 rounded-2xl bg-white/40">
                  <svg className="w-16 h-16 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 text-sm">CLAVE</span>
                    <span className="text-slate-800 font-bold">
                      {lastScannedItem.codigo || lastScannedItem.codbar || `ART-${lastScannedItem.articuloId}`}
                    </span>
                  </div>
                  {lastScannedItem.codbar && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-sm">CÓDIGO DE BARRAS</span>
                      <span className="text-slate-600 text-sm">{lastScannedItem.codbar}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-300/50">
                  <div>
                    <p className="text-emerald-600 text-sm font-semibold mb-1">Escaneado</p>
                    <p className="text-2xl font-bold text-slate-800">{lastScannedItem.packed ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-sm font-semibold mb-1">Requerido</p>
                    <p className="text-2xl font-bold text-slate-800">{lastScannedItem.unidades ?? 0}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Completado</span>
                    <span className="text-slate-800 font-bold">
                      {lastScannedItem.unidades
                        ? Math.round(((lastScannedItem.packed ?? 0) / lastScannedItem.unidades) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-slate-300/50 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all duration-500"
                      style={{
                        width: `${
                          lastScannedItem.unidades
                            ? Math.min(100, ((lastScannedItem.packed ?? 0) / lastScannedItem.unidades) * 100)
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                <p className="text-emerald-600 text-sm text-center pt-2">Escaneado hace 5s</p>
              </div>
            </div>
          )}

          <div className="glass border border-slate-300/60 rounded-3xl p-6 shadow-xl bg-white/40">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Orden: {caratula?.folio ?? ordenData?.id ?? "—"}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start justify-between">
                <span className="text-slate-500">Proveedor:</span>
                <span className="text-slate-800 font-semibold text-right">{caratula?.destino ?? "—"}</span>
              </div>
              <div className="flex items-start justify-between">
                <span className="text-slate-500">Almacén:</span>
                <span className="text-slate-800 font-semibold">{caratula?.picker ?? "—"}</span>
              </div>
              {caratula?.fecha && (
                <div className="flex items-start justify-between">
                  <span className="text-slate-500">Fecha:</span>
                  <span className="text-slate-800 font-semibold">{caratula.fecha}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
