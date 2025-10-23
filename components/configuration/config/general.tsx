"use client"

import { Palette } from "lucide-react"
import BrandingConfig from "../../dashboard/branding-config"

export function ConfigGeneral() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-4 border-b border-white/10">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-white">Personalización</h2>
          <p className="text-sm text-white/40">Configura la identidad visual de tu aplicación</p>
        </div>
      </div>

      {/* Branding Section */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <Palette className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">Branding</h3>
            <p className="text-sm text-white/50">Personaliza el logo y fondo de la pantalla de login</p>
          </div>
        </div>

        <BrandingConfig />
      </div>

      {/* Footer Info */}
      <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10">
        <p className="text-sm text-white/60 text-center">
          Los cambios se aplicarán inmediatamente en toda la aplicación
        </p>
      </div>
    </div>
  )
}
