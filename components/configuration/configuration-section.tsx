"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { MAIN_SECTIONS, SUB_SECTIONS } from "./constants"
import type { MainSectionId, SubSectionId } from "./types"
import { UsersContent } from "./users-content"
import { AdminsContent } from "./admins-content"
import { GeneralContent } from "./general-content"
import { PermissionsContent } from "./permissions-content"
import { ModulesContent } from "./modules-content"
import { ConfigContent } from "./config-content"

export default function ConfigurationSection() {
  const [activeMainSection, setActiveMainSection] = useState<MainSectionId>("usuarios")
  const [activeSubSection, setActiveSubSection] = useState<SubSectionId>("activos")
  const [searchQuery, setSearchQuery] = useState("")

  const handleMainSectionChange = (sectionId: MainSectionId) => {
    setActiveMainSection(sectionId)
    const firstSubSection = SUB_SECTIONS[sectionId][0]
    setActiveSubSection(firstSubSection.id)
  }

  const renderContent = () => {
    switch (activeMainSection) {
      case "usuarios":
        return <UsersContent searchQuery={searchQuery} activeSubSection={activeSubSection} />
      case "administradores":
        return <AdminsContent searchQuery={searchQuery} activeSubSection={activeSubSection} />
      case "general":
        return <GeneralContent activeSubSection={activeSubSection} />
      case "Facturación":
        return <PermissionsContent activeSubSection={activeSubSection} />
      case "modulos":
        return <ModulesContent activeSubSection={activeSubSection} />
      case "configuracion":
        return <ConfigContent activeSubSection={activeSubSection} />
      default:
        return null
    }
  }

  const currentSubSections = SUB_SECTIONS[activeMainSection]

  return (
    <div className="space-y-6 flex-1">
      {/* Header with Sub-Section Tabs */}
      <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl overflow-hidden">
        {/* Title Section */}
        <div className="border-b border-white/10 bg-black/20 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-3xl font-light tracking-wide text-white/90">Centro de Configuración</h3>
              <p className="mt-1 text-sm font-light tracking-wide text-white/50">
                Gestión avanzada de usuarios, Facturación y módulos del sistema
              </p>
            </div>

            {/* Search Bar */}
            <div className="relative w-80">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-11 pr-4 text-sm font-light tracking-wide text-white placeholder-white/40 backdrop-blur-xl transition-all focus:border-white/20 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
          </div>
        </div>

        <div className="border-b border-white/10 bg-black/10 px-8">
          <div className="flex gap-1">
            {currentSubSections.map((subSection) => {
              const Icon = subSection.icon
              const isActive = activeSubSection === subSection.id

              return (
                <button
                  key={subSection.id}
                  onClick={() => setActiveSubSection(subSection.id)}
                  className={`group relative flex items-center gap-2.5 px-6 py-4 text-sm font-light tracking-wide transition-all duration-200 ${
                    isActive ? "text-white" : "text-white/50 hover:text-white/80"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 transition-all ${isActive ? "text-purple-400" : "text-white/40 group-hover:text-white/60"}`}
                  />
                  <span>{subSection.label}</span>
                  {subSection.badge && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        isActive ? "bg-purple-500/20 text-purple-300" : "bg-white/10 text-white/50"
                      }`}
                    >
                      {subSection.badge}
                    </span>
                  )}

                  {/* Active Indicator */}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-500 to-blue-500" />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-60 shrink-0">
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-3">
            <div className="space-y-1">
              {MAIN_SECTIONS.map((section) => {
                const Icon = section.icon
                const isActive = activeMainSection === section.id

                return (
                  <button
                    key={section.id}
                    onClick={() => handleMainSectionChange(section.id)}
                    className={`group relative w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-light tracking-wide transition-all duration-200 ${
                      isActive
                        ? "bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white shadow-lg shadow-purple-500/10"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    <Icon
                      className={`h-4 w-4 shrink-0 transition-all ${
                        isActive ? "text-purple-400" : "text-white/40 group-hover:text-white/60"
                      }`}
                    />
                    <span className="flex-1 text-left">{section.label}</span>
                    {section.badge && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          isActive ? "bg-purple-500/30 text-purple-200" : "bg-white/10 text-white/50"
                        }`}
                      >
                        {section.badge}
                      </span>
                    )}

                    {/* Active Indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gradient-to-b from-purple-500 to-blue-500" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
        {/* Main Content Area */}
        <div className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] backdrop-blur-xl p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}
