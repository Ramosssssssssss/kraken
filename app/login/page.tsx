"use client"

import type React from "react"
import { useState } from "react"
import { Eye, EyeOff, User, Lock } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    const validUsers = [
      { email: "MAR", password: "1" },
      { email: "MIGUEL", password: "1" },
    ]

    const user = validUsers.find(
      (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
    )

    if (user) {
      window.location.href = "/dashboard"
    } else {
      setError("Usuario o contraseña incorrectos")
    }
  }

  return (
    <>
      <div className="min-h-screen bg-black flex">
        {/* Panel izquierdo */}
        <div className="flex-[3] flex items-center justify-center p-8 relative overflow-hidden">
          {/* Partículas */}
          <div className="absolute inset-0">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 2}s`,
                }}
              />
            ))}
          </div>

          {/* Fondo fondo7  opcion */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Image
              src="OFICIAL.jpg"
              alt="3D Octopus"
              fill
              className="object-cover"
              style={{
                filter: "drop-shadow(0 0 30px rgba(43, 21, 85, 0.74))",
              }}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="w-px bg-gradient-to-b from-transparent via-blue-500/30 to-transparent relative">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent animate-pulse" />
        </div>

        {/* Panel derecho */}
        <div className="flex-[1] flex flex-col p-8">
          {/* Formulario centrado verticalmente */}
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-xs space-y-8">
              {/* Logo KRKN */}
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <Image
                    src="/logogm.png"
                    alt="Kraken Logo"
                    width={100}
                    height={100}
                  />
                </div>
                <p className="text-gray-500 text-3xl mt-2 font-bold">
                  Inicia Sesión
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-gray-300 text-sm font-medium"
                  >
                    Email
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                      id="email"
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@krkn.com"
                      className="w-full bg-gray-900/80 border border-gray-800 rounded-lg px-10 py-3 text-gray-200 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:border-transparent"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-gray-300 text-sm font-medium"
                  >
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
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-300"
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="text-red-400 text-sm text-center">{error}</div>
                )}

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-700 hover:to-gray-800 text-gray-200 font-medium py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 group border border-gray-700"
                >
                  ENTRAR
                </button>
              </form>

              <div className="text-center space-y-3">
                <button className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
            </div>
          </div>

          {/* Logo BS fijo abajo */}
          <div className="flex justify-center mt-auto">
            <Image
              src="/testbs.png"
              alt="BS Logo"
              width={40}
              height={20}
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </>
  )
}