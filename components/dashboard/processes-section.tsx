"use client"

import type React from "react"
import { useRouter } from "next/navigation"

import { Inbox, LucideWarehouse, ScanBarcode, BoxIcon } from "lucide-react"

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
      className="bg-black border border-white/20 rounded-lg p-4 hover:border-blue-400 transition-colors cursor-pointer hover:bg-white/5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
          <Icon className="w-5 h-5 text-blue-400" />
        </div>
        <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">Activo</span>
      </div>
      <h4 className="text-lg font-semibold text-white mb-2">{title}</h4>
      <p className="text-sm text-gray-400 mb-3 text-center">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-600">{version}</span>
        <span className="text-blue-400 text-sm">Abrir →</span>
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
  const handlePackingClick = () => {
    router.push("/ordenes-packing")
  }

    const handlePickingClick = () => {
    router.push("/picking")
  }



  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">PROCESOS Y MÓDULOS</h2>

      {/* Módulos Activos */}
      <div className="bg-black border border-white/20 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ModuleCard
            title="Recibo"
            description="Registra la entrada de mercancía, validar contra órdenes de compra y asegurar cantidades correctas."
            icon={Inbox}
            version="v2.1.0"
            onClick={handleReciboClick}
          />
          <ModuleCard
            title="Acomodo"
            description="Ubica y organiza la mercancia recíbida en su posición correcta dentro del almacén."
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
    </div>
  )
}
