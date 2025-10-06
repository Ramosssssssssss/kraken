"use client"

import { useState } from "react"
import { X, Plus, ArrowRight, Check } from "lucide-react"
import { addWarehouse } from "@/lib/warehouse-data"

interface AddWarehouseDialogProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddWarehouseDialog({ isOpen, onClose, onSuccess }: AddWarehouseDialogProps) {
  const [step, setStep] = useState(1)
  const [name, setName] = useState("")
  const [rows, setRows] = useState("")
  const [cols, setCols] = useState("")
  const [firstRackLocation, setFirstRackLocation] = useState("")
  const [useConsecutive, setUseConsecutive] = useState<boolean | null>(null)

  const resetForm = () => {
    setStep(1)
    setName("")
    setRows("")
    setCols("")
    setFirstRackLocation("")
    setUseConsecutive(null)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim() || !rows || !cols) {
        alert("Por favor completa todos los campos")
        return
      }
      const rowsNum = Number.parseInt(rows)
      const colsNum = Number.parseInt(cols)
      if (rowsNum < 1 || rowsNum > 20 || colsNum < 1 || colsNum > 30) {
        alert("Las dimensiones deben estar entre 1-20 filas y 1-30 columnas")
        return
      }
      setStep(2)
    } else if (step === 2) {
      if (!firstRackLocation.trim()) {
        alert("Por favor ingresa la ubicación del primer rack")
        return
      }
      setStep(3)
    } else if (step === 3 && useConsecutive !== null) {
      const rowsNum = Number.parseInt(rows)
      const colsNum = Number.parseInt(cols)

      addWarehouse({
        name,
        rows: rowsNum,
        cols: colsNum,
        firstRackLocation,
        useConsecutive,
      })

      alert("Almacén creado exitosamente!")
      handleClose()
      onSuccess?.()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-zinc-800 bg-zinc-900 p-6">
          <button
            onClick={handleClose}
            className="absolute right-6 top-6 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-zinc-800 bg-zinc-800/50 p-2">
              <Plus className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Añadir Almacén</h3>
              <p className="text-sm text-zinc-400">Paso {step} de 3</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Nombre del Almacén</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Almacén Central"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Filas</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={rows}
                    onChange={(e) => setRows(e.target.value)}
                    placeholder="Ej: 8"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white">Columnas</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={cols}
                    onChange={(e) => setCols(e.target.value)}
                    placeholder="Ej: 16"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-400">
                  Se creará un almacén de {rows || "0"} × {cols || "0"} ={" "}
                  {(Number.parseInt(rows) || 0) * (Number.parseInt(cols) || 0)} racks
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-white">Ubicación del Primer Rack</label>
                <input
                  type="text"
                  value={firstRackLocation}
                  onChange={(e) => setFirstRackLocation(e.target.value.toUpperCase())}
                  placeholder="Ej: A1"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-2 text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-xs text-zinc-400">
                  Ingresa la ubicación del primer rack. Por ejemplo: A1, B5, C10, etc.
                </p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-4 text-sm text-white">¿Deseas usar numeración consecutiva automática?</p>
                <p className="mb-4 text-xs text-zinc-400">
                  Si seleccionas "Sí", los racks se numerarán automáticamente: {firstRackLocation},{" "}
                  {firstRackLocation.replace(/\d+$/, (match) => String(Number.parseInt(match) + 1))},{" "}
                  {firstRackLocation.replace(/\d+$/, (match) => String(Number.parseInt(match) + 2))}, etc.
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setUseConsecutive(true)}
                    className={`rounded-lg border p-4 text-center transition-all ${
                      useConsecutive === true
                        ? "border-blue-600 bg-blue-600/20 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <Check className="mx-auto mb-2 h-6 w-6" />
                    <div className="text-sm font-medium">Sí</div>
                    <div className="mt-1 text-xs text-zinc-500">Numeración automática</div>
                  </button>

                  <button
                    onClick={() => setUseConsecutive(false)}
                    className={`rounded-lg border p-4 text-center transition-all ${
                      useConsecutive === false
                        ? "border-blue-600 bg-blue-600/20 text-white"
                        : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    <X className="mx-auto mb-2 h-6 w-6" />
                    <div className="text-sm font-medium">No</div>
                    <div className="mt-1 text-xs text-zinc-500">Ingresar manualmente</div>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-900 p-6">
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
                (step === 1 && (!name.trim() || !rows || !cols)) ||
                (step === 2 && !firstRackLocation.trim()) ||
                (step === 3 && useConsecutive === null)
              }
              className={`ml-auto flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                (step === 1 && (!name.trim() || !rows || !cols)) ||
                (step === 2 && !firstRackLocation.trim()) ||
                (step === 3 && useConsecutive === null)
                  ? "cursor-not-allowed bg-zinc-700 text-zinc-500"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {step === 3 ? "Crear Almacén" : "Siguiente"}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
