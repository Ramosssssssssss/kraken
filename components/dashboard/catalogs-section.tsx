"use client"

import type React from "react"

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
      className="bg-black/30 backdrop-blur-md border border-white/10 rounded-2xl p-5 hover:border-blue-400/50 transition-all duration-300 cursor-pointer hover:bg-white/5 hover:shadow-lg hover:shadow-blue-500/10 group relative"
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/20 rounded-2xl pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="w-12 h-12 bg-blue-500/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-blue-400/30 group-hover:border-blue-400/50 transition-colors">
            <Icon className="w-6 h-6 text-blue-300" />
          </div>
          <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full text-xs font-medium border border-emerald-400/30 backdrop-blur-sm">
            Activo
          </span>
        </div>
        <h4 className="text-lg font-semibold text-white/95 mb-3 tracking-tight">{title}</h4>
        <p className="text-sm text-gray-300/80 mb-4 leading-relaxed">{description}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400/80 font-medium">{version}</span>
          <span className="text-blue-300 text-sm font-medium group-hover:text-blue-200 transition-colors">Abrir →</span>
        </div>
      </div>
    </div>
  )
}

export default function CatalogsSection() {
  const handleModuleClick = () => {
    console.log("Module clicked")
  }

  return (
    <div className="space-y-8">
      <h2 className="text-3xl font-bold text-white/95 tracking-tight">CATÁLOGOS</h2>

      {/* Módulos Principales */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 rounded-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModuleCard
              title="Almacenes"
              description="Registra la entrada de mercancía, validar contra órdenes de compra y asegurar cantidades correctas."
              icon={Inbox}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
            <ModuleCard
              title="Artículos"
              description="Ubica y organiza la mercancia recíbida en su posición correcta dentro del almacén."
              icon={LucideWarehouse}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
            <ModuleCard
              title="Clientes"
              description="Prepara los productos solicitados tomando la mercancía de su ubicación en almacén."
              icon={ScanBarcode}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
            <ModuleCard
              title="Empresas"
              description="Empaca y consolida los productos seleccionados para el envío o entrega."
              icon={BoxIcon}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
          </div>
        </div>
      </div>

      {/* Módulos Adicionales */}
      <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-8 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-black/10 rounded-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ModuleCard
              title="Órdenes de Compra"
              description="Registra la entrada de mercancía, validar contra órdenes de compra y asegurar cantidades correctas."
              icon={Inbox}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
               <ModuleCard
              title="Pedidos"
              description="Registra la entrada de mercancía, validar contra órdenes de compra y asegurar cantidades correctas."
              icon={Inbox}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
               <ModuleCard
              title="Proveedores"
              description="Registra la entrada de mercancía, validar contra órdenes de compra y asegurar cantidades correctas."
              icon={Inbox}
              version="v2.1.0"
              onClick={handleModuleClick}
            />
          </div>
          
        </div>
      </div>
    </div>
  )
}
