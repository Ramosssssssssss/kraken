"use client"

import { useState } from "react"
import { X, ArrowRight, Check, Layers, Eye } from "lucide-react"
import {
  type Rack,
  type RackLevel,
  type DrawerSize,
  DRAWER_CAPACITIES,
  configureRackStructure,
} from "@/lib/warehouse-data"

interface RackConfigDialogProps {
  isOpen: boolean
  rack: Rack | null
  warehouseId: string
  onClose: () => void
  onSuccess?: () => void
}

export function RackConfigDialog({ isOpen, rack, warehouseId, onClose, onSuccess }: RackConfigDialogProps) {
  const [step, setStep] = useState(1)
  const [numLevels, setNumLevels] = useState("")
  const [levelConfigs, setLevelConfigs] = useState<
    Array<{
      pequeña: string
      mediana: string
      grande: string
      xg: string
    }>
  >([])

  const resetForm = () => {
    setStep(1)
    setNumLevels("")
    setLevelConfigs([])
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const updateLevelConfig = (levelIndex: number, drawerType: DrawerSize, value: string) => {
    const newConfigs = [...levelConfigs]
    newConfigs[levelIndex][drawerType] = value
    setLevelConfigs(newConfigs)
  }

  const calculateTotalCapacity = () => {
    let total = 0
    levelConfigs.forEach((config) => {
      if (config.pequeña) total += Number.parseInt(config.pequeña) * DRAWER_CAPACITIES.pequeña
      if (config.mediana) total += Number.parseInt(config.mediana) * DRAWER_CAPACITIES.mediana
      if (config.grande) total += Number.parseInt(config.grande) * DRAWER_CAPACITIES.grande
      if (config.xg) total += Number.parseInt(config.xg) * DRAWER_CAPACITIES.xg
    })
    return total
  }

  const handleNext = () => {
    if (step === 1) {
      const levels = Number.parseInt(numLevels)
      if (!levels || levels < 1 || levels > 10) {
        alert("Por favor ingresa un número válido de niveles (1-10)")
        return
      }
      setLevelConfigs(
        Array.from({ length: levels }, () => ({
          pequeña: "",
          mediana: "",
          grande: "",
          xg: "",
        })),
      )
      setStep(2)
    } else if (step === 2) {
      const allValid = levelConfigs.every((config) => {
        return config.pequeña || config.mediana || config.grande || config.xg
      })

      if (!allValid) {
        alert("Cada nivel debe tener al menos un tipo de gaveta configurado")
        return
      }

      setStep(3)
    } else if (step === 3) {
      if (!rack) return

      const levels: RackLevel[] = levelConfigs.map((config, index) => {
        const drawers = []

        if (config.pequeña) {
          drawers.push({
            size: "pequeña" as DrawerSize,
            rows: Number.parseInt(config.pequeña),
            capacity: DRAWER_CAPACITIES.pequeña,
          })
        }
        if (config.mediana) {
          drawers.push({
            size: "mediana" as DrawerSize,
            rows: Number.parseInt(config.mediana),
            capacity: DRAWER_CAPACITIES.mediana,
          })
        }
        if (config.grande) {
          drawers.push({
            size: "grande" as DrawerSize,
            rows: Number.parseInt(config.grande),
            capacity: DRAWER_CAPACITIES.grande,
          })
        }
        if (config.xg) {
          drawers.push({
            size: "xg" as DrawerSize,
            rows: Number.parseInt(config.xg),
            capacity: DRAWER_CAPACITIES.xg,
          })
        }

        return {
          levelNumber: index + 1,
          drawers,
        }
      })

      const success = configureRackStructure(warehouseId, rack.id, levels)

      if (success) {
        alert("Rack configurado exitosamente!")
        handleClose()
        onSuccess?.()
      } else {
        alert("Error al configurar el rack")
      }
    }
  }

  if (!isOpen || !rack) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 p-6">
          <button
            onClick={handleClose}
            className="absolute right-6 top-6 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-2">
              <Layers className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Configurar Rack {rack.label}</h3>
              <p className="text-sm text-zinc-400">
                {step === 1 && "Paso 1: Número de niveles"}
                {step === 2 && "Paso 2: Configurar gavetas por nivel"}
                {step === 3 && "Paso 3: Vista previa"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">¿Cuántos niveles tendrá el rack?</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numLevels}
                  onChange={(e) => setNumLevels(e.target.value)}
                  placeholder="Ej: 4"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-400">
                  Los niveles son las estanterías horizontales del rack. Cada nivel puede tener diferentes tipos de
                  gavetas.
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h4 className="mb-2 text-sm font-semibold text-white">Tipos de Gavetas</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-blue-500" />
                    <span className="text-zinc-400">Pequeña: 22 por línea</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-yellow-500" />
                    <span className="text-zinc-400">Mediana: 15 por línea</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-red-500" />
                    <span className="text-zinc-400">Grande: 11 por línea</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded bg-orange-500" />
                    <span className="text-zinc-400">XG: 6 por línea</span>
                  </div>
                </div>
              </div>

              {levelConfigs.map((config, levelIndex) => (
                <div key={levelIndex} className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Layers className="h-4 w-4 text-blue-500" />
                    Nivel {levelIndex + 1}
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Líneas Pequeñas</label>
                      <input
                        type="number"
                        min="0"
                        value={config.pequeña}
                        onChange={(e) => updateLevelConfig(levelIndex, "pequeña", e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Líneas Medianas</label>
                      <input
                        type="number"
                        min="0"
                        value={config.mediana}
                        onChange={(e) => updateLevelConfig(levelIndex, "mediana", e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-yellow-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Líneas Grandes</label>
                      <input
                        type="number"
                        min="0"
                        value={config.grande}
                        onChange={(e) => updateLevelConfig(levelIndex, "grande", e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs text-zinc-400">Líneas XG</label>
                      <input
                        type="number"
                        min="0"
                        value={config.xg}
                        onChange={(e) => updateLevelConfig(levelIndex, "xg", e.target.value)}
                        placeholder="0"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-orange-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <h4 className="mb-3 text-sm font-semibold text-white">Vista Previa del Rack {rack.label}</h4>

                <div className="space-y-2">
                  {levelConfigs.map((config, levelIndex) => (
                    <div key={levelIndex} className="rounded-lg border border-zinc-700 bg-zinc-800 p-3">
                      <div className="mb-2 text-xs font-medium text-zinc-400">Nivel {levelIndex + 1}</div>

                      <div className="space-y-1">
                        {config.pequeña && Number.parseInt(config.pequeña) > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex gap-0.5">
                                {Array.from({ length: Number.parseInt(config.pequeña) }).map((_, i) => (
                                  <div key={i} className="h-6 flex-1 rounded bg-blue-500" />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {Number.parseInt(config.pequeña)} × 22 = {Number.parseInt(config.pequeña) * 22}
                            </span>
                          </div>
                        )}

                        {config.mediana && Number.parseInt(config.mediana) > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex gap-0.5">
                                {Array.from({ length: Number.parseInt(config.mediana) }).map((_, i) => (
                                  <div key={i} className="h-6 flex-1 rounded bg-yellow-500" />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {Number.parseInt(config.mediana)} × 15 = {Number.parseInt(config.mediana) * 15}
                            </span>
                          </div>
                        )}

                        {config.grande && Number.parseInt(config.grande) > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex gap-0.5">
                                {Array.from({ length: Number.parseInt(config.grande) }).map((_, i) => (
                                  <div key={i} className="h-6 flex-1 rounded bg-red-500" />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {Number.parseInt(config.grande)} × 11 = {Number.parseInt(config.grande) * 11}
                            </span>
                          </div>
                        )}

                        {config.xg && Number.parseInt(config.xg) > 0 && (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <div className="flex gap-0.5">
                                {Array.from({ length: Number.parseInt(config.xg) }).map((_, i) => (
                                  <div key={i} className="h-6 flex-1 rounded bg-orange-500" />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-zinc-400">
                              {Number.parseInt(config.xg)} × 6 = {Number.parseInt(config.xg) * 6}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-lg border border-blue-800 bg-blue-950/30 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-400">Capacidad Total</span>
                    <span className="text-lg font-bold text-blue-400">{calculateTotalCapacity()} items</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900 p-6">
          <div className="flex items-center justify-between">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-zinc-700"
              >
                Atrás
              </button>
            )}

            <button
              onClick={handleNext}
              disabled={
                (step === 1 && !numLevels) ||
                (step === 2 && !levelConfigs.some((c) => c.pequeña || c.mediana || c.grande || c.xg))
              }
              className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                (step === 1 && !numLevels) ||
                (step === 2 && !levelConfigs.some((c) => c.pequeña || c.mediana || c.grande || c.xg))
                  ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {step === 3 ? (
                <>
                  <Check className="h-4 w-4" />
                  Guardar Configuración
                </>
              ) : step === 2 ? (
                <>
                  <Eye className="h-4 w-4" />
                  Previsualizar
                </>
              ) : (
                <>
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
