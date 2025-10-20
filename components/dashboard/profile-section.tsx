"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { User, Mail, Lock, FileText, Camera, X, Loader2, Check, Upload, ImageIcon } from "lucide-react"
import { useCompany } from "@/lib/company-context"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"

interface UserProfile {
  id: number
  nombre: string
  email: string
  foto?: string | null
}

const PREDEFINED_AVATARS = ["/a1.png", "/a2.png", "/a3.png", "/a4.png", "/a5.png"]

function ChangePhotoModal({
  open,
  onClose,
  onPhotoChange,
  onAvatarSelect,
  uploading,
}: {
  open: boolean
  onClose: () => void
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onAvatarSelect: (avatarUrl: string) => void
  uploading: boolean
}) {
  const [activeTab, setActiveTab] = useState<"upload" | "avatars">("avatars")
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white/95">Cambiar Foto de Perfil</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => setActiveTab("avatars")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "avatars" ? "bg-white text-black" : "text-white/70 hover:text-white/90"
            }`}
          >
            <ImageIcon className="w-4 h-4 inline-block mr-2" />
            Elegir Avatar
          </button>
          <button
            onClick={() => setActiveTab("upload")}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === "upload" ? "bg-white text-black" : "text-white/70 hover:text-white/90"
            }`}
          >
            <Upload className="w-4 h-4 inline-block mr-2" />
            Subir Foto
          </button>
        </div>

        {/* Content */}
        {activeTab === "avatars" ? (
          <div>
            <p className="text-sm text-white/60 mb-4">Selecciona un avatar predeterminado</p>
            <div className="grid grid-cols-5 gap-3">
              {PREDEFINED_AVATARS.map((avatar, index) => (
                <button
                  key={index}
                  onClick={() => {
                    onAvatarSelect(avatar)
                    onClose()
                  }}
                  className="aspect-square rounded-full border-2 border-white/10 hover:border-white/40 transition-all hover:scale-105 overflow-hidden bg-white/5"
                >
                  <img
                    src={avatar || "/placeholder.svg"}
                    alt={`Avatar ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-white/60 mb-4">Sube una imagen personalizada (máx. 5MB)</p>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center hover:border-white/40 hover:bg-white/5 transition-all cursor-pointer"
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-12 h-12 text-white/70 animate-spin" />
                  <p className="text-sm text-white/70">Subiendo imagen...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center">
                    <Upload className="w-8 h-8 text-white/70" />
                  </div>
                  <div>
                    <p className="text-sm text-white/90 font-medium mb-1">Haz clic para subir</p>
                    <p className="text-xs text-white/50">PNG, JPG o JPEG</p>
                  </div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                onPhotoChange(e)
                setTimeout(() => onClose(), 1000)
              }}
              className="hidden"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function ChangePasswordModal({ open, onClose, profileId }: { open: boolean; onClose: () => void; profileId?: number }) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { apiUrl } = useCompany()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden")
      return
    }

    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres")
      return
    }

    if (newPassword.length > 20) {
      setError("La contraseña no puede exceder 20 caracteres")
      return
    }

    if (!apiUrl || !profileId) {
      setError("No se pudo identificar el usuario")
      return
    }

    try {
      setLoading(true)

      const requestBody = {
        PIKER_ID: profileId,
        PASS: newPassword,
      }

      const res = await fetch(`${apiUrl}/editar-piker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Error al cambiar la contraseña")
      }

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      })

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      onClose()
    } catch (err: any) {
      console.error("[v0] Password change error:", err)
      setError(err.message || "Error al cambiar la contraseña")
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white/95">Cambiar Contraseña</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Nueva Contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Ingresa tu nueva contraseña (máx. 20 caracteres)"
              required
              maxLength={20}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">Confirmar Nueva Contraseña</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
              placeholder="Confirma tu nueva contraseña"
              required
              maxLength={20}
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-md p-3">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Cambiar Contraseña"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PerfilPage() {
  const { apiUrl, companyData, userData, isReady, setUserData } = useCompany()
  const { toast } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [newName, setNewName] = useState("")
  const [savingName, setSavingName] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [photoModalOpen, setPhotoModalOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0) // Nuevo estado para forzar la actualización

  // Función para obtener los datos del usuario desde /pikers
  const fetchUserData = async () => {
    if (!apiUrl || !userData) return

    try {
      const userId = userData.id || userData.PIKER_ID || userData.ID || 0
      if (!userId) return

      console.log("[v0] Fetching user data from /pikers for userId:", userId)

      const res = await fetch(`${apiUrl}/pikers`)
      const data = await res.json()

      if (!res.ok || !data?.pikers) {
        throw new Error("Error al obtener los datos del usuario")
      }

      // Buscar el usuario actual en la lista
      const currentUser = data.pikers.find((p: any) => p.PIKER_ID === userId)
      
      if (currentUser) {
        console.log("[v0] Found user data:", currentUser)
        
        // Construir la URL de la imagen si existe
        let imageUrl = null
        if (currentUser.IMAGEN_COLAB) {
          imageUrl = `data:${currentUser.IMAGEN_COLAB_MIME || "image/jpeg"};base64,${currentUser.IMAGEN_COLAB}`
        }

        const userProfile: UserProfile = {
          id: currentUser.PIKER_ID,
          nombre: currentUser.NOMBRE || userData.nombre || userData.NOMBRE || userData.user || "Usuario",
          email: userData.email || userData.EMAIL || "",
          foto: imageUrl,
        }

        setProfile(userProfile)
        setNewName(userProfile.nombre)

        // CORRECCIÓN: Actualizar el contexto con la imagen del servidor sin usar función de actualización
        if (userData) {
          setUserData({
            ...userData,
            foto: imageUrl,
            nombre: userProfile.nombre,
          })
        }
      }
    } catch (error) {
      console.error("[v0] Error fetching user data:", error)
      // Si hay error, usar los datos del contexto
      if (userData) {
        const userId = userData.id || userData.PIKER_ID || userData.ID || 0
        const userProfile: UserProfile = {
          id: userId,
          nombre: userData.nombre || userData.NOMBRE || userData.user || "Usuario",
          email: userData.email || userData.EMAIL || "",
          foto: userData.foto || userData.IMAGEN_COLAB || null,
        }
        setProfile(userProfile)
        setNewName(userProfile.nombre)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isReady || !userData) return

    console.log("[v0] Component mounted, fetching user data...")
    fetchUserData()
  }, [isReady, userData, refreshKey]) // Agregamos refreshKey para recargar cuando cambie

  const handlePhotoClick = () => {
    setPhotoModalOpen(true)
  }

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !apiUrl || !profile?.id) {
      console.log("[v0] Missing requirements:", { file: !!file, apiUrl, profileId: profile?.id })
      return
    }
  // >>> INICIO DE LA VALIDACIÓN <<<
  const MAX_FILE_SIZE =  10 * 1024 * 1024; // 5MB
  if (file.size > MAX_FILE_SIZE) {
    toast({
      title: "Archivo demasiado grande",
      description: "Por favor, selecciona una imagen menor a 5MB.",
      variant: "destructive",
    })
    return; // Detiene la función aquí
  }
    try {
      setUploadingPhoto(true)

      const reader = new FileReader()
      reader.onload = async () => {
        const result = reader.result as string
        const [, meta, base64] = result.match(/^data:(.*?);base64,(.*)$/) || []

        if (!base64) {
          throw new Error("Error al procesar la imagen")
        }

        console.log("[v0] Sending photo update with PIKER_ID:", profile.id)

        // Creamos la URL de la imagen inmediatamente para mostrarla
        const imageUrl = `data:${meta || file.type || "image/jpeg"};base64,${base64}`
        
        // Actualizamos el estado local con la nueva imagen
        setProfile((prev) => (prev ? { ...prev, foto: imageUrl } : null))
        
        // Actualizamos el contexto de usuario
        if (userData) {
          setUserData({ ...userData, foto: imageUrl })
        }

        // Forzamos una actualización del componente
        setRefreshKey(prev => prev + 1)

        // Enviamos la imagen al servidor
        const res = await fetch(`${apiUrl}/editar-piker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            PIKER_ID: profile.id,
            IMAGEN_COLAB_BASE64: base64,
            IMAGEN_COLAB_MIME: meta || file.type || "image/jpeg",
          }),
        })

        const data = await res.json()

        if (!res.ok || !data?.ok) {
          throw new Error(data?.message || "Error al subir la foto")
        }

        // Después de subir exitosamente, volvemos a obtener los datos del servidor
        // para asegurar que tenemos la versión más reciente
        setTimeout(() => {
          fetchUserData()
        }, 500)

        toast({
          title: "Foto actualizada",
          description: "Tu foto de perfil ha sido actualizada exitosamente",
        })

        setUploadingPhoto(false)
      }

      reader.onerror = () => {
        toast({
          title: "Error",
          description: "Error al leer la imagen",
          variant: "destructive",
        })
        setUploadingPhoto(false)
      }

      reader.readAsDataURL(file)
    } catch (err: any) {
      console.error("[v0] Photo upload error:", err)
      toast({
        title: "Error",
        description: err.message || "Error al actualizar la foto",
        variant: "destructive",
      })
      setUploadingPhoto(false)
    }
  }

  const handleAvatarSelect = async (avatarUrl: string) => {
    if (!apiUrl || !profile?.id) {
      console.log("[v0] Missing requirements for avatar:", { apiUrl, profileId: profile?.id })
      return
    }

    try {
      setUploadingPhoto(true)

      console.log("[v0] Sending avatar update with PIKER_ID:", profile.id)

      // Actualizamos con el avatar predefinido inmediatamente
      setProfile((prev) => (prev ? { ...prev, foto: avatarUrl } : null))

      // Update userData context
      if (userData) {
        setUserData({ ...userData, foto: avatarUrl })
      }

      // Forzamos una actualización del componente
      setRefreshKey(prev => prev + 1)

      // Para avatares predefinidos, enviamos una cadena vacía para limpiar la imagen actual
      const res = await fetch(`${apiUrl}/editar-piker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PIKER_ID: profile.id,
          IMAGEN_COLAB_BASE64: "", // Vacío para limpiar la imagen actual
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Error al actualizar la foto")
      }

      // Después de actualizar, volvemos a obtener los datos del servidor
      setTimeout(() => {
        fetchUserData()
      }, 500)

      toast({
        title: "Foto actualizada",
        description: "Tu foto de perfil ha sido actualizada exitosamente",
      })
    } catch (err: any) {
      console.error("[v0] Avatar select error:", err)
      toast({
        title: "Error",
        description: err.message || "Error al actualizar la foto",
        variant: "destructive",
      })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleSaveName = async () => {
    if (!apiUrl || !newName.trim() || !profile?.id) {
      console.log("[v0] Missing requirements for name save:", { apiUrl, newName, profileId: profile?.id })
      return
    }

    try {
      setSavingName(true)

      console.log("[v0] Sending name update with PIKER_ID:", profile.id)

      const res = await fetch(`${apiUrl}/editar-piker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          PIKER_ID: profile.id,
          NOMBRE: newName.trim(),
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "Error al actualizar el nombre")
      }

      // Después de actualizar, volvemos a obtener los datos del servidor
      setTimeout(() => {
        fetchUserData()
      }, 500)

      setEditingName(false)

      toast({
        title: "Nombre actualizado",
        description: "Tu nombre ha sido actualizado exitosamente",
      })
    } catch (err: any) {
      console.error("[v0] Name save error:", err)
      toast({
        title: "Error",
        description: err.message || "Error al actualizar el nombre",
        variant: "destructive",
      })
    } finally {
      setSavingName(false)
    }
  }

  const getUserInitial = () => {
    const name = profile?.nombre || userData?.nombre || userData?.user || "U"
    return name.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="flex items-center gap-3 text-white/70">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Cargando perfil...</span>
        </div>
      </div>
    )
  }
  return (
    <div className="h-screen bg-black overflow-hidden flex items-center justify-center p-2">
      <div className="w-full max-w-4xl h-full max-h-[900px] flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white/95">Mi Perfil</h1>
          </div>
          <div className="text-sm text-white/40">{companyData?.nombre}</div>
        </div>

        <div className="flex-1 flex flex-col gap-6 min-h-0 overflow-y-auto">
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full border-2 border-white/10 overflow-hidden bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                  {profile?.foto ? (
                    <img
                      key={refreshKey} // Agregamos key para forzar la recarga de la imagen
                      src={profile.foto || "/placeholder.svg"}
                      alt="Foto de perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-white">{getUserInitial()}</span>
                  )}
                </div>
                <button
                  onClick={handlePhotoClick}
                  disabled={uploadingPhoto}
                  className="absolute inset-0 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                >
                  {uploadingPhoto ? (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  ) : (
                    <Camera className="w-5 h-5 text-white" />
                  )}
                </button>
              </div>

              <div className="flex-1 min-w-0">
                {editingName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-white font-semibold placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/20"
                      placeholder="Tu nombre"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveName}
                        disabled={savingName || !newName.trim()}
                        className="px-3 py-1.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                      >
                        {savingName ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Guardar
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingName(false)
                          setNewName(profile?.nombre || "")
                        }}
                        className="px-3 py-1.5 rounded-lg border border-white/10 text-white/70 text-sm hover:bg-white/5 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-white/95 mb-1 truncate">{profile?.nombre || "Usuario"}</h2>
                    <p className="text-sm text-white/50 flex items-center gap-1.5 mb-3 truncate">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      {profile?.email || "email@ejemplo.com"}
                    </p>
                    <button
                      onClick={() => setEditingName(true)}
                      className="px-3 py-1.5 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors text-sm font-medium"
                    >
                      Editar Nombre
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white/95 mb-4">Información de la Cuenta</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-white/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-white/50 mb-0.5">Correo Electrónico</div>
                  <div className="text-sm text-white/90 font-medium truncate">
                    {profile?.email || "email@ejemplo.com"}
                  </div>
                </div>
              </div>

              {userData?.user && (
                <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-lg">
                  <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center flex-shrink-0">
                    <User className="w-6 h-6 text-white/70" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-white/50 mb-0.5">Usuario</div>
                    <div className="text-sm text-white/90 font-medium">{userData.user}</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-white/10 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors flex-shrink-0">
                <Lock className="w-5 h-5 text-white/70" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm text-white/90 font-medium">Cambiar Contraseña</div>
              </div>
            </button>

            <a
              href="/facturacion"
              className="flex items-center gap-3 p-4 bg-[#0a0a0a] border border-white/10 rounded-xl hover:bg-white/5 transition-colors group"
            >
              <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors flex-shrink-0">
                <FileText className="w-5 h-5 text-white/70" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm text-white/90 font-medium">Facturación</div>
              </div>
            </a>
          </div>

      
        </div>
      </div>

      <ChangePasswordModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        profileId={profile?.id}
      />
      <ChangePhotoModal
        open={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoChange={handlePhotoChange}
        onAvatarSelect={handleAvatarSelect}
        uploading={uploadingPhoto}
      />
      <Toaster />
    </div>
  )
}