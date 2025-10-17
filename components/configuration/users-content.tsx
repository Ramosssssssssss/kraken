"use client"

import { Users } from "./users-roles/users"
import { Admins } from "./users-roles/admins"
import { Invitations } from "./users-roles/invitations"
import { Roles } from "./users-roles/roles"
import { Billing } from "./users-roles/billing"

interface UsersContentProps {
  searchQuery: string
  activeSubSection: string
}

export function UsersContent({ searchQuery, activeSubSection }: UsersContentProps) {
  switch (activeSubSection) {
    case "activos":
      return <Users searchQuery={searchQuery} />
    case "inactivos":
      return <Admins searchQuery={searchQuery} />
    case "pendientes":
      return <Invitations />
    case "historial":
      return <Roles />
    case "Facturación":
      return <Billing />
    default:
      return <Users searchQuery={searchQuery} />
  }
}
