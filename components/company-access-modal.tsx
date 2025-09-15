// app/components/company-access-modal.tsx
"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { User } from "lucide-react"

interface CompanyAccessModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CompanyAccessModal({ isOpen, onClose }: CompanyAccessModalProps) {
  const [companyCode, setCompanyCode] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const code = companyCode.trim().toLowerCase();

    // Acepta ambos (incluyo "goumam" por si ese era el correcto en tu caso)
    const allowed = new Set(["demo", "goumam", "fyttsa"]);

    if (!code) {
      setError("Ingresa un código de empresa.");
      return;
    }

    if (allowed.has(code)) {
      window.location.href = `http://${code}.krkn.mx/login`;
    } else {
      setError("Código de empresa incorrecto. Intenta nuevamente.");
    }
  };


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
              />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-800 to-indigo-900 hover:from-purple-900 hover:to-indigo-950 text-white font-semibold py-3 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
          >
            ENTRAR
          </Button>
        </form>

        <div className="mt-6 text-center space-y-2">
          <button className="text-gray-400 text-sm hover:text-white transition-colors">
            ¿Olvidaste tu contraseña?
          </button>
          <div className="text-gray-400 text-sm">
            ¿No tienes cuenta?{" "}
            <button className="text-purple-400 hover:text-purple-300 transition-colors">Regístrate</button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">© 2024 KRKN - Desde las profundidades del océano digital</p>
        </div>
      </div>
    </div>
  )
}
