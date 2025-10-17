"use client"
import { MOCK_ADMINS } from "./mock-data"
import { ConfigGeneral } from "./config/general"
import { ConfigLanguageRegion } from "./config/language-region"
import { ConfigConnection } from "./config/connection"
import { ConfigAdvanced } from "./config/advanced"
import { ConfigFolios } from "./config/folios"

interface AdminsContentProps {
  searchQuery: string
  activeSubSection: string
}

export function AdminsContent({ searchQuery, activeSubSection }: AdminsContentProps) {
  const filteredAdmins = MOCK_ADMINS.filter(
    (admin) =>
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  switch (activeSubSection) {
    case "admin-activos":
      return <ConfigGeneral />
    case "roles":
      return <ConfigLanguageRegion />
    case "admin-historial":
      return <ConfigConnection />
    case "alertas":
      return <ConfigAdvanced />
    case "empresa":
      return <ConfigFolios />
    default:
      return <ConfigGeneral />
  }
}
