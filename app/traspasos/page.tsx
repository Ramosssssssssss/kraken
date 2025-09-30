"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowLeft, Search, X, Package, Calendar, Clock, ArrowRight, RefreshCw, User } from "lucide-react"

type Pendiente = {
  TRASPASO_IN_ID: string
  FOLIO: string
  ALMACEN: string
  FECHA: string
  HORA: string
}

export default function TraspasosPage() {
  const [data, setData] = useState<Pendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [modalErrorVisible, setModalErrorVisible] = useState(false)
  const [mensajeError, setMensajeError] = useState("Este traspaso ya fue tomado o sigue en proceso.")

  const router = useRouter()
  const { apiUrl } = useCompany()

  // Get user data from localStorage
  const [userData, setUserData] = useState<any>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedUser = localStorage.getItem("userData")
      if (storedUser) {
        setUserData(JSON.parse(storedUser))
      }
    }
  }, [])

  const fetchPendientes = async () => {
    try {
      const res = await fetch(`${apiUrl}/traspasos`)
      const json = await res.json()

      if (Array.isArray(json.pendientes)) {
        setData(json.pendientes)
      } else {
        console.warn("pendientes no es un array:", json.pendientes)
        setData([])
      }
    } catch (error) {
      console.error("Error obteniendo traspasos:", error)
      setData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const limpiarFolio = (folio: string) => {
    const match = folio.match(/^([A-Z]+)0*([0-9]+)$/)
    if (match) {
      return `${match[1]}${match[2]}`
    }
    return folio
  }

  const handleCardPress = async (traspasoInId: string, folio: string, almacen: string) => {
    setLoadingDetalle(true)
    const ahora = new Date()
    const fechaIni = ahora.toISOString().split("T")[0]
    const horaIni = ahora.toTimeString().split(" ")[0].slice(0, 5)

    try {
      const res = await fetch(`${apiUrl}/tras-detalle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ traspasoInId }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        console.error("Error al obtener detalle:", errorText)
        setMensajeError("No se pudo obtener el detalle del traspaso.")
        setModalErrorVisible(true)
        setLoadingDetalle(false)
        return
      }

      const json = await res.json()
      console.log("Detalles obtenidos:", json)

      const updateRes = await fetch(`${apiUrl}/traspaso-tomado`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          traspasoInId,
          pikerId: userData?.PIKER_ID,
          fechaIni,
          horaIni,
        }),
      })

      if (!updateRes.ok) {
        const errorText = await updateRes.text()
        console.error("Error al tomar traspaso:", errorText)
        setMensajeError("No se pudo tomar el traspaso.")
        setModalErrorVisible(true)
        setLoadingDetalle(false)
        return
      }

      const updateData = await updateRes.json()
      console.log("Traspaso tomado:", updateData.message)

      // Navigate to picking screen with details
      const articulosEncoded = btoa(JSON.stringify(json.detalles))
     router.push(
  `/traspasosScreen/${traspasoInId}?articulos=${encodeURIComponent(
    articulosEncoded
  )}&piker=${userData?.PIKER_ID}&nombre=${userData?.NOMBRE}&folio=${limpiarFolio(
    folio
  )}&ALMACEN=${almacen}`
)
    } catch (err: any) {
      console.error("Error en el proceso:", err)
      setMensajeError(err?.message || "Este traspaso ya fue tomado o sigue en proceso.")
      setModalErrorVisible(true)
    } finally {
      setLoadingDetalle(false)
    }
  }

  useEffect(() => {
    fetchPendientes()
  }, [])

  const filteredData = data.filter((item) => limpiarFolio(item.FOLIO).toLowerCase().includes(searchTerm.toLowerCase()))

  if (loading || loadingDetalle) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
        >
          <RefreshCw className="w-12 h-12 text-white" />
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        className="sticky top-0 z-50 backdrop-blur-xl bg-black/80 border-b border-white/10"
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={() => router.back()} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Traspasos</h1>
          <button
            onClick={() => {
              setRefreshing(true)
              fetchPendientes()
            }}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-6 h-6 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </motion.header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white to-white/80 flex items-center justify-center shadow-lg shadow-white/20">
              <User className="w-8 h-8 text-black" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-white/60 tracking-wider uppercase">Piker Activo</p>
              <h2 className="text-xl font-bold mt-1">{userData?.NOMBRE || "Usuario"}</h2>
              <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-white/10 border border-white/20">
                <span className="text-xs font-bold tracking-wide">ID: {userData?.PIKER_ID || "N/A"}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60" />
            <input
              type="text"
              placeholder="Buscar TC..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-12 py-4 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 focus:border-white/30 focus:outline-none transition-colors text-white placeholder:text-white/40"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </motion.div>

        {/* Traspasos List */}
        <div className="space-y-4">
          <AnimatePresence>
            {filteredData.map((item, index) => {
              const fechaFormateada = new Date(item.FECHA).toLocaleDateString("es-ES")

              return (
                <motion.div
                  key={item.TRASPASO_IN_ID}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleCardPress(item.TRASPASO_IN_ID, item.FOLIO, item.ALMACEN)}
                  className="group cursor-pointer"
                >
                  <div className="rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 overflow-hidden hover:border-white/30 transition-all duration-300">
                    {/* Card Header */}
                    <div className="px-6 py-4 bg-black/40 border-b border-white/10 flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-black tracking-wide">{limpiarFolio(item.FOLIO)}</h3>
                        <div className="h-0.5 w-20 bg-white mt-1" />
                      </div>
                      <div className="w-3 h-3 rounded-full bg-white shadow-lg shadow-white/50" />
                    </div>

                    {/* Card Body */}
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                          <Package className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white/60 tracking-wider uppercase">Almacén</p>
                          <p className="text-base font-semibold mt-0.5">{item.ALMACEN}</p>
                        </div>
                      </div>

                      <div className="h-px bg-white/10 ml-14" />

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                          <Calendar className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white/60 tracking-wider uppercase">Fecha</p>
                          <p className="text-base font-semibold mt-0.5">{fechaFormateada}</p>
                        </div>
                      </div>

                      <div className="h-px bg-white/10 ml-14" />

                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-bold text-white/60 tracking-wider uppercase">Hora</p>
                          <p className="text-base font-semibold mt-0.5">{item.HORA}</p>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-4 bg-black/60 border-t border-white/10 flex items-center justify-between">
                      <span className="text-sm font-bold tracking-wide">PROCESAR TRASPASO</span>
                      <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg shadow-white/30 group-hover:scale-110 transition-transform">
                        <ArrowRight className="w-4 h-4 text-black" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredData.length === 0 && !refreshing && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-20"
          >
            <div className="p-8 rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 text-center max-w-md">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-bold mb-2">Sin Traspasos</h3>
              <p className="text-white/60 mb-6 leading-relaxed">
                {searchTerm
                  ? "No se encontraron traspasos con ese folio"
                  : "No hay traspasos disponibles en este momento"}
              </p>
              <button
                onClick={() => {
                  setRefreshing(true)
                  fetchPendientes()
                }}
                className="px-8 py-3 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform shadow-lg shadow-white/20"
              >
                ACTUALIZAR
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Error Modal */}
      <AnimatePresence>
        {modalErrorVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm"
            onClick={() => setModalErrorVisible(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.02] backdrop-blur-xl border border-white/20"
            >
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">⚠️</div>
                <h3 className="text-xl font-bold tracking-wide">ERROR</h3>
              </div>
              <p className="text-white/80 text-center mb-8 leading-relaxed">{mensajeError}</p>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setModalErrorVisible(false)
                    setRefreshing(true)
                    fetchPendientes()
                  }}
                  className="flex-1 py-4 rounded-xl bg-white text-black font-bold hover:scale-105 transition-transform shadow-lg shadow-white/20"
                >
                  REINTENTAR
                </button>
                <button
                  onClick={() => setModalErrorVisible(false)}
                  className="flex-1 py-4 rounded-xl bg-white/10 border border-white/20 text-white/80 font-semibold hover:bg-white/20 transition-colors"
                >
                  CANCELAR
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
