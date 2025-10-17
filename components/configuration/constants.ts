import {
  Users,
  Shield,
  Settings,
  Lock,
  UserCheck,
  UserX,
  UserPlus,
  Clock,
  ShieldCheck,
  Key,
  History,
  ShieldAlert,
  Building2,
  Mail,
  CheckCircle2,
  Grid3x3,
} from "lucide-react"
import type { MainSection, SubSection, MainSectionId } from "./types"

export const MAIN_SECTIONS: MainSection[] = [
  { id: "usuarios", label: "Usuarios &  Roles", icon: Users, badge: 3 },
  { id: "configuracion", label: "Configuración", icon: Shield, badge: 5 },
  { id: "general", label: "General", icon: Settings },
  { id: "Facturación", label: "Facturación", icon: Lock },
]

export const SUB_SECTIONS: Record<MainSectionId, SubSection[]> = {
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
  administradores: [],
}
