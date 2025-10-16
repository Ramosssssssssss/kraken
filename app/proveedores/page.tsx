"use client"

import type React from "react"
import { useMemo, useState, useEffect } from "react"
import { Loader2, Warehouse, ArrowLeft, MapPin, Box, Search, Filter, BarChart3, Package, Plus, X, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { useCompany } from "@/lib/company-context"

// 1. Define la interfaz para tipar los almacenes (añadí ESTATUS para el filtro)
interface Almacen {
  PROVEEDOR_ID: number | string;
  NOMBRE: string;
  LIMITE_CREDITO?: number;
  CALLE: string;
  COLONIA: string;
  CONTACTO1: string;
  TELEFONO1?: number;
  
  
  ESTATUS?: 'A' | 'I'; // Activo / Inactivo
}

export default function ProveedoresPage() {
  const router = useRouter()
  const { companyData, apiUrl: apiUrlFromCtx, isReady } = useCompany()
  
  // Estados principales
  const [almacenes, setAlmacenes] = useState<Almacen[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedAlmacen, setSelectedAlmacen] = useState<Almacen | null>(null)

  // Estados para la funcionalidad de Agregar
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newAlmacenName, setNewAlmacenName] = useState("")
  const [isAdding, setIsAdding] = useState(false)

  // Estados para la funcionalidad de Filtrar
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false)
  const [selectedFilter, setSelectedFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos')

  const derivedApiUrl = useMemo(() => {
    if (apiUrlFromCtx) return apiUrlFromCtx
    return null
  }, [apiUrlFromCtx])

  // Lógica de filtrado y búsqueda combinada
  const filteredAlmacenes = useMemo(() => {
    let filtered = almacenes;

    // Aplicar filtro por estado
    if (selectedFilter === 'activos') {
      filtered = filtered.filter(a => a.ESTATUS === 'A');
    } else if (selectedFilter === 'inactivos') {
      filtered = filtered.filter(a => a.ESTATUS === 'I');
    }

    // Aplicar búsqueda
    if (!searchQuery) return filtered;
    return filtered.filter(almacen =>
      almacen.NOMBRE.toLowerCase().includes(searchQuery.toLowerCase()) ||
      almacen.PROVEEDOR_ID.toString().includes(searchQuery)
    );
  }, [almacenes, searchQuery, selectedFilter]);

  const MAX_RETRIES = 3
  const RETRY_DELAY_MS = 1000
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const fetchWithRetry = async (url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options)
        if (!response.ok && response.status >= 500) throw new Error(`Error del servidor: ${response.status}`)
        return response
      } catch (error) {
        if (i < retries - 1) {
          console.warn(`Intento ${i + 1} fallido. Reintentando en ${RETRY_DELAY_MS}ms...`)
          await delay(RETRY_DELAY_MS)
        } else {
          throw error
        }
      }
    }
    throw new Error("No se pudo completar la solicitud después de varios intentos.")
  }

  // --- FUNCIÓN PARA OBTENER ALMACENES ---
  useEffect(() => {
    const fetchAlmacenes = async () => {
      const apiUrl = derivedApiUrl
      if (!apiUrl) {
        setError("No se pudo obtener la URL de la API.")
        return
      }
      setIsLoading(true)
      setError("")
      try {
        const response = await fetchWithRetry(`${apiUrl}/almacenes`, { method: "GET", headers: { "Content-Type": "application/json" } })
        const data = await response.json()
        if (response.ok && data.almacenes) {
          // Simular que todos los almacenes vienen con estatus 'A' (Activo)
          setAlmacenes(data.almacenes.map(a => ({ ...a, ESTATUS: 'A' })))
        } else {
          setError(data.message || "Error al obtener los almacenes")
        }
      } catch (err) {
        console.error("Error fetching almacenes:", err)
        setError("Error de conexión. Intenta nuevamente.")
      } finally {
        setIsLoading(false)
      }
    }
    if (isReady) fetchAlmacenes()
  }, [derivedApiUrl, isReady])

  // --- FUNCIÓN PARA AGREGAR UN ALMACÉN ---
  const handleAddAlmacen = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAlmacenName.trim()) return

    const apiUrl = derivedApiUrl
    if (!apiUrl) {
      setError("No se pudo obtener la URL de la API.")
      return
    }

    setIsAdding(true)
    try {
      const response = await fetch(`${apiUrl}/proveedores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ NOMBRE: newAlmacenName.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        const newAlmacen: Almacen = {
          PROVEEDOR_ID: data.PROVEEDOR_ID || Date.now(), 
          NOMBRE: newAlmacenName.trim(),
          LIMITE_CREDITO: data.LIMITE_CREDITO,
          CALLE: data.CALLE,
          COLONIA: data.COLONIA,
          CONTACTO1: data.CONTACTO1,
          TELEFONO1: data.TELEFONO1,
          ESTATUS: 'A'
        };
        setAlmacenes(prev => [newAlmacen, ...prev]);
        setNewAlmacenName("");
        setIsAddModalOpen(false);
      } else {
        setError(data.message || "Error al agregar el almacén.");
      }
    } catch (err) {
      console.error("Error adding almacen:", err)
      setError("Error de conexión al agregar. Intenta nuevamente.")
    } finally {
      setIsAdding(false)
    }
  }

  const handleSelectAlmacen = (almacen: Almacen) => {
    setSelectedAlmacen(almacen)
    console.log("Almacén seleccionado:", almacen)
  }

  if (!isReady) {
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <div className="relative"><div className="w-16 h-16 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Fondo dinámico y atmosférico */}
      <div className="fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      {/* Header Premium */}
      <header className="relative z-30 bg-neutral-900/40 backdrop-blur-2xl border-b border-neutral-800/50">
        <div className="max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center space-x-6">
              <button onClick={() => router.back()} className="p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all duration-300 group">
                <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-0.5" />
              </button>
              <div className="flex items-center space-x-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 shadow-lg shadow-purple-500/20">
                  <Warehouse className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">Centros de Distribución</h1>
                  <p className="text-sm text-neutral-500">Gestiona y monitorea todos tus almacenes</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* --- BOTÓN DE FILTRAR --- */}
              <div className="relative">
                <button onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)} className="p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all duration-300">
                  <Filter className="w-5 h-5" />
                </button>
                {isFilterDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-xl z-50">
                    <button onClick={() => { setSelectedFilter('todos'); setIsFilterDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-neutral-700 transition-colors flex items-center justify-between">
                      <span>Todos</span>
                      {selectedFilter === 'todos' && <Check className="w-4 h-4 text-purple-400"/>}
                    </button>
                    <button onClick={() => { setSelectedFilter('activos'); setIsFilterDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-neutral-700 transition-colors flex items-center justify-between">
                      <span>Activos</span>
                      {selectedFilter === 'activos' && <Check className="w-4 h-4 text-purple-400"/>}
                    </button>
                    <button onClick={() => { setSelectedFilter('inactivos'); setIsFilterDropdownOpen(false); }} className="w-full text-left px-4 py-3 hover:bg-neutral-700 transition-colors flex items-center justify-between">
                      <span>Inactivos</span>
                      {selectedFilter === 'inactivos' && <Check className="w-4 h-4 text-purple-400"/>}
                    </button>
                  </div>
                )}
              </div>
              <button className="p-3 rounded-xl bg-neutral-800/50 hover:bg-neutral-700/50 text-neutral-400 hover:text-white transition-all duration-300">
                <BarChart3 className="w-5 h-5" />
              </button>
              <div className="h-8 w-px bg-neutral-700"></div>
              {/* --- BOTÓN DE AGREGAR --- */}
              <button onClick={() => setIsAddModalOpen(true)} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-medium transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30">
                <Plus className="w-4 h-4" />
                <span>Nuevo Almacén</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Barra de Búsqueda y Estadísticas */}
      <section className="relative z-20 max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 py-8">
        <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
          <div className="relative w-full lg:w-96">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-900/60 border border-neutral-800/50 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent transition-all duration-300"
            />
          </div>
          <div className="flex items-center space-x-8 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50"></div>
              <span className="text-neutral-400">{almacenes.filter(a => a.ESTATUS === 'A').length} Activos</span>
            </div>
            <div className="text-neutral-500">
              Total: <span className="text-white font-medium">{almacenes.length}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="relative z-10 max-w-screen-2xl mx-auto px-6 sm:px-8 lg:px-10 pb-16">
        {/* ... (El código para los estados de carga, error y vacío es el mismo) ... */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96"><div className="w-20 h-20 border-4 border-neutral-700 border-t-purple-500 rounded-full animate-spin mb-6"></div><p className="text-neutral-400 text-lg">Cargando centros de distribución...</p></div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96 text-center"><div className="w-24 h-24 rounded-2xl bg-red-500/10 flex items-center justify-center mb-6"><Warehouse className="w-12 h-12 text-red-500" /></div><h3 className="text-xl font-semibold text-white mb-2">Error de Conexión</h3><p className="text-neutral-400 mb-8 max-w-md">{error}</p><button onClick={() => window.location.reload()} className="px-8 py-3 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-all duration-300">Reintentar</button></div>
        ) : filteredAlmacenes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96 text-center"><div className="relative"><div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-neutral-800 to-neutral-900 flex items-center justify-center mb-6"><Package className="w-16 h-16 text-neutral-600" /></div><div className="absolute -top-2 -right-2 w-8 h-8 bg-neutral-800 rounded-full flex items-center justify-center"><span className="text-neutral-500 text-xs font-bold">0</span></div></div><h3 className="text-xl font-semibold text-white mb-2">{searchQuery ? "Sin Resultados" : "No Hay Almacenes"}</h3><p className="text-neutral-400 max-w-md">{searchQuery ? "Tu búsqueda no coincidió con ningún almacén." : "Parece que no tienes almacenes configurados en este momento."}</p></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
            {filteredAlmacenes.map((almacen, index) => (
              <div key={almacen.PROVEEDOR_ID} onClick={() => handleSelectAlmacen(almacen)} className="group relative bg-neutral-900/40 backdrop-blur-xl border border-neutral-800/50 rounded-2xl p-8 cursor-pointer transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 hover:-translate-y-2 hover:border-neutral-700/50 overflow-hidden" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600/20 to-indigo-600/20 flex items-center justify-center shadow-lg">
                      <Box className="w-7 h-7 text-purple-400" />
                    </div>
                    <span className="text-xs text-neutral-500 bg-neutral-800/80 backdrop-blur-sm px-3 py-1.5 rounded-full font-mono">#{almacen.PROVEEDOR_ID}</span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-3 group-hover:text-purple-400 transition-colors duration-300">{almacen.NOMBRE}</h3>
                  <div className="flex items-center text-sm text-neutral-400 mb-6"><MapPin className="w-4 h-4 mr-2" /><span>Ver en mapa</span></div>
                  <div className="flex items-center justify-between pt-6 border-t border-neutral-800/50">
                    <div className="flex items-center space-x-2">
                      <div className="relative"><div className={`w-2 h-2 rounded-full ${almacen.ESTATUS === 'A' ? 'bg-emerald-500' : 'bg-neutral-500'}`}></div><div className={`absolute inset-0 w-2 h-2 rounded-full ${almacen.ESTATUS === 'A' ? 'bg-emerald-500 animate-ping' : ''}`}></div></div>
                      <span className="text-xs text-neutral-400 font-medium">{almacen.ESTATUS === 'A' ? 'Operativo' : 'Inactivo'}</span>
                    </div>
                    <button className="text-sm text-purple-400 font-semibold hover:text-purple-300 transition-colors duration-300 flex items-center gap-1">Gestionar <ArrowLeft className="w-3 h-3 rotate-180" /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- MODAL PARA AGREGAR ALMACÉN --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)}></div>
          <div className="relative bg-neutral-900 border border-neutral-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
            <button onClick={() => setIsAddModalOpen(false)} className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6">Agregar Nuevo Almacén</h2>
            <form onSubmit={handleAddAlmacen}>
              <div className="mb-6">
                <label htmlFor="nombre" className="block text-sm font-medium text-neutral-400 mb-2">Nombre del Almacén</label>
                <input
                  id="nombre"
                  type="text"
                  value={newAlmacenName}
                  onChange={(e) => setNewAlmacenName(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-800 border border-neutral-700 rounded-xl text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-transparent"
                  placeholder="Ej: Almacén Central"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-2.5 bg-neutral-800 text-white rounded-xl hover:bg-neutral-700 transition-colors">Cancelar</button>
                <button type="submit" disabled={isAdding} className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 disabled:opacity-50 flex items-center gap-2">
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {isAdding ? 'Agregando...' : 'Agregar Almacén'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}