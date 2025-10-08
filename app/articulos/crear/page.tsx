"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { useCompany } from "@/lib/company-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { ArrowLeft, Upload, Package, Barcode, DollarSign, Warehouse, ImageIcon } from "lucide-react"
import { useRouter } from "next/navigation"

interface LineaArticulo {
  LINEA_ARTICULO_ID: number
  NOMBRE: string
}

interface Almacen {
  ALMACEN_ID: number
  NOMBRE: string
}

export default function CrearArticuloPage() {
  const router = useRouter()
  const { apiUrl } = useCompany()
const fileInputRef = useRef<HTMLInputElement | null>(null)
const firstInputRef = useRef<HTMLInputElement | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    nombre: "",
    lineaArticuloId: "",
    unidadVenta: "PZA",
    unidadCompra: "PZA",
    claveArticulo: "",
    claveBarras: "",
    almacenId: "",
    localizacion: "",
    inventarioMaximo: "",
    puntoReorden: "",
    inventarioMinimo: "",
    precioLista: "",
    precioDistribuidor: "",
    impuesto: "IVA 16%",
    marca: "",
  })

  const [imagen, setImagen] = useState<string | null>(null)
  const [imagenPreview, setImagenPreview] = useState<string | null>(null)

  // Dropdowns data
  const [lineasArticulos, setLineasArticulos] = useState<LineaArticulo[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

useEffect(() => {
  if (!apiUrl) return
  const base = apiUrl.replace(/\/+$/, "") // quitar trailing slash

  const ac = new AbortController()
  const { signal } = ac

  ;(async () => {
    try {
      // lineas de artículos
      const lineasRes = await fetch(`${base}/lineas-articulos`, {
        method: "GET",
        cache: "no-store",
        signal,
      })
      if (!lineasRes.ok) throw new Error(`HTTP ${lineasRes.status}`)
      const lineasJson = await lineasRes.json()
      if (lineasJson.ok && Array.isArray(lineasJson.lineas)) {
        setLineasArticulos(lineasJson.lineas)
      } else {
        console.warn("Respuesta inesperada lineas:", lineasJson)
      }

      // almacenes
      const almacenesRes = await fetch(`${base}/almacenes`, {
        method: "GET",
        cache: "no-store",
        signal,
      })
      if (!almacenesRes.ok) throw new Error(`HTTP ${almacenesRes.status}`)
      const almacenesJson = await almacenesRes.json()
      if (almacenesJson.ok && Array.isArray(almacenesJson.almacenes)) {
        setAlmacenes(almacenesJson.almacenes)
      } else {
        console.warn("Respuesta inesperada almacenes:", almacenesJson)
      }
    } catch (err) {
      console.error("Error fetching catálogos:", err)
      setError("No se pudieron cargar catálogos")
    }
  })()

  return () => ac.abort()
}, [apiUrl])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => {
      const base64 = reader.result as string
      const base64Data = base64.split(",")[1]
      setImagen(base64Data)
      setImagenPreview(base64)
    }
    reader.readAsDataURL(file)
  }

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  if (!apiUrl) return

  setLoading(true)
  setError(null)

  // helpers
  const base = apiUrl.replace(/\/+$/, "")
  const toNum = (v: string) => (v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined)
  const nz = <T,>(v: T | undefined | null, fallback: T) => (v === undefined || v === null ? fallback : v)

  try {

    const payload = {
      P_NOMBRE: (formData.nombre || "").trim(),
      P_LINEA_ARTICULO_ID: nz(toNum(formData.lineaArticuloId), 0), // 0 en lugar de null
      P_UNIDAD_VENTA: formData.unidadVenta || "PZA",
      P_UNIDAD_COMPRA: formData.unidadCompra || "PZA",

      // Imagen: si no hay, mandamos string vacío (el backend lo convertirá a Buffer vacío)
      P_IMAGEN: (imagen && imagen.trim() !== "") ? imagen : "",

      // Claves: cadena vacía evita el INSERT del SP (porque el IF espera NULL)
      P_CLAVE_ARTICULO: (formData.claveArticulo || "").trim(),
      P_CLAVE_BARRAS: (formData.claveBarras || "").trim(),

      // Almacén/ubicación: valores "no null" para NO crear nivel si no quieres aún
      P_ALMACEN_ID: nz(toNum(formData.almacenId), 0),
      P_LOCALIZACION: (formData.localizacion || "").trim(),

      P_INVENTARIO_MAXIMO: nz(toNum(formData.inventarioMaximo), 0),
      P_PUNTO_REORDEN: nz(toNum(formData.puntoReorden), 0),
      P_INVENTARIO_MINIMO: nz(toNum(formData.inventarioMinimo), 0),
      P_PRECIO_LISTA: nz(toNum(formData.precioLista), 0),
      P_PRECIO_DISTRIBUIDOR: nz(toNum(formData.precioDistribuidor), 0),

      // Impuesto: el SP solo inserta para 3 strings exactos
      P_NOM_IMPUESTO: formData.impuesto || "NO SUJETO DEL IMPUESTO",

      // Marca: cadena vacía para no disparar lógicas que esperen null
      P_MARCA: (formData.marca || "").trim(),
    }

    const res = await fetch(`${base}/crear-articulo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`HTTP ${res.status} ${res.statusText}${text ? ` - ${text}` : ""}`)
    }

   const data = await res.json().catch(() => ({}))
if (data?.ok) {
  resetForm()                 // ✅ limpia todo y se queda en la misma página
} else {
  setError(data?.message || "Error al crear el artículo")
}

  } catch (err: any) {
    console.error(err)
    setError(err?.message || "Error de conexión. Intenta nuevamente.")
  } finally {
    setLoading(false)
  }
}
const initialForm = {
  nombre: "",
  lineaArticuloId: "",
  unidadVenta: "PZA",
  unidadCompra: "PZA",
  claveArticulo: "",
  claveBarras: "",
  almacenId: "",
  localizacion: "",
  inventarioMaximo: "",
  puntoReorden: "",
  inventarioMinimo: "",
  precioLista: "",
  precioDistribuidor: "",
  impuesto: "IVA 16%",
  marca: "",
}
const resetForm = () => {
  setFormData(initialForm)
  setImagen(null)
  setImagenPreview(null)
  if (fileInputRef.current) fileInputRef.current.value = ""
  setSuccess(true)
  // reenfoca al primer campo y sube al top
  setTimeout(() => {
    firstInputRef.current?.focus()
    window.scrollTo({ top: 0, behavior: "smooth" })
  }, 50)
  // oculta banner de éxito luego de 2s (opcional)
  setTimeout(() => setSuccess(false), 2000)
}

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-zinc-950 to-purple-950/20">
      {/* Header */}
      <div className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-light tracking-wide text-white">Crear Artículo</h1>
            <p className="text-sm text-white/50 tracking-wide">Registra un nuevo producto en el sistema</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Success Message */}
          {success && (
            <Card className="p-4 bg-green-500/10 border-green-500/20 backdrop-blur-xl">
              <p className="text-green-400 text-center font-light tracking-wide">✓ Artículo creado exitosamente</p>
            </Card>
          )}

          {/* Error Message */}
          {error && (
            <Card className="p-4 bg-red-500/10 border-red-500/20 backdrop-blur-xl">
              <p className="text-red-400 text-center font-light tracking-wide">{error}</p>
            </Card>
          )}

          {/* Información General */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <Package className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-light tracking-wide text-white">Información General</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombre" className="text-white/70 font-light tracking-wide">
                  Nombre del Artículo *
                </Label>
                <Input
                  ref={fileInputRef}

                  id="nombre"
                  required
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="Ej: Zapato deportivo Nike"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lineaArticulo" className="text-white/70 font-light tracking-wide">
                  Línea de Artículo
                </Label>
                <select
                  id="lineaArticulo"
                  value={formData.lineaArticuloId}
                  onChange={(e) => setFormData({ ...formData, lineaArticuloId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Seleccionar...</option>
                  {lineasArticulos.map((linea) => (
                    <option key={linea.LINEA_ARTICULO_ID} value={linea.LINEA_ARTICULO_ID}>
                      {linea.NOMBRE}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="marca" className="text-white/70 font-light tracking-wide">
                  Marca
                </Label>
                <Input
                  ref={fileInputRef}

                  id="marca"
                  value={formData.marca}
                  onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="Ej: Nike, Adidas"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="impuesto" className="text-white/70 font-light tracking-wide">
                  Impuesto *
                </Label>
                <select
                  id="impuesto"
                  required
                  value={formData.impuesto}
                  onChange={(e) => setFormData({ ...formData, impuesto: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="NO SUJETO DEL IMPUESTO">NO SUJETO DEL IMPUESTO</option>
                  <option value="IVA 16%">IVA 16%</option>
                  <option value="IVA 0%">IVA 0%</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Unidades */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
            <h2 className="text-lg font-light tracking-wide text-white mb-6">Unidades de Medida</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="unidadVenta" className="text-white/70 font-light tracking-wide">
                  Unidad de Venta *
                </Label>
                <select
                  id="unidadVenta"
                  required
                  value={formData.unidadVenta}
                  onChange={(e) => setFormData({ ...formData, unidadVenta: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="PZA">PZA (Pieza)</option>
                  <option value="PAR">PAR (Par)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidadCompra" className="text-white/70 font-light tracking-wide">
                  Unidad de Compra *
                </Label>
                <select
                  id="unidadCompra"
                  required
                  value={formData.unidadCompra}
                  onChange={(e) => setFormData({ ...formData, unidadCompra: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="PZA">PZA (Pieza)</option>
                  <option value="PAR">PAR (Par)</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Códigos */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <Barcode className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-light tracking-wide text-white">Códigos e Identificación</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="claveArticulo" className="text-white/70 font-light tracking-wide">
                  Clave del Artículo (SKU)
                </Label>
                <Input
                  ref={fileInputRef}

                  id="claveArticulo"
                  value={formData.claveArticulo}
                  onChange={(e) => setFormData({ ...formData, claveArticulo: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="Ej: ART-001"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="claveBarras" className="text-white/70 font-light tracking-wide">
                  Código de Barras
                </Label>
                <Input
                  ref={fileInputRef}

                  id="claveBarras"
                  value={formData.claveBarras}
                  onChange={(e) => setFormData({ ...formData, claveBarras: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="Ej: 7501234567890"
                />
              </div>
            </div>
          </Card>

          {/* Almacén e Inventario */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <Warehouse className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-light tracking-wide text-white">Almacén e Inventario</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="almacen" className="text-white/70 font-light tracking-wide">
                  Almacén
                </Label>
                <select
                  id="almacen"
                  value={formData.almacenId}
                  onChange={(e) => setFormData({ ...formData, almacenId: e.target.value })}
                  className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-white focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="">Seleccionar...</option>
                  {almacenes.map((almacen) => (
                    <option key={almacen.ALMACEN_ID} value={almacen.ALMACEN_ID}>
                      {almacen.NOMBRE}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="localizacion" className="text-white/70 font-light tracking-wide">
                  Localización
                </Label>
                <Input
                  ref={fileInputRef}

                  id="localizacion"
                  value={formData.localizacion}
                  onChange={(e) => setFormData({ ...formData, localizacion: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="Ej: Rack A-1-2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventarioMinimo" className="text-white/70 font-light tracking-wide">
                  Inventario Mínimo
                </Label>
                <Input
                  ref={fileInputRef}

                  id="inventarioMinimo"
                  type="number"
                  min="0"
                  value={formData.inventarioMinimo}
                  onChange={(e) => setFormData({ ...formData, inventarioMinimo: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="puntoReorden" className="text-white/70 font-light tracking-wide">
                  Punto de Reorden
                </Label>
                <Input
                  ref={fileInputRef}

                  id="puntoReorden"
                  type="number"
                  min="0"
                  value={formData.puntoReorden}
                  onChange={(e) => setFormData({ ...formData, puntoReorden: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="inventarioMaximo" className="text-white/70 font-light tracking-wide">
                  Inventario Máximo
                </Label>
                <Input
                  ref={fileInputRef}

                  id="inventarioMaximo"
                  type="number"
                  min="0"
                  value={formData.inventarioMaximo}
                  onChange={(e) => setFormData({ ...formData, inventarioMaximo: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="0"
                />
              </div>
            </div>
          </Card>

          {/* Precios */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <DollarSign className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-light tracking-wide text-white">Precios</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="precioLista" className="text-white/70 font-light tracking-wide">
                  Precio de Lista
                </Label>
                <Input
                  ref={fileInputRef}

                  id="precioLista"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precioLista}
                  onChange={(e) => setFormData({ ...formData, precioLista: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="precioDistribuidor" className="text-white/70 font-light tracking-wide">
                  Precio Distribuidor
                </Label>
                <Input
                  ref={fileInputRef}

                  id="precioDistribuidor"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.precioDistribuidor}
                  onChange={(e) => setFormData({ ...formData, precioDistribuidor: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                  placeholder="0.00"
                />
              </div>
            </div>
          </Card>

          {/* Imagen */}
          <Card className="p-6 bg-white/5 border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <ImageIcon className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-light tracking-wide text-white">Imagen del Producto</h2>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label
                  htmlFor="imagen"
                  className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  <span className="font-light tracking-wide">Seleccionar imagen</span>
                </label>
                <input    ref={fileInputRef}
 id="imagen" type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </div>

              {imagenPreview && (
                <div className="relative w-48 h-48 rounded-lg overflow-hidden border border-white/10">
                  <img src={imagenPreview || "/placeholder.svg"} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.back()}
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.nombre}
              className="bg-purple-600 hover:bg-purple-700 text-white px-8"
            >
              {loading ? "Creando..." : "Crear Artículo"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
