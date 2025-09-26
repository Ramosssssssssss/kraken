"use client"

import type { LucideIcon } from "lucide-react"

interface ModuleCardProps {
  title: string
  description: string
  icon: LucideIcon
  version?: string
  status: "active" | "available" | "inactive"
  onClick?: () => void
}

export default function ModuleCard({
  title,
  description,
  icon: Icon,
  version = "v2.1.0",
  status,
  onClick,
}: ModuleCardProps) {
  const statusConfig = {
    active: {
      badge: "bg-green-500/20 text-green-400",
      text: "Activo",
      card: "hover:border-blue-400 cursor-pointer hover:bg-white/5",
    },
    available: {
      badge: "bg-gray-600/20 text-gray-400",
      text: "Disponible",
      card: "opacity-75",
    },
    inactive: {
      badge: "bg-red-500/20 text-red-400",
      text: "Inactivo",
      card: "opacity-50",
    },
  }

  const config = statusConfig[status]

  return (
    <div
      onClick={onClick}
      className={`bg-black border border-white/20 rounded-lg p-4 transition-colors ${config.card}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <span className={`${config.badge} px-2 py-1 rounded text-xs`}>{config.text}</span>
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-gray-400 mb-3 text-center">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{version}</span>
        {status === "active" && <span className="text-blue-400 text-sm">Abrir →</span>}
        {status === "available" && (
          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
            Instalar
          </button>
        )}
      </div>
    </div>
  )
}
