"use client"

import { GeneralFolios } from "./general-section/folios"
import { GeneralBilling } from "./general-section/billing"
import { GeneralNotifications } from "./general-section/notifications"

interface GeneralContentProps {
  activeSubSection: string
}

export function GeneralContent({ activeSubSection }: GeneralContentProps) {
  switch (activeSubSection) {
    case "empresa":
      return <GeneralFolios />
    case "sistema":
      return <GeneralBilling />
    case "notificaciones":
      return <GeneralNotifications />
    default:
      return <GeneralFolios />
  }
}
