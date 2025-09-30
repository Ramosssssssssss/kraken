"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"

type OrdenPacking = {
  key: string
  id: string
  doctoId: number
  sistema: "PEDIDO" | "TRASPASO" | string
  cliente: string
  descripcion?: string | null
  fecha: string
  piezas?: number | null
  estado: "Pendiente"
}

export default function OrdenesPacking() {
  const router = useRouter()
  const { apiUrl } = useCompany()

  const [ordenes, setOrdenes] = useState<OrdenPacking[]>([])
  const [search, setSearch] = useState("")
  const [sortAsc, setSortAsc] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingInit, setLoadingInit] = useState(true)

  const baseURL = useMemo(() => (apiUrl || "").trim().replace(/\/+$/, ""), [apiUrl])

  const mapFromAPI = useCallback((rows: any[]): OrdenPacking[] => {
    const toIsoDate = (val: any) => {
      try {
        if (!val) return ""
        const d = new Date(val)
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, "0")
          const day = String(d.getDate()).padStart(2, "0")
          return `${y}-${m}-${day}`
        }
        return String(val)
      } catch {
        return String(val ?? "")
      }
    }

    return (rows || []).map((r: any, idx: number) => {
      const doctoId = Number(r?.R_DOCTO_ID ?? 0)
      const folio = String(r?.R_FOLIO ?? `DOC-${doctoId || idx}`)
      const cliente = String(r?.R_ALMACEN ?? "—")
      const desc = r?.R_DESCRIPCION ?? null
      const fecha = toIsoDate(r?.R_FECHA)
      const piezas = r?.R_PIEZAS ?? r?.PIEZAS ?? null
      const sistema = String(r?.R_SISTEMA ?? r?.SISTEMA ?? "")

      return {
        key: `${sistema || "S"}-${doctoId || idx}`,
        id: folio,
        doctoId: doctoId,
        sistema: sistema as any,
        cliente: cliente,
        descripcion: desc,
        fecha,
        piezas,
        estado: "Pendiente",
      }
    })
  }, [])

  const fetchOrdenes = useCallback(async () => {
    try {
      const url = `${baseURL}/ordenes`
      const resp = await fetch(url, {
        method: "GET",
        headers: { Accept: "application/json" },
      })
      const json = await resp.json()
      if (!resp.ok || !json?.ok) {
        throw new Error(json?.error || `Error ${resp.status}`)
      }

      const arr = Array.isArray(json?.ordenes) ? json.ordenes : []
      const mapped = mapFromAPI(arr)
      setOrdenes(mapped)
    } catch (err: any) {
      console.error("❌ fetchOrdenes:", err)
    }
  }, [baseURL, mapFromAPI])

  useEffect(() => {
    ;(async () => {
      setLoadingInit(true)
      await fetchOrdenes()
      setLoadingInit(false)
    })()
  }, [fetchOrdenes])

  const handleRefresh = useCallback(async () => {
    setRefreshing(true)
    await fetchOrdenes()
    setRefreshing(false)
  }, [fetchOrdenes])

  const filteredSorted = useMemo(() => {
    const term = search.trim().toLowerCase()
    const f = ordenes.filter((o) => o.cliente.toLowerCase().includes(term) || o.id.toLowerCase().includes(term))
    return f.sort((a, b) => (sortAsc ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)))
  }, [ordenes, search, sortAsc])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100">
      {/* Header with glassmorphism */}
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 border-b border-slate-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-4xl font-bold text-slate-900 mb-6 tracking-tight">Órdenes de Packing</h1>

          {/* Search and Filter Row */}
          <div className="flex gap-4 items-center">
            {/* Search Input */}
            <div className="flex-1 relative">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Buscar orden o cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Sort Button */}
            <button
              onClick={() => setSortAsc((v) => !v)}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 font-medium hover:bg-slate-50 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={sortAsc ? "M19 9l-7 7-7-7" : "M5 15l7-7 7 7"}
                />
              </svg>
              <span className="hidden sm:inline">{sortAsc ? "Más antiguos" : "Más recientes"}</span>
            </button>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-3 bg-white border border-slate-200 rounded-xl text-slate-900 hover:bg-slate-50 transition-all disabled:opacity-50"
            >
              <svg
                className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loadingInit ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredSorted.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-slate-500 text-lg">No hay órdenes por ahora.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSorted.map((item) => (
              <button
                key={item.key}
                onClick={() =>
                  router.push(
                    `/detalle-orden?doctoId=${item.doctoId}&sistema=${item.sistema}&orden=${encodeURIComponent(JSON.stringify(item))}`,
                  )
                }
                className="group bg-white/80 backdrop-blur-sm border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:scale-[1.02] transition-all duration-300 text-left"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    #{item.id}
                  </h3>
                  <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs font-semibold text-amber-700 uppercase tracking-wide">
                    {item.estado}
                  </span>
                </div>

                {/* Cliente */}
                <p className="text-base font-medium text-slate-700 mb-2">{item.cliente}</p>

                {/* Description */}
                {item.descripcion && <p className="text-sm text-slate-500 mb-4 line-clamp-2">{item.descripcion}</p>}

                {/* Footer Info */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>{item.fecha || "—"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                      />
                    </svg>
                    <span>{item.piezas ?? "—"} piezas</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
