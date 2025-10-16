"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { ArrowLeft, Package, Loader2, AlertCircle, Calendar, FileText, Hash, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

type DoctoInvfis = {
  FECHA: string
  FOLIO: string
  DESCRIPCION: string
}

export default function AplicarInvPage() {
  const router = useRouter()
  const { apiUrl } = useCompany()
  const { toast } = useToast()

  const [doctos, setDoctos] = useState<DoctoInvfis[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [applyingFolio, setApplyingFolio] = useState<string | null>(null)

  useEffect(() => {
    if (!apiUrl) return

    const fetchDoctos = async () => {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`${apiUrl}/doctos-invfis-semana`)
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

    fetchDoctos()
  }, [apiUrl])

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
        toast({
          title: "Éxito",
          description: `Inventario aplicado correctamente para el folio ${folio}`,
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 font-sans">
      {/* Header */}
      <div className="glass sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 rounded-xl bg-white/80 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-sm hover:bg-white/90 transition-all duration-200"
                onClick={() => router.push("/dashboard")}
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-800 to-purple-600 flex items-center justify-center">
                  <Package className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-semibold text-slate-900">Aplicar Inventario</h1>
                  <p className="text-md text-slate-500">Documentos de la semana actual</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Cargando documentos...</p>
          </div>
        ) : error ? (
          <div className="glass rounded-2xl p-8 border border-red-200/50 bg-red-50/80">
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-900">Error</h3>
            </div>
            <p className="text-red-700">{error}</p>
          </div>
        ) : doctos.length === 0 ? (
          <div className="glass rounded-2xl p-12 border border-white/20 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 mb-2">No hay documentos</h3>
            <p className="text-slate-500">No se encontraron documentos de inventario para esta semana</p>
          </div>
        ) : (
          <div className="glass rounded-2xl border border-white/20 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-purple-800 to-purple-700 text-white">
                    <th className="px-6 py-4 text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Fecha
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4" />
                        Folio
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Descripción
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left font-semibold">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {doctos.map((docto, index) => (
                    <tr
                      key={`${docto.FOLIO}-${index}`}
                      className="border-b border-white/20 hover:bg-purple-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-700 font-medium">{formatDate(docto.FECHA)}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-lg bg-purple-100 text-purple-900 font-semibold text-sm">
                          {docto.FOLIO}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">{docto.DESCRIPCION || "—"}</td>
                      <td className="px-6 py-4">
                        <Button
                          onClick={() => handleAplicarInventario(docto.FOLIO)}
                          disabled={applyingFolio === docto.FOLIO}
                          className="bg-gradient-to-r from-purple-800 to-purple-600 hover:from-purple-700 hover:to-purple-500 text-white"
                          size="sm"
                        >
                          {applyingFolio === docto.FOLIO ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Aplicando...
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Aplicar Inventario
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50/80 px-6 py-4 border-t border-white/20">
              <p className="text-sm text-slate-600">
                Total de documentos: <span className="font-semibold text-slate-900">{doctos.length}</span>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
