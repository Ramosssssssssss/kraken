"use client"

import { Sliders } from "lucide-react"

export function ConfigAdvanced() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">Configuraciones Avanzadas</h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">Configuración avanzada del sistema</p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Sliders className="mx-auto h-12 w-12 text-white/30" />
        <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Configuraciones Avanzadas</h5>
        <p className="mt-2 text-sm font-light tracking-wide text-white/50">Opciones avanzadas para usuarios expertos MODULADO CORRECTO</p>
      </div>
    </div>
  )
}
