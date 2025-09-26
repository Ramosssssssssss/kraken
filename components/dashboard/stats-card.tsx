import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: LucideIcon
  color?: "blue" | "green" | "purple" | "yellow" | "red"
}

export default function StatsCard({ title, value, subtitle, icon: Icon, color = "blue" }: StatsCardProps) {
  const colorConfig = {
    blue: "text-blue-400",
    green: "text-green-400",
    purple: "text-purple-400",
    yellow: "text-yellow-400",
    red: "text-red-400",
  }

  return (
    <div className="bg-black border border-white/10 rounded-lg p-4">
      <div className="flex items-center mb-2">
        {Icon && <Icon className={`w-4 h-4 mr-2 ${colorConfig[color]}`} />}
        <span className="text-gray-400">{title}</span>
      </div>
      <p className={`text-2xl font-bold ${colorConfig[color]}`}>{value}</p>
      {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
    </div>
  )
}
