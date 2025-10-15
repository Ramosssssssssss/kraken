"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useCompany } from "@/lib/company-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card } from "@/components/ui/card"
import { X, Upload, Package, Barcode, DollarSign, Warehouse, ImageIcon } from "lucide-react"

interface LineaArticulo {
  LINEA_ARTICULO_ID: number
  NOMBRE: string
}

interface Almacen {
  ALMACEN_ID: number
  NOMBRE: string
}

interface CrearArticuloModalProps {
  open: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function CrearArticuloModal({ open, onClose, onSuccess }: CrearArticuloModalProps) {
  const { apiUrl } = useCompany()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const firstInputRef = useRef<HTMLInputElement | null>(null)

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
  const [lineasArticulos, setLineasArticulos] = useState<LineaArticulo[]>([])
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!apiUrl || !open) return
    const base = apiUrl.replace(/\/+$/, "")
    const ac = new AbortController()
    ;(async () => {
      try {
        const [lineasRes, almacenesRes] = await Promise.all([
          fetch(`${base}/lineas-articulos`, { signal: ac.signal, cache: "no-store" }),
          fetch(`${base}/almacenes`, { signal: ac.signal, cache: "no-store" }),
        ])

        if (lineasRes.ok) {
          const lineasJson = await lineasRes.json()
          if (lineasJson.ok && Array.isArray(lineasJson.lineas)) {
            setLineasArticulos(lineasJson.lineas)
          }
        }

        if (almacenesRes.ok) {
          const almacenesJson = await almacenesRes.json()
          if (almacenesJson.ok && Array.isArray(almacenesJson.almacenes)) {
            setAlmacenes(almacenesJson.almacenes)
          }
        }
      } catch (err) {
        console.error("Error fetching catalogs:", err)
      }
    })()

    return () => ac.abort()
  }, [apiUrl, open])

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

    const base = apiUrl.replace(/\/+$/, "")
    const toNum = (v: string) => (v !== "" && !Number.isNaN(Number(v)) ? Number(v) : undefined)
    const nz = <T,>(v: T | undefined | null, fallback: T) => (v === undefined || v === null ? fallback : v)

    try {
      const payload = {
        P_NOMBRE: (formData.nombre || "").trim(),
        P_LINEA_ARTICULO_ID: nz(toNum(formData.lineaArticuloId), 0),
        P_UNIDAD_VENTA: formData.unidadVenta || "PZA",
        P_UNIDAD_COMPRA: formData.unidadCompra || "PZA",
        P_IMAGEN: imagen && imagen.trim() !== "" ? imagen : "",
        P_CLAVE_ARTICULO: (formData.claveArticulo || "").trim(),
        P_CLAVE_BARRAS: (formData.claveBarras || "").trim(),
        P_ALMACEN_ID: nz(toNum(formData.almacenId), 0),
        P_LOCALIZACION: (formData.localizacion || "").trim(),
        P_INVENTARIO_MAXIMO: nz(toNum(formData.inventarioMaximo), 0),
        P_PUNTO_REORDEN: nz(toNum(formData.puntoReorden), 0),
        P_INVENTARIO_MINIMO: nz(toNum(formData.inventarioMinimo), 0),
        P_PRECIO_LISTA: nz(toNum(formData.precioLista), 0),
        P_PRECIO_DISTRIBUIDOR: nz(toNum(formData.precioDistribuidor), 0),
        P_NOM_IMPUESTO: formData.impuesto || "NO SUJETO DEL IMPUESTO",
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
        resetForm()
        setSuccess(true)
        setTimeout(() => {
          setSuccess(false)
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        setError(data?.message || "Error al crear el artículo")
      }
    } catch (err: any) {
      console.error(err)
      setError(err?.message || "Error de conexión")
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
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
    setImagen(null)
    setImagenPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          <div className="relative w-full max-w-6xl rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-950 to-black shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-3">
                <Package className="w-5 h-5 text-purple-400" />
                <h2 className="text-xl font-light tracking-wide text-white">Crear Artículo</h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
              {success && (
                <Card className="p-4 bg-green-500/10 border-green-500/20">
                  <p className="text-green-400 text-center font-light tracking-wide">✓ Artículo creado exitosamente</p>
                </Card>
              )}

              {error && (
                <Card className="p-4 bg-red-500/10 border-red-500/20">
                  <p className="text-red-400 text-center font-light tracking-wide">{error}</p>
                </Card>
              )}

              {/* Información General */}
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Package className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-light tracking-wide text-white">Información General</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nombre" className="text-white/70 font-light tracking-wide">
                      Nombre del Artículo *
                    </Label>
                    <Input
                      ref={firstInputRef}
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
                      className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
                      className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-600 focus:border-purple-500/50 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    >
                      <option value="NO SUJETO DEL IMPUESTO">NO SUJETO DEL IMPUESTO</option>
                      <option value="IVA 16%">IVA 16%</option>
                      <option value="IVA 0%">IVA 0%</option>
                    </select>
                  </div>
                </div>
              </Card>

              {/* Unidades y Códigos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-white/5 border-white/10">
                  <h3 className="text-lg font-light tracking-wide text-white mb-6">Unidades</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/70 font-light tracking-wide">Unidad de Venta *</Label>
                      <select
                        required
                        value={formData.unidadVenta}
                        onChange={(e) => setFormData({ ...formData, unidadVenta: e.target.value })}
                        className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-600 focus:border-purple-500/50 focus:outline-none"
                      >
                        <option value="PZA">PZA (Pieza)</option>
                        <option value="PAR">PAR (Par)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70 font-light tracking-wide">Unidad de Compra *</Label>
                      <select
                        required
                        value={formData.unidadCompra}
                        onChange={(e) => setFormData({ ...formData, unidadCompra: e.target.value })}
                        className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-600 focus:border-purple-500/50 focus:outline-none"
                      >
                        <option value="PZA">PZA (Pieza)</option>
                        <option value="PAR">PAR (Par)</option>
                      </select>
                    </div>
                  </div>
                </Card>

                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <Barcode className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-light tracking-wide text-white">Códigos</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/70 font-light tracking-wide">Clave (SKU)</Label>
                      <Input
                        value={formData.claveArticulo}
                        onChange={(e) => setFormData({ ...formData, claveArticulo: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                        placeholder="ART-001"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-white/70 font-light tracking-wide">Código de Barras</Label>
                      <Input
                        value={formData.claveBarras}
                        onChange={(e) => setFormData({ ...formData, claveBarras: e.target.value })}
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                        placeholder="7501234567890"
                      />
                    </div>
                  </div>
                </Card>
              </div>

              {/* Almacén e Inventario */}
              <Card className="p-6 bg-white/5 border-white/10">
                <div className="flex items-center gap-3 mb-6">
                  <Warehouse className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-light tracking-wide text-white">Almacén e Inventario</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label className="text-white/70 font-light tracking-wide">Almacén</Label>
                    <select
                      value={formData.almacenId}
                      onChange={(e) => setFormData({ ...formData, almacenId: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-white/5 border border-white/10 text-gray-600 focus:border-purple-500/50 focus:outline-none"
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
                    <Label className="text-white/70 font-light tracking-wide">Localización</Label>
                    <Input
                      value={formData.localizacion}
                      onChange={(e) => setFormData({ ...formData, localizacion: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                      placeholder="Rack A-1-2"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 font-light tracking-wide">Inv. Mínimo</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.inventarioMinimo}
                      onChange={(e) => setFormData({ ...formData, inventarioMinimo: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 font-light tracking-wide">Punto Reorden</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.puntoReorden}
                      onChange={(e) => setFormData({ ...formData, puntoReorden: e.target.value })}
                      className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-purple-500/50"
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-white/70 font-light tracking-wide">Inv. Máximo</Label>
                    <Input
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

              {/* Precios e Imagen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <DollarSign className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-light tracking-wide text-white">Precios</h3>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-white/70 font-light tracking-wide">Precio Lista</Label>
                      <Input
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
                      <Label className="text-white/70 font-light tracking-wide">Precio Distribuidor</Label>
                      <Input
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

                <Card className="p-6 bg-white/5 border-white/10">
                  <div className="flex items-center gap-3 mb-6">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                    <h3 className="text-lg font-light tracking-wide text-white">Imagen</h3>
                  </div>
                  <div className="space-y-4">
                    <label
                      htmlFor="imagen"
                      className="cursor-pointer px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-colors flex items-center gap-2 w-fit"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="font-light tracking-wide">Seleccionar imagen</span>
                    </label>
                    <input
                      ref={fileInputRef}
                      id="imagen"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                    {imagenPreview && (
                      <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-white/10">
                        <img
                          src={imagenPreview || "/placeholder.svg"}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-4 pt-4 border-t border-white/10">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onClose}
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
      </div>
    </div>
  )
}
