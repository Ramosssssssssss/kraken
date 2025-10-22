"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, ChevronRight } from "lucide-react";

interface Almacen {
  id: string;
  nombre: string;
  codigo: string;
  almacenId: number;
  descripcion: string;
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
];

export default function AlmacenSelectionPremium() {
  const [selectedAlmacen, setSelectedAlmacen] = useState<Almacen | null>(null);
  const router = useRouter();

  const handleAlmacenSelect = (almacen: Almacen) => {
    setSelectedAlmacen(almacen);

    // Navigate to catalog with parameters
    const params = new URLSearchParams({
      almacenId: almacen.almacenId.toString(),
      almacenNombre: almacen.nombre,
      almacenCodigo: almacen.codigo,
    });

    router.push(`/catalogoAcomodo?${params.toString()}`);
  };

  const handleBack = () => {
    router.back();
  };

  const isSelected = (id: string) => selectedAlmacen?.id === id;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      {/* Glassmorphism Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-white/5">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center hover:scale-105 transition-transform"
            >
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>

            <div className="text-center">
              <h1 className="text-2xl font-bold text-white tracking-tight">
                Seleccionar Almacén
              </h1>
              <p className="text-sm text-gray-400 font-medium mt-1">
                Elige el almacén para gestionar inventario
              </p>
            </div>

            <div className="w-12" />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Warehouse Grid */}
        <div className="grid gap-4 md:gap-6">
          {almacenes.map((almacen, index) => {
            const selected = isSelected(almacen.id);
            return (
              <button
                key={almacen.id}
                onClick={() => handleAlmacenSelect(almacen)}
                className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 backdrop-blur-xl ${
                  selected
                    ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border-2 border-purple-500/30 shadow-lg shadow-purple-500/20 scale-[1.02]"
                    : "bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 hover:border-purple-500/30 hover:shadow-lg hover:scale-[1.01]"
                }`}
              >
                {/* Gradient Overlay for Selected */}
                {selected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-2xl" />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Icon Container */}
                    <div
                      className={`flex items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${
                        selected
                          ? "bg-gradient-to-br from-purple-500/30 to-blue-500/30 shadow-lg"
                          : "bg-white/5 border border-white/10 group-hover:bg-white/10"
                      }`}
                    >
                      <Building2
                        className={`w-8 h-8 transition-colors duration-300 ${
                          selected
                            ? "text-white"
                            : "text-gray-400 group-hover:text-gray-300"
                        }`}
                      />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-bold mb-1 transition-colors duration-300 ${
                          selected ? "text-white" : "text-white"
                        }`}
                      >
                        {almacen.nombre}
                      </h3>
                      <p className="text-gray-300 text-sm mb-2 leading-relaxed">
                        {almacen.descripcion}
                      </p>
                      <div className="flex items-center gap-3 text-xs">
                        <span
                          className={`px-3 py-1 rounded-lg font-medium ${
                            selected
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-white/5 text-gray-400 border border-white/10"
                          }`}
                        >
                          ID: {almacen.almacenId}
                        </span>
                        <span
                          className={`px-3 py-1 rounded-lg font-medium ${
                            selected
                              ? "bg-purple-500/20 text-purple-300 border border-purple-500/30"
                              : "bg-white/5 text-gray-400 border border-white/10"
                          }`}
                        >
                          {almacen.codigo}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow */}
                  <ChevronRight
                    className={`w-6 h-6 transition-all duration-300 ${
                      selected
                        ? "text-purple-400 translate-x-1"
                        : "text-gray-500 group-hover:text-gray-300 group-hover:translate-x-1"
                    }`}
                  />
                </div>

                {/* Selection Indicator */}
                {selected && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-gradient-to-br from-purple-400 to-blue-400 rounded-full shadow-lg shadow-purple-500/50 animate-pulse" />
                )}
              </button>
            );
          })}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 px-6 py-3 rounded-xl bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl border border-white/10">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm text-gray-300 font-medium">
              {almacenes.length} almacenes disponibles
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
