"use client"

interface DashboardHeaderProps {
  activeSection: string
}

export default function DashboardHeader({ activeSection }: DashboardHeaderProps) {
  return (
    <header className="bg-black/40 backdrop-blur-xl border-b border-white/10 px-6 py-4 relative">
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-gray-900/20 via-transparent to-gray-800/20 pointer-events-none" />

      <div className="flex items-center justify-between relative z-10">
        <h1 className="text-2xl font-bold text-white/95 tracking-tight">{activeSection}</h1>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-gray-300/80 font-medium">Bienvenido al abismo</div>
        </div>
      </div>
    </header>
  )
}
