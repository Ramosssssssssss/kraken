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

export default function ConfigurationSection() {
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
  
    const handlesnMicroClick = () => {
    router.push("/snMicro")
  }




  return (
    <div className="space-y-6 flex-1 ">
      <h3 className="text-3xl font-bold text-white">Configuración del Modúlo de Recibo</h3>


 {/* Módulos Activos */}
<div className="bg-black border border-white/20 rounded-xl p-6">
 {/* Estilo modulos por columnas  */}

  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Columna 1 */}
    <div className="flex flex-col space-y-3">
      <label className="text-sm font-semibold text-white/80">SERIE:</label>
      <input
        type="text"
        placeholder="ABC"
        maxLength={3}
        className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all uppercase font-bold"
      />
    </div>

    {/* Columna 2 */}
    <div className="flex flex-col space-y-3">
      <label className="text-sm font-semibold text-white/80">CONSECUTIVO:</label>
      <input
        type="text"
        placeholder="Folio"
        maxLength={9}
        className="w-full px-4 py-3 bg-black border border-white/20 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-bold"
      />
    </div>
  </div>
</div>

    </div>   
  )
}
