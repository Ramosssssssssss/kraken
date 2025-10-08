"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { useCompany } from "@/lib/company-context"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Package,
  X,
  Plus,
  Eye,
  Pencil,
  RefreshCw,
  GripVertical,
  Save,
  Upload,
} from "lucide-react"
import { CrearArticuloModal } from "@/components/crear-articulo-modal"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

type Articulo = {
  ARTICULO_ID: number
  NOMBRE: string
  MARCA?: string | null
  CLAVE_ARTICULO?: string | null
  UNIDAD_VENTA: string
  UNIDAD_COMPRA: string
  PRECIO_LISTA: number
  TIENE_IMAGEN?: number | boolean
}

type ArticuloDetalle = {
  ARTICULO_ID: number
  NOMBRE: string
  MARCA: string | null
  UNIDAD_VENTA: string
  UNIDAD_COMPRA: string
  PRECIO_LISTA: number
  PRECIO_DISTRIBUIDOR?: number | null
  LINEA?: string | null
  CLAVE_ARTICULO?: string | null
  CLAVE_BARRAS?: string | null
  IMPUESTO?: string | null
  ALMACEN?: string | null
  LOCALIZACION?: string | null
  TIENE_IMAGEN?: number | boolean
  INVENTARIO_MINIMO?: number | null
  PUNTO_REORDEN?: number | null
  INVENTARIO_MAXIMO?: number | null
  LINEA_ARTICULO_ID?: number // Added this property
}

const PER_PAGE_OPTIONS = [15, 25, 50, 100]

type ColumnKey = "id" | "nombre" | "clave" | "unidad" | "precio" | "acciones"

type ColumnConfig = {
  key: ColumnKey
  label: string
  filterable: boolean
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "id", label: "ID", filterable: false },
  { key: "nombre", label: "Nombre", filterable: true },
  { key: "clave", label: "Clave", filterable: true },
  { key: "unidad", label: "Unidad", filterable: true },
  { key: "precio", label: "Precio", filterable: true },
  { key: "acciones", label: "Acciones", filterable: false },
]

export default function ArticulosPage() {
  const { apiUrl } = useCompany()

  const [items, setItems] = useState<Articulo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [filters, setFilters] = useState({
    nombre: "",
    clave: "",
    unidadVenta: "",
    precio: "",
  })

  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(15)

  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(DEFAULT_COLUMNS.map((c) => c.key))
  const [draggedColumn, setDraggedColumn] = useState<ColumnKey | null>(null)

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [detalle, setDetalle] = useState<ArticuloDetalle | null>(null)
  const [loadingDetalle, setLoadingDetalle] = useState(false)
  const [errorDetalle, setErrorDetalle] = useState<string | null>(null)

  // Edit mode
  const [isEditMode, setIsEditMode] = useState(false)
  const [editedData, setEditedData] = useState<Partial<ArticuloDetalle>>({})
  const [saving, setSaving] = useState(false)
  const [lineasArticulos, setLineasArticulos] = useState<Array<{ LINEA_ARTICULO_ID: number; NOMBRE: string }>>([])
  const [almacenes, setAlmacenes] = useState<Array<{ ALMACEN_ID: number; NOMBRE: string }>>([])
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  const fetchArticulos = async () => {
    if (!apiUrl) return
    const base = apiUrl.replace(/\/+$/, "")
    const ac = new AbortController()

    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${base}/artics`, { signal: ac.signal, cache: "no-store" })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json?.ok && Array.isArray(json.articulos)) {
        setItems(json.articulos)
      } else {
        setError("Respuesta inesperada del servidor")
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setError(e?.message || "Error al cargar artículos")
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArticulos()
  }, [apiUrl])

  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (filters.nombre && !item.NOMBRE.toLowerCase().includes(filters.nombre.toLowerCase())) return false
      if (filters.clave && !(item.CLAVE_ARTICULO || "").toLowerCase().includes(filters.clave.toLowerCase()))
        return false
      if (filters.unidadVenta && !item.UNIDAD_VENTA.toLowerCase().includes(filters.unidadVenta.toLowerCase()))
        return false
      if (filters.precio && !item.PRECIO_LISTA.toString().includes(filters.precio)) return false
      return true
    })
  }, [items, filters])

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage))
  const currentPage = Math.min(page, pageCount)
  const paged = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return filtered.slice(start, start + perPage)
  }, [filtered, currentPage, perPage])

  useEffect(() => {
    setPage(1)
  }, [perPage, filters])

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 2 }).format(n || 0)

  const verArticulo = (id: number) => {
    setSelectedId(id)
    setDetailModalOpen(true)
  }

  useEffect(() => {
    if (!detailModalOpen || !selectedId || !apiUrl) return
    const base = apiUrl.replace(/\/+$/, "")
    const ac = new AbortController()
    ;(async () => {
      setLoadingDetalle(true)
      setErrorDetalle(null)
      setDetalle(null)
      try {
        const url = `${base}/artics/${encodeURIComponent(selectedId)}`
        const res = await fetch(url, { cache: "no-store", signal: ac.signal })

        if (!res.ok) {
          const body = await res.text().catch(() => "")
          throw new Error(`HTTP ${res.status} ${res.statusText}${body ? ` • ${body}` : ""}`)
        }

        const json = await res.json()
        if (json?.ok && json.articulo) setDetalle(json.articulo)
        else throw new Error("Respuesta inesperada")
      } catch (e: any) {
        if (e.name !== "AbortError") {
          setErrorDetalle(e?.message || "Error al cargar el artículo")
        }
      } finally {
        setLoadingDetalle(false)
      }
    })()

    return () => ac.abort()
  }, [detailModalOpen, selectedId, apiUrl])

  const closeDetailModal = () => {
    setDetailModalOpen(false)
    setSelectedId(null)
    setDetalle(null)
    setErrorDetalle(null)
    setIsEditMode(false)
    setEditedData({})
    setImagePreview(null)
  }

  useEffect(() => {
    if (!isEditMode || !apiUrl) return
    const base = apiUrl.replace(/\/+$/, "")

    Promise.all([
      fetch(`${base}/lineas-articulos`).then((r) => r.json()),
      fetch(`${base}/almacenes`).then((r) => r.json()),
    ])
      .then(([lineasRes, almacenesRes]) => {
        if (lineasRes?.ok) setLineasArticulos(lineasRes.lineas || [])
        if (almacenesRes?.ok) setAlmacenes(almacenesRes.almacenes || [])
      })
      .catch((e) => console.error("Error fetching dropdowns:", e))
  }, [isEditMode, apiUrl])

  const handleEditClick = () => {
    if (!detalle) return
    setIsEditMode(true)
    setEditedData({
      NOMBRE: detalle.NOMBRE,
      UNIDAD_VENTA: detalle.UNIDAD_VENTA,
      CLAVE_ARTICULO: detalle.CLAVE_ARTICULO || "",
      CLAVE_BARRAS: detalle.CLAVE_BARRAS || "",
      LOCALIZACION: detalle.LOCALIZACION || "",
      INVENTARIO_MINIMO: detalle.INVENTARIO_MINIMO || 0,
      PUNTO_REORDEN: detalle.PUNTO_REORDEN || 0,
      INVENTARIO_MAXIMO: detalle.INVENTARIO_MAXIMO || 0,
    })
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      setImagePreview(base64)
    }
    reader.readAsDataURL(file)
  }

const handleSave = async () => {
  if (!apiUrl || !selectedId || !detalle) return

  setSaving(true)
  const base = apiUrl.replace(/\/+$/, "")

  // Helper: PUT JSON con manejo de error del body
  const putJson = async (url: string, payload: any) => {
    const resp = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    const data = await resp.json().catch(() => ({}))
    if (!resp.ok) {
      throw new Error(data?.message || `HTTP ${resp.status} - ${url}`)
    }
    return data
  }

  // Helper: de dónde sacar el ALMACEN_ID para endpoints que lo requieren
  const resolveAlmacenId = () =>
    (editedData as any)?.ALMACEN_ID ?? (detalle as any)?.ALMACEN_ID

  try {
    const updates: Promise<any>[] = []

    // NOMBRE
    if (editedData.NOMBRE && editedData.NOMBRE !== detalle.NOMBRE) {
      updates.push(
        putJson(`${base}/artics/${selectedId}/nombre`, {
          NOMBRE: editedData.NOMBRE, // <-- backend espera MAYÚSCULAS
        }),
      )
    }

    // LINEA_ARTICULO_ID  (si lo estás editando)
    if (
      editedData.LINEA_ARTICULO_ID !== undefined &&
      editedData.LINEA_ARTICULO_ID !== (detalle as any)?.LINEA_ARTICULO_ID
    ) {
      updates.push(
        putJson(`${base}/artics/${selectedId}/linea`, {
          LINEA_ARTICULO_ID: editedData.LINEA_ARTICULO_ID,
        }),
      )
    }

    // UNIDAD_VENTA (solo permite PAR o PZA, en mayúsculas)
    if (editedData.UNIDAD_VENTA && editedData.UNIDAD_VENTA !== detalle.UNIDAD_VENTA) {
      const unidad = String(editedData.UNIDAD_VENTA).toUpperCase()
      updates.push(
        putJson(`${base}/artics/${selectedId}/unidad-venta`, {
          UNIDAD_VENTA: unidad, // <-- PAR | PZA
        }),
      )
    }

    // CLAVE_ARTICULO (SKU)
    if (editedData.CLAVE_ARTICULO !== undefined && editedData.CLAVE_ARTICULO !== detalle.CLAVE_ARTICULO) {
      updates.push(
        putJson(`${base}/artics/${selectedId}/clave`, {
          CLAVE_ARTICULO: editedData.CLAVE_ARTICULO ?? "",
        }),
      )
    }

    // CODIGO_BARRAS
    if (editedData.CLAVE_BARRAS !== undefined && editedData.CLAVE_BARRAS !== detalle.CLAVE_BARRAS) {
      updates.push(
        putJson(`${base}/artics/${selectedId}/codigo-barras`, {
          CODIGO_BARRAS: editedData.CLAVE_BARRAS ?? "",
        }),
      )
    }

    // LOCALIZACION (requiere ALMACEN_ID)
    if (editedData.LOCALIZACION !== undefined && editedData.LOCALIZACION !== detalle.LOCALIZACION) {
      const ALMACEN_ID = resolveAlmacenId()
      if (!ALMACEN_ID) throw new Error("ALMACEN_ID es requerido para actualizar LOCALIZACION")
      updates.push(
        putJson(`${base}/artics/${selectedId}/localizacion`, {
          LOCALIZACION: editedData.LOCALIZACION ?? "",
          ALMACEN_ID,
        }),
      )
    }

    // INVENTARIO_MINIMO (requiere ALMACEN_ID)
    if (
      editedData.INVENTARIO_MINIMO !== undefined &&
      editedData.INVENTARIO_MINIMO !== detalle.INVENTARIO_MINIMO
    ) {
      const ALMACEN_ID = resolveAlmacenId()
      if (!ALMACEN_ID) throw new Error("ALMACEN_ID es requerido para actualizar INVENTARIO_MINIMO")
      updates.push(
        putJson(`${base}/artics/${selectedId}/inventario-minimo`, {
          INVENTARIO_MINIMO: Number(editedData.INVENTARIO_MINIMO) ?? 0,
          ALMACEN_ID,
        }),
      )
    }

    // PUNTO_REORDEN (requiere ALMACEN_ID)
    if (
      editedData.PUNTO_REORDEN !== undefined &&
      editedData.PUNTO_REORDEN !== detalle.PUNTO_REORDEN
    ) {
      const ALMACEN_ID = resolveAlmacenId()
      if (!ALMACEN_ID) throw new Error("ALMACEN_ID es requerido para actualizar PUNTO_REORDEN")
      updates.push(
        putJson(`${base}/artics/${selectedId}/punto-reorden`, {
          PUNTO_REORDEN: Number(editedData.PUNTO_REORDEN) ?? 0,
          ALMACEN_ID,
        }),
      )
    }

    // INVENTARIO_MAXIMO (requiere ALMACEN_ID)
    if (
      editedData.INVENTARIO_MAXIMO !== undefined &&
      editedData.INVENTARIO_MAXIMO !== detalle.INVENTARIO_MAXIMO
    ) {
      const ALMACEN_ID = resolveAlmacenId()
      if (!ALMACEN_ID) throw new Error("ALMACEN_ID es requerido para actualizar INVENTARIO_MAXIMO")
      updates.push(
        putJson(`${base}/artics/${selectedId}/inventario-maximo`, {
          INVENTARIO_MAXIMO: Number(editedData.INVENTARIO_MAXIMO) ?? 0,
          ALMACEN_ID,
        }),
      )
    }

    // IMAGEN base64 (opcional si la editas; backend espera IMAGEN en base64)
    if ((editedData as any).IMAGEN_BASE64) {
      updates.push(
        putJson(`${base}/artics/${selectedId}/imagen`, {
          IMAGEN: (editedData as any).IMAGEN_BASE64, // string base64 sin encabezado data:
        }),
      )
    }

    // Ejecutar todo
    await Promise.all(updates)

    // Refresh data
    setIsEditMode(false)
    setEditedData({})
    setImagePreview(null)
    fetchArticulos()

    // Reload detail
    const res = await fetch(`${base}/artics/${selectedId}`, { cache: "no-store" })
    if (res.ok) {
      const json = await res.json()
      if (json?.ok && json.articulo) setDetalle(json.articulo)
    }
  } catch (e: any) {
    alert(`Error al guardar: ${e.message}`)
  } finally {
    setSaving(false)
  }
}


  const handleDragStart = (columnKey: ColumnKey) => {
    setDraggedColumn(columnKey)
  }

  const handleDragOver = (e: React.DragEvent, columnKey: ColumnKey) => {
    e.preventDefault()
    if (!draggedColumn || draggedColumn === columnKey) return

    const newOrder = [...columnOrder]
    const draggedIndex = newOrder.indexOf(draggedColumn)
    const targetIndex = newOrder.indexOf(columnKey)

    newOrder.splice(draggedIndex, 1)
    newOrder.splice(targetIndex, 0, draggedColumn)

    setColumnOrder(newOrder)
  }

  const handleDragEnd = () => {
    setDraggedColumn(null)
  }

  const getColumnConfig = (key: ColumnKey) => DEFAULT_COLUMNS.find((c) => c.key === key)!

  const renderCell = (item: Articulo, columnKey: ColumnKey) => {
    switch (columnKey) {
      case "id":
        return <span className="text-white/60 text-sm">#{item.ARTICULO_ID}</span>
      case "nombre":
        return <span className="text-white text-sm">{item.NOMBRE}</span>
      case "clave":
        return <span className="text-white/70 text-sm">{item.CLAVE_ARTICULO || "—"}</span>
      case "unidad":
        return (
          <span className="text-white/70 text-sm">
            {item.UNIDAD_VENTA}/{item.UNIDAD_COMPRA}
          </span>
        )
      case "precio":
        return <span className="text-white text-sm">{fmtMoney(item.PRECIO_LISTA)}</span>
      case "acciones":
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => verArticulo(item.ARTICULO_ID)}
              className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-purple-950/20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-400" />
              <div>
                <h1 className="text-2xl font-light tracking-wide text-white">Artículos</h1>
                <p className="text-sm text-white/50 tracking-wide">Catálogo general de productos</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchArticulos}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => setCreateModalOpen(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Crear Artículo
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1800px] mx-auto px-6 py-8">
        {loading && (
          <div className="flex items-center gap-3 text-white/70">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando artículos...
          </div>
        )}

        {error && (
          <Card className="p-4 bg-red-500/10 border-red-500/20 backdrop-blur-xl">
            <p className="text-red-400 font-light tracking-wide">{error}</p>
          </Card>
        )}

        {!loading && !error && (
          <div className="space-y-4">
            {/* Table */}
            <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      {columnOrder.map((columnKey) => {
                        const config = getColumnConfig(columnKey)
                        return (
                          <th
                            key={columnKey}
                            draggable
                            onDragStart={() => handleDragStart(columnKey)}
                            onDragOver={(e) => handleDragOver(e, columnKey)}
                            onDragEnd={handleDragEnd}
                            className={`text-left px-4 py-3 text-white/70 font-light tracking-wide text-sm cursor-move hover:bg-white/5 transition ${
                              columnKey === "acciones" ? "text-right" : ""
                            } ${draggedColumn === columnKey ? "opacity-50" : ""}`}
                          >
                            <div className="flex items-center gap-2">
                              <GripVertical className="w-3 h-3 text-white/30" />
                              {config.label}
                            </div>
                          </th>
                        )
                      })}
                    </tr>
                    <tr className="border-b border-white/10 bg-white/[0.02]">
                      {columnOrder.map((columnKey) => {
                        const config = getColumnConfig(columnKey)

                        if (!config.filterable) {
                          return (
                            <th key={columnKey} className="px-4 py-2">
                              <div className="w-16" />
                            </th>
                          )
                        }

                        let filterValue = ""
                        let onFilterChange = (val: string) => {}

                        switch (columnKey) {
                          case "nombre":
                            filterValue = filters.nombre
                            onFilterChange = (val) => setFilters({ ...filters, nombre: val })
                            break
                          case "clave":
                            filterValue = filters.clave
                            onFilterChange = (val) => setFilters({ ...filters, clave: val })
                            break
                          case "unidad":
                            filterValue = filters.unidadVenta
                            onFilterChange = (val) => setFilters({ ...filters, unidadVenta: val })
                            break
                          case "precio":
                            filterValue = filters.precio
                            onFilterChange = (val) => setFilters({ ...filters, precio: val })
                            break
                        }

                        return (
                          <th key={columnKey} className="px-4 py-2">
                            <Input
                              placeholder="Filtrar..."
                              value={filterValue}
                              onChange={(e) => onFilterChange(e.target.value)}
                              className="h-8 bg-white/5 border-white/10 text-white text-sm placeholder:text-white/30 focus:border-purple-500/50"
                            />
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {paged.length === 0 ? (
                      <tr>
                        <td colSpan={columnOrder.length} className="px-4 py-8 text-center text-white/50">
                          No hay artículos que coincidan con los filtros
                        </td>
                      </tr>
                    ) : (
                      paged.map((item, idx) => (
                        <tr
                          key={item.ARTICULO_ID}
                          className={`border-b border-white/5 hover:bg-white/[0.02] transition ${
                            idx % 2 === 0 ? "bg-white/[0.01]" : ""
                          }`}
                        >
                          {columnOrder.map((columnKey) => (
                            <td key={columnKey} className={`px-4 py-4 ${columnKey === "acciones" ? "text-right" : ""}`}>
                              {renderCell(item, columnKey)}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-white/50 text-sm">Filas por página:</span>
                <select
                  value={perPage}
                  onChange={(e) => setPerPage(Number(e.target.value))}
                  className="h-9 px-3 rounded-md bg-white/5 border border-white/10 text-white text-sm focus:border-purple-500/50 focus:outline-none"
                >
                  {PER_PAGE_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-white/50 text-sm">
                  {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, filtered.length)} de{" "}
                  {filtered.length}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentPage === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 h-9 w-9"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={currentPage === pageCount}
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    className="text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-40 h-9 w-9"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <CrearArticuloModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSuccess={() => {
          fetchArticulos()
        }}
      />

      {/* Detail Modal */}
      {detailModalOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeDetailModal} />
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="w-full max-w-5xl rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950 to-black shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
                <div className="text-white/80">{detalle?.NOMBRE ?? "Artículo"}</div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={closeDetailModal}
                  className="text-white/70 hover:text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                <div className="p-6 border-r border-white/10 flex flex-col items-center justify-center bg-white/[0.02] gap-4">
                  <div className="w-full max-w-md aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40 relative">
                    {imagePreview ? (
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Preview"
                        className="w-full h-full object-contain"
                      />
                    ) : selectedId ? (
                      <img
                        key={selectedId}
                        src={`${apiUrl?.replace(/\/+$/, "")}/artics/${encodeURIComponent(selectedId)}/imagen`}
                        alt="Imagen del artículo"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          ;(e.currentTarget as HTMLImageElement).style.display = "none"
                        }}
                      />
                    ) : null}
                    {!detalle?.TIENE_IMAGEN && !imagePreview && (
                      <div className="absolute inset-0 flex items-center justify-center text-white/30 text-sm">
                        Sin imagen
                      </div>
                    )}
                  </div>

                  {isEditMode && (
                    <div className="w-full max-w-md">
                      <Label htmlFor="image-upload" className="cursor-pointer">
                        <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition text-white/70 hover:text-white">
                          <Upload className="w-4 h-4" />
                          <span className="text-sm">Cambiar imagen</span>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="hidden"
                        />
                      </Label>
                    </div>
                  )}
                </div>

                <div className="p-6">
                  {loadingDetalle && (
                    <div className="flex items-center gap-2 text-white/60">
                      <Loader2 className="w-4 h-4 animate-spin" /> Cargando…
                    </div>
                  )}
                  {errorDetalle && (
                    <div className="rounded-md border border-red-500/20 bg-red-500/10 text-red-300 px-3 py-2">
                      {errorDetalle}
                    </div>
                  )}
                  {detalle && !loadingDetalle && !errorDetalle && (
                    <div className="space-y-4">
                      {isEditMode ? (
                        <div className="space-y-2">
                          <Label className="text-white/70">Nombre</Label>
                          <Input
                            value={editedData.NOMBRE || ""}
                            onChange={(e) => setEditedData({ ...editedData, NOMBRE: e.target.value })}
                            className="bg-white/5 border-white/10 text-white"
                          />
                        </div>
                      ) : (
                        <div>
                          <h2 className="text-xl text-white font-light tracking-wide">{detalle.NOMBRE}</h2>
                          <p className="text-white/50">
                            {detalle.UNIDAD_VENTA}/{detalle.UNIDAD_COMPRA}
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                        <InfoRow label="Precio lista" value={fmtMoney(detalle.PRECIO_LISTA)} />
                        {detalle.PRECIO_DISTRIBUIDOR != null && (
                          <InfoRow label="Precio distribuidor" value={fmtMoney(detalle.PRECIO_DISTRIBUIDOR || 0)} />
                        )}
                        <InfoRow label="Línea" value={detalle.LINEA ?? "—"} />
                        <InfoRow label="Impuesto" value={detalle.IMPUESTO ?? "—"} />

                        {isEditMode ? (
                          <>
                            <EditableField
                              label="SKU"
                              value={editedData.CLAVE_ARTICULO || ""}
                              onChange={(val) => setEditedData({ ...editedData, CLAVE_ARTICULO: val })}
                            />
                            <EditableField
                              label="Código barras"
                              value={editedData.CLAVE_BARRAS || ""}
                              onChange={(val) => setEditedData({ ...editedData, CLAVE_BARRAS: val })}
                            />
                            <InfoRow label="Almacén" value={detalle.ALMACEN ?? "—"} />
                            <EditableField
                              label="Localización"
                              value={editedData.LOCALIZACION || ""}
                              onChange={(val) => setEditedData({ ...editedData, LOCALIZACION: val })}
                            />
                            <EditableField
                              label="Inv. Mínimo"
                              type="number"
                              value={editedData.INVENTARIO_MINIMO?.toString() || "0"}
                              onChange={(val) => setEditedData({ ...editedData, INVENTARIO_MINIMO: Number(val) })}
                            />
                            <EditableField
                              label="Punto Reorden"
                              type="number"
                              value={editedData.PUNTO_REORDEN?.toString() || "0"}
                              onChange={(val) => setEditedData({ ...editedData, PUNTO_REORDEN: Number(val) })}
                            />
                            <EditableField
                              label="Inv. Máximo"
                              type="number"
                              value={editedData.INVENTARIO_MAXIMO?.toString() || "0"}
                              onChange={(val) => setEditedData({ ...editedData, INVENTARIO_MAXIMO: Number(val) })}
                            />
                            <div className="space-y-2">
                              <Label className="text-white/40 text-xs">Unidad Venta</Label>
                              <Select
                                value={editedData.UNIDAD_VENTA || detalle.UNIDAD_VENTA}
                                onValueChange={(val) => setEditedData({ ...editedData, UNIDAD_VENTA: val })}
                              >
                                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PAR">PAR</SelectItem>
                                  <SelectItem value="PZA">PZA</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </>
                        ) : (
                          <>
                            <InfoRow label="SKU" value={detalle.CLAVE_ARTICULO ?? "—"} />
                            <InfoRow label="Código barras" value={detalle.CLAVE_BARRAS ?? "—"} />
                            <InfoRow label="Almacén" value={detalle.ALMACEN ?? "—"} />
                            <InfoRow label="Localización" value={detalle.LOCALIZACION ?? "—"} />
                            {detalle.INVENTARIO_MINIMO != null && (
                              <InfoRow label="Inv. Mínimo" value={detalle.INVENTARIO_MINIMO} />
                            )}
                            {detalle.PUNTO_REORDEN != null && (
                              <InfoRow label="Punto Reorden" value={detalle.PUNTO_REORDEN} />
                            )}
                            {detalle.INVENTARIO_MAXIMO != null && (
                              <InfoRow label="Inv. Máximo" value={detalle.INVENTARIO_MAXIMO} />
                            )}
                          </>
                        )}
                      </div>

                      <div className="pt-2 flex items-center gap-2">
                        {isEditMode ? (
                          <>
                            <Button
                              className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                              onClick={handleSave}
                              disabled={saving}
                            >
                              {saving ? (
                                <>
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                  Guardando...
                                </>
                              ) : (
                                <>
                                  <Save className="w-4 h-4" />
                                  Guardar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-white/70 hover:text-white hover:bg-white/10"
                              onClick={() => {
                                setIsEditMode(false)
                                setEditedData({})
                                setImagePreview(null)
                              }}
                              disabled={saving}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              className="bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-2"
                              onClick={handleEditClick}
                            >
                              <Pencil className="w-4 h-4" />
                              Editar
                            </Button>
                            <Button
                              variant="ghost"
                              className="text-white/70 hover:text-white hover:bg-white/10"
                              onClick={closeDetailModal}
                            >
                              Cerrar
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-white/40">{label}</span>
      <span className="text-white/90">{value}</span>
    </div>
  )
}

function EditableField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string
  value: string
  onChange: (val: string) => void
  type?: string
}) {
  return (
    <div className="space-y-2">
      <Label className="text-white/40 text-xs">{label}</Label>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border-white/10 text-white h-9"
      />
    </div>
  )
}
