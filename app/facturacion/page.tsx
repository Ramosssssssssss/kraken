"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import {
  User,
  Crown,
  Clock,
  Zap,
  CreditCard,
  Mail,
  ReceiptText,
  ChevronRight,
  Edit,
  X,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react"
import Link from "next/link"
import { useCompany } from "@/lib/company-context"
import { useBillingStatus } from "@/lib/hooks/useBillingStatus"
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js"
import { loadStripe } from "@stripe/stripe-js"

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_BS!)

type PortalData = {
  tenant: string
  active: boolean
  source: "SUSCRIPCIONES" | "PAGOS_SUSCRIPCION" | "NONE"
  subscription?: {
    id: string
    status: string
    cancel_at_period_end: boolean
    current_period_end?: number | null
    plan_name?: string
    price_id?: string | null
    amount?: number | null
    currency?: string | null
    interval?: "day" | "week" | "month" | "year" | null
  } | null
  customer?: {
    id: string
    email?: string | null
  } | null
  paymentMethod?: {
    id: string
    brand?: string | null
    last4?: string | null
    exp_month?: number | null
    exp_year?: number | null
  } | null
  invoices: Array<{
    id: string
    number?: string | null
    created: number
    amount_paid: number
    currency: string
    status: string
    hosted_invoice_url?: string | null
    pdf?: string | null
    description?: string | null
  }>
}

function fmtMoney(cents: number, currency = "mxn") {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

function fmtDateFromEpoch(sec?: number | null) {
  if (!sec || Number.isNaN(Number(sec))) return "—"
  const d = new Date(Number(sec) * 1000)
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatDateFromUnix(unix?: number) {
  if (!unix) return "—"
  const d = new Date(unix * 1000)
  return d.toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "2-digit" })
}

/* ---------------- Modal para editar tarjeta --------------- */
function EditCardModal({
  open,
  onClose,
  tenant,
  onUpdated,
}: {
  open: boolean
  onClose: () => void
  tenant: string
  onUpdated: () => Promise<void> | void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancel = false
    ;(async () => {
      try {
        setErr(null)
        setBusy(true)
        const res = await fetch("/api/billing/setup-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tenant }),
        })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || "No se pudo iniciar la edición de tarjeta")
        if (!cancel) setClientSecret(json.client_secret)
      } catch (e: any) {
        if (!cancel) setErr(e?.message || "Error")
      } finally {
        if (!cancel) setBusy(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [open, tenant])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements || !clientSecret) return
    try {
      setBusy(true)
      setErr(null)

      const card = elements.getElement(CardElement)
      if (!card) throw new Error("No se encontró el elemento de tarjeta")

      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      })

      if (result.error) throw new Error(result.error.message || "Error confirmando tarjeta")

      const pmId = result.setupIntent.payment_method as string
      const res = await fetch("/api/billing/pm-set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant, payment_method_id: pmId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "No se pudo guardar la tarjeta como predeterminada")

      await onUpdated()
      onClose()
      alert("Método de pago actualizado.")
    } catch (e: any) {
      setErr(e?.message || "Error al actualizar método de pago")
    } finally {
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-xl border border-white/10 bg-[#0a0a0a] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Editar método de pago</h3>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 text-white/70" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-3">
            <CardElement
              options={{
                hidePostalCode: true,
                style: {
                  base: {
                    color: "#fff",
                    fontSize: "16px",
                    "::placeholder": {
                      color: "#9ca3af",
                    },
                  },
                },
              }}
            />
          </div>

          {err && (
            <div className="text-sm text-red-400 bg-red-950/30 border border-red-900/40 rounded-md p-3">{err}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy || !stripe || !elements || !clientSecret}
              className="px-4 py-2 rounded-lg bg-white text-black font-medium hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {busy ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function FacturacionSection() {
  const { companyData, isReady } = useCompany()
  const { active, data, tenant } = useBillingStatus()
  const [editOpen, setEditOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [portalData, setPortalData] = useState<PortalData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [canceling, setCanceling] = useState(false)

  const planLabel = useMemo(() => (active ? "PRO" : "FREE"), [active])

  const nextBilling = useMemo(() => {
    if (!data || !("current_period_end" in data)) return "—"
    return formatDateFromUnix((data as any).current_period_end)
  }, [data])

  async function reload() {
    if (!tenant) return
    const res = await fetch(`/api/billing/portal-data?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" })
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || "No fue posible cargar los datos.")
    setPortalData(json as PortalData)
  }

  useEffect(() => {
    if (!isReady) return
    if (!tenant) {
      setError("No se detectó el tenant.")
      setLoading(false)
      return
    }
    let abort = false
    ;(async () => {
      try {
        setLoading(false)
        setError(null)
        await reload()
      } catch (e: any) {
        if (!abort) setError(e?.message || "Error desconocido")
      } finally {
        if (!abort) setLoading(false)
      }
    })()
    return () => {
      abort = true
    }
  }, [isReady, tenant])

  const canCancel = useMemo(() => {
    const s = portalData?.subscription
    if (!s) return false
    const st = (s.status || "").toLowerCase()
    return st === "active" || st === "trialing" || st === "past_due"
  }, [portalData?.subscription])

  async function handleCancel() {
    if (!tenant || !canCancel || !portalData?.subscription?.id) return
    if (!confirm("¿Cancelar al final del periodo actual?")) return
    try {
      setCanceling(true)
      const res = await fetch(`/api/billing/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenant }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || "No se pudo programar la cancelación")
      await reload()
      alert("La suscripción se cancelará al finalizar el periodo actual.")
    } catch (e: any) {
      alert(e?.message || "Error cancelando la suscripción")
    } finally {
      setCanceling(false)
    }
  }

  const nextBillingText = useMemo(() => {
    const sec = portalData?.subscription?.current_period_end ?? null
    return fmtDateFromEpoch(sec)
  }, [portalData?.subscription?.current_period_end])

  return (
    <Elements stripe={stripePromise}>
      <div className="space-y-6 h-full overflow-hidden">
        <h2 className="text-2xl font-bold text-white/95">Facturación</h2>

        {/* Información del Usuario */}
        {/* <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10">
              <User className="w-8 h-8 text-white/70" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white/95">Usuario KRKN</h3>
              <p className="text-white/50 text-sm">Administrador del abismo</p>
              <p className="text-white/40 text-sm mt-0.5">usuario@krkn.com</p>
            </div>
          </div>
        </div> */}

        {/* Información de Suscripción */}
<div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 mx-4 md:mx-12">
          <h3 className="text-lg font-semibold text-white/95 mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-white/70" />
            Suscripción
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white/50 text-sm">Plan Actual</span>
                <div className="bg-white/10 text-white/90 px-2 py-1 rounded text-xs font-semibold border border-white/10">
                  {planLabel}
                </div>
              </div>
              <p className="text-2xl font-bold text-white/95">{planLabel === "PRO" ? "Plan Pro" : "Plan Free"}</p>
              <p className="text-sm text-white/40 mt-1">{planLabel === "PRO" ? "Activo" : "Sin suscripción activa"}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-white/50" />
                <span className="text-white/50 text-sm">Próxima facturación</span>
              </div>
              <p className="text-2xl font-bold text-white/95">{nextBilling}</p>
              <p className="text-sm text-white/40 mt-1">{active ? "Suscripción en curso" : "No aplica"}</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-white/50" />
                <span className="text-white/50 text-sm">Uso Mensual</span>
              </div>
              <p className="text-2xl font-bold text-white/95">—</p>
              <p className="text-sm text-white/40 mt-1">Métricas próximamente</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/planes">
              <button className="bg-white text-black px-4 py-2 rounded-lg hover:bg-white/90 transition-colors font-medium">
                {active ? "Cambiar Plan" : "Activar Plan"}
              </button>
              
            </Link>
               {portalData && !portalData.active && (
              <div className="bg-amber-950/20 border border-amber-900/40 rounded-xl p-2 w-365 h-10 ">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-amber-300">No hay una suscripción activa. Ve a la página de planes para activarla.       <Link
                        href="/planes"
                        className="inline-block rounded-lg bg-amber-500/20 border border-amber-700/40 px-1 py-1 text-sm text-amber-200 hover:bg-amber-500/30 transition-colors align-middle ml-330  relative -top-7  "
                      >
                        Elegir plan
                      </Link></div>
                    <div className="mt-3">
                
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Método de Pago y Facturación */}
        {loading && (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 flex items-center gap-3 ">
            <Loader2 className="w-5 h-5 animate-spin text-white/50" />
            <span className="text-white/70">Cargando información de facturación...</span>
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-6">
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              {error}
            </div>
          </div>
        )}

        {!loading && !error && portalData && (
          <>
            {/* Método de Pago */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6 mx-4 md:mx-12">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white/95 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-white/70" />
                  Método de Pago
                </h3>
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 transition-colors text-sm"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              </div>

              {portalData.paymentMethod ? (
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-4 ">
                  <div className="w-12 h-12 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white/70" />
                  </div>
                  <div>
                    <div className="font-medium text-white/95 capitalize">
                      {portalData.paymentMethod.brand ?? "Tarjeta"}
                    </div>
                    <div className="text-sm text-white/50">
                      •••• {portalData.paymentMethod.last4 ?? "—"} — Vence {portalData.paymentMethod.exp_month ?? "–"}/
                      {String(portalData.paymentMethod.exp_year ?? "–").slice(-2)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-white/50 bg-white/5 border border-white/10 rounded-lg p-4">
                  No hay método de pago asociado.
                </div>
              )}

              <div className="mt-4 flex items-center gap-2 text-sm text-white/50">
                <Mail className="w-4 h-4" />
                Correo de facturación:
                <span className="text-white/70 ml-1">{portalData.customer?.email || "—"}</span>
              </div>
            </div>

            {/* Historial de Facturas */}
            <div className="bg-[#0a0a0a] border border-white/10 rounded-xl overflow-hidden mx-4 md:mx-12">
              <div className="p-6 border-b border-white/10 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white/95 flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-white/70" />
                  Historial de Facturas
                </h3>
                <div className="text-sm text-white/50">{portalData.invoices.length} factura(s)</div>
              </div>

              {portalData.invoices.length === 0 ? (
                <div className="p-6 text-white/50">No hay facturas todavía.</div>
              ) : (
                <div className="divide-y divide-white/10">
                  {portalData.invoices.map((inv) => (
                    <a
                      key={inv.id}
                      href={inv.hosted_invoice_url ?? inv.pdf ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-white/10 bg-white/5 flex items-center justify-center">
                          <ReceiptText className="w-5 h-5 text-white/70" />
                        </div>
                        <div>
                          <div className="font-medium text-white/90">
                            {inv.number ? `Factura ${inv.number}` : `Factura ${inv.id.slice(-8)}`}
                          </div>
                          <div className="text-sm text-white/50">
                            {fmtDateFromEpoch(inv.created)} · {fmtMoney(inv.amount_paid, inv.currency)} ·{" "}
                            {inv.status === "paid" ? "Pagada" : inv.status || "—"}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-white/30 group-hover:text-white/50 transition-colors" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Cancelar Suscripción */}
            {canCancel && (
              <div className="bg-[#0a0a0a] border border-white/10 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-white/95 mb-2">Cancelar Suscripción</h3>
                <p className="text-sm text-white/50 mb-4">
                  {portalData.subscription?.cancel_at_period_end
                    ? "Tu suscripción se cancelará al final del periodo actual."
                    : "Puedes cancelar tu suscripción en cualquier momento. Seguirás teniendo acceso hasta el final del periodo de facturación."}
                </p>
                <button
                  onClick={handleCancel}
                  disabled={canceling || portalData.subscription?.cancel_at_period_end}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-white/10 text-white/70 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {canceling
                    ? "Cancelando…"
                    : portalData.subscription?.cancel_at_period_end
                      ? "Cancelación programada"
                      : "Cancelar suscripción"}
                </button>
              </div>
            )}

         
          </>
        )}


      </div>

      {tenant && (
        <EditCardModal open={editOpen} onClose={() => setEditOpen(false)} tenant={tenant} onUpdated={reload} />
      )}
    </Elements>
  )
}
