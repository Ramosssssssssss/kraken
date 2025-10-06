"use client"

import { Sun, MessageCircle, Bell, Plus } from "lucide-react"

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
          {/* Icon Buttons */}
          <div className="flex items-center gap-2">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/80 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white border border-zinc-800/60 backdrop-blur-sm"
              aria-label="Toggle theme"
            >
              <Sun className="h-4 w-4" />
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/80 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white border border-zinc-800/60 backdrop-blur-sm"
              aria-label="Messages"
            >
              <MessageCircle className="h-4 w-4" />
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900/80 text-zinc-400 transition-all hover:bg-zinc-800 hover:text-white border border-zinc-800/60 backdrop-blur-sm"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
            </button>

            <button
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-900 to-purple-900 text-white transition-all hover:from-blue-700 hover:to-purple-700 shadow-lg shadow-blue-500/20"
              aria-label="Add new"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="text-sm text-gray-300/80 font-medium">Bienvenido al abismo</div>
        </div>
      </div>
    </header>
  )
}
