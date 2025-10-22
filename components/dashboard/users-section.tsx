"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import {
  Edit3,
  UserPlus,
  MailPlus,
  X,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Trash2,
  AlertTriangle,
} from "lucide-react"
import { useCompany } from "@/lib/company-context"
import { fetchJsonWithRetry } from "@/lib/fetch-with-retry"

type Estatus = "A" | "I"
type RolString = "PICKER" | "EDITOR" | "ADMIN"

interface Piker {
  PIKER_ID: number
  NOMBRE: string
  USUARIO: string | null
  ESTATUS: Estatus
  IMAGEN_COLAB?: string | null
  IMAGEN_COLAB_MIME?: string | null
  ROL: number | string
  MODULOS_KRKN?: string
}

const ROLE_TO_INT: Record<RolString, number> = { PICKER: 1, EDITOR: 2, ADMIN: 3 }
const INT_TO_ROLE: Record<number, RolString> = { 1: "PICKER", 2: "EDITOR", 3: "ADMIN" }
const normalizeRoleForView = (r: number | string): RolString =>
  typeof r === "number"
    ? (INT_TO_ROLE[r] ?? "PICKER")
    : ((["PICKER", "EDITOR", "ADMIN"].includes(r.toUpperCase()) ? r.toUpperCase() : "PICKER") as RolString)

const getInitials = (name: string): string => {
  const words = name.trim().split(/\s+/)
  const initials = words
    .slice(0, 3) // Maximum 3 words
    .map((word) => word.charAt(0).toUpperCase())
    .join("")
  return initials || "?"
}

export default function UsersSection() {
  const { apiUrl, isReady } = useCompany()

  const [all, setAll] = useState<Piker[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 7

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Piker | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState("")

  // Modal crear
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({
    NOMBRE: "",
    USUARIO: "",
    PASS: "",
    ROL: "PICKER" as RolString,
    ESTATUS: "A" as Estatus,
    IMAGEN_COLAB_BASE64: "",
    IMAGEN_COLAB_MIME: "",
  })
  const [showPass, setShowPass] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  // Modal editar
  const [openEdit, setOpenEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    PIKER_ID: 0,
    NOMBRE: "",
    USUARIO: "",
    PASS: "",
    ROL: "PICKER" as RolString,
    ESTATUS: "A" as Estatus,
    IMAGEN_COLAB_BASE64: undefined as string | undefined,
    IMAGEN_COLAB_MIME: undefined as string | undefined,
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState("")

  const openEditWith = (p: Piker) => {
    setEditError("")
    setEditForm({
      PIKER_ID: p.PIKER_ID,
      NOMBRE: p.NOMBRE || "",
      USUARIO: p.USUARIO || "",
      PASS: "",
      ROL: normalizeRoleForView(p.ROL),
      ESTATUS: (p.ESTATUS || "A") as Estatus,
      IMAGEN_COLAB_BASE64: undefined,
      IMAGEN_COLAB_MIME: undefined,
    })
    setOpenEdit(true)
  }

  const onEditFileChange = (file?: File | null) => {
    if (!file) {
      setEditForm((f) => ({ ...f, IMAGEN_COLAB_BASE64: "", IMAGEN_COLAB_MIME: undefined }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [, meta, base64] = result.match(/^data:(.*?);base64,(.*)$/) || []
      setEditForm((f) => ({
        ...f,
        IMAGEN_COLAB_BASE64: base64 || "",
        IMAGEN_COLAB_MIME: meta || file.type || "image/jpeg",
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError("")
    if (!apiUrl) return setEditError("No hay API disponible")
    if (!editForm.NOMBRE.trim()) return setEditError("Nombre es requerido")

    const payload: any = {
      PIKER_ID: editForm.PIKER_ID,
      NOMBRE: editForm.NOMBRE.trim(),
      USUARIO: editForm.USUARIO.trim() || null,
      ROL: ROLE_TO_INT[editForm.ROL] ?? 1,
      ESTATUS: editForm.ESTATUS,
    }

    if (editForm.PASS) payload.PASS = (editForm.PASS || "").slice(0, 20)

    if (typeof editForm.IMAGEN_COLAB_BASE64 === "string") {
      payload.IMAGEN_COLAB_BASE64 = editForm.IMAGEN_COLAB_BASE64
      if (editForm.IMAGEN_COLAB_BASE64) {
        payload.IMAGEN_COLAB_MIME = editForm.IMAGEN_COLAB_MIME || "image/jpeg"
      }
    }

    try {
      setSavingEdit(true)
      const data = await fetchJsonWithRetry(`${apiUrl}/editar-piker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!data?.ok) {
        return setEditError(data?.message || "No se pudo actualizar el usuario")
      }

      setAll((prev) =>
        prev.map((p) => {
          if (p.PIKER_ID !== editForm.PIKER_ID) return p
          const updated: Piker = { ...p }
          updated.NOMBRE = payload.NOMBRE
          updated.USUARIO = payload.USUARIO
          updated.ROL = payload.ROL
          updated.ESTATUS = payload.ESTATUS
          if (typeof editForm.IMAGEN_COLAB_BASE64 === "string") {
            if (editForm.IMAGEN_COLAB_BASE64 === "") {
              updated.IMAGEN_COLAB = null
              updated.IMAGEN_COLAB_MIME = null
            } else {
              updated.IMAGEN_COLAB = editForm.IMAGEN_COLAB_BASE64
              updated.IMAGEN_COLAB_MIME = editForm.IMAGEN_COLAB_MIME || "image/jpeg"
            }
          }
          return updated
        }),
      )
      setOpenEdit(false)
    } catch (e) {
      console.error(e)
      setEditError("Error de conexión al actualizar")
    } finally {
      setSavingEdit(false)
    }
  }

  const openDeleteConfirm = (p: Piker) => {
    setUserToDelete(p)
    setDeleteError("")
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!apiUrl || !userToDelete) return

    const normalizedApi =
      typeof window !== "undefined" && window.location.protocol === "https:" && apiUrl.startsWith("http:")
        ? apiUrl.replace(/^http:/, "https:")
        : apiUrl

    const tryDelete = async () => {
      try {
        const data = await fetchJsonWithRetry(`${normalizedApi}/eliminar-piker/${userToDelete.PIKER_ID}`, {
          method: "DELETE",
          mode: "cors",
        })
        if (data?.ok) return true

        // Si falla, intenta con POST
        const data2 = await fetchJsonWithRetry(`${normalizedApi}/eliminar-piker`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          body: JSON.stringify({ id: userToDelete.PIKER_ID }),
        })
        if (data2?.ok) return true
        throw new Error(data2?.message || "No se pudo eliminar (POST fallback)")
      } catch (err) {
        // Último intento con POST
        try {
          const data2 = await fetchJsonWithRetry(`${normalizedApi}/eliminar-piker`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            mode: "cors",
            body: JSON.stringify({ id: userToDelete.PIKER_ID }),
          })
          if (data2?.ok) return true
          throw new Error(data2?.message || "No se pudo eliminar (POST fallback)")
        } catch (e2) {
          throw e2
        }
      }
    }

    try {
      setDeleteError("")
      setDeletingId(userToDelete.PIKER_ID)

      const ok = await tryDelete()
      if (!ok) throw new Error("No se pudo eliminar")

      setAll((prev) => {
        const next = prev.filter((x) => x.PIKER_ID !== userToDelete.PIKER_ID)
        setPage((pg) => {
          const newTotal = prev.length - 1
          const newPages = Math.max(Math.ceil(newTotal / pageSize), 1)
          return Math.min(pg, newPages)
        })
        return next
      })
      setDeleteConfirmOpen(false)
      setUserToDelete(null)
    } catch (e: any) {
      console.error(e)
      setDeleteError(e?.message || "Error de conexión al eliminar")
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (!isReady || !apiUrl) return
    ;(async () => {
      setError("")
      setLoading(true)
      try {
        const data = await fetchJsonWithRetry(`${apiUrl}/pikers`)
        const list: Piker[] = Array.isArray(data) ? data : Array.isArray(data?.pikers) ? data.pikers : []
        if (!Array.isArray(list)) throw new Error(data?.message || "No se pudieron cargar los pickers")
        setAll(list)
        setPage(1)
      } catch (e: any) {
        setError(e?.message || "Error al cargar los pickers")
      } finally {
        setLoading(false)
      }
    })()
  }, [apiUrl, isReady])

  const total = all.length
  const pages = Math.max(Math.ceil(total / pageSize), 1)
  const visible = useMemo(() => {
    const start = (page - 1) * pageSize
    return all.slice(start, start + pageSize)
  }, [all, page])

  const onFileChange = (file?: File | null) => {
    if (!file) {
      setForm((f) => ({ ...f, IMAGEN_COLAB_BASE64: "", IMAGEN_COLAB_MIME: "" }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const [, meta, base64] = result.match(/^data:(.*?);base64,(.*)$/) || []
      setForm((f) => ({
        ...f,
        IMAGEN_COLAB_BASE64: base64 || "",
        IMAGEN_COLAB_MIME: meta || file.type || "image/jpeg",
      }))
    }
    reader.readAsDataURL(file)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")
    if (!apiUrl) return setCreateError("No hay API disponible")
    if (!form.NOMBRE.trim()) return setCreateError("Nombre es requerido")
    if (form.PASS && form.PASS.length > 20) return setCreateError("La contraseña no puede exceder 20 caracteres")

    const payload = {
      NOMBRE: form.NOMBRE.trim(),
      USUARIO: form.USUARIO.trim() || null,
      PASS: form.PASS || null,
      ROL: ROLE_TO_INT[form.ROL] ?? 1,
      ESTATUS: form.ESTATUS as Estatus,
      MODULOS_KRKN: "CORE",
      IMAGEN_COLAB_BASE64: form.IMAGEN_COLAB_BASE64 || undefined,
      IMAGEN_COLAB_MIME: form.IMAGEN_COLAB_MIME || undefined,
    }

    try {
      setCreating(true)
      const data = await fetchJsonWithRetry(`${apiUrl}/anadir-piker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!data?.ok) {
        return setCreateError(data?.message || "No se pudo crear el usuario")
      }

      const created: Piker = data.piker
      setAll((prev) => [created, ...prev])
      setPage(1)

      setOpenCreate(false)
      setForm({
        NOMBRE: "",
        USUARIO: "",
        PASS: "",
        ROL: "PICKER",
        ESTATUS: "A",
        IMAGEN_COLAB_BASE64: "",
        IMAGEN_COLAB_MIME: "",
      })
      setShowPass(false)
    } catch (e) {
      console.error(e)
      setCreateError("Error de conexión al crear usuario")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold text-white">Gestión de Usuarios</h2>
            <p className="text-sm text-white/40">Administra los usuarios del sistema</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 text-sm text-white/90 transition-colors rounded-lg">
              <MailPlus className="w-4 h-4" />
              Invitar por correo
            </button>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/10 px-4 py-2 text-sm font-medium text-white transition-colors rounded-lg"
            >
              <UserPlus className="w-4 h-4" />
              Crear usuario
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {loading && <p className="text-white/60 px-6">Cargando usuarios...</p>}
          {error && <p className="text-red-400 px-6">{error}</p>}

          {!loading && !error && (
            <div className="bg-white/[0.02] border border-white/5 rounded-xl overflow-hidden">
              {visible.map((piker) => {
                const roleLabel = normalizeRoleForView(piker.ROL)
                const initials = getInitials(piker.NOMBRE)

                return (
                  <div
                    key={piker.PIKER_ID}
                    className="group bg-black/40 hover:bg-black/60 border-b border-white/5 last:border-b-0 p-6 transition-all duration-200"
                  >
                    <div className="flex items-center gap-6">
                      {/* Avatar section */}
                      <div className="flex-shrink-0">
                        <div className="w-12 h-12 rounded-full bg-white/5 group-hover:bg-white/10 flex items-center justify-center overflow-hidden transition-all duration-200">
                          {piker.IMAGEN_COLAB ? (
                            <img
                              src={`data:${piker.IMAGEN_COLAB_MIME};base64,${piker.IMAGEN_COLAB}`}
                              alt={piker.NOMBRE}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-white/60 font-medium text-sm">{initials}</span>
                          )}
                        </div>
                      </div>

                      {/* Content section */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h4 className="text-base font-medium text-white/90 group-hover:text-white transition-colors">
                            {piker.NOMBRE}
                          </h4>
                          <span className="text-[10px] text-white/30 font-mono uppercase">{roleLabel}</span>
                        </div>
                        <p className="text-sm text-white/40 group-hover:text-white/60 transition-colors">
                          {piker.USUARIO || "Sin usuario asignado"}
                        </p>
                      </div>

                      {/* Status and actions section */}
                      <div className="flex-shrink-0 flex items-center gap-4">
                        <span className="text-xs text-white/40 bg-white/5 px-3 py-1 rounded-lg">
                          {piker.ESTATUS === "A" ? "Activo" : "Inactivo"}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditWith(piker)}
                            className="p-2 text-white/40 hover:text-white/90 hover:bg-white/10 rounded-lg transition-all"
                            title="Editar"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => openDeleteConfirm(piker)}
                            disabled={deletingId === piker.PIKER_ID}
                            className="p-2 text-white/40 hover:text-red-400 hover:bg-white/10 rounded-lg transition-all disabled:opacity-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {!loading && !error && total > 0 && (
            <div className="flex items-center justify-between px-6">
              <div className="text-white/40 text-sm">
                Página {page} de {pages} · {total} usuarios
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm text-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 text-sm text-white/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors rounded-lg"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {deleteConfirmOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !deletingId && setDeleteConfirmOpen(false)}
          />
          <div className="relative w-full max-w-md mx-4 rounded-xl border border-white/10 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl">
            <div className="flex items-start gap-4 mb-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="text-white text-lg font-semibold mb-2">Eliminar Usuario</h4>
                <p className="text-white/60 text-sm">
                  ¿Estás seguro de que deseas eliminar a{" "}
                  <span className="text-white font-medium">{userToDelete.NOMBRE}</span>? Esta acción no se puede
                  deshacer.
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-red-400 text-sm">{deleteError}</p>
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                className="px-4 py-2 text-white/90 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                onClick={() => !deletingId && setDeleteConfirmOpen(false)}
                disabled={!!deletingId}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={!!deletingId}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-lg transition-colors disabled:opacity-50"
              >
                {deletingId ? "Eliminando..." : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Crear */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !creating && setOpenCreate(false)}
          />
          <div className="relative w-full max-w-md mx-4 rounded-xl border border-white/10 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl">
            <button
              className="absolute right-3 top-3 p-2 rounded-lg hover:bg-white/10 text-white/80"
              onClick={() => !creating && setOpenCreate(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-white text-lg font-semibold mb-4">Crear Usuario</h4>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre *</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={form.NOMBRE}
                  onChange={(e) => setForm((f) => ({ ...f, NOMBRE: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Usuario *</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={form.USUARIO}
                  onChange={(e) => setForm((f) => ({ ...f, USUARIO: e.target.value }))}
                  placeholder="jperez"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Contraseña *</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                    value={form.PASS}
                    onChange={(e) => setForm((f) => ({ ...f, PASS: e.target.value }))}
                    placeholder="máx. 20 caracteres"
                    maxLength={20}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-white/10 text-white/80"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Correo (opcional)</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  placeholder="email@krkn.mx"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Rol</label>
                  <select
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-white/30"
                    value={form.ROL}
                    onChange={(e) => setForm((f) => ({ ...f, ROL: e.target.value as RolString }))}
                  >
                    <option value="PICKER">PICKER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Foto (opcional)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => onFileChange(e.target.files?.[0])}
                  className="block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/15"
                />
              </div>

              {createError && <p className="text-red-400 text-sm">{createError}</p>}
              <label className="block text-[11px] text-white/50 mb-1">* Campos Obligatorios</label>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-white/90 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  onClick={() => !creating && setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium border border-white/10 rounded-lg transition-colors"
                >
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {openEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => !savingEdit && setOpenEdit(false)}
          />
          <div className="relative w-full max-w-md mx-4 rounded-xl border border-white/10 bg-black/90 backdrop-blur-2xl p-6 shadow-2xl">
            <button
              className="absolute right-3 top-3 p-2 rounded-lg hover:bg-white/10 text-white/80"
              onClick={() => !savingEdit && setOpenEdit(false)}
            >
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-white text-lg font-semibold mb-4">Editar Usuario</h4>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre *</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={editForm.NOMBRE}
                  onChange={(e) => setEditForm((f) => ({ ...f, NOMBRE: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Usuario</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={editForm.USUARIO}
                  onChange={(e) => setEditForm((f) => ({ ...f, USUARIO: e.target.value }))}
                  placeholder="jperez"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Contraseña (dejar vacío para no cambiar)</label>
                <input
                  type="password"
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={editForm.PASS}
                  onChange={(e) => setEditForm((f) => ({ ...f, PASS: e.target.value }))}
                  placeholder="máx. 20 caracteres"
                  maxLength={20}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Rol</label>
                  <select
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-white/30"
                    value={editForm.ROL}
                    onChange={(e) => setEditForm((f) => ({ ...f, ROL: e.target.value as RolString }))}
                  >
                    <option value="PICKER">PICKER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-white/70 mb-1">Estatus</label>
                  <select
                    className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white focus:outline-none focus:border-white/30"
                    value={editForm.ESTATUS}
                    onChange={(e) => setEditForm((f) => ({ ...f, ESTATUS: e.target.value as Estatus }))}
                  >
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Foto</label>
                <div className="space-y-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => onEditFileChange(e.target.files?.[0])}
                    className="block w-full text-sm text-white/70 file:mr-4 file:rounded-lg file:border-0 file:bg-white/10 file:px-3 file:py-2 file:text-white hover:file:bg-white/15"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      id="clear-photo"
                      type="checkbox"
                      className="accent-white/80"
                      checked={editForm.IMAGEN_COLAB_BASE64 === ""}
                      onChange={(e) =>
                        setEditForm((f) => ({
                          ...f,
                          IMAGEN_COLAB_BASE64: e.target.checked ? "" : undefined,
                          IMAGEN_COLAB_MIME: undefined,
                        }))
                      }
                    />
                    <label htmlFor="clear-photo" className="text-xs text-white/70">
                      Quitar foto actual
                    </label>
                  </div>
                </div>
              </div>

              {editError && <p className="text-red-400 text-sm">{editError}</p>}

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="px-4 py-2 text-white/90 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
                  onClick={() => !savingEdit && setOpenEdit(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-medium border border-white/10 rounded-lg transition-colors"
                >
                  {savingEdit ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
