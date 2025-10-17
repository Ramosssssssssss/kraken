import type React from "react"

export type MainSectionId = "usuarios" | "administradores" | "general" | "Facturación" | "modulos" | "configuracion"
export type SubSectionId = string

export interface MainSection {
  id: MainSectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export interface SubSection {
  id: SubSectionId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
}

export interface User {
  id: number
  name: string
  email: string
  role: string
  department: string
  status: "active" | "inactive"
  lastLogin: string
  phone: string
}

export interface Admin {
  id: number
  name: string
  email: string
  role: string
  permissions: string[]
  lastLogin: string
}
