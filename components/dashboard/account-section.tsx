// components/dashboard/account-section.tsx
"use client";

import { useState, useMemo } from "react";
import { User, Crown, Clock, Zap, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCompany } from "@/lib/company-context";
import { useBillingStatus } from "@/lib/hooks/useBillingStatus";

function formatDateFromUnix(unix?: number) {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" });
}

export default function AccountSection() {
  const router = useRouter();
  const { companyData, isReady } = useCompany();
  const { active, data, tenant } = useBillingStatus();
  const [busyPortal, setBusyPortal] = useState(false);

  const planLabel = useMemo(() => (active ? "PRO" : "FREE"), [active]);

  const nextBilling = useMemo(() => {
    if (!data || !("current_period_end" in data)) return "—";
    return formatDateFromUnix((data as any).current_period_end);
  }, [data]);

  // ⬇️ Si prefieres usar un <Link/> directo, puedes borrar esta función
  function openMyPortal() {
    router.push("/misFacturas");
  }

  // (Opcional) Mantener un botón secundario para abrir el portal nativo de Stripe
  async function openStripePortal() {
    try {
      if (!isReady || !companyData?.codigo || !tenant) return;
      setBusyPortal(true);
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "No fue posible abrir el portal");
      if (json?.url) window.location.href = json.url;
    } catch (e: any) {
      alert(e?.message || "Error");
    } finally {
      setBusyPortal(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-white">CONFIGURACIÓN DE TU CUENTA</h2>

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
                {planLabel}
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {planLabel === "PRO" ? "Plan Pro" : "Plan Free"}
            </p>
            <p className="text-sm text-gray-500">
              {planLabel === "PRO" ? "Activo" : "Sin suscripción activa"}
            </p>
          </div>

          <div className="bg-black border border-white/10 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Clock className="w-4 h-4 mr-2 text-green-400" />
              <span className="text-gray-400">Próxima facturación</span>
            </div>
            <p className="text-2xl font-bold text-green-400">{nextBilling}</p>
            <p className="text-sm text-gray-500">
              {active ? "Suscripción en curso" : "No aplica"}
            </p>
          </div>

          <div className="bg-black border border-white/10 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Zap className="w-4 h-4 mr-2 text-blue-400" />
              <span className="text-gray-400">Uso Mensual</span>
            </div>
            <p className="text-2xl font-bold text-blue-400">—</p>
            <p className="text-sm text-gray-500">(Pendiente de integrar métricas reales)</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          {/* 👉 AHORA abre TU portal interno */}
          <button
            onClick={openMyPortal}
            disabled={!isReady || !companyData?.codigo}
            className="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            title="Abrir facturación en KRKN"
          >
            Ver Facturación
          </button>

          {/* (Opcional) Mantener Stripe Portal como enlace secundario */}
          {active && (
            <button
              onClick={openStripePortal}
              disabled={busyPortal}
              className="border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 inline-flex items-center gap-2"
              title="Abrir portal de Stripe"
            >
              {busyPortal ? "Abriendo portal…" : (
                <>
                  Abrir portal de Stripe
                  <ExternalLink className="w-4 h-4" />
                </>
              )}
            </button>
          )}

          {/* Botón de planes */}
          <Link href="/planes">
            <button className="border border-white/30 text-white px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
              {active ? "Cambiar Plan" : "Activar Plan"}
            </button>
          </Link>
        </div>
      </div>

      {/* Estadísticas de Uso */}
      <div className="bg-black border border-white/20 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Estadísticas de Uso</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">—</div>
            <div className="text-sm text-gray-500">Proyectos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">—</div>
            <div className="text-sm text-gray-500">API Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">—</div>
            <div className="text-sm text-gray-500">Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-400">—</div>
            <div className="text-sm text-gray-500">Integraciones</div>
          </div>
        </div>
      </div>
    </div>
  );
}
