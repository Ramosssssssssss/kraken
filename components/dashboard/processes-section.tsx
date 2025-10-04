"use client"

import type React from "react"
import { useRouter } from "next/navigation"

import { Inbox, LucideWarehouse, ScanBarcode, BoxIcon, ChevronRight } from "lucide-react"

interface ModuleCardProps {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  version: string
  onClick?: () => void
}

function ModuleCard({ title, description, icon: Icon, version, onClick }: ModuleCardProps) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-black/40 hover:bg-black/60 border-b border-white/5 last:border-b-0 p-6 cursor-pointer transition-all duration-200"
    >
      <div className="flex items-center gap-6">
        {/* Icon section */}
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-white/5 group-hover:bg-white/10 rounded-lg flex items-center justify-center transition-all duration-200">
            <Icon className="w-6 h-6 text-white/60 group-hover:text-white/90 transition-colors" />
          </div>
        </div>

        {/* Content section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h4 className="text-base font-medium text-white/90 group-hover:text-white transition-colors">{title}</h4>
            <span className="text-[10px] text-white/30 font-mono">{version}</span>
          </div>
          <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors line-clamp-1">
            {description}
          </p>
        </div>

        {/* Action section */}
        <div className="flex-shrink-0">
          <div className="flex items-center gap-2 text-white/30 group-hover:text-white/70 transition-colors">
            <span className="text-xs font-medium">Abrir</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProcessesSection() {
  const router = useRouter()

  const handleReciboClick = () => {
    router.push("/recibo")
  }

  const handleEtiquetadorClick = () => {
    router.push("/acomodo")
  }

  const handlePickingClick = () => {
    router.push("/picking")
  }

  const handlePackingClick = () => {
    router.push("/ordenes-packing")
  }

  const handlesnMicroClick = () => {
    router.push("/snMicro")
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="space-y-1 pb-4 border-b border-white/10">
          <h2 className="text-2xl font-semibold text-white">Procesos y Módulos</h2>
          <p className="text-sm text-white/40">Gestiona tus operaciones de almacén</p>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 px-6">
              Módulos Principales
            </h3>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              <ModuleCard
                title="Recibo"
                description="Registra la entrada de mercancía, valida contra órdenes de compra y asegura cantidades correctas."
                icon={Inbox}
                version="v2.1.0"
                onClick={handleReciboClick}
              />
              <ModuleCard
                title="Acomodo"
                description="Ubica y organiza la mercancía recibida en su posición correcta dentro del almacén."
                icon={LucideWarehouse}
                version="v2.1.0"
                onClick={handleEtiquetadorClick}
              />
              <ModuleCard
                title="Picking"
                description="Prepara los productos solicitados tomando la mercancía de su ubicación en almacén."
                icon={ScanBarcode}
                version="v2.1.0"
                onClick={handlePickingClick}
              />
              <ModuleCard
                title="Packing"
                description="Empaca y consolida los productos seleccionados para el envío o entrega."
                icon={BoxIcon}
                version="v2.1.0"
                onClick={handlePackingClick}
              />
            </div>
          </div>

          <div>
            <h3 className="text-xs font-medium text-white/50 uppercase tracking-wider mb-3 px-6">
              Módulos Alternativos
            </h3>
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              <ModuleCard
                title="Recibo Sin Microsip"
                description="Registra la entrada de mercancía, valida contra órdenes de compra y asegura cantidades correctas."
                icon={Inbox}
                version="v2.1.0"
                onClick={handlesnMicroClick}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
