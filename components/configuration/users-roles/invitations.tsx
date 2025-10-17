"use client"

import { UserPlus } from "lucide-react"

export function Invitations() {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">Solicitudes Pendientes</h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">Usuarios pendientes de aprobación</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <UserPlus className="mx-auto h-12 w-12 text-white/30" />
        <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">No hay solicitudes pendientes</h5>
        <p className="mt-2 text-sm font-light tracking-wide text-white/50">Todas las solicitudes han sido procesadas</p>
                <p className="mt-2 text-sm font-light tracking-wide text-white/50">MODULADO CORRECTO</p>

      </div>
    </div>
  )
}
