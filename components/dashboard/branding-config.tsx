"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { ImageIcon, Upload, Save, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { useCompany } from "@/lib/company-context"

interface Toast {
  id: number
  type: "success" | "error"
  message: string
}

export default function BrandingConfig() {
  const { companyData, apiUrl, setCompanyData } = useCompany()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const logoInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!apiUrl || !companyData?.codigo) {
      setIsFetching(false)
      setConnectionError(true)
      return
    }

     const fetchBranding = async () => {
       try {
         const response = await fetch(`${apiUrl}/get-branding/${companyData.codigo}`)

         if (!response.ok) {
           throw new Error(`HTTP error! status: ${response.status}`)
         }

         const data = await response.json()

         if (data.ok && data.branding) {
           if (data.branding.logo) {
             setLogoPreview(data.branding.logo)
           }
           if (data.branding.background) {
             setBackgroundPreview(data.branding.background)
           }
         }
         setConnectionError(false)
       } catch (error) {
         console.error("Error fetching branding:", error)
         setConnectionError(true)
       } finally {
         setIsFetching(false)
       }
     }

     fetchBranding()
  }, [apiUrl, companyData])

  const showToast = (type: "success" | "error", message: string) => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(
      () => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      },
      type === "error" ? 1000 : 3000,
    )
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "background") => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      showToast("error", "Por favor selecciona una imagen válida")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast("error", "La imagen no debe superar 10MB")
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const preview = reader.result as string

      if (type === "logo") {
        setLogoFile(file)
        setLogoPreview(preview)
      } else {
        setBackgroundFile(file)
        setBackgroundPreview(preview)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    if (!apiUrl || !companyData?.codigo) {
      showToast("error", "No se pudo obtener la información de la empresa")
      return
    }

    if (!logoFile && !backgroundFile) {
      showToast("error", "Selecciona al menos una imagen para guardar")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.append("codigo", companyData.codigo)

      if (logoFile) {
        formData.append("logo", logoFile)
      }

      if (backgroundFile) {
        formData.append("background", backgroundFile)
      }

      const response = await fetch(`${apiUrl}/update-branding`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        showToast("success", "Branding actualizado exitosamente")
        setLogoFile(null)
        setBackgroundFile(null)
        setConnectionError(false)
        
        // Actualizar el contexto con el nuevo branding
        if (companyData && data.branding) {
          const updatedCompanyData = {
            ...companyData,
            branding: data.branding
          }
          setCompanyData(updatedCompanyData)
        }
      } else {
        showToast("error", data.message || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving branding:", error)
      showToast("error", "Error de conexión al guardar")
      setConnectionError(true)
    } finally {
      setIsLoading(false)
    }
  }

  if (isFetching) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-white/40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl
              backdrop-blur-xl border shadow-2xl
              animate-in slide-in-from-right duration-300
              ${
                toast.type === "success"
                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                  : "bg-red-500/10 border-red-500/20 text-red-400"
              }
            `}
          >
            {toast.type === "success" ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Connection Error Banner */}
      {connectionError && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="text-sm text-yellow-300 font-medium">No se pudo conectar con el servidor backend</p>
              <div className="text-xs text-yellow-300/80 space-y-1">
                <p>Para que esta funcionalidad trabaje correctamente, necesitas:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>
                    Configurar la variable de entorno{" "}
                    <code className="bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_API_URL</code> con la URL de tu API
                  </li>
                  <li>
                    Configurar la variable de entorno{" "}
                    <code className="bg-black/30 px-1 py-0.5 rounded">NEXT_PUBLIC_COMPANY_CODE</code> con el código de
                    tu empresa
                  </li>
                  <li>Asegurarte de que tu servidor backend esté corriendo</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-3xl font-bold text-white">Configuración de Branding</h2>

      {/* Logo Section */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-400" />
          Logo de la Empresa
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Vista Previa</label>
            <div className="relative w-full h-48 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="object-contain max-h-full max-w-full"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    setLogoPreview(null)
                  }}
                />
              ) : (
                <div className="text-center text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin logo</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Subir Nuevo Logo</label>
            <div className="flex flex-col gap-3">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, "logo")}
                className="hidden"
              />
              <button
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-white transition-all"
              >
                <Upload className="w-5 h-5" />
                Seleccionar Logo
              </button>
              <p className="text-xs text-gray-500">Formatos: PNG, JPG, SVG • Máximo 10MB</p>
            </div>
          </div>
        </div>
      </div>

      {/* Background Section */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-purple-400" />
          Fondo del Login
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Vista Previa</label>
            <div className="relative w-full h-48 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
              {backgroundPreview ? (
                <img
                  src={backgroundPreview}
                  alt="Background preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.style.display = 'none'
                    setBackgroundPreview(null)
                  }}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-center text-gray-500">
                  <div>
                    <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Sin fondo personalizado</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Subir Nuevo Fondo</label>
            <div className="flex flex-col gap-3">
              <input
                ref={backgroundInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e, "background")}
                className="hidden"
              />
              <button
                onClick={() => backgroundInputRef.current?.click()}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl text-white transition-all"
              >
                <Upload className="w-5 h-5" />
                Seleccionar Fondo
              </button>
              <p className="text-xs text-gray-500">Formatos: PNG, JPG • Máximo 10MB • Recomendado: 1920x1080px</p>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading || (!logoFile && !backgroundFile)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar Cambios
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <p className="text-sm text-blue-300">
          Los cambios se aplicarán inmediatamente en la pantalla de login para todos los usuarios de tu empresa.
        </p>
      </div>
    </div>
  )
}
