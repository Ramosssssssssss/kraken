"use client"

import { Edit3, Users, Shield, User } from "lucide-react"

export default function PersonalizeSection() {
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

      {/* Gestión de USUARIOS */}
      <div className="bg-black border border-white/20 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2 text-green-400" />
          Gestión de USUARIOS
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
}
