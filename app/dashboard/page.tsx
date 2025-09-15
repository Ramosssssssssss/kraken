"use client"

import { useState } from "react"
import {
  User,
  Settings,
  Grid3X3,
  Puzzle,
  LogOut,
  Menu,
  X,
  Crown,
  Clock,
  Users,
  Edit3,
  Shield,
  Zap,
  Database,
  Webhook,
  Bot,
  Mail,
  Calendar,
} from "lucide-react"
import Image from "next/image"

export default function Dashboard() {
  const [activeSection, setActiveSection] = useState("Cuenta")
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const menuItems = [
    { name: "Cuenta", icon: User },
    { name: "Personalizar", icon: Settings },
    { name: "Aplicaciones", icon: Grid3X3 },
    { name: "Integraciones", icon: Puzzle },
    { name: "Cerrar sesión", icon: LogOut },
  ]

  const handleLogout = () => {
    window.location.href = "/login"
  }

  const handleMenuClick = (itemName: string) => {
    if (itemName === "Cerrar sesión") {
      handleLogout()
    } else {
      setActiveSection(itemName)
    }
  }

  const renderContent = () => {
    switch (activeSection) {
      case "Cuenta":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Configuración de Cuenta</h2>

            {/* Información del Usuario */}
            <div className="bg-black border border-white/20 rounded-lg p-6 space-y-4">
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-gray-800 to-black rounded-full flex items-center justify-center border border-white/30">
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">Usuario KRKN</h3>
                  <p className="text-gray-400">Administrador del abismo</p>
                  <p className="text-sm text-gray-500">usuario@krkn.com</p>
                </div>
              </div>
            </div>

            {/* Información de Suscripción */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Crown className="w-5 h-5 mr-2 text-yellow-400" />
                Tu Suscripción
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-black border border-white/10 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400">Plan Actual</span>
                    <div className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-2 py-1 rounded text-xs font-semibold">
                      PRO
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">Plan Pro</p>
                  <p className="text-sm text-gray-500">$29.99/mes</p>
                </div>

                <div className="bg-black border border-white/10 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Clock className="w-4 h-4 mr-2 text-green-400" />
                    <span className="text-gray-400">Tiempo Restante</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">23 días</p>
                  <p className="text-sm text-gray-500">Próxima facturación: 15 Ene 2025</p>
                </div>

                <div className="bg-black border border-white/10 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Zap className="w-4 h-4 mr-2 text-blue-400" />
                    <span className="text-gray-400">Uso Mensual</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">2.4K</p>
                  <p className="text-sm text-gray-500">de 10K requests</p>
                </div>
              </div>

              <div className="mt-6 flex space-x-3">
                <button className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity">
                  Actualizar Plan
                </button>
                <button className="border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
                  Ver Facturación
                </button>
              </div>
            </div>

            {/* Estadísticas de Uso */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Estadísticas de Uso</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-400">156</div>
                  <div className="text-sm text-gray-500">Proyectos</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">2.4K</div>
                  <div className="text-sm text-gray-500">API Calls</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">89%</div>
                  <div className="text-sm text-gray-500">Uptime</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">12</div>
                  <div className="text-sm text-gray-500">Integraciones</div>
                </div>
              </div>
            </div>
          </div>
        )

      case "Personalizar":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Personalización</h2>

            {/* Configuración de Perfil */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Edit3 className="w-5 h-5 mr-2 text-blue-400" />
                Información Personal
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de Usuario</label>
                  <input
                    type="text"
                    defaultValue="Usuario KRKN"
                    className="w-full bg-black border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    defaultValue="usuario@krkn.com"
                    className="w-full bg-black border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nombre de Organización</label>
                  <input
                    type="text"
                    defaultValue="KRKN Corp"
                    className="w-full bg-black border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Zona Horaria</label>
                  <select className="w-full bg-black border border-white/30 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-400">
                    <option>UTC-5 (América/Bogotá)</option>
                    <option>UTC-6 (América/México)</option>
                    <option>UTC-3 (América/Argentina)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Gestión de Usuarios */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Users className="w-5 h-5 mr-2 text-green-400" />
                Gestión de Usuarios
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Usuario KRKN</p>
                      <p className="text-sm text-gray-500">Administrador • usuario@krkn.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">Activo</span>
                    <button className="text-gray-400 hover:text-white">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-gray-600 to-black rounded-full flex items-center justify-center border border-white/20">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Colaborador 1</p>
                      <p className="text-sm text-gray-500">Editor • colaborador@krkn.com</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs">Pendiente</span>
                    <button className="text-gray-400 hover:text-white">
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                + Invitar Usuario
              </button>
            </div>

            {/* Configuración de Seguridad */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 text-red-400" />
                Seguridad
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Autenticación de Dos Factores</p>
                    <p className="text-sm text-gray-500">Protege tu cuenta con 2FA</p>
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded text-sm">Activado</button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Sesiones Activas</p>
                    <p className="text-sm text-gray-500">Gestiona tus sesiones activas</p>
                  </div>
                  <button className="text-blue-400 hover:text-blue-300 text-sm">Ver Sesiones</button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Cambiar Contraseña</p>
                    <p className="text-sm text-gray-500">Actualiza tu contraseña</p>
                  </div>
                  <button className="text-blue-400 hover:text-blue-300 text-sm">Cambiar</button>
                </div>
              </div>
            </div>
          </div>
        )

      case "Aplicaciones":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Aplicaciones y Módulos</h2>

            {/* Módulos Activos */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Módulos Activos</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-black border border-white/20 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-400/30">
                      <Database className="w-5 h-5 text-blue-400" />
                    </div>
                    <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">Activo</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Etiquetador</h4>
                  <p className="text-sm text-gray-400 mb-3">
Genera tus propias etiquetas con nuestro etiquetador                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">v2.1.0</span>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">Configurar</button>
                  </div>
                </div>

               
              </div>
            </div>

            {/* Módulos Disponibles */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Módulos Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-black border border-white/10 rounded-lg p-4 opacity-75">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center border border-orange-400/30">
                      <Calendar className="w-5 h-5 text-orange-400" />
                    </div>
                    <span className="bg-gray-600/20 text-gray-400 px-2 py-1 rounded text-xs">Disponible</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">PICKING</h4>
                  <p className="text-sm text-gray-400 mb-3">Gestión de eventos y programación de tareas</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">v1.0.0</span>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                      Instalar
                    </button>
                  </div>
                </div>

                <div className="bg-black border border-white/10 rounded-lg p-4 opacity-75">
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center border border-red-400/30">
                      <Shield className="w-5 h-5 text-red-400" />
                    </div>
                    <span className="bg-gray-600/20 text-gray-400 px-2 py-1 rounded text-xs">Disponible</span>
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Seguridad Avanzada</h4>
                  <p className="text-sm text-gray-400 mb-3">Monitoreo y protección en tiempo real</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">v2.5.0</span>
                    <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
                      Instalar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )

      case "Integraciones":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold text-white">Integraciones</h2>

            {/* Integraciones Activas */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Integraciones Activas</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                      <Database className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">PostgreSQL</h4>
                      <p className="text-sm text-gray-400">Base de datos principal • Conectado hace 2 días</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">Conectado</span>
                    <button className="text-gray-400 hover:text-white">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Webhook className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">Webhooks API</h4>
                      <p className="text-sm text-gray-400">Notificaciones en tiempo real • 1,234 eventos procesados</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">Activo</span>
                    <button className="text-gray-400 hover:text-white">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-black border border-white/10 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                      <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white">SendGrid</h4>
                      <p className="text-sm text-gray-400">Servicio de email • 89% tasa de entrega</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-sm">Conectado</span>
                    <button className="text-gray-400 hover:text-white">
                      <Settings className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Integraciones Disponibles */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Integraciones Disponibles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-blue-400 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center mb-3">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Redis</h4>
                  <p className="text-sm text-gray-400 mb-4">Cache en memoria para mejor rendimiento</p>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Conectar
                  </button>
                </div>

                <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-purple-400 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center mb-3">
                    <Bot className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">OpenAI</h4>
                  <p className="text-sm text-gray-400 mb-4">Integración con modelos de IA avanzados</p>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Conectar
                  </button>
                </div>

                <div className="bg-black border border-white/10 rounded-lg p-4 hover:border-green-400 transition-colors">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg flex items-center justify-center mb-3">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Stripe</h4>
                  <p className="text-sm text-gray-400 mb-4">Procesamiento de pagos seguro</p>
                  <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Conectar
                  </button>
                </div>
              </div>
            </div>

            {/* Configuración de API */}
            <div className="bg-black border border-white/20 rounded-lg p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Configuración de API</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">API Key</p>
                    <p className="text-sm text-gray-400">Clave para acceso a la API</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <code className="bg-black border border-white/20 px-3 py-1 rounded text-sm text-gray-300">
                      krkn_••••••••••••••••
                    </code>
                    <button className="text-blue-400 hover:text-blue-300 text-sm">Regenerar</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Rate Limit</p>
                    <p className="text-sm text-gray-400">Límite de requests por minuto</p>
                  </div>
                  <span className="text-gray-300">1000/min</span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Webhook URL</p>
                    <p className="text-sm text-gray-400">Endpoint para notificaciones</p>
                  </div>
                  <code className="bg-black border border-white/20 px-3 py-1 rounded text-sm text-gray-300">
                    https://api.krkn.com/webhook
                  </code>
                </div>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <div
        className={`${sidebarOpen ? "w-64" : "w-16"} bg-black border-r border-white/20 transition-all duration-300 flex flex-col`}
      >
        {/* Header */}
        <div className="p-4 border-b border-white/20">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-800 via-gray-900 to-black flex items-center justify-center border border-white/30">
                  <Image src="/kraken6.png" alt="Kraken Logo" width={24} height={24} className="w-6 h-6" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">KRKN</h1>
                  <p className="text-xs text-gray-400">Dashboard</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeSection === item.name
            const isLogout = item.name === "Cerrar sesión"

            return (
              <button
                key={item.name}
                onClick={() => handleMenuClick(item.name)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-200 group ${
                  isActive && !isLogout
                    ? "bg-gray-800 text-white border border-gray-600"
                    : isLogout
                      ? "text-red-400 hover:bg-red-900/30 hover:text-red-300"
                      : "text-gray-300 hover:bg-gray-900 hover:text-white"
                }`}
              >
                <Icon className={`w-5 h-5 ${isLogout ? "text-red-400 group-hover:text-red-300" : ""}`} />
                {sidebarOpen && <span className="font-medium">{item.name}</span>}
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        {sidebarOpen && (
          <div className="p-4 border-t border-white/20">
            <div className="text-xs text-gray-500 text-center">KRKN Dashboard v1.0</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-black border-b border-white/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">{activeSection}</h1>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-400">Bienvenido al abismo</div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">{renderContent()}</main>
      </div>
    </div>
  )
}
