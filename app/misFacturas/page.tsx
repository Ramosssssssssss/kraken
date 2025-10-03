// app/misFacturas/page.tsx
"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
    CreditCard,
    Mail,
    ReceiptText,
    Clock,
    AlertTriangle,
    Loader2,
    CheckCircle2,
    XCircle,
    Trash2,
    ChevronRight,
    Edit,
    X,
} from "lucide-react";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";
import { Elements, CardElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY_BS!);

type PortalData = {
    tenant: string;
    active: boolean;
    source: "SUSCRIPCIONES" | "PAGOS_SUSCRIPCION" | "NONE";
    subscription?: {
        id: string;
        status: string;
        cancel_at_period_end: boolean;
        current_period_end?: number | null; // epoch seconds
        plan_name?: string;
        price_id?: string | null;
        amount?: number | null; // in cents
        currency?: string | null; // "mxn"
        interval?: "day" | "week" | "month" | "year" | null;
    } | null;
    customer?: {
        id: string;
        email?: string | null;
    } | null;
    paymentMethod?: {
        id: string;
        brand?: string | null;
        last4?: string | null;
        exp_month?: number | null;
        exp_year?: number | null;
    } | null;
    invoices: Array<{
        id: string;
        number?: string | null;
        created: number; // epoch seconds
        amount_paid: number; // cents
        currency: string;
        status: string; // "paid"/"open"/"void"
        hosted_invoice_url?: string | null;
        pdf?: string | null;
        description?: string | null;
    }>;
};

function fmtMoney(cents: number, currency = "mxn") {
    return new Intl.NumberFormat("es-MX", {
        style: "currency",
        currency: currency.toUpperCase(),
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(cents / 100);
}

function fmtDateFromEpoch(sec?: number | null) {
    if (!sec || Number.isNaN(Number(sec))) return "—";
    const d = new Date(Number(sec) * 1000);
    return d.toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

/* ---------------- Modal para editar tarjeta (Stripe Elements) --------------- */
function EditCardModal({
    open,
    onClose,
    tenant,
    onUpdated,
}: {
    open: boolean;
    onClose: () => void;
    tenant: string;
    onUpdated: () => Promise<void> | void;
}) {
    const stripe = useStripe();
    const elements = useElements();
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        if (!open) return;
        let cancel = false;
        (async () => {
            try {
                setErr(null);
                setBusy(true);
                const res = await fetch("/api/billing/setup-intent", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ tenant }),
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json?.error || "No se pudo iniciar la edición de tarjeta");
                if (!cancel) setClientSecret(json.client_secret);
            } catch (e: any) {
                if (!cancel) setErr(e?.message || "Error");
            } finally {
                if (!cancel) setBusy(false);
            }
        })();
        return () => { cancel = true; };
    }, [open, tenant]);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!stripe || !elements || !clientSecret) return;
        try {
            setBusy(true);
            setErr(null);

            const card = elements.getElement(CardElement);
            if (!card) throw new Error("No se encontró el elemento de tarjeta");

            const result = await stripe.confirmCardSetup(clientSecret, {
                payment_method: { card },
            });

            if (result.error) throw new Error(result.error.message || "Error confirmando tarjeta");

            const pmId = result.setupIntent.payment_method as string;
            const res = await fetch("/api/billing/pm-set-default", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant, payment_method_id: pmId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "No se pudo guardar la tarjeta como predeterminada");

            await onUpdated();
            onClose();
            alert("Método de pago actualizado.");
        } catch (e: any) {
            setErr(e?.message || "Error al actualizar método de pago");
        } finally {
            setBusy(false);
        }
    }

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
            <div className="absolute inset-0 bg-black/60" onClick={onClose} />
            <div className="relative w-full sm:max-w-md mx-auto rounded-2xl border border-zinc-800 bg-zinc-950/95 p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Editar método de pago</h3>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-zinc-800/60">
                        <X className="size-5 text-white" />
                    </button>
                </div>

                <form onSubmit={onSubmit} className="mt-4 space-y-4">
                    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3">
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
                        <div className="text-sm text-rose-400 bg-rose-950/30 border border-rose-900/40 rounded-md p-2">
                            {err}
                        </div>
                    )}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-zinc-700">
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={busy || !stripe || !elements || !clientSecret}
                            className="px-4 py-2 rounded-lg bg-white text-black disabled:opacity-50"
                        >
                            {busy ? "Guardando…" : "Guardar"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );

}

/* -------------------------------- Página principal ------------------------------- */
export default function MisFacturasPage() {
    const { isReady, companyData } = useCompany();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<PortalData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [canceling, setCanceling] = useState(false);
    const [editOpen, setEditOpen] = useState(false);

    const tenant = companyData?.codigo?.toLowerCase() || "";

    async function reload() {
        const res = await fetch(`/api/billing/portal-data?tenant=${encodeURIComponent(tenant)}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || "No fue posible cargar los datos.");
        setData(json as PortalData);
    }

    // Carga inicial
    useEffect(() => {
        if (!isReady) return;
        if (!tenant) {
            setError("No se detectó el tenant.");
            setLoading(false);
            return;
        }
        let abort = false;
        (async () => {
            try {
                setLoading(true);
                setError(null);
                await reload();
            } catch (e: any) {
                if (!abort) setError(e?.message || "Error desconocido");
            } finally {
                if (!abort) setLoading(false);
            }
        })();
        return () => { abort = true; };
    }, [isReady, tenant]);

    const canCancel = useMemo(() => {
        const s = data?.subscription;
        if (!s) return false;
        const st = (s.status || "").toLowerCase();
        return st === "active" || st === "trialing" || st === "past_due";
    }, [data?.subscription]);

    // Cancelación al final del periodo
    async function handleCancel() {
        if (!tenant || !canCancel || !data?.subscription?.id) return;
        if (!confirm("¿Cancelar al final del periodo actual?")) return;
        try {
            setCanceling(true);
            const res = await fetch(`/api/billing/cancel`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tenant }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json?.error || "No se pudo programar la cancelación");
            await reload();
            alert("La suscripción se cancelará al finalizar el periodo actual.");
        } catch (e: any) {
            alert(e?.message || "Error cancelando la suscripción");
        } finally {
            setCanceling(false);
        }
    }

    const nextBillingText = useMemo(() => {
        const sec = data?.subscription?.current_period_end ?? null;
        return fmtDateFromEpoch(sec);
    }, [data?.subscription?.current_period_end]);

    return (
        <div className="min-h-screen bg-black text-zinc-100">
            <div className="mx-auto max-w-6xl px-6 py-8">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-3xl font-semibold tracking-tight">Facturación y Suscripción</h1>
                    <Link href="/dashboard" className="text-sm text-zinc-400 hover:text-white">Volver al inicio →</Link>
                </div>

                {/* Carga / error */}
                {loading && (
                    <div className="rounded-xl border border-zinc-800 p-6 bg-zinc-900/40 flex items-center gap-3">
                        <Loader2 className="size-5 animate-spin" />
                        Cargando…
                    </div>
                )}
                {error && !loading && (
                    <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-6 text-rose-300">
                        <div className="flex items-center gap-2"><AlertTriangle className="size-5" /> {error}</div>
                    </div>
                )}

                {!loading && !error && data && (
                    <Elements stripe={stripePromise}>
                        <div className="space-y-8">
                            {/* Suscripción actual */}
                            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
                                <div className="p-6 border-b border-zinc-800">
                                    <h2 className="text-xl font-semibold">Suscripción actual</h2>
                                </div>

                                <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Plan */}
                                    <div className="rounded-xl border border-zinc-800 p-5">
                                        <div className="text-sm text-zinc-400 mb-2">Plan</div>
                                        <div className="text-2xl font-bold">
                                            {data.subscription?.plan_name ?? "—"}
                                        </div>
                                        <div className="text-sm text-zinc-400 mt-1">
                                            {data.subscription?.amount != null
                                                ? `${fmtMoney(
                                                    data.subscription.amount,
                                                    data.subscription.currency || "mxn"
                                                )} / ${data.subscription?.interval === "year" ? "año" : "mes"
                                                }`
                                                : "—"}
                                        </div>
                                        <div className="mt-3 inline-flex items-center gap-2 text-xs">
                                            {(data.subscription?.status || "—").toLowerCase() === "active" ? (
                                                <><CheckCircle2 className="size-4 text-emerald-400" /> <span className="text-emerald-400">Activa</span></>
                                            ) : (
                                                <><XCircle className="size-4 text-amber-400" /> <span className="text-amber-400">{data.subscription?.status || "—"}</span></>
                                            )}
                                        </div>
                                        <div className="mt-6">
                                            <button
                                                onClick={handleCancel}
                                                disabled={!canCancel || canceling}
                                                className="inline-flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
                                            >
                                                <Trash2 className="size-4" />
                                                {canceling
                                                    ? "Cancelando…"
                                                    : data.subscription?.cancel_at_period_end
                                                        ? "Cancelación programada"
                                                        : "Cancelar suscripción"}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Próxima facturación */}
                                    <div className="rounded-xl border border-zinc-800 p-5">
                                        <div className="text-sm text-zinc-400 mb-2">Próxima facturación</div>
                                        <div className="text-2xl font-bold">{nextBillingText}</div>
                                        <div className="mt-2 text-sm text-zinc-400 flex items-center gap-2">
                                            <Clock className="size-4" />{" "}
                                            {data.subscription?.cancel_at_period_end
                                                ? "Se cancelará al final del periodo"
                                                : "Se renovará automáticamente"}
                                        </div>
                                    </div>

                                    {/* Método de pago */}
                                    <div className="rounded-xl border border-zinc-800 p-5">
                                        <div className="text-sm text-zinc-400 mb-2 flex items-center justify-between">
                                            Método de pago
                                            <button
                                                onClick={() => setEditOpen(true)}
                                                className="inline-flex items-center gap-2 rounded-lg border-none bg-zinc-800 px-3 py-2 text-sm hover:bg-white/10"
                                            >
                                                <Edit className="size-4" />
                                            </button>
                                        </div>
                                        {data.paymentMethod ? (
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-lg border border-zinc-700 p-2">
                                                    <CreditCard className="size-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium capitalize">
                                                        {data.paymentMethod.brand ?? "Tarjeta"}
                                                    </div>
                                                    <div className="text-sm text-zinc-400">
                                                        •••• {data.paymentMethod.last4 ?? "—"} — Vence{" "}
                                                        {data.paymentMethod.exp_month ?? "–"}/
                                                        {String(data.paymentMethod.exp_year ?? "–")
                                                            .toString()
                                                            .slice(-2)}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-zinc-400">No hay método de pago asociado.</div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-zinc-800">
                                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                                        <Mail className="size-4" /> Correo de facturación:
                                        <span className="text-zinc-200 ml-1">{data.customer?.email || "—"}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Historial de facturas */}
                            <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
                                <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold">Historial de facturas</h2>
                                    <div className="text-sm text-zinc-400">{data.invoices.length} factura(s)</div>
                                </div>

                                {data.invoices.length === 0 ? (
                                    <div className="p-6 text-zinc-400">No hay facturas todavía.</div>
                                ) : (
                                    <ul className="divide-y divide-zinc-800">
                                        {data.invoices.map((inv) => (
                                            <li key={inv.id} className="px-6 py-4 hover:bg-zinc-900/40">
                                                <a
                                                    href={inv.hosted_invoice_url ?? inv.pdf ?? "#"}
                                                    target="_blank"
                                                    className="flex items-center justify-between"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="rounded-lg border border-zinc-700 p-2">
                                                            <ReceiptText className="size-5" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">
                                                                {inv.number ? `Factura ${inv.number}` : `Factura ${inv.id}`}
                                                            </div>
                                                            <div className="text-sm text-zinc-400">
                                                                {fmtDateFromEpoch(inv.created)} · {fmtMoney(inv.amount_paid, inv.currency)} ·{" "}
                                                                {inv.status === "paid" ? "Pagada" : inv.status || "—"}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="size-4 text-zinc-500" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            {!data.active && (
                                <section className="rounded-2xl border border-amber-900/40 bg-amber-950/30 p-6">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="size-5 text-amber-400 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-amber-300">No hay una suscripción activa</div>
                                            <div className="text-sm text-amber-200/90 mt-1">
                                                Ve a la página de planes para activarla.
                                            </div>
                                            <div className="mt-3">
                                                <Link
                                                    href="/planes"
                                                    className="inline-block rounded-lg border border-amber-700 px-3 py-2 text-sm hover:bg-amber-600/10"
                                                >
                                                    Elegir plan
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            )}
                        </div>

                        {/* Modal editar tarjeta */}
                        <EditCardModal
                            open={editOpen}
                            onClose={() => setEditOpen(false)}
                            tenant={tenant}
                            onUpdated={reload}
                        />
                    </Elements>
                )}
            </div>
        </div>
    );
}
