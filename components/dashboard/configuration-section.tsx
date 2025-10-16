"use client"

import type React from "react"

import { useState } from "react"
import {
  Users,
  Shield,
  Settings,
  Lock,
  Grid3x3,
  Search,
  Plus,
  Edit2,
  Trash2,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Mail,
  Calendar,
  Building2,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  ShieldCheck,
  ShieldAlert,
  Key,
  History,
} from "lucide-react"

type MainSectionId = "usuarios" | "administradores" | "general" | "Facturación" | "modulos" | "configuracion"
type SubSectionId = string

interface MainSection {
  id: MainSectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

interface SubSection {
  id: SubSectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

const MAIN_SECTIONS: MainSection[] = [
  { id: "usuarios", label: "Usuarios &  Roles", icon: Users, badge: 3 },
  { id: "configuracion", label: "Configuración", icon: Shield, badge: 5 },
  { id: "general", label: "General", icon: Settings },
  { id: "Facturación", label: "Facturación", icon: Lock },
]

const SUB_SECTIONS: Record<MainSectionId, SubSection[]> = {
  usuarios: [
    { id: "activos", label: "Usuarios", icon: UserCheck, badge: 21 },
    { id: "inactivos", label: "Administradores", icon: UserX, badge: 3 },
    { id: "pendientes", label: "Invitaciones", icon: UserPlus, badge: 2 },
    { id: "historial", label: "Roles", icon: Clock },
    { id: "Facturación", label: "Facturación", icon: Lock },
  ],
  configuracion: [
    { id: "admin-activos", label: "General", icon: ShieldCheck, badge: 5 },
    { id: "roles", label: "Idioma & Región", icon: Key },
    { id: "admin-historial", label: "Conexión", icon: History },
    { id: "alertas", label: "Configuraciones Avanzadas", icon: ShieldAlert, badge: 1 },
        { id: "empresa", label: "Folios", icon: Building2 },

  ],
  general: [
    { id: "empresa", label: "Folios", icon: Building2 },
    { id: "sistema", label: "Facturacion", icon: Settings },
    { id: "notificaciones", label: "Notificaciones", icon: Mail },
  ],
  Facturación: [
    { id: "roles-Facturación", label: "Roles del Sistema", icon: Shield },
    { id: "Facturación-modulos", label: "Facturación por Módulo", icon: Lock },
    { id: "Facturación-custom", label: "Facturación Personalizados", icon: Key },
  ],
  modulos: [
    { id: "modulos-activos", label: "Módulos Activos", icon: CheckCircle2 },
    { id: "modulos-disponibles", label: "Módulos Disponibles", icon: Grid3x3 },
  ],
  administradores: []
}

// Mock data for demonstration
const MOCK_USERS = [
  {
    id: 1,
    name: "Carlos Mendoza",
    email: "carlos.mendoza@krkn.com",
    role: "Gerente de Almacén",
    department: "Operaciones",
    status: "active",
    lastLogin: "2025-01-15 14:30",
    phone: "+52 555 123 4567",
  },
  {
    id: 2,
    name: "Ana García",
    email: "ana.garcia@krkn.com",
    role: "Supervisor",
    department: "Logística",
    status: "active",
    lastLogin: "2025-01-15 09:15",
    phone: "+52 555 234 5678",
  },
  {
    id: 3,
    name: "Roberto Silva",
    email: "roberto.silva@krkn.com",
    role: "Operador",
    department: "Almacén",
    status: "inactive",
    lastLogin: "2025-01-10 16:45",
    phone: "+52 555 345 6789",
  },
]

const MOCK_ADMINS = [
  {
    id: 1,
    name: "María López",
    email: "maria.lopez@krkn.com",
    role: "Super Admin",
    permissions: ["all"],
    lastLogin: "2025-01-15 15:00",
  },
  {
    id: 2,
    name: "Jorge Ramírez",
    email: "jorge.ramirez@krkn.com",
    role: "Admin",
    permissions: ["users", "inventory", "reports"],
    lastLogin: "2025-01-15 12:30",
  },
]

export default function ConfigurationSection() {
  const [activeMainSection, setActiveMainSection] = useState<MainSectionId>("usuarios")
  const [activeSubSection, setActiveSubSection] = useState<SubSectionId>("activos")
  const [searchQuery, setSearchQuery] = useState("")

  const handleMainSectionChange = (sectionId: MainSectionId) => {
    setActiveMainSection(sectionId)
    const firstSubSection = SUB_SECTIONS[sectionId][0]
    setActiveSubSection(firstSubSection.id)
  }

  const renderContent = () => {
    switch (activeMainSection) {
      case "usuarios":
        return <UsersContent searchQuery={searchQuery} activeSubSection={activeSubSection} />
      case "administradores":
        return <AdminsContent searchQuery={searchQuery} activeSubSection={activeSubSection} />
      case "general":
        return <GeneralContent activeSubSection={activeSubSection} />
      case "Facturación":
        return <PermissionsContent activeSubSection={activeSubSection} />
      case "modulos":
        return <ModulesContent activeSubSection={activeSubSection} />
      default:
        return null
    }
  }

  const currentSubSections = SUB_SECTIONS[activeMainSection]

  return (
    <div className="space-y-6 flex-1">
      {/* Header with Sub-Section Tabs */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl overflow-hidden">
        {/* Title Section */}
        <div className="border-b border-white/10 bg-black/20 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-light tracking-wide text-white/90">Centro de Configuración</h3>
              <p className="mt-1 text-sm font-light tracking-wide text-white/50">
                Gestión avanzada de usuarios, Facturación y módulos del sistema
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm font-light tracking-wide text-white placeholder-white/40 backdrop-blur-xl transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-black/10 px-8">
        
          <div className="flex gap-1">
            
            {currentSubSections.map((subSection) => {
              const Icon = subSection.icon
              const isActive = activeSubSection === subSection.id

              return (
                
                <button
                  key={subSection.id}
                  onClick={() => setActiveSubSection(subSection.id)}
                  className={`group relative flex items-center gap-2.5 px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
                    isActive ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-all ${isActive ? "text-purple-400" : "text-white/40 group-hover:text-white/60"}`}
                  />
                  <span>{subSection.label}</span>
                  {subSection.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isActive ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {subSection.badge}
                    </span>
                  )}

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
        
      </div>

      <div className="flex gap-6">
              <div className="w-60 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-3">
            <div className="space-y-1">
              {MAIN_SECTIONS.map((section) => {
                const Icon = section.icon
                const isActive = activeMainSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => handleMainSectionChange(section.id)}
                    className={`group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-light tracking-wide transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white shadow-lg shadow-purple-500/10"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-all ${
                        isActive ? "text-purple-400" : "text-white/40 group-hover:text-white/60"
                      }`}
                    />
                    <span className="flex-1 text-left">{section.label}</span>
                    {section.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isActive ? "bg-purple-500/30 text-purple-200" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {section.badge}
                      </span>
                    )}

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-purple-500 to-blue-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8">
          {renderContent()}
        </div>

  
      </div>
    </div>
  )
}

// Users Content Component
function UsersContent({ searchQuery, activeSubSection }: { searchQuery: string; activeSubSection: string }) {
  // Filter users based on sub-section
  let filteredUsers = MOCK_USERS.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Further filter based on sub-section
  if (activeSubSection === "activos") {
    filteredUsers = filteredUsers.filter((user) => user.status === "active")
  } else if (activeSubSection === "inactivos") {
    filteredUsers = filteredUsers.filter((user) => user.status === "inactive")
  } else if (activeSubSection === "pendientes") {
    filteredUsers = [] // No pending users in mock data
  }

  // Show different content based on sub-section
  if (activeSubSection === "historial") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Historial de Accesos</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            Registro de actividad de usuarios en el sistema
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Clock className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Historial de Accesos</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            Esta sección estará disponible próximamente
          </p>
        </div>
      </div>
    )
  }

  if (activeSubSection === "pendientes") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Solicitudes Pendientes</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">Usuarios pendientes de aprobación</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <UserPlus className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">No hay solicitudes pendientes</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            Todas las solicitudes han sido procesadas
          </p>
        </div>
      </div>
    )
  }

  const sectionTitle =
    activeSubSection === "activos"
      ? "Usuarios Activos"
      : activeSubSection === "inactivos"
        ? "Usuarios Dados de Baja"
        : "Gestión de Usuarios"

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">{sectionTitle}</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            {filteredUsers.length} usuario(s) {activeSubSection === "activos" ? "activo(s)" : "inactivo(s)"}
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-light tracking-wide text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
          <Plus className="h-4 w-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-xl border border-white/10 bg-black/20">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">USUARIO</th>
              <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">ROL</th>
              <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">DEPARTAMENTO</th>
              <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">ESTADO</th>
              <th className="px-6 py-4 text-left text-xs font-medium tracking-wider text-white/60">ÚLTIMO ACCESO</th>
              <th className="px-6 py-4 text-right text-xs font-medium tracking-wider text-white/60">ACCIONES</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredUsers.map((user) => (
              <tr key={user.id} className="group transition-colors hover:bg-white/5">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                      <span className="text-sm font-medium text-purple-300">
                        {user.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-light text-white/90">{user.name}</div>
                      <div className="flex items-center gap-1.5 text-xs font-light text-white/50">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="rounded-lg bg-white/10 px-3 py-1.5 text-xs font-light tracking-wide text-white/80">
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-sm font-light text-white/70">
                    <Building2 className="h-3.5 w-3.5 text-white/40" />
                    {user.department}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.status === "active" ? (
                    <span className="flex items-center gap-1.5 text-xs font-light text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-light text-red-400">
                      <XCircle className="h-3.5 w-3.5" />
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 text-xs font-light text-white/60">
                    <Calendar className="h-3 w-3" />
                    {user.lastLogin}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white/90">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400">
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
    </div>
  )
}

// Admins Content Component
function AdminsContent({ searchQuery, activeSubSection }: { searchQuery: string; activeSubSection: string }) {
  const filteredAdmins = MOCK_ADMINS.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // Show different content based on sub-section
  if (activeSubSection === "roles") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Roles y Facturación</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">Configuración de roles administrativos</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Key className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Roles y Facturación</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            Esta sección estará disponible próximamente
          </p>
        </div>
      </div>
    )
  }

  if (activeSubSection === "admin-historial") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Historial de Accesos Administrativos</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            Registro de actividad de administradores
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <History className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Historial de Accesos</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            Esta sección estará disponible próximamente
          </p>
        </div>
      </div>
    )
  }

  if (activeSubSection === "alertas") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Alertas de Seguridad</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">Notificaciones de seguridad del sistema</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Alertas de Seguridad</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            Esta sección estará disponible próximamente
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Administradores del Sistema</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            {filteredAdmins.length} administrador(es) con acceso privilegiado
          </p>
        </div>

        <button className="flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-5 py-2.5 text-sm font-light tracking-wide text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50">
          <Plus className="h-4 w-4" />
          Nuevo Administrador
        </button>
      </div>

      <div className="grid gap-4">
        {filteredAdmins.map((admin) => (
          <div
            key={admin.id}
            className="group rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:bg-white/10 hover:border-white/20"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/30 to-blue-500/30 border border-purple-500/40">
                  <Shield className="h-7 w-7 text-purple-300" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h5 className="text-lg font-light tracking-wide text-white/90">{admin.name}</h5>
                    <span className="rounded-lg bg-purple-500/20 px-3 py-1 text-xs font-medium text-purple-300">
                      {admin.role}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 text-sm font-light text-white/60">
                    <Mail className="h-3.5 w-3.5" />
                    {admin.email}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {admin.permissions.map((perm) => (
                      <span
                        key={perm}
                        className="rounded-md bg-white/10 px-2.5 py-1 text-xs font-light tracking-wide text-white/70"
                      >
                        {perm === "all" ? "Acceso Total" : perm}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-light text-white/50">
                    <Calendar className="h-3 w-3" />
                    Último acceso: {admin.lastLogin}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-white/10 hover:text-white/90">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/60 transition-all hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// General Settings Content
function GeneralContent({ activeSubSection }: { activeSubSection: string }) {
  if (activeSubSection === "empresa") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Información de Empresa</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">Datos generales de la organización</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <label className="text-sm font-medium tracking-wide text-white/80">Nombre de la Empresa</label>
            <input
              type="text"
              placeholder="KRKN Systems"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white placeholder-white/40 transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium tracking-wide text-white/80">RFC</label>
            <input
              type="text"
              placeholder="KRK123456ABC"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white placeholder-white/40 transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="space-y-3 md:col-span-2">
            <label className="text-sm font-medium tracking-wide text-white/80">Dirección</label>
            <input
              type="text"
              placeholder="Calle Principal #123, Col. Centro"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white placeholder-white/40 transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <button className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-light tracking-wide text-white/70 transition-all hover:bg-white/10 hover:text-white/90">
            Cancelar
          </button>
          <button className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-2.5 text-sm font-light tracking-wide text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
            Guardar Cambios
          </button>
        </div>
      </div>
    )
  }

  if (activeSubSection === "notificaciones") {
    return (
      <div className="space-y-6">
        <div>
          <h4 className="text-xl font-light tracking-wide text-white/90">Configuración de Notificaciones</h4>
          <p className="mt-1 text-sm font-light tracking-wide text-white/50">
            Preferencias de notificaciones del sistema
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Mail className="mx-auto h-12 w-12 text-white/30" />
          <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Notificaciones</h5>
          <p className="mt-2 text-sm font-light tracking-wide text-white/50">
            Esta sección estará disponible próximamente
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">Configuración del Sistema</h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">Ajustes globales del sistema KRKN</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="text-sm font-medium tracking-wide text-white/80">Zona Horaria</label>
          <select className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option>GMT-6 (Ciudad de México)</option>
            <option>GMT-5 (Bogotá)</option>
            <option>GMT-3 (Buenos Aires)</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium tracking-wide text-white/80">Idioma del Sistema</label>
          <select className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option>Español</option>
            <option>English</option>
            <option>Português</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium tracking-wide text-white/80">Formato de Fecha</label>
          <select className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option>DD/MM/YYYY</option>
            <option>MM/DD/YYYY</option>
            <option>YYYY-MM-DD</option>
          </select>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium tracking-wide text-white/80">Moneda</label>
          <select className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-light tracking-wide text-white transition-all focus:border-purple-500/50 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20">
            <option>MXN - Peso Mexicano</option>
            <option>USD - Dólar Americano</option>
            <option>EUR - Euro</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <button className="rounded-xl border border-white/10 bg-white/5 px-6 py-2.5 text-sm font-light tracking-wide text-white/70 transition-all hover:bg-white/10 hover:text-white/90">
          Cancelar
        </button>
        <button className="rounded-xl border border-purple-500/30 bg-purple-500/10 px-6 py-2.5 text-sm font-light tracking-wide text-purple-300 transition-all hover:bg-purple-500/20 hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/20">
          Guardar Cambios
        </button>
      </div>
    </div>
  )
}

function PermissionsContent({ activeSubSection }: { activeSubSection: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">
          {activeSubSection === "roles-Facturación"
            ? "Roles del Sistema"
            : activeSubSection === "Facturación-modulos"
              ? "Facturación por Módulo"
              : "Facturación Personalizados"}
        </h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">
          Configuración de roles y Facturación del sistema
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Lock className="mx-auto h-12 w-12 text-white/30" />
        <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Configuración de Facturación</h5>
        <p className="mt-2 text-sm font-light tracking-wide text-white/50">
          Esta sección estará disponible próximamente
        </p>
      </div>
    </div>
  )
}

function ModulesContent({ activeSubSection }: { activeSubSection: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-xl font-light tracking-wide text-white/90">
          {activeSubSection === "modulos-activos" ? "Módulos Activos" : "Módulos Disponibles"}
        </h4>
        <p className="mt-1 text-sm font-light tracking-wide text-white/50">
          Gestión de módulos y funcionalidades del sistema
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <Grid3x3 className="mx-auto h-12 w-12 text-white/30" />
        <h5 className="mt-4 text-lg font-light tracking-wide text-white/70">Gestión de Módulos</h5>
        <p className="mt-2 text-sm font-light tracking-wide text-white/50">
          Esta sección estará disponible próximamente
        </p>
      </div>
    </div>
  )
}
