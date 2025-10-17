import type { User, Admin } from "./types"

export const MOCK_USERS: User[] = [
  {
    id: 1,
    name: "Carlos Mendoza",
    email: "carlos.mendoza@krkn.com",
    role: "Gerente de Almacén",
    department: "Operaciones",
    status: "active",
    lastLogin: "2025-01-15 14:30",
    phone: "+52 555 123 4567",
  },
  {
    id: 2,
    name: "Ana García",
    email: "ana.garcia@krkn.com",
    role: "Supervisor",
    department: "Logística",
    status: "active",
    lastLogin: "2025-01-15 09:15",
    phone: "+52 555 234 5678",
  },
  {
    id: 3,
    name: "Roberto Silva",
    email: "roberto.silva@krkn.com",
    role: "Operador",
    department: "Almacén",
    status: "inactive",
    lastLogin: "2025-01-10 16:45",
    phone: "+52 555 345 6789",
  },
]

export const MOCK_ADMINS: Admin[] = [
  {
    id: 1,
    name: "María López",
    email: "maria.lopez@krkn.com",
    role: "Super Admin",
    permissions: ["all"],
    lastLogin: "2025-01-15 15:00",
  },
  {
    id: 2,
    name: "Jorge Ramírez",
    email: "jorge.ramirez@krkn.com",
    role: "Admin",
    permissions: ["users", "inventory", "reports"],
    lastLogin: "2025-01-15 12:30",
  },
]
