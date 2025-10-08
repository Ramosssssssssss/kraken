"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { ImageIcon, Upload, Save, Loader2, CheckCircle2, XCircle } from "lucide-react"
import { useCompany } from "@/lib/company-context"
import Image from "next/image"

interface Toast {
  id: number
  type: "success" | "error"
  message: string
}

export default function PersonalizeSection() {
  const { companyData, apiUrl } = useCompany()
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [toasts, setToasts] = useState<Toast[]>([])

  const logoInputRef = useRef<HTMLInputElement>(null)
  const backgroundInputRef = useRef<HTMLInputElement>(null)

  // useEffect(() => {
  //   if (!apiUrl || !companyData?.codigo) return

  //   const fetchBranding = async () => {
  //     try {
  //       const response = await fetch(`${apiUrl}/get-branding/${companyData.codigo}`)
  //       const data = await response.json()

  //       if (data.ok && data.branding) {
  //         if (data.branding.logo) {
  //           setLogoPreview(data.branding.logo)
  //         }
  //         if (data.branding.background) {
  //           setBackgroundPreview(data.branding.background)
  //         }
  //       }
  //     } catch (error) {
  //       console.error("Error fetching branding:", error)
  //     } finally {
  //       setIsFetching(false)
  //     }
  //   }

  //   fetchBranding()
  // }, [apiUrl, companyData])

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

    // Validate file type
    if (!file.type.startsWith("image/")) {
      showToast("error", "Por favor selecciona una imagen válida")
      return
    }

    // Validate file size (max 10MB)
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
      } else {
        showToast("error", data.message || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving branding:", error)
      showToast("error", "Error de conexión al guardar")
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

      <h2 className="text-3xl font-bold text-white">Personalización del Login</h2>

      {/* Logo Section */}
      <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-blue-400" />
          Logo de la Empresa
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Preview */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Vista Previa</label>
            <div className="relative w-full h-48 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
              {logoPreview ? (
                <Image
                  src={logoPreview || "/placeholder.svg"}
                  alt="Logo preview"
                  width={200}
                  height={200}
                  className="object-contain max-h-full"
                />
              ) : (
                <div className="text-center text-gray-500">
                  <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Sin logo</p>
                </div>
              )}
            </div>
          </div>

          {/* Upload */}
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
          {/* Preview */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Vista Previa</label>
            <div className="relative w-full h-48 bg-black/40 border border-white/10 rounded-xl overflow-hidden">
              {backgroundPreview ? (
                <Image
                  src={backgroundPreview || "/placeholder.svg"}
                  alt="Background preview"
                  fill
                  className="object-cover"
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

          {/* Upload */}
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
          💡 Los cambios se aplicarán inmediatamente en la pantalla de login para todos los usuarios de tu empresa.
        </p>
      </div>
    </div>
  )
}
