"use client"

import { PackagePlusIcon } from "lucide-react"

export default function EmbarquesSection() {
  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white/95 tracking-tight">EMBARQUES</h2>

      {/* Placeholder content */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 rounded-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-500/20 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-blue-400/30 mx-auto mb-6">
                <PackagePlusIcon className="w-10 h-10 text-blue-300" />
              </div>
              <h3 className="text-xl font-semibold text-white/95 mb-3 tracking-tight">Módulo de Embarques</h3>
              <p className="text-gray-300/80">Funcionalidad en desarrollo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
