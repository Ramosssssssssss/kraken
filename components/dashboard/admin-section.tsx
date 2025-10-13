"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, RefreshCw, Building2, Globe, Calendar, Pencil, Save, X } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface Cliente {
  id: number
  codigo: string
  nombre: string
  apiUrl: string
  activo?: boolean
  fechaCreacion?: string
  ultimoAcceso?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null)
  const [newApiUrl, setNewApiUrl] = useState("")
  const [updating, setUpdating] = useState(false)

  const fetchClientes = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("https://picking-backend.onrender.com/clientesKRKN", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.ok && Array.isArray(data.clientes)) {
        setClientes(data.clientes)
        setFilteredClientes(data.clientes)
      } else {
        throw new Error("Formato de respuesta inválido")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar clientes")
      console.error("[v0] Error fetching clientes:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = (cliente: Cliente) => {
    setEditingCliente(cliente)
    setNewApiUrl(cliente.apiUrl)
    setEditModalOpen(true)
  }

  const handleUpdateApiUrl = async () => {
    if (!editingCliente) return

    setUpdating(true)
    try {
      const response = await fetch(`https://picking-backend.onrender.com/clientes/${editingCliente.id}/api-url`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ apiUrl: newApiUrl }),
      })

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.ok) {
        // Update local state
        setClientes((prev) => prev.map((c) => (c.id === editingCliente.id ? { ...c, apiUrl: newApiUrl } : c)))
        setFilteredClientes((prev) => prev.map((c) => (c.id === editingCliente.id ? { ...c, apiUrl: newApiUrl } : c)))
        setEditModalOpen(false)
        setEditingCliente(null)
      } else {
        throw new Error(data.message || "Error al actualizar")
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al actualizar API URL")
      console.error("[v0] Error updating API URL:", err)
    } finally {
      setUpdating(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  useEffect(() => {
    const filtered = clientes.filter(
      (cliente) =>
        cliente.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cliente.apiUrl.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredClientes(filtered)
  }, [searchTerm, clientes])

  return (
    <div className="min-h-screen bg-black from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
              <Building2 className="h-8 w-8 text-primary" />
              Clientes
            </h1>
            <p className="text-muted-foreground mt-1">Gestiona todos los clientes del sistema</p>
          </div>
          <Button onClick={fetchClientes} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <Badge variant="default" className="bg-green-500">
                Activo
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clientes.filter((c) => c.activo !== false).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resultados</CardTitle>
              <Search className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredClientes.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Search Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Buscar Clientes</CardTitle>
            <CardDescription>Filtra por nombre, código o URL de API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar clientes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive text-center">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[80px]">ID</TableHead>
                    <TableHead>Código</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>API URL</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                    <TableHead className="text-right">Fecha Creación</TableHead>
                    <TableHead className="text-center w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                        <p className="text-muted-foreground mt-2">Cargando clientes...</p>
                      </TableCell>
                    </TableRow>
                  ) : filteredClientes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                        <p className="text-muted-foreground mt-2">
                          {searchTerm ? "No se encontraron clientes" : "No hay clientes disponibles"}
                        </p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredClientes.map((cliente) => (
                      <TableRow key={cliente.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{cliente.id}</TableCell>
                        <TableCell>
                          <code className="px-2 py-1 bg-muted rounded text-sm">{cliente.codigo}</code>
                        </TableCell>
                        <TableCell className="font-medium">{cliente.nombre}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Globe className="h-3 w-3" />
                            <span className="truncate max-w-[300px]">{cliente.apiUrl}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={cliente.activo !== false ? "default" : "secondary"}
                            className={cliente.activo !== false ? "bg-green-500 hover:bg-green-600" : ""}
                          >
                            {cliente.activo !== false ? "Activo" : "Inactivo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {cliente.fechaCreacion ? (
                            <div className="flex items-center justify-end gap-1">
                              <Calendar className="h-3 w-3" />
                              {new Date(cliente.fechaCreacion).toLocaleDateString()}
                            </div>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(cliente)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Footer Info */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              Mostrando {filteredClientes.length} de {clientes.length} clientes totales
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar API URL</DialogTitle>
            <DialogDescription>Actualiza la URL de la API para {editingCliente?.nombre}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="cliente-nombre">Cliente</Label>
              <Input id="cliente-nombre" value={editingCliente?.nombre || ""} disabled className="bg-muted" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api-url">API URL</Label>
              <Input
                id=" "
                value={newApiUrl}
                onChange={(e) => setNewApiUrl(e.target.value)}
                placeholder="https://api.ejemplo.com"
                type="url"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)} disabled={updating}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button onClick={handleUpdateApiUrl} disabled={updating || !newApiUrl}>
              {updating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
