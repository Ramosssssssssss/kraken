"use client"
import {
  User,
  Settings,
  Grid3X3,
  Puzzle,
  LogOut,
  Menu,
  X,
  Users2Icon,
  FolderArchiveIcon,
  ListStartIcon,
  PackagePlusIcon,
} from "lucide-react"
import Image from "next/image"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onLogout: () => void
}

export default function Sidebar({
  activeSection,
  onSectionChange,
  sidebarOpen,
  onToggleSidebar,
  onLogout,
}: SidebarProps) {
  const menuItems = [
    { name: "CUENTA", icon: User },
    { name: "PERSONALIZAR", icon: Settings },
    { name: "USUARIOS", icon: Users2Icon },
    { name: "CATÁLOGOS", icon: FolderArchiveIcon },
    { name: "PROCESOS", icon: ListStartIcon },
    { name: "INVENTARIO", icon: PackagePlusIcon },
    { name: "EMBARQUES", icon: PackagePlusIcon },
    { name: "APLICACIONES", icon: Grid3X3 },
    { name: "INTEGRACIONES", icon: Puzzle },
    { name: "CERRAR SESIÓN", icon: LogOut },
  ]

  const handleMenuClick = (itemName: string) => {
    if (itemName === "CERRAR SESIÓN") {
      onLogout()
    } else {
      onSectionChange(itemName)
    }
  }

  return (
    <div
      className={`${sidebarOpen ? "w-72" : "w-16"} relative transition-all duration-500 ease-out flex flex-col h-screen`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950/99 to-black backdrop-blur-sm border-r border-white/[0.20]" />

      <div className="absolute inset-0 bg-gradient-to-r from-purple-950/[0.03] via-transparent to-purple-950/[0.03]" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className={`${sidebarOpen ? "p-6" : "p-4"} border-b border-white/[0.02]`}>
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gray-900/30 flex items-center justify-center border border-white/[0.05]">
                    <Image src="/kraken6.png" alt="Kraken Logo" width={28} height={28} className="w-7 h-7" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border border-black" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-white/95">KRKN</h1>
                  <p className="text-xs text-gray-500 font-normal">Dashboard</p>
                </div>
              </div>
            )}
            <button
              onClick={onToggleSidebar}
              className={`p-2.5 rounded-lg hover:bg-white/[0.03] text-gray-500 hover:text-white/70 transition-all duration-200 border border-transparent hover:border-white/[0.05] ${!sidebarOpen ? "mx-auto" : ""}`}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item, index) => {
            const Icon = item.icon
            const isActive = activeSection === item.name
            const isLogout = item.name === "CERRAR SESIÓN"

            return (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.name)}
                className={`w-full flex items-center ${sidebarOpen ? "space-x-3 px-3" : "justify-center px-2"} py-3 rounded-lg transition-all duration-200 group relative ${
                  isActive && !isLogout
                    ? "bg-white/[0.04] text-white border border-white/[0.06]"
                    : isLogout
                      ? "text-gray-500 hover:bg-red-950/10 hover:text-red-400 border border-transparent hover:border-red-900/20"
                      : "text-gray-500 hover:bg-white/[0.03] hover:text-white/70 border border-transparent hover:border-white/[0.05]"
                }`}
              >
                {isActive && !isLogout && sidebarOpen && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-white/40 rounded-r-sm" />
                )}

                <Icon
                  className={`w-5 h-5 transition-colors duration-200 ${
                    isLogout
                      ? "text-gray-600 group-hover:text-red-400"
                      : isActive
                        ? "text-white/90"
                        : "group-hover:text-white/70"
                  }`}
                />

                {sidebarOpen && (
                  <span
                    className={`font-medium text-sm transition-colors duration-200 ${
                      isLogout ? "group-hover:text-red-400" : isActive ? "text-white/90" : "group-hover:text-white/70"
                    }`}
                  >
                    {item.name}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/[0.02]">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
              <div className="text-xs text-gray-600 font-normal">KRKN Dashboard v1.0</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
