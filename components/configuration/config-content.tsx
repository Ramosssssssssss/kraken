"use client"

import { ConfigGeneral } from "./config/general"
import { ConfigLanguageRegion } from "./config/language-region"
import { ConfigConnection } from "./config/connection"
import { ConfigAdvanced } from "./config/advanced"
import { ConfigFolios } from "./config/folios"

interface ConfigContentProps {
  activeSubSection: string
}

export function ConfigContent({ activeSubSection }: ConfigContentProps) {
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
