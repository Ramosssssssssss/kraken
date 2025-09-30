"use client"

import { useEffect, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { TrendingUp, Package, FileText, RefreshCw, LogOut, ArrowLeft, Menu, X, Store } from "lucide-react"
import { useRouter } from "next/navigation"

interface UserData {
  PIKER_ID: number
  NOMBRE: string
  USUARIO: string
  ESTATUS: string
  IMAGEN_COLAB?: string
  IMAGEN_COLAB_MIME?: string
  ROL: string
}

interface CompanyData {
  id: number
  codigo: string
  nombre: string
  apiUrl: string
  branding?: any
}

interface BonoData {
  R_TOTAL_UNI_TRAS?: number
  R_TOTAL_PART_TRAS?: number
  R_TOTAL_DOC_TRAS?: number
  R_TOTAL_SCORE_TRAS?: number
  R_TOTAL_UNI_VENT?: number
  R_TOTAL_PART_VENT?: number
  R_TOTAL_DOC_VENT?: number
  R_TOTAL_SCORE_VENT?: number
  R_TOTAL_UNI_PED?: number
  R_TOTAL_PART_PED?: number
  R_TOTAL_DOC_PED?: number
  R_TOTAL_SCORE_PED?: number
  R_TOTAL_SCORE_GRAL?: number
}

interface MetricsResponse {
  bono: BonoData
  rank: number | null
}

export default function HomePage() {
  const router = useRouter()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [bono, setBono] = useState<BonoData>({})
  const [rank, setRank] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sideMenuVisible, setSideMenuVisible] = useState(false)

  useEffect(() => {
    const storedUser = localStorage.getItem("userData")
    const storedCompany = localStorage.getItem("companyData")

    if (!storedUser || !storedCompany) {
      router.replace("/login")
      return
    }

    const user = JSON.parse(storedUser)
    const company = JSON.parse(storedCompany)

    setUserData(user)
    setCompanyData(company)

    fetchMetrics(company.apiUrl, user.PIKER_ID)
  }, [router])

  const fetchMetrics = async (apiUrl: string, pikerId: number, retries = 5) => {
    let intentos = 0
    const maxIntentos = retries

    while (intentos < maxIntentos) {
      try {
        console.log(`[v0] Intento ${intentos + 1} de ${maxIntentos}: obteniendo métricas...`)

        const response = await fetch(`${apiUrl}/metrics`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ pikerId }),
        })

        const data = await response.json()

        if (response.ok) {
          console.log("[v0] Métricas obtenidas correctamente:", data)
          setBono(data.bono || {})
          setRank(data.rank || null)
          setIsLoading(false)
          setIsRefreshing(false)
          return
        } else {
          console.error("[v0] Error en respuesta de métricas:", data.message || "Respuesta no OK")
        }
      } catch (error) {
        console.error("[v0] Error al obtener métricas:", error)
      }

      intentos++
      if (intentos < maxIntentos) {
        console.log("[v0] Esperando antes de reintentar...")
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }

    console.error("[v0] Se alcanzó el número máximo de intentos para obtener métricas")
    setIsLoading(false)
    setIsRefreshing(false)
  }

  const handleRefresh = () => {
    if (!companyData || !userData) return
    setIsRefreshing(true)
    fetchMetrics(companyData.apiUrl, userData.PIKER_ID)
  }

  const handleLogout = async () => {
    localStorage.removeItem("userData")
    localStorage.removeItem("companyData")
    router.replace("/login")
  }

  const traducirEstatus = (estatus = ""): string => {
    switch (estatus.trim().toUpperCase()) {
      case "A":
        return "ACTIVO"
      case "B":
        return "BAJA"
      case "I":
        return "INACTIVO"
      default:
        return estatus
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400 text-sm">Cargando picking...</p>
        </motion.div>
      </div>
    )
  }

  if (!userData || !companyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400">No se encontraron datos de sesión</p>
          <button
            onClick={() => router.replace("/login")}
            className="mt-4 px-6 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-colors"
          >
            Iniciar sesión
          </button>
        </div>
      </div>
    )
  }

  const getAvatarUrl = () => {
    if (userData.IMAGEN_COLAB && userData.IMAGEN_COLAB_MIME) {
      return `data:${userData.IMAGEN_COLAB_MIME};base64,${userData.IMAGEN_COLAB}`
    }
    return null
  }

  const estatusTexto = traducirEstatus(userData.ESTATUS)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 pb-32">
      {/* Side Menu */}
      <AnimatePresence>
        {sideMenuVisible && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSideMenuVisible(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-gradient-to-br from-gray-900 to-black border-r border-white/10 z-50 p-6"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold text-white">Menú</h2>
                <button
                  onClick={() => setSideMenuVisible(false)}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400" />
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    setSideMenuVisible(false)
                    router.push("/dashboard")
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/5 text-gray-300 hover:text-white transition-colors"
                >
                  <Package className="w-5 h-5" />
                  <span>Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    setSideMenuVisible(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-500/10 text-gray-300 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Cerrar sesión</span>
                </button>
              </div>

              <div className="absolute bottom-6 left-6 right-6">
                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-gray-400 mb-1">Usuario</p>
                  <p className="text-white font-medium">{userData.NOMBRE}</p>
                  <p className="text-xs text-gray-500 mt-1">@{userData.USUARIO}</p>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="sticky top-0 z-30 backdrop-blur-xl bg-black/40 border-b border-white/5"
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSideMenuVisible(true)}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center hover:scale-105 transition-transform"
              >
                <Menu className="w-6 h-6 text-white" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-white">KRAKEN</h1>
                <p className="text-xs text-gray-500">Fyttsa</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-3 hover:bg-white/5 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-400" />
              </button>
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-3 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 text-gray-400 ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              <button onClick={handleLogout} className="p-3 hover:bg-red-500/10 rounded-lg transition-colors">
                <LogOut className="w-5 h-5 text-gray-400 hover:text-red-400" />
              </button>
            </div>
          </div>

          {/* Quick Stats Bar */}
          <div className="flex items-center justify-around py-3 px-4 rounded-xl bg-gradient-to-r from-white/5 to-white/[0.02] border border-white/10">
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                {bono.R_TOTAL_SCORE_GRAL || "0"}
              </p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold text-white-400">{rank ? `#${rank}` : "N/A"}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Ranking</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="text-center">
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent"> {estatusTexto}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Estado</p>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* User Profile Card */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/10" />
          <div className="relative flex items-center gap-6">
            <div className="relative">
              {getAvatarUrl() ? (
                <img
                  src={getAvatarUrl()! || "/placeholder.svg"}
                  alt={userData.NOMBRE}
                  className="w-20 h-20 rounded-2xl object-cover ring-4 ring-blue-500/20"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-2xl font-bold text-white">
                  {userData.NOMBRE.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-4 border-black" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{userData.NOMBRE}</h2>
              <p className="text-gray-400 text-sm mb-2">@{userData.USUARIO}</p>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium border border-blue-500/20">
                  Picker ID: {userData.PIKER_ID}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Section Title */}
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">Rendimiento</h3>
          <p className="text-gray-400 text-sm">Estadísticas de productividad</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Traspasos Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 hover:border-blue-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-6 h-6 text-blue-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{bono.R_TOTAL_SCORE_TRAS || "0"}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">pts</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">Traspasos</h3>
              <div className="space-y-3 p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Unidades</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_UNI_TRAS || "0"}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Partidas</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_PART_TRAS || "0"}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Documentos</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_DOC_TRAS || "0"}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Ventanilla Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 hover:border-purple-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Store className="w-6 h-6 text-purple-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{bono.R_TOTAL_SCORE_VENT || "0"}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">pts</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">Ventanilla</h3>
              <div className="space-y-3 p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Unidades</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_UNI_VENT || "0"}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Partidas</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_PART_VENT || "0"}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Documentos</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_DOC_VENT || "0"}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Pedidos Card */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10 p-6 hover:border-green-500/30 transition-all duration-300"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText className="w-6 h-6 text-green-400" />
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-white">{bono.R_TOTAL_SCORE_PED || "0"}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">pts</p>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-white mb-4">Pedidos</h3>
              <div className="space-y-3 p-4 rounded-xl bg-black/20 border border-white/5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Unidades</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_UNI_PED || "0"}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Partidas</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_PART_PED || "0"}</span>
                </div>
                <div className="h-px bg-white/5" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Documentos</span>
                  <span className="font-bold text-white">{bono.R_TOTAL_DOC_PED || "0"}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <motion.nav
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30"
      >
        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          <button
            onClick={() => router.push(`/traspasos?piker=${userData.PIKER_ID}&nombre=${userData.NOMBRE}`)}
            className="flex flex-col items-center gap-2 px-4 py-2 rounded-xl hover:bg-blue-500/10 text-gray-400 hover:text-blue-400 transition-colors"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-xs font-semibold">Traspasos</span>
          </button>
          <div className="w-px h-12 bg-white/10" />
          <button
            onClick={() => router.push(`/picking/ventanilla?piker=${userData.PIKER_ID}&nombre=${userData.NOMBRE}`)}
            className="flex flex-col items-center gap-2 px-4 py-2 rounded-xl hover:bg-purple-500/10 text-gray-400 hover:text-purple-400 transition-colors"
          >
            <Store className="w-6 h-6" />
            <span className="text-xs font-semibold">Ventanilla</span>
          </button>
          <div className="w-px h-12 bg-white/10" />
          <button
            onClick={() => router.push(`/picking/pedidos?piker=${userData.PIKER_ID}&nombre=${userData.NOMBRE}`)}
            className="flex flex-col items-center gap-2 px-4 py-2 rounded-xl hover:bg-green-500/10 text-gray-400 hover:text-green-400 transition-colors"
          >
            <FileText className="w-6 h-6" />
            <span className="text-xs font-semibold">Pedidos</span>
          </button>
        </div>
      </motion.nav>
    </div>
  )
}
