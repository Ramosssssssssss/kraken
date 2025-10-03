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
      <div className="bg-black border border-white/20 rounded-lg p-6 grid-row-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 ">
          <div className="text-white/90 text-sm">     
                <h1 className="text-xl font-bold text-white">SERIE: </h1>
  
            <input
                type="text"
                color="white"
                placeholder="ABC"
  className="w-50 pl-12 pr-4 py-3 bg-black border border-slate-200 rounded-xl text-slate-1 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all uppercase color-white font-bold"
            maxLength={3}
              />
                              <h1 className="text-xl font-bold text-white">CONSECUTIVO:</h1>

                <input
                type="text"
                placeholder="Folio"
                className="w-50 pl-12 pr-4 py-3 bg-black border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                         maxLength={9}

             />


          
      
    </div>
    </div>
    </div> 
      
    </div>   
  )
}
