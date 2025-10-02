"use client";

import { User, Crown, Clock, Zap } from "lucide-react";
import Link from "next/link";

export default function AccountSection() {
  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">
        CONFIGURACIÓN DE TU CUENTA
      </h2>

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
            <p className="text-sm text-gray-500">
              Próxima facturación: 15 Ene 2025
            </p>
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
          <Link href="/planes">
            <button className="border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
              Ver Facturación
            </button>
          </Link>
        </div>
      </div>

      {/* Estadísticas de Uso */}
      <div className="bg-black border border-white/20 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          Estadísticas de Uso
        </h3>
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
            <div className="text-sm text-gray-500">INTEGRACIONES</div>
          </div>
        </div>
      </div>
    </div>
  );
}
