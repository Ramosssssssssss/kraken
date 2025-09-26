import { User, Edit3 } from "lucide-react"

interface UserCardProps {
  name: string
  email: string
  role: string
  status: "active" | "pending" | "inactive"
  avatar?: string
}

export default function UserCard({ name, email, role, status, avatar }: UserCardProps) {
  const statusConfig = {
    active: { bg: "bg-green-500/20", text: "text-green-400", label: "Activo" },
    pending: { bg: "bg-yellow-500/20", text: "text-yellow-400", label: "Pendiente" },
    inactive: { bg: "bg-red-500/20", text: "text-red-400", label: "Inactivo" },
  }

  const config = statusConfig[status]

  return (
    <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-lg">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
          {avatar ? (
            <img src={avatar || "/placeholder.svg"} alt={name} className="w-10 h-10 rounded-full" />
          ) : (
            <User className="w-5 h-5 text-white" />
          )}
        </div>
        <div>
          <p className="text-white font-medium">{name}</p>
          <p className="text-sm text-gray-500">
            {role} • {email}
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <span className={`${config.bg} ${config.text} px-2 py-1 rounded text-xs`}>{config.label}</span>
        <button className="text-gray-400 hover:text-white">
          <Edit3 className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
