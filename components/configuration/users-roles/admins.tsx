"use client"

import { Plus, Edit2, Trash2, Shield, Mail, Calendar } from "lucide-react"
import { MOCK_ADMINS } from "../mock-data"

interface AdminsProps {
  searchQuery: string
}

export function Admins({ searchQuery }: AdminsProps) {
  const filteredAdmins = MOCK_ADMINS.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Administradores del Sistema</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            {filteredAdmins.length} administrador(es) con acceso privilegiado modulado correcto
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-light tracking-wide text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50">
          <Plus className="h-4 w-4" />
          Nuevo Administrador
        </button>
      </div>

      <div className="grid gap-4">
        {filteredAdmins.map((admin) => (
          <div
            key={admin.id}
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/40">
                  <Shield className="h-7 w-7 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h5 className="text-lg font-light tracking-wide text-white/90">{admin.name}</h5>
                    <span className="rounded-lg bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
                      {admin.role}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-light text-white/60">
                    <Mail className="h-3.5 w-3.5" />
                    {admin.email}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {admin.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-light tracking-wide text-white/70"
                      >
                        {perm === "all" ? "Acceso Total" : perm}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-light text-white/50">
                    <Calendar className="h-3 w-3" />
                    Último acceso: {admin.lastLogin}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white/90">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
