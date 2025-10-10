"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { Calendar, FileText, Truck, Download, ChevronRight, Barcode } from "lucide-react"
import { useCompany } from "@/lib/company-context"

function OrderRow({ 
  onClick 
}: {
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className="group bg-black/40 hover:bg-black/60 border-b border-white/5 last:border-b-0 p-6 cursor-pointer transition-all duration-200"
    >
      <div className="flex items-center gap-6">
        <div className="flex-shrink-0 w-56">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/5 group-hover:bg-white/10 rounded-lg flex items-center justify-center transition-all duration-200">
              <FileText className="w-6 h-6 text-white/60 group-hover:text-white/90" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white/90 group-hover:text-white transition-colors">
                
              </h4>
              <div className="mt-2 px-3 py-1 rounded-full text-xs font-medium border bg-yellow-500/20 text-yellow-300 border-yellow-500/30 inline-block">
                
              </div>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-40">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4 text-white/40" />
            <span className="text-white/90"></span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm">
            <Truck className="w-4 h-4 text-white/40 flex-shrink-0" />
            <span className="text-white/90 truncate"></span>
          </div>
        </div>

        <div className="flex-shrink-0 w-24 text-right">
          <div className="text-sm text-white/90">
            
          </div>
        </div>

        <div className="flex-shrink-0 w-32 text-right">
          <div className="text-sm font-medium text-white/90">
            
          </div>
        </div>

        <div className="flex-shrink-0">
          <div className="flex items-center gap-7">
            <div className="bg-white/5 p-4 rounded-lg border border-white/10 group-hover:border-white/20 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-30 h-30 bg-gradient-to-br from-white/10 to-white/5 rounded border border-white/10 flex items-center justify-center">
                  <Barcode className="w-7 h-7 text-white/40" />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm text-white/40 font-medium"></span>
                  <span className="text-sm text-white/60 font-mono mt-1"></span>
                </div>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/70 transition-colors" />
          </div>
        </div>
      </div>
    </div>
  )
}

function TableHeaders() {
  return (
    <div className="px-6 py-4 border-b border-white/10 bg-white/[0.02]">
      <div className="flex items-center gap-6 text-xs font-medium text-white/50 uppercase tracking-wider">
        <div className="flex-shrink-0 w-56">Orden</div>
        <div className="flex-shrink-0 w-40">Fecha Entrega</div>
        <div className="flex-1 min-w-0">Proveedor</div>
        <div className="flex-shrink-0 w-24 text-right">Artículos</div>
        <div className="flex-shrink-0 w-32 text-right">Total</div>
        <div className="flex-shrink-0 w-40 text-right">Código</div>
      </div>
    </div>
  )
}

export default function OrdersBoardVertical() {
  const router = useRouter()
  const { apiUrl, isReady } = useCompany()

  const emptyOrders = Array(5).fill(null)

  const handleOrderClick = (orderId: number) => {
    console.log("Navegar a orden:", orderId)
  }

  const handleRefresh = () => {
    console.log("Actualizar datos...")
  }

  const handleExport = () => {
    console.log("Exportando órdenes...")
  }

  return (
    <div className="min-h-screen bg-black p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="space-y-2 pb-4 border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl lg:text-3xl font-semibold text-white">ORDEN</h2>
              <p className="text-sm text-white/40 mt-1">Órdenes por recibir en almacén</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white/80 transition-colors"
              >
                Actualizar
              </button>
              <button
                onClick={handleExport}
                className="px-4 py-2 text-sm bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/60 hover:text-white/80 transition-colors flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Exportar
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/5 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-white/60" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-semibold text-white"></p>
                <p className="text-xs text-white/40">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-semibold text-white"></p>
                <p className="text-xs text-white/40">Pendientes</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-semibold text-white"></p>
                <p className="text-xs text-white/40">En Proceso</p>
              </div>
            </div>
          </div>

          <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3 sm:p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-green-400" />
              </div>
              <div>
                <p className="text-lg sm:text-2xl font-semibold text-white"></p>
                <p className="text-xs text-white/40">Completadas</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
          <TableHeaders />

          <div className="divide-y divide-white/5">
            {emptyOrders.map((_, index) => (
              <OrderRow
                key={index}
                onClick={() => handleOrderClick(index)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}