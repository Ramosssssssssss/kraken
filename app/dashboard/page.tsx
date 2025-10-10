"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import Sidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import PersonalizeSection from "@/components/dashboard/personalize-section"
import UsersSection from "@/components/dashboard/users-section"
import ApplicationsSection from "@/components/dashboard/applications-section"
import CatalogsSection from "@/components/dashboard/catalogs-section"
import ProcessesSection from "@/components/dashboard/processes-section"
import InventorySection from "@/components/dashboard/inventory-sections"
import EmbarquesSection from "@/components/dashboard/embarques-section"
import IntegrationsSection from "@/components/dashboard/integrations-section"
import ConfigurationSection from "@/components/dashboard/configuration-section"
import PerfilPage from "@/components/dashboard/profile-section"
import PlaceholderSection from "@/components/dashboard/placeholder-section"
import TablesSection from "@/components/dashboard/tables-section"
import AdminSection from "@/components/dashboard/admin-section"
// Opcional: evita pre-render estático de esta página

export const dynamic = "force-dynamic"


interface UserData {
  PIKER_ID: number
  NOMBRE: string
  USUARIO: string
  ESTATUS: string
  IMAGEN_COLAB?: string
  IMAGEN_COLAB_MIME?: string
  ROL: string
  MODULOS_KRKN: string
  MODULOS_KRKN_ARRAY: number[]
}
interface CompanyData {
  id: number
  codigo: string
  nombre: string
  apiUrl: string
  branding?: any
}

const ALLOWED_SECTIONS = new Set([
  "PERFIL",
  "PERSONALIZAR",
  "USUARIOS",
  "APLICACIONES",
  "CATÁLOGOS",
  "PROCESOS",
  "INVENTARIO",
  "EMBARQUES",
  "INTEGRACIONES",
  "CONFIGURACION",
    "ADMIN",

  // nuevas que van a placeholder
  "ADUANA",
  "AUDITORÍA",
  "KPI'S",
  "LAYOUT",
  "TABLEROS",
])

const PLACEHOLDER_SECTIONS = new Set([
  "ADUANA",
  "AUDITORÍA",
  "INTEGRACIONES",
  "KPI'S",
  "LAYOUT",
  "TABLEROS",
])
/* ---------- Wrapper con Suspense ---------- */
export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <DashboardPageInner />
    </Suspense>
  )
}

/* ---------- Todo tu código va aquí dentro ---------- */
function DashboardPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [userData, setUserData] = useState<UserData | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState<string>("PERFIL")

  const [sidebarOpen, setSidebarOpen] = useState(true)
  const onToggleSidebar = () => setSidebarOpen((s) => !s)

  useEffect(() => {
    const storedUserData = localStorage.getItem("userData")
    const storedCompanyData = localStorage.getItem("companyData")

    if (storedUserData && storedCompanyData) {
      setUserData(JSON.parse(storedUserData))
      setCompanyData(JSON.parse(storedCompanyData))
      setIsLoading(false)
    } else {
      router.replace("/")
      return
    }

    // 1) ?section=...
    const qp = searchParams.get("section")
    const candidate = (qp || "").toUpperCase()
    if (candidate && ALLOWED_SECTIONS.has(candidate)) {
      setActiveSection(candidate)
      try { localStorage.setItem("dashboard:lastSection", candidate) } catch {}
      return
    }

    // 2) fallback localStorage
    try {
      const last = localStorage.getItem("dashboard:lastSection")
      if (last && ALLOWED_SECTIONS.has(last)) {
        setActiveSection(last)
        router.replace(`/dashboard?section=${last}`)
        return
      }
    } catch {}

    // 3) default
    router.replace(`/dashboard?section=PERFIL`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams])

  const handleSectionChange = (section: string) => {
    const s = section.toUpperCase()
    setActiveSection(s)
    try { localStorage.setItem("dashboard:lastSection", s) } catch {}
    router.replace(`/dashboard?section=${s}`)
  }

  const handleLogout = () => {
    localStorage.removeItem("userData")
    localStorage.removeItem("companyData")
    router.replace("/login")
  }

const renderContent = useMemo(() => {
  // Si la sección clickeada está marcada como placeholder, renderízala acá
  if (PLACEHOLDER_SECTIONS.has(activeSection)) {
    return <PlaceholderSection title={activeSection} />
  }

  switch (activeSection) {
    case "PERSONALIZAR":
      return <PersonalizeSection />
    case "USUARIOS":
      return <UsersSection />
    case "APLICACIONES":
      return <ApplicationsSection />
    case "CATÁLOGOS":
      return <CatalogsSection />
    case "PROCESOS":
      return <ProcessesSection />
    case "INVENTARIO":
      return <InventorySection />
    case "EMBARQUES":
      return <EmbarquesSection />
    // OJO: si quieres que INTEGRACIONES también sea placeholder,
    // quita esta línea y lo manejará el guard clause de arriba.
    // case "INTEGRACIONES":
    //   return <IntegrationsSection />
    case "CONFIGURACION":
      return <ConfigurationSection />
          case "ADMIN":
      return <AdminSection />
      
    case "PERFIL":
    default:
      return <PerfilPage />
  }
}, [activeSection])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!userData || !companyData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center overflow-hidden">
        <div className="text-center">
          <p className="text-gray-400">No se encontraron datos de sesión</p>
          <button onClick={() => router.replace("/")} className="mt-4 text-blue-400 hover:text-blue-300">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-dvh w-screen bg-black flex overflow-hidden">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="flex-1 flex min-h-0 flex-col">
        <div className="shrink-0">
          <DashboardHeader activeSection={activeSection} />
        </div>
        <main className="flex-1 overflow-y-auto p-6">
          {renderContent}
        </main>
      </div>
    </div>
  )
}
