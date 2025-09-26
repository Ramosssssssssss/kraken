"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

import Sidebar from "@/components/dashboard/sidebar"
import DashboardHeader from "@/components/dashboard/dashboard-header"
import AccountSection from "@/components/dashboard/account-section"
import PersonalizeSection from "@/components/dashboard/personalize-section"
import UsersSection from "@/components/dashboard/users-section"
import ApplicationsSection from "@/components/dashboard/applications-section"
import CatalogsSection from "@/components/dashboard/catalogs-section"
import ProcessesSection from "@/components/dashboard/processes-section"
import InventorySection from "@/components/dashboard/inventory-sections"
import EmbarquesSection from "@/components/dashboard/embarques-section"
import IntegrationsSection from "@/components/dashboard/integrations-section"

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

export default function DashboardPage() {
  const router = useRouter()

  const [userData, setUserData] = useState<UserData | null>(null)
  const [companyData, setCompanyData] = useState<CompanyData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeSection, setActiveSection] = useState("CUENTA")

  // nuevo: estado para abrir/cerrar sidebar
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
      // si no hay sesión, vete al inicio
      router.replace("/")
    }
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("userData")
    localStorage.removeItem("companyData")
    router.replace("/login")
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const renderContent = () => {
    switch (activeSection) {
      case "CUENTA":
        return <AccountSection />
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
      case "INTEGRACIONES":
        return <IntegrationsSection />
      default:
        return <AccountSection />
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!userData || !companyData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
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
    <div className="min-h-screen bg-black flex">
      <Sidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        onLogout={handleLogout}
        // 👇 props que pedía SidebarProps
        sidebarOpen={sidebarOpen}
        onToggleSidebar={onToggleSidebar}
      />

      <div className="flex-1 flex flex-col">
        <DashboardHeader activeSection={activeSection} />
        <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  )
}
