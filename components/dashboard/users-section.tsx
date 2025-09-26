"use client"

import { useEffect, useMemo, useState } from "react"
import { Users, User, Edit3, UserPlus, MailPlus, X, ChevronLeft, ChevronRight, Eye, EyeOff } from "lucide-react"
import { useCompany } from "@/lib/company-context"

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
  typeof r === "number" ? (INT_TO_ROLE[r] ?? "PICKER") : ((["PICKER","EDITOR","ADMIN"].includes(r.toUpperCase()) ? r.toUpperCase() : "PICKER") as RolString)

export default function UsersSection() {
  const { apiUrl, isReady } = useCompany()

  // Datos completos y página actual (solo cliente)
  const [all, setAll] = useState<Piker[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 7

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

  // Cargar una sola vez (sin paginación en server)
  useEffect(() => {
    if (!isReady || !apiUrl) return
    ;(async () => {
      setError("")
      setLoading(true)
      try {
        const res = await fetch(`${apiUrl}/pikers`)
        const data = await res.json()
        const list: Piker[] = Array.isArray(data) ? data : Array.isArray(data?.pikers) ? data.pikers : []
        if (!res.ok || !Array.isArray(list)) throw new Error(data?.message || "No se pudieron cargar los pickers")
        setAll(list)
        setPage(1)
      } catch (e: any) {
        setError(e?.message || "Error al cargar los pickers")
      } finally {
        setLoading(false)
      }
    })()
  }, [apiUrl, isReady])

  // Derivados de paginación (cliente)
  const total = all.length
  const pages = Math.max(Math.ceil(total / pageSize), 1)
  const visible = useMemo(() => {
    const start = (page - 1) * pageSize
    return all.slice(start, start + pageSize)
  }, [all, page])

  // Imagen → base64
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

  // Crear (POST) y paginar en cliente
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
      const res = await fetch(`${apiUrl}/anadir-piker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data?.ok) {
        return setCreateError(data?.message || "No se pudo crear el usuario")
      }

      // Insertar al inicio y repaginar en cliente
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

  // Fondo elegante
  const subtleBg = useMemo(
    () => ({
      background:
        "linear-gradient(135deg, rgba(18,16,24,0.95) 0%, rgba(12,10,16,0.95) 40%, rgba(32,20,44,0.97) 100%)",
    }),
    []
  )

  return (
    <div className="space-y-6 relative">
      <div className="pointer-events-none absolute inset-0 -z-10" style={subtleBg} />

      <h2 className="text-3xl font-semibold text-white/90 tracking-tight">Gestión de Usuarios</h2>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <h3 className="text-lg font-medium text-white/90 flex items-center gap-2">
            <Users className="w-5 h-5 text-white/70" />
            Lista de Pickers
          </h3>
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-4 py-2 text-sm text-white/90 hover:bg-white/12 hover:border-white/20 transition-colors backdrop-blur-xl">
              <MailPlus className="w-4 h-4" />
              Invitar por correo
            </button>
            <button
              onClick={() => setOpenCreate(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/15 hover:border-white/20 transition-colors backdrop-blur-xl"
            >
              <UserPlus className="w-4 h-4" />
              Crear usuario
            </button>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-6 space-y-4">
          {loading && <p className="text-white/70">Cargando usuarios...</p>}
          {error && <p className="text-red-400">{error}</p>}

          {!loading &&
            !error &&
            visible.map((piker) => {
              const roleLabel = normalizeRoleForView(piker.ROL)
              return (
                <div
                  key={piker.PIKER_ID}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/6 backdrop-blur-xl px-4 py-4 hover:bg-white/10 hover:border-white/15 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-10 h-10 rounded-full border border-white/20 bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center overflow-hidden shadow-inner">
                      {piker.IMAGEN_COLAB ? (
                        <img
                          src={`data:${piker.IMAGEN_COLAB_MIME};base64,${piker.IMAGEN_COLAB}`}
                          alt={piker.NOMBRE}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        <User className="w-5 h-5 text-white/90" />
                      )}
                    </div>
                    <div>
                      <p className="text-white/90 font-medium">{piker.NOMBRE}</p>
                      <p className="text-xs text-white/50">
                        {roleLabel} • {piker.USUARIO || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`rounded-lg px-2.5 py-1 text-xs border ${
                        piker.ESTATUS === "A"
                          ? "border-emerald-400/20 text-emerald-300 bg-emerald-400/10"
                          : "border-red-400/20 text-red-300 bg-red-400/10"
                      }`}
                    >
                      {piker.ESTATUS === "A" ? "Activo" : "Inactivo"}
                    </span>
                    <button className="rounded-lg p-2 text-white/70 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}

          {/* Paginación (cliente, 7 por página) */}
          {!loading && !error && total > 0 && (
            <div className="mt-6 flex items-center justify-between">
              <div className="text-white/60 text-sm">
                Página {page} de {pages} · {total} usuarios (paginado en cliente)
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white/90 hover:bg-white/12 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors backdrop-blur-xl"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(pages, p + 1))}
                  disabled={page >= pages}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/8 px-3 py-2 text-sm text-white/90 hover:bg-white/12 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors backdrop-blur-xl"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Crear */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => !creating && setOpenCreate(false)} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-2xl p-6 shadow-2xl">
            <button className="absolute right-3 top-3 p-2 rounded-lg hover:bg-white/10 text-white/80" onClick={() => !creating && setOpenCreate(false)}>
              <X className="w-4 h-4" />
            </button>

            <h4 className="text-white/90 text-lg font-semibold mb-4">Crear usuario</h4>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-white/70 mb-1">Nombre</label>
                <input
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={form.NOMBRE}
                  onChange={(e) => setForm((f) => ({ ...f, NOMBRE: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Usuario (opcional)</label>
                <input
                  className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
                  value={form.USUARIO}
                  onChange={(e) => setForm((f) => ({ ...f, USUARIO: e.target.value }))}
                  placeholder="jperez"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">Contraseña (opcional)</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 pr-10 text-white placeholder-white/40 focus:outline-none focus:border-white/30"
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-white/70 mb-1">Rol</label>
                  <select
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-white/30"
                    value={form.ROL}
                    onChange={(e) => setForm((f) => ({ ...f, ROL: e.target.value as RolString }))}
                  >
                    <option value="PICKER">PICKER</option>
                    <option value="EDITOR">EDITOR</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-1">Estatus</label>
                  <select
                    className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-white focus:outline-none focus:border-white/30"
                    value={form.ESTATUS}
                    onChange={(e) => setForm((f) => ({ ...f, ESTATUS: e.target.value as Estatus }))}
                  >
                    <option value="A">Activo</option>
                    <option value="I">Inactivo</option>
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

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-white/90 hover:bg-white/10 transition-colors"
                  onClick={() => !creating && setOpenCreate(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-white font-medium hover:bg-white/15 hover:border-white/20 transition-colors"
                >
                  {creating ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
