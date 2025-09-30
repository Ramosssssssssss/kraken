"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Building2, ChevronRight } from "lucide-react"

interface Almacen {
  id: string
  nombre: string
  codigo: string
  almacenId: number
  descripcion: string
}

const almacenes: Almacen[] = [
  {
    id: "1",
    nombre: "ALMACÉN GENERAL",
    codigo: "ALM_GEN",
    almacenId: 384,
    descripcion: "Almacén principal con inventario general",
  },
  {
    id: "2",
    nombre: "BODEGA1",
    codigo: "BOD_1",
    almacenId: 3482,
    descripcion: "Bodega especializada número uno",
  },
  {
    id: "3",
    nombre: "BODEGA2",
    codigo: "BOD_2",
    almacenId: 3483,
    descripcion: "Bodega especializada número dos",
  },
  {
    id: "4",
    nombre: "BODEGA3",
    codigo: "BOD_3",
    almacenId: 3484,
    descripcion: "Bodega especializada número tres",
  },
  {
    id: "5",
    nombre: "BODEGA4",
    codigo: "BOD_4",
    almacenId: 3485,
    descripcion: "Bodega especializada número cuatro",
  },
  {
    id: "6",
    nombre: "BODEGA5",
    codigo: "BOD_5",
    almacenId: 3486,
    descripcion: "Bodega especializada número cinco",
  },
  {
    id: "7",
    nombre: "DEFECTOS",
    codigo: "BOD_DEF",
    almacenId: 3487,
    descripcion: "Bodega para productos defectuosos",
  },
  {
    id: "8",
    nombre: "MERCADO LIBRE",
    codigo: "BOD_ML",
    almacenId: 3638,
    descripcion: "Bodega para productos de Mercado Libre",
  },
]

export default function AlmacenSelectionPremium() {
  const [selectedAlmacen, setSelectedAlmacen] = useState<Almacen | null>(null)
  const router = useRouter()

  const handleAlmacenSelect = (almacen: Almacen) => {
    setSelectedAlmacen(almacen)

    // Navigate to catalog with parameters
    const params = new URLSearchParams({
      almacenId: almacen.almacenId.toString(),
      almacenNombre: almacen.nombre,
      almacenCodigo: almacen.codigo,
    })

    router.push(`/catalogoAcomodo?${params.toString()}`)
  }

  const handleBack = () => {
    router.back()
  }

  const isSelected = (id: string) => selectedAlmacen?.id === id

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Glassmorphism Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-white/80 border-b border-neutral-200/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-neutral-200/50 hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-700" />
              <span className="font-medium text-neutral-700">Atrás</span>
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Seleccionar Almacén</h1>
              <p className="text-sm text-neutral-600 font-medium mt-1">Elige el almacén para gestionar inventario</p>
            </div>

            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Warehouse Grid */}
        <div className="grid gap-4 md:gap-6">
          {almacenes.map((almacen, index) => {
            const selected = isSelected(almacen.id)
            return (
              <button
                key={almacen.id}
                onClick={() => handleAlmacenSelect(almacen)}
                className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 ${
                  selected
                    ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 shadow-lg scale-[1.02]"
                    : "bg-white/60 backdrop-blur-sm border border-neutral-200/50 hover:bg-white/80 hover:border-neutral-300/50 hover:shadow-lg hover:scale-[1.01]"
                }`}
              >
                {/* Gradient Overlay for Selected */}
                {selected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 rounded-2xl" />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon Container */}
                    <div
                      className={`flex items-center justify-center w-14 h-14 rounded-xl transition-all duration-300 ${
                        selected
                          ? "bg-blue-100 border border-blue-200"
                          : "bg-neutral-100 border border-neutral-200 group-hover:bg-neutral-200"
                      }`}
                    >
                      <Building2
                        className={`w-7 h-7 transition-colors duration-300 ${
                          selected ? "text-blue-600" : "text-neutral-600 group-hover:text-neutral-700"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-bold mb-1 transition-colors duration-300 ${
                          selected ? "text-blue-900" : "text-neutral-900"
                        }`}
                      >
                        {almacen.nombre}
                      </h3>
                      <p className="text-neutral-600 text-sm mb-2 leading-relaxed">{almacen.descripcion}</p>
                      <div className="flex items-center gap-3 text-xs">
                        <span
                          className={`px-2 py-1 rounded-md font-medium ${
                            selected ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          ID: {almacen.almacenId}
                        </span>
                        <span
                          className={`px-2 py-1 rounded-md font-medium ${
                            selected ? "bg-blue-100 text-blue-700" : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {almacen.codigo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight
                    className={`w-5 h-5 transition-all duration-300 ${
                      selected
                        ? "text-blue-600 translate-x-1"
                        : "text-neutral-400 group-hover:text-neutral-600 group-hover:translate-x-1"
                    }`}
                  />
                </div>

                {/* Selection Indicator */}
                {selected && <div className="absolute top-4 right-4 w-3 h-3 bg-blue-500 rounded-full shadow-sm" />}
              </button>
            )
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/60 backdrop-blur-sm border border-neutral-200/50">
            <Building2 className="w-4 h-4 text-neutral-500" />
            <span className="text-sm text-neutral-600 font-medium">{almacenes.length} almacenes disponibles</span>
          </div>
        </div>
      </div>
    </div>
  )
}
