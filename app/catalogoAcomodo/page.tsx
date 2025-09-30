"use client"

import { useState, useCallback, useRef, useMemo, useEffect, Suspense } from "react"
import { useCompany } from "@/lib/company-context"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Search, X, ImageIcon, MapPin, Info, Scan, Loader2, Package, AlertCircle } from "lucide-react"
export default function CatalogoAlmacenPremium() {
  return (
    <Suspense fallback={null}>
      <CatalogoAlmacenPremiumInner />
    </Suspense>
  )
}
interface Producto {
  ARTICULO_ID: string
  IMAGEN?: string
  CLAVE_ARTICULO: string
  NOMBRE: string
  EXISTENCIA: string
  LOCALIZACION: string
  INVENTARIO_MAXIMO: number
  PUNTO_REORDEN: number
  INVENTARIO_MINIMO: number
}

interface ProductoCompleto {
  articulo_id: string
  imagen?: string
  clave_articulo: string
  nombre: string
  unidad_venta?: string
  precio_publico?: number
  precio_publico_iva?: number
  existencia?: number
  descuento?: number
  fecha_ini_vigencia?: string
  fecha_fin_vigencia?: string
  linea_articulo?: string
  marca?: string
  talla?: string
  almacenes: {
    almacen_general: AlmacenInfo
    traspaso_sucursal: AlmacenInfo
    bodega1: AlmacenInfo
    bodega2: AlmacenInfo
    bodega3: AlmacenInfo
    bodega4: AlmacenInfo
    bodega5: AlmacenInfo
    defectos: AlmacenInfo
    mercado_libre: AlmacenInfo
  }
}

interface AlmacenInfo {
  id: number | null
  nombre: string
  ubicacion: string
  inventario_maximo: number | null
  punto_reorden: number | null
  inventario_minimo: number | null
  existencia: number | null
}

const ProductCard = ({
  product,
  selectedAlmacen,
  onEdit,
  onImagePress,
}: {
  product: ProductoCompleto
  selectedAlmacen: string
  onEdit: () => void
  onImagePress: () => void
}) => {
  const getCurrentAlmacenInfo = (): AlmacenInfo => {
    if (selectedAlmacen === "384") return product.almacenes.almacen_general
    if (selectedAlmacen === "3482") return product.almacenes.bodega1
    if (selectedAlmacen === "3483") return product.almacenes.bodega2
    if (selectedAlmacen === "3484") return product.almacenes.bodega3
    if (selectedAlmacen === "3485") return product.almacenes.bodega4
    if (selectedAlmacen === "3486") return product.almacenes.bodega5
    if (selectedAlmacen === "3487") return product.almacenes.defectos
    if (selectedAlmacen === "3638") return product.almacenes.mercado_libre
    return product.almacenes.almacen_general
  }

  const currentAlmacen = getCurrentAlmacenInfo()
  const [showDetailsModal, setShowDetailsModal] = useState(false)

  return (
    <>
      <div className="bg-white/60 backdrop-blur-sm border border-neutral-200/50 rounded-2xl p-6 hover:bg-white/80 hover:shadow-lg transition-all duration-300">
        {/* Product Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="w-20 h-20 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center overflow-hidden">
            {product.imagen ? (
              <img
                src={product.imagen || "/placeholder.svg"}
                alt={product.clave_articulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <Package className="w-8 h-8 text-neutral-400" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-neutral-900 mb-1 truncate">{product.clave_articulo}</h3>
            <p className="text-sm text-neutral-600 leading-relaxed line-clamp-2">{product.nombre}</p>
          </div>
        </div>

        {/* Location Info */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 mb-4 border border-blue-100">
          <div className="mb-3">
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">
              Ubicación en {currentAlmacen.nombre}
            </p>
            <p className="text-lg font-bold text-blue-900">{currentAlmacen.ubicacion || "Sin ubicación"}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-1">Existencias en almacén</p>
            <p className="text-lg font-bold text-emerald-600">{currentAlmacen.existencia || 0}</p>
          </div>
        </div>

        {/* Additional Info */}
        {(product.existencia || product.descuento) && (
          <div className="bg-neutral-50 rounded-xl p-4 mb-4 border border-neutral-200">
            <div className="grid grid-cols-2 gap-4">
              {product.existencia && (
                <div>
                  <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1">
                    Existencias totales
                  </p>
                  <p className="text-lg font-bold text-emerald-600">{product.existencia}</p>
                </div>
              )}
              {product.descuento && (
                <div>
                  <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-1">Descuento</p>
                  <p className="text-lg font-bold text-red-500">{product.descuento}%</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Inventory Levels */}
        {(currentAlmacen.inventario_maximo || currentAlmacen.punto_reorden || currentAlmacen.inventario_minimo) && (
          <div className="bg-neutral-50 rounded-xl p-4 mb-6 border border-neutral-200">
            <p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">Niveles de inventario</p>
            <div className="grid grid-cols-3 gap-3">
              {currentAlmacen.inventario_maximo && (
                <div>
                  <p className="text-xs text-neutral-500">Máximo</p>
                  <p className="text-sm font-semibold text-emerald-600">{currentAlmacen.inventario_maximo}</p>
                </div>
              )}
              {currentAlmacen.punto_reorden && (
                <div>
                  <p className="text-xs text-neutral-500">Reorden</p>
                  <p className="text-sm font-semibold text-amber-600">{currentAlmacen.punto_reorden}</p>
                </div>
              )}
              {currentAlmacen.inventario_minimo && (
                <div>
                  <p className="text-xs text-neutral-500">Mínimo</p>
                  <p className="text-sm font-semibold text-red-500">{currentAlmacen.inventario_minimo}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={onImagePress}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors duration-200"
          >
            <ImageIcon className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-semibold text-blue-700">Imagen</span>
          </button>

          <button
            onClick={onEdit}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors duration-200"
          >
            <MapPin className="w-5 h-5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Ubicación</span>
          </button>

          <button
            onClick={() => setShowDetailsModal(true)}
            className="flex flex-col items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors duration-200"
          >
            <Info className="w-5 h-5 text-emerald-600" />
            <span className="text-xs font-semibold text-emerald-700">Detalles</span>
          </button>
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-neutral-900">Detalles del Producto</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="p-2 rounded-xl bg-neutral-100 hover:bg-neutral-200 transition-colors duration-200"
              >
                <X className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Product Info */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-neutral-700 mb-3">Información</h4>
                <div className="space-y-2">
                  <div>
                    <p className="text-xs text-neutral-500">Clave</p>
                    <p className="font-semibold text-neutral-900">{product.clave_articulo}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">Nombre</p>
                    <p className="text-sm text-neutral-700">{product.nombre}</p>
                  </div>
                  {product.marca && (
                    <div>
                      <p className="text-xs text-neutral-500">Marca</p>
                      <p className="font-semibold text-emerald-600">{product.marca}</p>
                    </div>
                  )}
                  {product.linea_articulo && (
                    <div>
                      <p className="text-xs text-neutral-500">Línea</p>
                      <p className="font-semibold text-blue-600">{product.linea_articulo}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Pricing */}
              {(product.precio_publico || product.descuento) && (
                <div className="bg-neutral-50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold text-neutral-700 mb-3">Precios</h4>
                  <div className="space-y-2">
                    {product.precio_publico && (
                      <div>
                        <p className="text-xs text-neutral-500">Precio</p>
                        <p className="font-semibold text-emerald-600">${product.precio_publico.toFixed(2)}</p>
                      </div>
                    )}
                    {product.descuento && (
                      <div>
                        <p className="text-xs text-neutral-500">Descuento</p>
                        <p className="font-semibold text-red-500">{product.descuento}%</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Inventory */}
              <div className="bg-neutral-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-neutral-700 mb-3">Inventario</h4>
                <div className="space-y-3">
                  {Object.entries(product.almacenes)
                    .filter(([_, almacen]) => almacen.existencia && almacen.existencia > 0)
                    .slice(0, 6)
                    .map(([key, almacen]) => (
                      <div
                        key={key}
                        className="flex justify-between items-center py-2 border-b border-neutral-200 last:border-b-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-neutral-900">
                            {almacen.nombre.length > 20 ? almacen.nombre.substring(0, 20) + "..." : almacen.nombre}
                          </p>
                          <p className="text-xs text-amber-600">{almacen.ubicacion || "Sin ubicación"}</p>
                        </div>
                        <p className="font-semibold text-emerald-600">{almacen.existencia}</p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

 function CatalogoAlmacenPremiumInner() {
    
  const searchParams = useSearchParams()
  const almacenId = searchParams.get("almacenId") || ""
  const almacenNombre = searchParams.get("almacenNombre") || ""
  const almacenCodigo = searchParams.get("almacenCodigo") || ""

  const { apiUrl } = useCompany()
  const baseURL = useMemo(
    () => (apiUrl?.trim() ? apiUrl.trim().replace(/\/+$/, "") : "https://picking-backend.onrender.com"),
    [apiUrl],
  )

  const [searchText, setSearchText] = useState("")
  const [producto, setProducto] = useState<ProductoCompleto | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [showImageModal, setShowImageModal] = useState(false)
  const [scannerEnabled, setScannerEnabled] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newLocation, setNewLocation] = useState("")
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const scannerInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const buscarProducto = useCallback(
    async (query: string) => {
      if (!query.trim() || query.length < 2) {
        setProducto(null)
        setHasSearched(false)
        return
      }

      if (!baseURL) {
        return
      }

      try {
        setIsSearching(true)
        setHasSearched(true)

        const fullURL = `${baseURL}/buscar-producto-avanzado?clave=${encodeURIComponent(query.trim().toUpperCase())}`

        const resp = await fetch(fullURL, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        })

        const data = await resp.json()

        if (!resp.ok) {
          setProducto(null)
          return
        }

        if (data.encontrado && data.producto) {
          setProducto(data.producto)
        } else {
          setProducto(null)
        }
      } catch (error: any) {
        setProducto(null)
      } finally {
        setIsSearching(false)
      }
    },
    [baseURL],
  )

  const actualizarLocalizacion = useCallback(
    async (nuevaLocalizacion: string) => {
      if (!producto || !baseURL) {
        return
      }

      if (!nuevaLocalizacion.trim()) {
        return
      }

      try {
        setIsUpdatingLocation(true)

        const fullURL = `${baseURL}/actualizar-localizacion`

        const resp = await fetch(fullURL, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            clave: producto.clave_articulo,
            nuevaLocalizacion: nuevaLocalizacion.trim().toUpperCase(),
            almacenId: Number.parseInt(almacenId, 10),
          }),
        })

        const data = await resp.json()

        if (!resp.ok) {
          return
        }

        // Update product location
        const updatedProduct = { ...producto }
        const almacenesMap = {
          "384": "almacen_general",
          "3482": "bodega1",
          "3483": "bodega2",
          "3484": "bodega3",
          "3485": "bodega4",
          "3486": "bodega5",
          "3487": "defectos",
          "3638": "mercado_libre",
        } as const

        const almacenKey = almacenesMap[almacenId as keyof typeof almacenesMap]
        if (almacenKey) {
          updatedProduct.almacenes[almacenKey].ubicacion = nuevaLocalizacion.trim().toUpperCase()
        }

        setProducto(updatedProduct)
        setShowEditModal(false)
        setNewLocation("")

        alert("Localización actualizada correctamente")
      } catch (error: any) {
        alert("Error al actualizar la localización")
      } finally {
        setIsUpdatingLocation(false)
      }
    },
    [producto, baseURL, almacenId],
  )

  const handleImagePress = useCallback(() => {
    if (producto?.imagen) {
      setShowImageModal(true)
    } else {
      alert("No hay imagen disponible")
    }
  }, [producto?.imagen])

  const openEditModal = () => {
    if (!producto) return

    const almacenesMap = {
      "384": producto.almacenes.almacen_general?.ubicacion ?? "",
      "3482": producto.almacenes.bodega1?.ubicacion ?? "",
      "3483": producto.almacenes.bodega2?.ubicacion ?? "",
      "3484": producto.almacenes.bodega3?.ubicacion ?? "",
      "3485": producto.almacenes.bodega4?.ubicacion ?? "",
      "3486": producto.almacenes.bodega5?.ubicacion ?? "",
      "3487": producto.almacenes.defectos?.ubicacion ?? "",
      "3638": producto.almacenes.mercado_libre?.ubicacion ?? "",
    } as const

    const id = almacenId as keyof typeof almacenesMap
    const currentLocation = almacenesMap[id] ?? ""

    setNewLocation(currentLocation)
    setShowEditModal(true)
  }

  const handleSearch = (text: string) => {
    setSearchText(text)
    if (text.length >= 2) {
      buscarProducto(text)
    } else {
      setProducto(null)
      setHasSearched(false)
    }
  }

  const handleScannerInput = (text: string) => {
    if (text.length > 0) {
      setSearchText(text)
      buscarProducto(text)
      setTimeout(() => {
        if (scannerInputRef.current) {
          scannerInputRef.current.value = ""
        }
      }, 100)
    }
  }

  const toggleScanner = () => {
    setScannerEnabled(!scannerEnabled)

    if (!scannerEnabled) {
      setTimeout(() => {
        scannerInputRef.current?.focus()
      }, 100)
    } else {
      scannerInputRef.current?.blur()
    }
  }

  const handleBack = () => {
    router.back()
  }

  // Focus scanner on mount
  useEffect(() => {
    if (scannerEnabled && scannerInputRef.current) {
      scannerInputRef.current.focus()
    }
  }, [scannerEnabled])

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100">
      {/* Hidden Scanner Input */}
      <input
        ref={scannerInputRef}
        onChange={(e) => handleScannerInput(e.target.value)}
        className="absolute w-px h-px opacity-0 -z-10"
        autoComplete="off"
      />

      {/* Glassmorphism Header */}
      <div className="sticky top-0 z-40 backdrop-blur-xl bg-white/80 border-b border-neutral-200/50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/60 backdrop-blur-sm border border-neutral-200/50 hover:bg-white/80 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-700" />
              <span className="font-medium text-neutral-700">Almacenes</span>
            </button>

            <div className="text-center">
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
                {almacenNombre.length > 20 ? almacenNombre.substring(0, 20) + "..." : almacenNombre}
              </h1>
              <p className="text-sm text-neutral-600 font-medium mt-1">Catálogo de Productos</p>
            </div>

            <button
              onClick={toggleScanner}
              className={`px-4 py-2.5 rounded-xl border transition-all duration-200 ${
                scannerEnabled
                  ? "bg-blue-500 border-blue-500 text-white shadow-md"
                  : "bg-white/60 backdrop-blur-sm border-neutral-200/50 text-neutral-700 hover:bg-white/80"
              }`}
            >
              <div className="flex items-center gap-2">
                <Scan className="w-4 h-4" />
                <span className="font-medium text-sm">{scannerEnabled ? "ON" : "OFF"}</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-neutral-400" />
          </div>
          <input
            ref={searchInputRef}
            value={searchText}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por clave de artículo..."
            className="w-full pl-12 pr-12 py-4 bg-white/60 backdrop-blur-sm border border-neutral-200/50 rounded-2xl text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-200"
            autoCapitalize="characters"
            autoCorrect="false"
          />
          {searchText.length > 0 && (
            <button
              onClick={() => {
                setSearchText("")
                setProducto(null)
                setHasSearched(false)
              }}
              className="absolute inset-y-0 right-0 pr-4 flex items-center"
            >
              <X className="h-5 w-5 text-neutral-400 hover:text-neutral-600 transition-colors duration-200" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pb-8">
        {hasSearched && (
          <div>
            {isSearching ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                <p className="text-neutral-600 font-medium">Buscando producto...</p>
              </div>
            ) : producto ? (
              <ProductCard
                product={producto}
                selectedAlmacen={almacenId}
                onEdit={openEditModal}
                onImagePress={handleImagePress}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-2xl bg-neutral-100 border border-neutral-200 flex items-center justify-center mb-4">
                  <AlertCircle className="w-8 h-8 text-neutral-400" />
                </div>
                <h3 className="text-lg font-semibold text-neutral-900 mb-2">Sin resultados</h3>
                <p className="text-neutral-600 text-center">No se encontró "{searchText}" en este almacén</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image Modal */}
      {showImageModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative">
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-4 -right-4 z-10 p-2 rounded-full bg-white shadow-lg hover:bg-neutral-50 transition-colors duration-200"
            >
              <X className="w-5 h-5 text-neutral-600" />
            </button>

            <div className="bg-white rounded-2xl p-4 max-w-md">
              {producto?.imagen ? (
                <img
                  src={producto.imagen || "/placeholder.svg"}
                  alt={producto.clave_articulo}
                  className="w-full h-80 object-contain rounded-xl"
                />
              ) : (
                <div className="w-full h-80 bg-neutral-100 rounded-xl flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-neutral-400 mx-auto mb-2" />
                    <p className="text-neutral-600">Sin imagen disponible</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Editar Ubicación</h3>
              <p className="text-neutral-600">{producto?.clave_articulo}</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-neutral-700 mb-2">Nueva Ubicación:</label>
              <input
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Ej: A-01-B-03"
                className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all duration-200"
                autoCapitalize="characters"
                autoCorrect="false"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowEditModal(false)
                  setNewLocation("")
                }}
                className="flex-1 px-4 py-3 bg-neutral-100 text-neutral-700 rounded-xl font-semibold hover:bg-neutral-200 transition-colors duration-200"
                disabled={isUpdatingLocation}
              >
                Cancelar
              </button>

              <button
                onClick={() => actualizarLocalizacion(newLocation)}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                disabled={isUpdatingLocation || !newLocation.trim()}
              >
                {isUpdatingLocation ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Actualizando...
                  </>
                ) : (
                  "Actualizar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
