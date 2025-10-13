"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Upload, Save, Loader2, CheckCircle2, XCircle, AlertCircle, Trash2, User } from "lucide-react"
import { useCompany } from "@/lib/company-context"

interface Toast {
  id: number
  type: "success" | "error"
  message: string
}

interface Avatar {
  id: number | null
  nombre: string
  preview: string | null
  file: File | null
}

export default function UploadAvatares() {
  const { companyData, apiUrl } = useCompany()
  const [avatares, setAvatares] = useState<Avatar[]>([
    { id: null, nombre: "", preview: null, file: null },
    { id: null, nombre: "", preview: null, file: null },
    { id: null, nombre: "", preview: null, file: null },
    { id: null, nombre: "", preview: null, file: null },
    { id: null, nombre: "", preview: null, file: null },
  ])
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [connectionError, setConnectionError] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])

  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!apiUrl || !companyData?.codigo) {
      setIsFetching(false)
      setConnectionError(true)
      return
    }

    const fetchAvatares = async () => {
      try {
        const response = await fetch(`${apiUrl}/get-avatares`)

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()

        if (data.ok && data.avatares && data.avatares.length > 0) {
          const loadedAvatares = [...avatares]
          data.avatares.forEach((avatar: any, index: number) => {
            if (index < 5) {
              loadedAvatares[index] = {
                id: avatar.id,
                nombre: avatar.nombre,
                preview: avatar.imagen,
                file: null,
              }
            }
          })
          setAvatares(loadedAvatares)
        }
        setConnectionError(false)
      } catch (error) {
        console.error("Error fetching avatares:", error)
        setConnectionError(true)
      } finally {
        setIsFetching(false)
      }
    }

    fetchAvatares()
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

  const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
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
      const newAvatares = [...avatares]
      newAvatares[index] = {
        ...newAvatares[index],
        preview,
        file,
      }
      setAvatares(newAvatares)
    }
    reader.readAsDataURL(file)
  }

  const handleNombreChange = (index: number, nombre: string) => {
    const newAvatares = [...avatares]
    newAvatares[index] = {
      ...newAvatares[index],
      nombre,
    }
    setAvatares(newAvatares)
  }

  const handleDelete = (index: number) => {
    const newAvatares = [...avatares]
    newAvatares[index] = {
      id: null,
      nombre: "",
      preview: null,
      file: null,
    }
    setAvatares(newAvatares)
  }

  const handleSave = async () => {
    if (!apiUrl || !companyData?.codigo) {
      showToast("error", "No se pudo obtener la información de la empresa")
      return
    }

    const avataresToSave = avatares.filter((avatar) => avatar.file || avatar.preview)

    if (avataresToSave.length === 0) {
      showToast("error", "Selecciona al menos un avatar para guardar")
      return
    }

    const missingNames = avataresToSave.some((avatar) => !avatar.nombre.trim())
    if (missingNames) {
      showToast("error", "Todos los avatares deben tener un nombre")
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()

      formData.append("codigo", companyData.codigo)

      let fieldIndex = 0
      avatares.forEach((avatar, originalIndex) => {
        if (avatar.file || avatar.preview) {
          if (avatar.file) {
            formData.append(`avatar${fieldIndex}`, avatar.file)
          }
          formData.append(`nombre${fieldIndex}`, avatar.nombre)
          if (avatar.id) {
            formData.append(`id${fieldIndex}`, avatar.id.toString())
          }
          fieldIndex++
        }
      })

      const response = await fetch(`${apiUrl}/upload-avatares`, {
        method: "POST",
        body: formData,
      })

      const data = await response.json()

      if (data.ok) {
        showToast("success", "Avatares actualizados exitosamente")
        setConnectionError(false)
      } else {
        showToast("error", data.message || "Error al guardar")
      }
    } catch (error) {
      console.error("Error saving avatares:", error)
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
                <p>Para que esta funcionalidad trabaje correctamente, necesitas configurar las variables de entorno.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-white">Gestión de Avatares</h2>
        <p className="text-white/60">Sube hasta 5 avatares personalizados para tu equipo</p>
      </div>

      {/* Avatares Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {avatares.map((avatar, index) => (
          <div key={index} className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4">
            {/* Preview */}
            <div className="relative w-full aspect-square bg-black/40 border border-white/10 rounded-xl flex items-center justify-center overflow-hidden group">
              {avatar.preview ? (
                <>
                  <img
                    src={avatar.preview || "/placeholder.svg"}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => handleDelete(index)}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 hover:bg-red-500 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-500">
                  <User className="w-12 h-12 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Avatar {index + 1}</p>
                </div>
              )}
            </div>

            {/* Nombre Input */}
            <input
              type="text"
              placeholder="Nombre del avatar"
              value={avatar.nombre}
              onChange={(e) => handleNombreChange(index, e.target.value)}
              className="w-full px-4 py-2 bg-black/40 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500/50 transition-colors"
            />

            {/* Upload Button */}
            <input
              ref={(el) => {
                fileInputRefs.current[index] = el
              }}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect(index, e)}
              className="hidden"
            />
            <button
              onClick={() => fileInputRefs.current[index]?.click()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-white text-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              {avatar.preview ? "Cambiar" : "Subir"}
            </button>
          </div>
        ))}
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isLoading || avatares.every((a) => !a.file && !a.preview)}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all shadow-lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Guardar Avatares
            </>
          )}
        </button>
      </div>

      {/* Info */}
      <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
        <p className="text-sm text-purple-300">
          Los avatares se guardarán en la base de datos y estarán disponibles para usar en toda la aplicación.
        </p>
      </div>
    </div>
  )
}
