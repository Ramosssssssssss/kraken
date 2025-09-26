"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User, Loader2, CheckCircle } from "lucide-react"
import { useCompany } from "@/lib/company-context"
import { useRouter } from "next/navigation"
function setTenantCookies(tenant: string, apiUrl: string) {
  // cookie corta (5 min) para el brinco de subdominio
  const exp = new Date(Date.now() + 5 * 60 * 1000).toUTCString()
  document.cookie = `tenant=${tenant}; domain=.krkn.mx; path=/; expires=${exp}; SameSite=Lax`
  document.cookie = `apiUrl=${encodeURIComponent(apiUrl)}; domain=.krkn.mx; path=/; expires=${exp}; SameSite=Lax`
}

interface CompanyAccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CompanyAccessModal({ isOpen, onClose }: CompanyAccessModalProps) {
  const [companyCode, setCompanyCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const company = useCompany()

  // Don't render modal if context isn't ready
  if (!company.isReady) {
    return null
  }

const router = useRouter()
const { setCompanyData } = company
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setError("")

  const code = companyCode.trim().toLowerCase()
  if (!code) {
    setError("Ingresa un código de empresa.")
    return
  }

  setIsLoading(true)

  try {
    const response = await fetch("https://picking-backend.onrender.com/check-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ empresa: code }),
    })

    const data = await response.json()

    if (response.ok && data?.ok && data?.cliente) {
      // persistimos en context + localStorage
      setCompanyData(data.cliente)
      try {
        localStorage.setItem("companyData", JSON.stringify(data.cliente))
      } catch {}

      // cookies de apoyo para el subdominio
      setTenantCookies(data.cliente.codigo, data.cliente.apiUrl)

      console.log("[v0] Company validated:", data.cliente.codigo)
      console.log("[v0] API URL stored globally:", data.cliente.apiUrl)

      setIsSuccess(true)

      // navega con router; https y subdominio en minúsculas
      const tenant = data.cliente.codigo.toLowerCase()
      setTimeout(() => {
        router.push(`https://${tenant}.krkn.mx/login`)
      }, 800)
    } else {
      setError(data?.message || "Código de empresa incorrecto. Intenta nuevamente.")
    }
  } catch (err) {
    console.error("[v0] Error validating company:", err)
    setError("Error de conexión. Intenta nuevamente.")
  } finally {
    setIsLoading(false)
  }
}

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 80% 20%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                           radial-gradient(circle at 40% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%)`,
        }}
      />

      <div className="relative bg-gray-800/90 backdrop-blur-sm border border-gray-700/50 rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4 animate-in fade-in-0 zoom-in-95 duration-300">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-4 relative">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-800 via-purple-900 to-indigo-900 p-1">
              <div className="w-full h-full rounded-full bg-gray-900 flex items-center justify-center">
                <img src="/kraken6.png" alt="Kraken Logo" className="w-14 h-14 object-contain" />
              </div>
            </div>
          </div>

          <h1 className="text-3xl font-bold text-white mb-2 tracking-wider">KRKN</h1>
          <p className="text-gray-400 text-sm text-center">
            Para acceder a tu plataforma, debes contar con el código de tu empresa
          </p>
        </div>

        {isSuccess ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-white text-lg font-semibold mb-2">¡Empresa Validada!</h3>
              <p className="text-gray-400 text-sm">Redirigiendo al login...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-white text-sm font-medium">Código de Empresa</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Ingresa tu código de empresa"
                  value={companyCode}
                  onChange={(e) => {
                    setCompanyCode(e.target.value)
                    setError("")
                  }}
                  className="w-full bg-gray-700/50 border-gray-600 text-white placeholder-gray-400 pl-10 py-3 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  autoFocus
                  disabled={isLoading}
                />
              </div>
            </div>

            {error && <p className="text-red-400 text-sm text-center">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Validando...
                </>
              ) : (
                "ENTRAR"
              )}
            </Button>
          </form>
        )}

        {!isSuccess && (
          <div className="mt-6 text-center space-y-2">
            <button className="text-gray-400 text-sm hover:text-white transition-colors">
              ¿Olvidaste tu contraseña?
            </button>
            <div className="text-gray-400 text-sm">
              ¿No tienes cuenta?{" "}
              <button className="text-purple-400 hover:text-purple-300 transition-colors">Regístrate</button>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">© 2025 KRKN - Desde las profundidades del océano digital</p>
        </div>
      </div>
    </div>
  )
}
