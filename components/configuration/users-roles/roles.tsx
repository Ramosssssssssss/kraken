"use client"

import { Key, Plus, Edit2, Trash2, MoreVertical, X, ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import { useCompany } from "@/lib/company-context"

interface Role {
  id: number
  name: string
  description: string
  status: string
  createdAt?: string
  updatedAt?: string
}

export function Roles() {
  const { apiUrl, isReady } = useCompany()

  const [all, setAll] = useState<Role[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 7

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState("")

  // Modal crear
  const [openCreate, setOpenCreate] = useState(false)
  const [form, setForm] = useState({
    name: "",
    description: "",
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState("")

  // Modal editar
  const [openEdit, setOpenEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    id: 0,
    name: "",
    description: "",
  })
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState("")

  const openEditWith = (role: Role) => {
    setEditError("")
    setEditForm({
      id: role.id,
      name: role.name || "",
      description: role.description || "",
    })
    setOpenEdit(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditError("")
    if (!apiUrl) return setEditError("No hay API disponible")
    if (!editForm.name.trim()) return setEditError("Nombre es requerido")

    const payload: any = {
      id: editForm.id,
      name: editForm.name.trim(),
      description: editForm.description.trim(),
    }

    try {
      setSavingEdit(true)
      const res = await fetch(`${apiUrl}/editar-rol`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        return setEditError(data?.message || "No se pudo actualizar el rol")
      }

      setAll((prev) =>
        prev.map((role) => {
          if (role.id !== editForm.id) return role
          return {
            ...role,
            name: payload.name,
            description: payload.description,
            updatedAt: new Date().toISOString()
          }
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

  const openDeleteConfirm = (role: Role) => {
    setRoleToDelete(role)
    setDeleteError("")
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!apiUrl || !roleToDelete) return

    const normalizedApi =
      typeof window !== "undefined" && window.location.protocol === "https:" && apiUrl.startsWith("http:")
        ? apiUrl.replace(/^http:/, "https:")
        : apiUrl

    try {
      setDeleteError("")
      setDeletingId(roleToDelete.id)

      const res = await fetch(`${normalizedApi}/eliminar-rol/${roleToDelete.id}`, {
        method: "DELETE",
        mode: "cors",
      })
      let data: any = null
      try {
        data = await res.json()
      } catch {}
      
      if (!res.ok || !data?.ok) {
        // Intentar con método POST como fallback
        const res2 = await fetch(`${normalizedApi}/eliminar-rol`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          mode: "cors",
          body: JSON.stringify({ id: roleToDelete.id }),
        })
        const data2 = await res2.json().catch(() => ({}))
        if (!res2.ok || !data2?.ok) {
          throw new Error(data2?.message || "No se pudo eliminar el rol")
        }
      }

      setAll((prev) => {
        const next = prev.filter((x) => x.id !== roleToDelete.id)
        setPage((pg) => {
          const newTotal = prev.length - 1
          const newPages = Math.max(Math.ceil(newTotal / pageSize), 1)
          return Math.min(pg, newPages)
        })
        return next
      })
      setDeleteConfirmOpen(false)
      setRoleToDelete(null)
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
        const res = await fetch(`${apiUrl}/roles`)
        const data = await res.json()
        const list: Role[] = Array.isArray(data) ? data : Array.isArray(data?.roles) ? data.roles : []
        if (!res.ok || !Array.isArray(list)) throw new Error(data?.message || "No se pudieron cargar los roles")
        setAll(list)
        setPage(1)
      } catch (e: any) {
        setError(e?.message || "Error al cargar los roles")
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError("")
    if (!apiUrl) return setCreateError("No hay API disponible")
    if (!form.name.trim()) return setCreateError("Nombre es requerido")

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
    }

    try {
      setCreating(true)
      const res = await fetch(`${apiUrl}/anadir-rol`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        return setCreateError(data?.message || "No se pudo crear el rol")
      }

      const created: Role = data.role
      setAll((prev) => [created, ...prev])
      setPage(1)

      setOpenCreate(false)
      setForm({
        name: "",
        description: "",
      })
    } catch (e) {
      console.error(e)
      setCreateError("Error de conexión al crear rol")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Roles del Sistema</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            {total} rol(es) configurado(s)
          </p>
        </div>

        <button 
          onClick={() => setOpenCreate(true)}
          className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-light tracking-wide text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20"
        >
          <Plus className="h-4 w-4" />
          Nuevo Rol
        </button>
      </div>

      {loading && <p className="text-white/60 px-6">Cargando roles...</p>}
      {error && <p className="text-red-400 px-6">{error}</p>}

      {!loading && !error && total === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Key className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Gestión de Roles</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            No hay roles configurados. Añade tu primer rol para comenzar.
          </p>
        </div>
      )}

      {!loading && !error && total > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">ID</th>
                <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">NOMBRE</th>
                <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">DESCRIPCIÓN</th>
                <th className="px-6 py-4 text-right text-xs font-medium tracking-wider text-white/60">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {visible.map((role) => (
                <tr key={role.id} className="group transition-colors hover:bg-white/5">
                  <td className="px-6 py-4">
                    <span className="text-sm font-light text-white/70">#{role.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                        <Key className="h-5 w-5 text-purple-300" />
                      </div>
                      <div className="text-sm font-light text-white/90">{role.name}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-light text-white/60 max-w-md truncate">
                      {role.description || "Sin descripción"}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                      <button 
                        onClick={() => openEditWith(role)}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white/90"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => openDeleteConfirm(role)}
                        disabled={deletingId === role.id}
                        className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white/90">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {!loading && !error && total > 0 && (
        <div className="flex items-center justify-between px-6">
          <div className="text-white/40 text-sm">
            Página {page} de {pages} · {total} roles
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

      {/* Modal de confirmación de eliminación */}
      {deleteConfirmOpen && roleToDelete && (
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
                <h4 className="text-white text-lg font-semibold mb-2">Eliminar Rol</h4>
                <p className="text-white/60 text-sm">
                  ¿Estás seguro de que deseas eliminar el rol{" "}
                  <span className="text-white font-medium">{roleToDelete.name}</span>? Esta acción no se puede
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

            <h4 className="text-white text-lg font-semibold mb-4">Crear Rol</h4>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre *</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Descripción</label>
                <textarea
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe las responsabilidades de este rol..."
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
                  {creating ? "Creando..." : "Crear rol"}
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

            <h4 className="text-white text-lg font-semibold mb-4">Editar Rol</h4>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre *</label>
                <input
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Descripción</label>
                <textarea
                  className="w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30 resize-none"
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Describe las responsabilidades de este rol..."
                />
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