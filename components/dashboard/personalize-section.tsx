"use client"

import { useState } from "react"
import { Palette, Users, ArrowRight, Sparkles } from "lucide-react"
import UploadAvatares from "./upload-avatares"
import BrandingConfig from "./branding-config"
type Section = "menu" | "branding" | "avatares"

export default function PersonalizePage() {
  const [activeSection, setActiveSection] = useState<Section>("menu")

  if (activeSection === "branding") {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActiveSection("menu")}
            className="mb-6 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            ← Volver al menú
          </button>
          <BrandingConfig />
        </div>
      </div>
    )
  }

  if (activeSection === "avatares") {
    return (
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-7xl mx-auto">
          <button
            onClick={() => setActiveSection("menu")}
            className="mb-6 text-white/60 hover:text-white transition-colors flex items-center gap-2 text-sm"
          >
            ← Volver al menú
          </button>
          <UploadAvatares />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-6xl w-full">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-4">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span className="text-sm text-white/80">Centro de Personalización</span>
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">
            ¿Qué deseas
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              {" "}
              personalizar
            </span>
            ?
          </h1>
          <p className="text-lg text-white/60 max-w-2xl mx-auto">
            Configura la identidad visual de tu aplicación y gestiona los avatares de tu equipo
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 focus-within:gap-8">
          {/* Branding Card */}
          <button
            onClick={() => setActiveSection("branding")}
            className="group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-white/10 rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:border-white/20 hover:shadow-2xl hover:shadow-blue-500/20"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-500" />

            {/* Content */}
            <div className="relative z-10 space-y-6">
              <div className="flex items-start justify-between">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl group-hover:bg-blue-500/20 transition-colors">
                  <Palette className="w-8 h-8 text-blue-400" />
                </div>
                <ArrowRight className="w-6 h-6 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div>

              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">Branding</h2>
                <p className="text-white/60 leading-relaxed">
                  Personaliza el logo y fondo de la pantalla de login. Define la identidad visual de tu aplicación.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-blue-400">
                <span>Configurar branding</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl group-hover:bg-blue-500/30 transition-all" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all" />
          </button>

          {/* Avatares Card */}
          {/* <button
            onClick={() => setActiveSection("avatares")}
            className="group relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-white/10 rounded-3xl p-8 text-left transition-all hover:scale-[1.02] hover:border-white/20 hover:shadow-2xl hover:shadow-purple-500/20"
          >
            {/* Animated Background */}
            {/* <div className="absolute inset-0 bg-gradient-to-br from-purple-500/0 to-pink-500/0 group-hover:from-purple-500/5 group-hover:to-pink-500/5 transition-all duration-500" /> */}

            {/* Content */}
            {/* <div className="relative z-10 space-y-6">
              <div className="flex items-start justify-between">
                <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl group-hover:bg-purple-500/20 transition-colors">
                  <Users className="w-8 h-8 text-purple-400" />
                </div>
                <ArrowRight className="w-6 h-6 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </div> */}
{/* 
              <div className="space-y-3">
                <h2 className="text-2xl font-bold text-white">Avatares</h2>
                <p className="text-white/60 leading-relaxed">
                  Gestiona hasta 5 avatares personalizados para tu equipo. Crea una galería visual única.
                </p>
              </div>

              <div className="flex items-center gap-2 text-sm text-purple-400">
                <span>Gestionar avatares</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Decorative Elements */}
            {/* <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl group-hover:bg-purple-500/30 transition-all" />
            <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl group-hover:bg-pink-500/30 transition-all" />
          </button>  */}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <p className="text-sm text-white/40">Los cambios se aplicarán inmediatamente en toda la aplicación</p>
        </div>
      </div>
    </div>
  )
}
