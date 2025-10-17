"use client"

import { BillingSystemRoles } from "./billing/system-roles"
import { BillingModuleBilling } from "./billing/module-billing"
import { BillingCustomBilling } from "./billing/custom-billing"

interface PermissionsContentProps {
  activeSubSection: string
}

export function PermissionsContent({ activeSubSection }: PermissionsContentProps) {
  switch (activeSubSection) {
    case "roles-Facturación":
      return <BillingSystemRoles />
    case "Facturación-modulos":
      return <BillingModuleBilling />
    case "Facturación-custom":
      return <BillingCustomBilling />
    default:
      return <BillingSystemRoles />
  }
}
