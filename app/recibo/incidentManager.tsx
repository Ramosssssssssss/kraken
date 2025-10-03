"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { X, AlertTriangle, Plus, Minus, RefreshCw, Receipt, CheckCircle, XCircle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export type IncidentType = "extra" | "changed" | "missing" | "return"

export interface Incident {
  id: string
  type: IncidentType
  productKey: string
  productName: string
  quantity: number
  expectedProductKey?: string
  expectedProductName?: string
  notes?: string
  timestamp: Date
}

export interface Detalle {
  CLAVE_ARTICULO?: string
  NOMBRE?: string
  CANTIDAD_REQUERIDA?: number
  CANTIDAD_ESCANEADA?: number
  NOTAS?: string
}

interface IncidentManagerProps {
  incidents: Incident[]
  setIncidents: React.Dispatch<React.SetStateAction<Incident[]>>
  detalles: Detalle[]
  setDetalles: React.Dispatch<React.SetStateAction<Detalle[]>>
  setScannedProducts: React.Dispatch<React.SetStateAction<{ [key: string]: number }>>
  caratula: any
  autoOpen?: boolean
  onClose?: () => void
}

export default function IncidentManager({
  incidents,
  setIncidents,
  detalles,
  setDetalles,
  setScannedProducts,
  caratula,
  autoOpen = false,
  onClose,
}: IncidentManagerProps) {
  const { toast } = useToast()
  const [showIncidentModal, setShowIncidentModal] = useState(false)
  const [showIncidentTypeModal, setShowIncidentTypeModal] = useState(false)
  const [selectedIncidentType, setSelectedIncidentType] = useState<IncidentType | null>(null)

  const [showBillingModal, setShowBillingModal] = useState(false)
  const [showAuthAlert, setShowAuthAlert] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordInput, setPasswordInput] = useState("")

  const [incidentProductKey, setIncidentProductKey] = useState("")
  const [incidentProductName, setIncidentProductName] = useState("")
  const [incidentQuantity, setIncidentQuantity] = useState("")
  const [expectedProductKey, setExpectedProductKey] = useState("")
  const [expectedProductName, setExpectedProductName] = useState("")
  const [incidentNotes, setIncidentNotes] = useState("")

  useEffect(() => {
    if (autoOpen) {
      setShowIncidentTypeModal(true)
    }
  }, [autoOpen])

  const selectIncidentType = (type: IncidentType) => {
    if (type === "extra") {
      setSelectedIncidentType(type)
      setShowIncidentTypeModal(false)
      setTimeout(() => {
        setShowBillingModal(true)
      }, 150)
    } else {
      setSelectedIncidentType(type)
      setShowIncidentTypeModal(false)
      setTimeout(() => {
        setShowIncidentModal(true)
      }, 150)
    }
  }

  const handleBillingConfirmation = (areInvoiced: boolean) => {
    setShowBillingModal(false)

    if (areInvoiced) {
      setTimeout(() => {
        setShowAuthAlert(true)
        setTimeout(() => {
          setShowAuthAlert(false)
          setTimeout(() => {
            setShowPasswordModal(true)
          }, 150)
        }, 2000)
      }, 150)
    } else {
      setTimeout(() => {
        setShowIncidentModal(true)
      }, 150)
    }
  }

  const handlePasswordSubmit = () => {
    if (passwordInput === "BlackSheep$23") {
      setShowPasswordModal(false)
      setPasswordInput("")
      setTimeout(() => {
        setShowIncidentModal(true)
      }, 150)
    } else {
      toast({
        title: "Error",
        description: "Contraseña incorrecta",
        variant: "destructive",
      })
      setPasswordInput("")
    }
  }

  const applyIncidentToProduct = (incident: Incident) => {
    if (incident.type === "missing") {
      const productIndex = detalles.findIndex((d) => d.CLAVE_ARTICULO === incident.productKey)
      if (productIndex !== -1) {
        const updatedDetalles = [...detalles]
        const originalRequired = updatedDetalles[productIndex].CANTIDAD_REQUERIDA || 0
        const actualQuantity = incident.quantity

        updatedDetalles[productIndex] = {
          ...updatedDetalles[productIndex],
          CANTIDAD_REQUERIDA: actualQuantity,
          CANTIDAD_ESCANEADA: actualQuantity,
          NOTAS: `ARTÍCULO DE MENOS - Original: ${originalRequired}, Recibido: ${actualQuantity}`,
        }

        setDetalles(updatedDetalles)
        setScannedProducts((prev) => ({
          ...prev,
          [incident.productKey]: actualQuantity,
        }))
      }
    } else if (incident.type === "changed") {
      const productIndex = detalles.findIndex((d) => d.CLAVE_ARTICULO === incident.expectedProductKey)
      if (productIndex !== -1) {
        const updatedDetalles = [...detalles]
        updatedDetalles[productIndex] = {
          ...updatedDetalles[productIndex],
          NOTAS: `ARTÍCULO CAMBIADO - Vino: ${incident.productKey} (${incident.productName})`,
          CANTIDAD_ESCANEADA: updatedDetalles[productIndex].CANTIDAD_REQUERIDA,
        }

        setDetalles(updatedDetalles)
        setScannedProducts((prev) => ({
          ...prev,
          [incident.expectedProductKey!]: updatedDetalles[productIndex].CANTIDAD_REQUERIDA || 0,
        }))
      }
    } else if (incident.type === "return") {
      const productIndex = detalles.findIndex((d) => d.CLAVE_ARTICULO === incident.productKey)
      if (productIndex !== -1) {
        const updatedDetalles = [...detalles]
        updatedDetalles[productIndex] = {
          ...updatedDetalles[productIndex],
          NOTAS: `DEVOLUCIÓN DE ARTÍCULO - Original: ${updatedDetalles[productIndex].CANTIDAD_REQUERIDA}, Devuelto: ${incident.quantity}`,
          CANTIDAD_ESCANEADA: 0,
        }

        setDetalles(updatedDetalles)
        setScannedProducts((prev) => ({
          ...prev,
          [incident.productKey]: 0,
        }))
      }
    }
  }

  const saveIncident = () => {
    if (!incidentProductKey.trim()) {
      toast({
        title: "Error",
        description: "Debes especificar la clave del artículo",
        variant: "destructive",
      })
      return
    }

    if (!incidentQuantity.trim() || isNaN(Number(incidentQuantity)) || Number(incidentQuantity) <= 0) {
      toast({
        title: "Error",
        description: "Debes especificar una cantidad válida",
        variant: "destructive",
      })
      return
    }

    if (selectedIncidentType === "changed" && !expectedProductKey.trim()) {
      toast({
        title: "Error",
        description: "Para artículo cambiado debes especificar qué esperabas",
        variant: "destructive",
      })
      return
    }

    const newIncident: Incident = {
      id: Date.now().toString(),
      type: selectedIncidentType!,
      productKey: incidentProductKey.trim(),
      productName: incidentProductName.trim(),
      quantity: Number(incidentQuantity),
      expectedProductKey: expectedProductKey.trim() || undefined,
      expectedProductName: expectedProductName.trim() || undefined,
      notes: incidentNotes.trim() || undefined,
      timestamp: new Date(),
    }

    setIncidents((prev) => [...prev, newIncident])
    applyIncidentToProduct(newIncident)
    setShowIncidentModal(false)

    const typeNames = {
      extra: "Artículo de más",
      changed: "Artículo cambiado",
      missing: "Artículo de menos",
      return: "Devolución de artículo",
    }

    toast({
      title: "Incidencia aplicada",
      description: `Se registró y aplicó: ${typeNames[selectedIncidentType!]} - ${incidentProductKey}`,
    })

    setIncidentProductKey("")
    setIncidentProductName("")
    setIncidentQuantity("")
    setExpectedProductKey("")
    setExpectedProductName("")
    setIncidentNotes("")
    setSelectedIncidentType(null)

    if (onClose) {
      setTimeout(() => {
        onClose()
      }, 500)
    }
  }

  const getIncidentTypeInfo = (type: IncidentType) => {
    switch (type) {
      case "extra":
        return {
          title: "Artículo de Más",
          description: "Reportar un artículo que vino de más en el envío",
          icon: Plus,
          color: "text-orange-500",
          bg: "bg-orange-50",
        }
      case "changed":
        return {
          title: "Artículo Cambiado",
          description: "Reportar cuando vino un artículo diferente al esperado",
          icon: RefreshCw,
          color: "text-yellow-500",
          bg: "bg-yellow-50",
        }
      case "missing":
        return {
          title: "Artículo de Menos",
          description: "Reportar un artículo que no vino en el envío",
          icon: Minus,
          color: "text-red-500",
          bg: "bg-red-50",
        }
      case "return":
        return {
          title: "Devolución de Artículo",
          description: "Reportar un artículo que debe ser devuelto al proveedor",
          icon: RotateCcw,
          color: "text-purple-500",
          bg: "bg-purple-50",
        }
    }
  }

  return (
    <>
      {/* Billing Confirmation Modal */}
      <Dialog open={showBillingModal} onOpenChange={setShowBillingModal}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center gap-6 py-4">
            <div className="bg-yellow-100 rounded-full p-4">
              <Receipt className="h-10 w-10 text-yellow-600" />
            </div>
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">¿ESTÁN FACTURADOS?</h2>
              <p className="text-gray-600">Los artículos de más requieren verificación de facturación</p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                onClick={() => handleBillingConfirmation(false)}
                variant="destructive"
                className="flex-1"
                size="lg"
              >
                <XCircle className="mr-2 h-5 w-5" />
                NO
              </Button>
              <Button onClick={() => handleBillingConfirmation(true)} className="flex-1 bg-green-600" size="lg">
                <CheckCircle className="mr-2 h-5 w-5" />
                SÍ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Alert Modal */}
      <Dialog open={showAuthAlert} onOpenChange={setShowAuthAlert}>
        <DialogContent className="sm:max-w-md border-l-4 border-l-yellow-500">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="bg-yellow-100 rounded-full p-5">
              <AlertTriangle className="h-12 w-12 text-yellow-600" />
            </div>
            <h2 className="text-xl font-bold text-yellow-900 uppercase tracking-wide">SE NECESITA AUTORIZACIÓN</h2>
            <div className="bg-yellow-100 px-4 py-2 rounded-full">
              <p className="text-sm text-yellow-900 font-semibold">Preparando verificación...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Password Modal */}
      <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl">Ingresa la contraseña</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              type="password"
              placeholder="Contraseña"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
              autoFocus
            />
            <div className="flex gap-3">
              <Button
                onClick={() => {
                  setShowPasswordModal(false)
                  setPasswordInput("")
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button onClick={handlePasswordSubmit} className="flex-1">
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Type Selection Modal */}
      <Dialog
        open={showIncidentTypeModal}
        onOpenChange={(open) => {
          setShowIncidentTypeModal(open)
          if (!open && onClose) {
            onClose()
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Reportar Incidencia</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 text-center mb-4">Selecciona el tipo de incidencia que deseas reportar:</p>

          <div className="space-y-4">
            {(["extra", "changed", "missing", "return"] as IncidentType[]).map((type) => {
              const info = getIncidentTypeInfo(type)
              const Icon = info.icon
              return (
                <button
                  key={type}
                  onClick={() => selectIncidentType(type)}
                  className="w-full flex items-center gap-4 p-5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all"
                >
                  <div className={`${info.bg} rounded-xl p-3`}>
                    <Icon className={`h-8 w-8 ${info.color}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="font-bold text-lg text-gray-200">{info.title}</h3>
                    <p className="text-sm text-gray-300">{info.description}</p>
                  </div>
                  <X className="h-5 w-5 text-gray-400 rotate-45" />
                </button>
              )
            })}

            {incidents.length > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mt-6">
                <p className="font-semibold text-orange-900 mb-2">Incidencias reportadas: {incidents.length}</p>
                {incidents.slice(-3).map((incident) => (
                  <p key={incident.id} className="text-sm text-gray-700 mb-1">
                    • {getIncidentTypeInfo(incident.type).title}: {incident.productKey}
                  </p>
                ))}
                {incidents.length > 3 && (
                  <p className="text-xs text-gray-500 italic mt-2">... y {incidents.length - 3} más</p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Form Modal */}
      <Dialog open={showIncidentModal} onOpenChange={setShowIncidentModal}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {selectedIncidentType ? getIncidentTypeInfo(selectedIncidentType).title : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Product Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                {selectedIncidentType === "changed" ? "Artículo que vino:" : "Artículo:"}
              </label>
              <div className="flex gap-3 mb-3">
                <Input
                  placeholder="Clave del artículo"
                  value={incidentProductKey}
                  onChange={(e) => setIncidentProductKey(e.target.value.toUpperCase())}
                  className="flex-1"
                />
                <Input
                  placeholder="Nombre del artículo"
                  value={incidentProductName}
                  onChange={(e) => setIncidentProductName(e.target.value)}
                  className="flex-[2]"
                />
              </div>

              {detalles.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 mb-2">O selecciona de la lista:</p>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {detalles.map((product, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setIncidentProductKey(product.CLAVE_ARTICULO || "")
                          setIncidentProductName(product.NOMBRE || "")
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                          incidentProductKey === product.CLAVE_ARTICULO
                            ? "bg-blue-500 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                      >
                        {product.CLAVE_ARTICULO}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Expected Product Section (for changed type) */}
            {selectedIncidentType === "changed" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Artículo que esperabas:</label>
                <div className="flex gap-3 mb-3">
                  <Input
                    placeholder="Clave esperada"
                    value={expectedProductKey}
                    onChange={(e) => setExpectedProductKey(e.target.value.toUpperCase())}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Nombre esperado"
                    value={expectedProductName}
                    onChange={(e) => setExpectedProductName(e.target.value)}
                    className="flex-[2]"
                  />
                </div>

                {detalles.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">O selecciona de la lista:</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {detalles.map((product, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setExpectedProductKey(product.CLAVE_ARTICULO || "")
                            setExpectedProductName(product.NOMBRE || "")
                          }}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            expectedProductKey === product.CLAVE_ARTICULO
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {product.CLAVE_ARTICULO}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quantity Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Cantidad:</label>
              <Input
                type="number"
                placeholder="Ingresa la cantidad"
                value={incidentQuantity}
                onChange={(e) => setIncidentQuantity(e.target.value)}
              />
            </div>

            {/* Notes Section */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Notas adicionales (opcional):</label>
              <Textarea
                placeholder="Agrega cualquier detalle adicional..."
                value={incidentNotes}
                onChange={(e) => setIncidentNotes(e.target.value)}
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button onClick={() => setShowIncidentModal(false)} variant="outline" className="flex-1">
                Cancelar
              </Button>
              <Button onClick={saveIncident} className="flex-1">
                Guardar Incidencia
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
