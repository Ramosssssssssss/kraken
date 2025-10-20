"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import {
  ArrowLeft,
  Package,
  Loader2,
  AlertCircle,
  Calendar,
  FileText,
  Hash,
  CheckCircle2,
  Clock,
  TrendingUp,
  BarChart3,
  PlayCircle,
  Filter,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

type DoctoInvfis = {
  FECHA: string
  FOLIO: string
  DESCRIPCION: string
  APLICADO: "S" | "N"  // Nuevo campo
}

export default function AplicarInvPage() {
  const router = useRouter()
  const { apiUrl } = useCompany()
  const { toast } = useToast()

  const [doctos, setDoctos] = useState<DoctoInvfis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingFolio, setApplyingFolio] = useState<string | null>(null)
  const [successModal, setSuccessModal] = useState<{
    open: boolean
    folio?: string | null
    doctoId?: string | number | null
    inserted?: number
  }>({ open: false, folio: null, doctoId: null, inserted: 0 })
  const [filter, setFilter] = useState<"todos" | "aplicados" | "no-aplicados">("todos") // Nuevo estado para el filtro
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date()
    return d.toISOString().slice(0, 10)
  })

  // Fetch documents optionally by start/end date. On mount fetch today's documents.
  useEffect(() => {
    if (!apiUrl) return

    const fetchDoctos = async (s?: string, e?: string) => {
      setLoading(true)
      setError(null)

      try {
        const base = `${apiUrl}/doctos-invfis-semana`
        const params = new URLSearchParams()
        if (s) params.append("start", s)
        if (e) params.append("end", e)

        const url = params.toString() ? `${base}?${params.toString()}` : base

        const response = await fetch(url)
        const data = await response.json()

        if (data.ok && data.data) {
          setDoctos(data.data)
        } else {
          setError(data.message || "Error al cargar los documentos")
        }
      } catch (err) {
        console.error("Error fetching doctos:", err)
        setError("Error de conexión al servidor")
      } finally {
        setLoading(false)
      }
    }

    // On mount, fetch today's documents
    const today = new Date().toISOString().slice(0, 10)
    setStartDate(today)
    setEndDate(today)
    fetchDoctos(today, today)
  }, [apiUrl])

  const stats = useMemo(() => {
    const total = doctos.length
    const aplicados = doctos.filter((d) => d.APLICADO === "S").length
    const noAplicados = doctos.filter((d) => d.APLICADO === "N").length

    return { total, aplicados, noAplicados }
  }, [doctos])

  const handleAplicarInventario = async (folio: string) => {
    if (!apiUrl) {
      toast({
        title: "Error",
        description: "No se ha configurado la URL de la API",
        variant: "destructive",
      })
      return
    }

    setApplyingFolio(folio)

    try {
      const response = await fetch(`${apiUrl}/aplicar-invfis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ folio }),
      })

      const data = await response.json()

      if (data.ok) {
        setDoctos((prev) => 
          prev.map((doc) => 
            doc.FOLIO === folio ? { ...doc, APLICADO: "S" } : doc
          )
        )

        // Mostrar modal de éxito usando campos devueltos por el API si existen
        setSuccessModal({
          open: true,
          folio: data.folio || folio,
          doctoId: data.doctoInvfisId ?? null,
          inserted: typeof data.inserted === 'number' ? data.inserted : 0,
        })

      } else {
        toast({
          title: "Error",
          description: data.message || "Error al aplicar el inventario",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Error applying inventory:", err)
      toast({
        title: "Error",
        description: "Error de conexión al servidor",
        variant: "destructive",
      })
    } finally {
      setApplyingFolio(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("es-MX", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch {
      return dateString
    }
  }

  // Filtrar documentos según el filtro seleccionado
  const filteredDoctos = useMemo(() => {
    if (filter === "aplicados") {
      return doctos.filter((d) => d.APLICADO === "S")
    } else if (filter === "no-aplicados") {
      return doctos.filter((d) => d.APLICADO === "N")
    }
    return doctos
  }, [doctos, filter])
function extractUsuarioFromDescripcion(desc?: string | null) {
  if (!desc) return "—"
  // Busca "por:" (insensible a may/min) y captura hasta "Fecha" o fin
  const m = desc.match(/por:\s*([\s\S]*?)(?:\bFecha\b|$)/i)
  if (!m) return "—"
  // Limpia bordes y corta por salto de línea si existiera
  const usuario = m[1].split("\n")[0].trim()
  return usuario || "—"
}
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0f] via-[#0a0a0f] to-[#151021]">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="mx-auto max-w-[1920px] px-8 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <button
                onClick={() => router.push("/dashboard")}
                className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-white/60 transition-all hover:bg-white/10 hover:text-white/90"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-teal-400/20 bg-teal-400/8 p-3">
                  <Package className="h-6 w-6 text-teal-300" />
                </div>
                <div>
                  <h1 className="font-light text-3xl tracking-wide text-white/90">Aplicar Inventario Físico</h1>
                  <p className="mt-1 font-light text-sm tracking-wide text-white/50">
                    Gestión de documentos de inventario • Semana actual
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-[1920px] px-8 py-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-teal-300" />
              <p className="mt-4 font-light text-sm tracking-wide text-white/70">Cargando documentos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-red-400" />
              <div>
                <h3 className="font-light text-lg tracking-wide text-red-400">Error al cargar documentos</h3>
                <p className="mt-1 font-light text-sm tracking-wide text-red-400/70">{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Stats Dashboard */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl transition-all hover:bg-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-light text-sm tracking-wide text-white/60">Total Documentos</div>
                    <div className="mt-2 font-light text-3xl tracking-wide text-white/90">{stats.total}</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                    <FileText className="h-6 w-6 text-white/60" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-6 backdrop-blur-xl transition-all hover:bg-green-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-light text-sm tracking-wide text-green-400/80">Aplicados</div>
                    <div className="mt-2 font-light text-3xl tracking-wide text-green-400">{stats.aplicados}</div>
                  </div>
                  <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3">
                    <CheckCircle2 className="h-6 w-6 text-green-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-orange-500/20 bg-orange-500/10 p-6 backdrop-blur-xl transition-all hover:bg-orange-500/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-light text-sm tracking-wide text-orange-400/80">No Aplicados</div>
                    <div className="mt-2 font-light text-3xl tracking-wide text-orange-400">{stats.noAplicados}</div>
                  </div>
                  <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-3">
                    <Clock className="h-6 w-6 text-orange-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filtros */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-3">
                <Filter className="h-4 w-4 text-white/60" />
                <span className="font-light text-sm tracking-wide text-white/60">Filtros</span>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-2">
                  <label className="font-light text-xs text-white/60">Desde</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="rounded-md border border-white/10 bg-white/3 px-3 py-1 text-sm text-white/80"
                  />

                  <label className="font-light text-xs text-white/60 ml-3">Hasta</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="rounded-md border border-white/10 bg-white/3 px-3 py-1 text-sm text-white/80"
                  />
                  <Button
                    size="sm"
                    onClick={() => {
                      // fetch by range
                      const base = `${apiUrl}/doctos-invfis-semana`
                      const params = new URLSearchParams()
                      if (startDate) params.append("start", startDate)
                      if (endDate) params.append("end", endDate)
                      const url = params.toString() ? `${base}?${params.toString()}` : base
                      setLoading(true)
                      fetch(url)
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.ok && data.data) setDoctos(data.data)
                          else setError(data.message || "Error al cargar los documentos")
                        })
                        .catch((err) => {
                          console.error(err)
                          setError("Error de conexión al servidor")
                        })
                        .finally(() => setLoading(false))
                    }}
                    className="ml-3 rounded-lg bg-teal-400/10 border border-teal-300/20 text-teal-300 text-xs"
                  >
                    Buscar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const today = new Date().toISOString().slice(0, 10)
                      setStartDate(today)
                      setEndDate(today)
                      // refetch today's
                      const base = `${apiUrl}/doctos-invfis-semana`
                      const params = new URLSearchParams()
                      params.append("start", today)
                      params.append("end", today)
                      const url = `${base}?${params.toString()}`
                      setLoading(true)
                      fetch(url)
                        .then((r) => r.json())
                        .then((data) => {
                          if (data.ok && data.data) setDoctos(data.data)
                          else setError(data.message || "Error al cargar los documentos")
                        })
                        .catch((err) => {
                          console.error(err)
                          setError("Error de conexión al servidor")
                        })
                        .finally(() => setLoading(false))
                    }}
                    className="ml-2 text-xs"
                  >
                    Limpiar
                  </Button>
                </div>

                <div className="flex gap-2">
                <Button
                  variant={filter === "todos" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("todos")}
                  className={`font-light text-xs tracking-wide ${
                    filter === "todos"
                      ? "bg-teal-400/12 border-teal-300/30 text-teal-300"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90"
                  }`}
                >
                  Todos ({stats.total})
                </Button>
                <Button
                  variant={filter === "aplicados" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("aplicados")}
                  className={`font-light text-xs tracking-wide ${
                    filter === "aplicados"
                      ? "bg-green-500/20 border-green-500/40 text-green-400"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90"
                  }`}
                >
                  Aplicados ({stats.aplicados})
                </Button>
                <Button
                  variant={filter === "no-aplicados" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter("no-aplicados")}
                  className={`font-light text-xs tracking-wide ${
                    filter === "no-aplicados"
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                      : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/90"
                  }`}
                >
                  No Aplicados ({stats.noAplicados})
                </Button>
                </div>
              </div>
            </div>

            {/* Documents Table */}
            {filteredDoctos.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-16 text-center backdrop-blur-xl">
                <div className="mx-auto w-fit rounded-2xl border border-white/10 bg-white/5 p-6">
                  <BarChart3 className="h-12 w-12 text-white/40" />
                </div>
                <h3 className="mt-6 font-light text-xl tracking-wide text-white/70">No hay documentos</h3>
                <p className="mt-2 font-light text-sm tracking-wide text-white/50">
                  No se encontraron documentos de inventario para este filtro
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2 font-light text-sm tracking-wide text-white/70">
                            <Calendar className="h-4 w-4" />
                            Fecha
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2 font-light text-sm tracking-wide text-white/70">
                            <Hash className="h-4 w-4" />
                            Folio
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2 font-light text-sm tracking-wide text-white/70">
                            <FileText className="h-4 w-4" />
                            Descripción
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="flex items-center gap-2 font-light text-sm tracking-wide text-white/70">
                            <CheckCircle2 className="h-4 w-4" />
                            Aplicado
                          </div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="font-light text-sm tracking-wide text-white/70">ACCIONES</div>
                        </th>
                        <th className="px-6 py-4 text-left">
                          <div className="font-light text-sm tracking-wide text-white/70">USUARIO</div>
                        </th>
                       
                      </tr>
                    </thead>
                 <tbody>
  {filteredDoctos.map((docto, index) => {
    const isApplied = docto.APLICADO === "S"
    const usuarioDescripcion = extractUsuarioFromDescripcion(docto.DESCRIPCION)

    return (
      <tr
        key={`${docto.FOLIO}-${index}`}
        className="group border-b border-white/5 transition-all hover:bg-white/[0.02]"
      >
        <td className="px-6 py-4">
          <span className="font-light text-sm tracking-wide text-white/80">
            {formatDate(docto.FECHA)}
          </span>
        </td>

        <td className="px-6 py-4">
          <span className="inline-flex items-center gap-2 rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 font-mono text-sm text-purple-400">
            {docto.FOLIO}
          </span>
        </td>

        <td className="px-6 py-4">
          <span
            className="font-light text-sm tracking-wide text-white/70"
            style={{ whiteSpace: "pre-line" }}
          >
            {docto.DESCRIPCION || "—"}
          </span>
        </td>

        <td className="px-6 py-4">
          {isApplied ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-1.5 font-light text-xs tracking-wide text-green-400">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Sí
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-lg border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 font-light text-xs tracking-wide text-orange-400">
              <Clock className="h-3.5 w-3.5" />
              No
            </span>
          )}
        </td>

        <td className="px-6 py-4">
          {isApplied ? (
            <span className="font-light text-xs tracking-wide text-green-400/70">✓ Ya aplicado</span>
          ) : (
            <Button
              onClick={() => handleAplicarInventario(docto.FOLIO)}
              disabled={applyingFolio === docto.FOLIO}
              size="sm"
              className="rounded-lg border border-purple-500/20 bg-purple-500/10 font-light text-xs tracking-wide text-purple-400 transition-all hover:bg-purple-500/20 hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] disabled:opacity-50"
            >
              {applyingFolio === docto.FOLIO ? (
                <>
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <PlayCircle className="mr-2 h-3.5 w-3.5" />
                  Aplicar
                </>
              )}
            </Button>
          )}
        </td>

        {/* 🆕 USUARIO (extraído de DESCRIPCION) */}
        <td className="px-6 py-4">
          <span className="font-light text-sm tracking-wide text-white/70">
            {usuarioDescripcion}
          </span>
        </td>
      </tr>
    )
  })}
</tbody>

                  </table>
                </div>

                {/* Footer */}
                <div className="border-t border-white/10 bg-white/[0.02] px-6 py-4">
                  <div className="flex items-center justify-between">
                    <p className="font-light text-sm tracking-wide text-white/60">
                      Mostrando <span className="text-white/90">{filteredDoctos.length}</span> documento(s)
                      {filter !== "todos" && (
                        <span className="ml-2 text-purple-400">
                          ({filter === "aplicados" ? "aplicados" : "no aplicados"})
                        </span>
                      )}
                    </p>
                    <p className="font-light text-xs tracking-wide text-white/50">Última actualización: Hoy</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success modal */}
      <SuccessModalInline
        open={successModal.open}
        folio={successModal.folio ?? null}
        doctoId={successModal.doctoId ?? null}
        inserted={successModal.inserted ?? 0}
        onClose={() => setSuccessModal({ open: false, folio: null, doctoId: null, inserted: 0 })}
        onCopy={(text: string) => copyToClipboard(text, toast)}
      />
    </div>
  )
}

// --- Helper modal component and clipboard helper (inline to keep file simple) ---
function SuccessModalInline(props: {
  open: boolean
  folio?: string | null
  doctoId?: string | number | null
  inserted?: number
  onClose: () => void
  onCopy?: (text: string) => void
}) {
  const { open, folio, doctoId, inserted = 0, onClose, onCopy } = props
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-gradient-to-br from-teal-800/95 to-cyan-900/95 p-6 text-white shadow-xl">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-white/6 p-3">
            <svg className="h-8 w-8 text-emerald-300" viewBox="0 0 24 24" fill="none">
              <path d="M5 13l4 4L20 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-semibold">Inventario aplicado</h3>
            <p className="mt-1 text-sm text-white/80">Todo listo. Se aplicó el conteo correctamente.</p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <div className="flex items-center justify-between rounded-md bg-white/6 px-3 py-2">
                <div className="text-xs text-white/80">Folio</div>
                <div className="font-mono text-sm text-white/95">{folio ?? "—"}</div>
              </div>

            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={() => { if (folio && onCopy) onCopy(folio) }}
                className="rounded-md bg-white/8 px-4 py-2 text-sm text-white/90 hover:bg-white/12"
              >
                Copiar folio
              </button>
              <button
                onClick={onClose}
                className="rounded-md bg-white/10 px-4 py-2 text-sm text-white/100 font-semibold hover:bg-white/14"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// clipboard helper used by modal
async function copyToClipboard(text: string, toast: (opts: any) => void) {
  try {
    await navigator.clipboard.writeText(text)
    toast({ title: "Copiado", description: "Folio copiado al portapapeles" })
  } catch (err) {
    console.error("Clipboard error:", err)
    toast({ title: "Error", description: "No se pudo copiar el folio", variant: "destructive" })
  }
}