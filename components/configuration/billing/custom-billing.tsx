"use client"

import { Wrench } from "lucide-react"

export function BillingCustomBilling() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">Facturación Personalizados</h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">
          Configuración de facturación personalizados
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Wrench className="mx-auto h-12 w-12 text-white/30" />
        <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Facturación Personalizados</h5>
        <p className="mt-2 text-sm font-light tracking-wide text-white/50">
          Crea facturación personalizados para tu sistema
        </p>
      </div>
    </div>
  )
}
