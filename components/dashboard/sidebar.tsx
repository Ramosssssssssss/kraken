"use client"

import { useState } from "react"
import {
  User,
  Settings,
  LogOut,
  ChevronDown,
  Users2Icon,
  FolderArchiveIcon,
  ListStartIcon,
  PackagePlusIcon,
  LayoutDashboard,
  Briefcase,
  TrendingUp,
  Zap,
  Share2,
  DollarSign,
  MoreHorizontal,
  UserCircle,
  MoreVertical,
} from "lucide-react"

interface SidebarProps {
  activeSection: string
  onSectionChange: (section: string) => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
  onLogout: () => void
}

interface MenuItem {
  name: string
  icon: any
  children?: MenuItem[]
}

export default function Sidebar({
  activeSection,
  onSectionChange,
  sidebarOpen,
  onToggleSidebar,
  onLogout,
}: SidebarProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(["Social Media"])
  const [showCollapsedMenu, setShowCollapsedMenu] = useState(false)

const menuItems: MenuItem[] = [
    { name: "CUENTA", icon: LayoutDashboard },
    { name: "PERSONALIZAR", icon: Briefcase },
    { name: "USUARIOS", icon: TrendingUp },
    { name: "CATÁLOGOS", icon: Zap },
    // {
    //   name: "Social Media",
    //   icon: Share2,
    //   children: [
    //     { name: "CUENTA", icon: User },
    //     { name: "PERSONALIZAR", icon: Settings },
    //     { name: "USUARIOS", icon: Users2Icon },
    //     { name: "CATÁLOGOS", icon: FolderArchiveIcon },
    //     { name: "PROCESOS", icon: ListStartIcon },
    //     { name: "INVENTARIO", icon: PackagePlusIcon },
    //   ],
    // },
    { name: "PROCESOS", icon: DollarSign },
    { name: "INVENTARIO", icon: MoreHorizontal },
  ]

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionName) ? prev.filter((s) => s !== sectionName) : [...prev, sectionName],
    )
  }

  const handleMenuClick = (itemName: string, hasChildren: boolean) => {
    if (hasChildren) {
      toggleSection(itemName)
    } else {
      onSectionChange(itemName)
    }
  }

  if (!sidebarOpen) {
    return (
      <div className="w-16 relative transition-all duration-300 ease-out flex flex-col h-screen bg-[#0a0a0a] border-r border-white/5">
        {/* Logo Icon */}
        <div className="p-4 border-b border-white/5 flex items-center justify-center">
          <button
            onClick={onToggleSidebar}
            className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center hover:bg-orange-500/20 transition-all duration-200 group"
          >
            <div className="w-6 h-6 text-orange-500">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.5 8.5L22 9.5L17 14.5L18.5 21L12 17.5L5.5 21L7 14.5L2 9.5L8.5 8.5L12 2Z" />
              </svg>
            </div>
          </button>
        </div>

        {/* Icon-only Menu Items */}
        <nav className="flex-1 p-2 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const hasChildren = item.children && item.children.length > 0

            return (
              <div key={item.name}>
                <button
                  onClick={() => (hasChildren ? null : onSectionChange(item.name))}
                  className="w-full p-3 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center justify-center group relative"
                  title={item.name}
                >
                  <Icon className="w-5 h-5" />
                  {/* Tooltip on hover */}
                  <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                    {item.name}
                  </span>
                </button>

                {/* Show children icons if expanded */}
                {hasChildren && item.children && (
                  <div className="space-y-1 mt-1">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      const isActive = activeSection === child.name

                      return (
                        <button
                          key={child.name}
                          onClick={() => onSectionChange(child.name)}
                          className={`w-full p-2 rounded-lg transition-all duration-200 flex items-center justify-center group relative ${
                            isActive ? "bg-white/5 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
                          }`}
                          title={child.name}
                        >
                          <ChildIcon className="w-4 h-4" />
                          {/* Tooltip on hover */}
                          <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
                            {child.name}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/5 relative">
          <button
            onClick={() => setShowCollapsedMenu(!showCollapsedMenu)}
            className="w-full p-2.5 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex items-center justify-center"
            title="Opciones"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {/* Dropdown menu */}
          {showCollapsedMenu && (
            <>
              {/* Backdrop to close menu */}
              <div className="fixed inset-0 z-40" onClick={() => setShowCollapsedMenu(false)} />

              {/* Menu */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
                <button
                  onClick={() => {
                    onSectionChange("Cuenta General")
                    setShowCollapsedMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-3"
                >
                  <UserCircle className="w-4 h-4" />
                  <span>Cuenta General</span>
                </button>

                <button
                  onClick={() => {
                    onSectionChange("Configuración")
                    setShowCollapsedMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 flex items-center gap-3"
                >
                  <Settings className="w-4 h-4" />
                  <span>Configuración</span>
                </button>

                <div className="h-px bg-white/5 my-1" />

                <button
                  onClick={() => {
                    onLogout()
                    setShowCollapsedMenu(false)
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:text-red-400 hover:bg-red-950/20 transition-all duration-200 flex items-center gap-3"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="w-72 relative transition-all duration-300 ease-out flex flex-col h-screen bg-[#0a0a0a] border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <div className="w-6 h-6 text-orange-500">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L15.5 8.5L22 9.5L17 14.5L18.5 21L12 17.5L5.5 21L7 14.5L2 9.5L8.5 8.5L12 2Z" />
              </svg>
            </div>
          </div>
          <span className="text-white font-medium">Dashboard</span>
        </div>
        <button
          onClick={onToggleSidebar}
          className="p-1.5 rounded-md hover:bg-white/5 text-gray-500 hover:text-white/70 transition-all duration-200"
        >
          <ChevronDown className="w-4 h-4 rotate-90" />
        </button>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const hasChildren = item.children && item.children.length > 0
          const isExpanded = expandedSections.includes(item.name)

          return (
            <div key={item.name}>
               <button
                onClick={() => handleMenuClick(item.name, !!hasChildren)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-all duration-200 group"
              >
                <div className="flex items-center space-x-3">
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-normal">{item.name}</span>
                </div>
                {hasChildren && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  />
                )}
              </button>

              {/* Children */}
              {hasChildren && isExpanded && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-white/5 pl-3">
                  {item.children?.map((child) => {
                    const ChildIcon = child.icon
                    const isActive = activeSection === child.name

                    return (
                      <button
                        key={child.name}
                        onClick={() => onSectionChange(child.name)}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                          isActive ? "bg-white/5 text-white" : "text-gray-500 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        <ChildIcon className="w-4 h-4" />
                        <span className="text-sm font-normal">{child.name}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => onSectionChange("Cuenta General")}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex items-center justify-center group relative"
            title="Cuenta General"
          >
            <UserCircle className="w-5 h-5" />
            <span className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
              Cuenta General
            </span>
          </button>

          <button
            onClick={() => onSectionChange("Configuración")}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all duration-200 flex items-center justify-center group relative"
            title="Configuración"
          >
            <Settings className="w-5 h-5" />
            <span className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
              Configuración
            </span>
          </button>

          <button
            onClick={onLogout}
            className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-950/20 text-gray-400 hover:text-red-400 transition-all duration-200 flex items-center justify-center group relative"
            title="Cerrar Sesión"
          >
            <LogOut className="w-5 h-5" />
            <span className="absolute bottom-full mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap transition-opacity duration-200 z-50">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
