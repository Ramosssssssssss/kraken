"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { Eye, EyeOff, User, Lock, Loader2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"
import { parseModulesCSV } from "@/lib/parse-mods"
function getTenantFromHost(hostname: string) {
  const parts = hostname.split(".")
  return parts.length >= 3 ? (parts[0] || "").toLowerCase() : null
}

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const [customLogo, setCustomLogo] = useState<string | null>(null)
  const [customBackground, setCustomBackground] = useState<string | null>(null)
  const [brandingLoaded, setBrandingLoaded] = useState(false)

  const { companyData, apiUrl: apiUrlFromCtx, isReady, setUserData } = useCompany()

  const derivedApiUrl = useMemo(() => {
    if (apiUrlFromCtx) return apiUrlFromCtx
    if (typeof window === "undefined") return null
    const tenant = getTenantFromHost(window.location.hostname)
    return null
  }, [apiUrlFromCtx])

  useEffect(() => {
    const fetchBranding = async () => {
      if (!companyData?.codigo || !derivedApiUrl) {
        setBrandingLoaded(true)
        return
      }

      // const brandingUrl = `${derivedApiUrl}/get-branding/${companyData.codigo}`

      try {
        // const response = await fetch(brandingUrl)
        // const data = await response.json()

        // if (data.ok && data.branding) {
        //   if (data.branding.logo) {
        //     setCustomLogo(data.branding.logo)
        //   }
        //   if (data.branding.background) {
        //     setCustomBackground(data.branding.background)
        //   }
        // }
      } catch (error) {
        console.error("Error fetching branding:", error)
      } finally {
        setBrandingLoaded(true)
      }
    }

    if (isReady) {
      fetchBranding()
    }
  }, [companyData, derivedApiUrl, isReady])

  const particles = useMemo(
    () =>
      Array.from({ length: 20 }).map(() => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: `${Math.random() * 3}s`,
        duration: `${2 + Math.random() * 2}s`,
      })),
    [],
  )

const MAX_RETRIES = 3
const RETRY_DELAY_MS = 1000 // 1 segundo

// Función para esperar entre reintentos
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Fetch con reintentos
const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      // Solo reintenta si hay error de red, no si el status es 401, 400, etc.
      if (!response.ok && response.status >= 500) {
        throw new Error(`Error del servidor: ${response.status}`)
      }
      return response
    } catch (error) {
      if (i < retries - 1) {
        console.warn(`Intento ${i + 1} fallido. Reintentando en ${RETRY_DELAY_MS}ms...`)
        await delay(RETRY_DELAY_MS)
      } else {
        throw error // después de los reintentos, lanza el error
      }
    }
  }
  throw new Error("No se pudo completar la solicitud después de varios intentos.")
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")
  setIsLoading(true)

  const apiUrl = derivedApiUrl

  if (!apiUrl) {
    setError("No se pudo obtener la URL de la API para este subdominio.")
    setIsLoading(false)
    return
  }

  if (!email || !password) {
    setError("Usuario y contraseña son requeridos")
    setIsLoading(false)
    return
  }

  try {
    const response = await fetchWithRetry(`${apiUrl}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: email, password }),
    })

    const data = await response.json()

    if (response.ok && data.message === "✅ Login exitoso") {
      const modulosArr = parseModulesCSV(data.user?.MODULOS_KRKN)
      const userDataToSave = {
        ...data.user,
        user: email,
        password: password,
        MODULOS_KRKN: data.user?.MODULOS_KRKN ?? null,
        modulosKrknArr: modulosArr,
      }
      setUserData(userDataToSave)

      router.replace("/dashboard")
    } else {
      setError(data.message || "Credenciales inválidas")
    }
  } catch (err) {
    console.error("Login error:", err)
    setError("Error de conexión. Intenta nuevamente.")
  } finally {
    setIsLoading(false)
  }
}

  if (!isReady || !brandingLoaded) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-black flex">
        {/* Panel izquierdo */}
        <div className="flex-[3] flex items-center justify-center p-8 relative overflow-hidden">
          {/* Partículas */}
          <div className="absolute inset-0">
            {particles.map((p, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
                style={{
                  left: p.left,
                  top: p.top,
                  animationDelay: p.delay,
                  animationDuration: p.duration,
                }}
              />
            ))}
          </div>

          <div className="absolute inset-0 flex items-center justify-center">
            {customBackground ? (
              <img
                src={customBackground || "/placeholder.svg"}
                alt="Custom Background"
                className="w-full h-full object-cover"
                style={{ filter: "drop-shadow(0 0 30px rgba(43, 21, 85, 0.74))" }}
              />
            ) : (
              <Image
                src="/test.jpg"
                alt="3D Octopus"
                fill
                className="object-cover"
                style={{ filter: "drop-shadow(0 0 30px rgba(43, 21, 85, 0.74))" }}
              />
            )}
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-blue-500/30 to-transparent relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse" />
        </div>

        {/* Panel derecho */}
        <div className="flex-[1] flex flex-col p-8">
          {/* Form */}
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs space-y-8">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  {customLogo ? (
                    <img
                      src={customLogo || "/placeholder.svg"}
                      alt="Company Logo"
                      className="w-[100px] h-[100px] object-contain"
                    />
                  ) : (
                    <Image src="/FYTTSA.png" alt="Kraken Logo" width={100} height={100} />
                  )}
                </div>
                <p className="text-gray-500 text-3xl mt-2 font-bold">Inicia Sesión</p>
                {companyData && <p className="text-gray-400 text-sm">{companyData.nombre}</p>}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-gray-300 text-sm font-medium">
                    Usuario
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ingresa tu usuario"
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-10 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-gray-300 text-sm font-medium">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-10 py-3 pr-12 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {error && <div className="text-red-400 text-sm text-center">{error}</div>}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-gray-200 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group border border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Iniciando sesión...
                    </>
                  ) : (
                    "ENTRAR"
                  )}
                </button>
              </form>
{/* FUNCION DE REESTABLECER CONTRASEÑA PROXIMA
              <div className="text-center space-y-3">
                <button className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
 */}
              {(apiUrlFromCtx || derivedApiUrl) && (
                <div className="text-center">
                  <p className="text-gray-600 text-xs">API: {apiUrlFromCtx || derivedApiUrl}</p>
                </div>
              )}
            </div>
          </div>

          {/* Logo BS fijo abajo */}
          <div className="flex justify-center mt-auto">
            <Image src="/testbs.png" alt="BS Logo" width={40} height={20} className="object-contain" />
          </div>
        </div>
      </div>
    </>
  )
}
