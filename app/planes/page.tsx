// app/planes/page.tsx

"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Loader2,
  Check,
  Star,
  Sparkles,
  X,
  Clock,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCompany } from "@/lib/company-context";

/* ================== Tipos devueltos por /api/stripe/catalog ================== */
interface StripePrice {
  price_id: string;
  lookup_key: string | null;
  nickname: string | null;
  currency: string;
  unit_amount: number | null; // centavos
  interval?: "day" | "week" | "month" | "year";
  interval_count?: number;
}
interface StripeCatalogItem {
  product_id: string;
  product_key: string | null;
  name: string;
  description: string | null;
  active: boolean;
  prices: StripePrice[];
}

/* ================== Util dinero ================== */
function formatAmount(
  amountInCents: number | null,
  currency = "mxn",
  noDecimals = false
) {
  if (amountInCents == null) return "—";
  const opts: Intl.NumberFormatOptions = {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: noDecimals ? 0 : 0,
    maximumFractionDigits: noDecimals ? 0 : 0,
  };
  return new Intl.NumberFormat("es-MX", opts).format(amountInCents / 100);
}

function perMonthFromCycle(price?: StripePrice) {
  if (!price?.unit_amount) return null;
  const interval = price.interval || "month";
  const ic = price.interval_count ?? 1;
  const months = interval === "year" ? 12 : ic || 1;
  return Math.round(price.unit_amount / months);
}

/* ================== Ciclos / matching ================== */
type CycleKey = "monthly" | "semiannual" | "annual";
const LOOKUP_KEYS: Record<CycleKey, string> = {
  monthly: "plan_unico_mxn_monthly",
  semiannual: "plan_unico_mxn_semestral",
  annual: "plan_unico_mxn_yearly",
};
const CYCLE_META: Record<
  CycleKey,
  {
    label: string;
    pillText: string;
    suffix: string;
    saveBadge?: string;
    matcher: (p: StripePrice) => boolean;
  }
> = {
  monthly: {
    label: "Pago mensual",
    pillText: "Pago mensual",
    suffix: "mes",
    matcher: (p) =>
      p.lookup_key === LOOKUP_KEYS.monthly ||
      (p.interval === "month" && (p.interval_count ?? 1) === 1),
  },
  semiannual: {
    label: "Pago semestral (ahorra 8%)",
    pillText: "Pago semestral (ahorra un 8%)*",
    suffix: "6 meses",
    saveBadge: "Ahorra un 8%",
    matcher: (p) =>
      p.lookup_key === LOOKUP_KEYS.semiannual ||
      (p.interval === "month" && (p.interval_count ?? 1) === 6),
  },
  annual: {
    label: "Pago anual (ahorra 16%)",
    pillText: "Pago anual (ahorra un 16%)*",
    suffix: "año",
    saveBadge: "Ahorra un 16%",
    matcher: (p) =>
      p.lookup_key === LOOKUP_KEYS.annual ||
      (p.interval === "year" && (p.interval_count ?? 1) === 1),
  },
};

/* ================== Funcionalidades (modal) ================== */
const FEATURES: Array<{ group: string; items: string[] }> = [
  {
    group: "Recibo",
    items: [
      "Registro de entrada contra orden de compra con validación de cantidades",
      "Escaneo de códigos de barras y captura de lote, serie y caducidad",
      "Asignación de ubicación inicial y generación de etiquetas de ingreso",
    ],
  },
  {
    group: "Acomodo",
    items: [
      "Sugerencia de ubicación por reglas (ABC/rotación/volumen)",
      "Validación de acomodo por escaneo de ubicación y artículo",
      "Reubicaciones internas y traspasos entre zonas con trazabilidad",
    ],
  },
  {
    group: "Picking",
    items: [
      "Generación de tareas de surtido por pedido o lote",
      "Verificación por escaneo (producto, lote/serie y cantidad)",
      "Indicadores de productividad por picker",
    ],
  },
  {
    group: "Packing",
    items: [
      "Consolidación de ítems pickeados por pedido/envío",
      "Chequeo final por escaneo y control de calidad",
      "Embalaje por caja/bulto con peso/volumen y contenido",
      "Impresión de etiquetas de envío y documentación",
    ],
  },
  {
    group: "Etiquetador",
    items: [
      "Códigos de barras/QR (SKU, lote/serie, ubicación)",
      "Datos dinámicos desde artículos: nombre, variante, precio, etc.",
      "Impresión masiva por lote, por ubicación o por recepción",
      "Compatibilidad con impresoras térmicas (Zebra/USB/Red)",
      "Impresión de etiquetas de envío y documentación",
    ],
  },
];

/* ================== Hook: bloquear scroll cuando la modal está abierta ================== */
function useLockBodyScroll(locked: boolean) {
  useEffect(() => {
    if (!locked) return;
    const original = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [locked]);
}

/* ================== Modal genérica ================== */
function Modal({
  open,
  onClose,
  title,
  icon,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const onBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      aria-modal="true"
      role="dialog"
      className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center"
      onClick={onBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] opacity-0 animate-[fadeIn_180ms_ease-out_forwards]" />
      {/* Card */}
      <div
        className={`
          relative w-full sm:max-w-2xl mx-auto
          rounded-2xl border border-zinc-800
          bg-zinc-950/90 shadow-2xl
          opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95
          animate-[modalIn_220ms_cubic-bezier(0.2,0.8,0.2,1)_forwards]
        `}
      >
        <div className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-zinc-200">
              {icon}
              <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-zinc-800/60 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label="Cerrar"
            >
              <X className="size-5 text-zinc-400" />
            </button>
          </div>

          <div className="mt-3 text-sm text-zinc-300">{children}</div>

          <div className="mt-5 sm:mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-100 hover:bg-zinc-800 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Keyframes */}
      <style jsx>{`
        @keyframes fadeIn {
          to {
            opacity: 1;
          }
        }
        @keyframes modalIn {
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

/* ================== Página ================== */
export default function PlanesPage() {
  const router = useRouter();

  // ⬇️ Usa contexto de compañía
  const { companyData, isReady } = useCompany();

  const [items, setItems] = useState<StripeCatalogItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cycle, setCycle] = useState<CycleKey>("monthly");
  const [email, setEmail] = useState<string>("");
  const [busyPrice, setBusyPrice] = useState<string | null>(null);

  const [showFeatures, setShowFeatures] = useState(false);
  const [showSupport, setShowSupport] = useState(false);

  /* ================== Cargar catálogo (multi-tenant) ================== */
  useEffect(() => {
    if (!isReady) return;
    // Si no hay tenant, mostramos error leve y no llamamos al API
    if (!companyData?.codigo) {
      setItems(null);
      setError("No se pudo identificar la compañía (tenant).");
      setLoading(false);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);

        // Opción A: endpoint interno Next API (recomendado)
        // Pasa el tenant para que el handler resuelva catálogo por compañía
        const res = await fetch(
          `/api/stripe/catalog?tenant=${encodeURIComponent(
            companyData.codigo
          )}`,
          {
            cache: "no-store",
          }
        );

        // Opción B (si manejas todo desde el backend de la compañía):
        // const res = await fetch(`${companyData.apiUrl}/stripe/catalog?tenant=${encodeURIComponent(companyData.codigo)}`, { cache: "no-store" });

        if (!res.ok) throw new Error("No se pudo cargar el catálogo");
        const data = await res.json();
        if (mounted) setItems((data.items || []) as StripeCatalogItem[]);
      } catch (e: any) {
        if (mounted) setError(e?.message || "Error inesperado");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isReady, companyData?.codigo /* , companyData?.apiUrl */]);

  /* ================== Resolver price por ciclo ================== */
  const plan = useMemo(() => {
    if (!items?.length) return null;
    const item = items[0]; // un solo plan
    const price =
      item.prices.find((p) => p.lookup_key === LOOKUP_KEYS[cycle]) ??
      item.prices.find(CYCLE_META[cycle].matcher);
    return { item, price };
  }, [items, cycle]);

  const pricePM = perMonthFromCycle(plan?.price);

  /* ================== Checkout ================== */
  async function handleSubscribe(priceId?: string) {
    try {
      if (!priceId) return;
      const emailToUse = email.trim();
      if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
        alert("Ingresa un email válido para continuar");
        return;
      }
      if (!companyData?.codigo) {
        alert("No se encontró el tenant para esta suscripción.");
        return;
      }

      setBusyPrice(priceId);

      // Opción A: endpoint interno
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailToUse,
          priceId,
          tenant: companyData.codigo, // ⬅️ importante
          successUrl: `${window.location.origin}/planes/success`,
          cancelUrl: `${
            window.location.origin
          }/planes/cancel?price=${encodeURIComponent(priceId)}`,
          userId: null, // ⬅️ ya no hay UserContext
        }),
      });

      // Opción B (backend por compañía):
      // const res = await fetch(`${companyData.apiUrl}/stripe/checkout`, { ... });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "No fue posible iniciar el checkout");
      }
      const data = await res.json();
      if (data?.url) window.location.href = data.url as string;
    } catch (e: any) {
      alert(e?.message || "Error iniciando el checkout");
    } finally {
      setBusyPrice(null);
    }
  }

  /* ================== UI ================== */
  const disabled = !isReady || !companyData?.codigo;

  return (
    <div className="min-h-screen bg-black text-zinc-100">
      {/* Banner superior */}
      <div className="sticky top-0 z-10 backdrop-blur supports-[backdrop-filter]:bg-black/60 bg-black/80 border-b border-zinc-900/60">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition"
                aria-label="Regresar al inicio"
              >
                <ArrowLeft className="size-4" />
                Regresar
              </button>

              <div className="inline-flex items-center rounded-full border border-zinc-800 bg-zinc-900/70 px-4 py-2 text-sm">
                {CYCLE_META[cycle].pillText}
              </div>
            </div>

            <div className="flex items-center gap-1 rounded-full bg-zinc-900/70 border border-zinc-800 p-1">
              {(["monthly", "semiannual", "annual"] as CycleKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setCycle(k)}
                  className={`px-4 py-2 rounded-full text-sm transition ${
                    cycle === k
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:text-white"
                  }`}
                >
                  {CYCLE_META[k].label.split(" (")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative">
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            background:
              "radial-gradient(800px 400px at 50% -10%, rgba(99,102,241,0.25), transparent), radial-gradient(600px 300px at 90% 10%, rgba(236,72,153,0.2), transparent)",
          }}
        />
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-8 relative">
          <div className="flex items-center gap-3 text-sm text-zinc-400">
            <Sparkles className="size-4" />
            <span>
              Planes y suscripciones{" "}
              {companyData?.nombre ? `– ${companyData.nombre}` : ""}
            </span>
          </div>
          <h1 className="mt-4 text-3xl sm:text-5xl font-semibold tracking-tight">
            Elige tu plan
          </h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Administra tu suscripción con pagos seguros por Stripe. Cambia entre
            mensual, semestral y anual cuando quieras.
          </p>

          {/* Email (ya no hay user.email) */}
          <div className="mt-6 max-w-lg">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Tu email (para el recibo)"
              className="w-full rounded-xl bg-zinc-900/70 border border-zinc-800 px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
              type="email"
              disabled={disabled}
            />
          </div>

          {!isReady && (
            <div className="mt-3 text-sm text-zinc-500 flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" /> Preparando contexto de
              compañía…
            </div>
          )}
          {isReady && !companyData?.codigo && (
            <div className="mt-3 text-sm text-amber-400">
              No se detectó compañía. Verifica el subdominio o las cookies/LS de
              tenant.
            </div>
          )}
        </div>
      </section>

      {/* Tarjeta del plan */}
      <section className="mx-auto max-w-6xl px-6 pb-16">
        {loading && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="size-5 animate-spin" /> Cargando catálogo…
          </div>
        )}
        {error && <div className="text-rose-400">{error}</div>}

        {!loading && !error && plan && (
          <div className="grid lg:grid-cols-2 gap-8">
            <article className="relative rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900/70 to-zinc-950/70 p-6 sm:p-8 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]">
              {CYCLE_META[cycle].saveBadge && (
                <div className="absolute -top-3 left-6">
                  <span className="rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-600/40 px-3 py-1 text-xs font-medium">
                    {CYCLE_META[cycle].saveBadge}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-3">
                <Star className="size-5 text-indigo-400" />
                <h3 className="text-2xl font-semibold">{plan.item.name}</h3>
              </div>
              {plan.item.description && (
                <p className="mt-2 text-sm text-zinc-400">
                  {plan.item.description}
                </p>
              )}

              <div className="mt-6 flex items-end gap-2">
                <span className="text-5xl font-bold tracking-tight">
                  {formatAmount(
                    plan.price?.unit_amount ?? null,
                    plan.price?.currency ?? "mxn"
                  )}
                </span>
                <span className="pb-2 text-zinc-500">
                  / {CYCLE_META[cycle].suffix}
                </span>
              </div>

              <div className="mt-2 text-sm text-zinc-400">
                {cycle === "monthly" ? (
                  <>
                    Pago mensual de{" "}
                    <span className="text-zinc-200 font-medium">
                      {formatAmount(
                        plan?.price?.unit_amount ?? null,
                        plan?.price?.currency ?? "mxn"
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    Equivale a{" "}
                    <span className="text-zinc-200 font-medium">
                      {formatAmount(
                        pricePM ?? null,
                        plan?.price?.currency ?? "mxn"
                      )}{" "}
                      / mes
                    </span>
                  </>
                )}
              </div>

              <ul className="mt-6 space-y-2 text-sm text-zinc-300">
                <li>
                  <button
                    type="button"
                    onClick={() => setShowFeatures(true)}
                    className="group w-full text-left flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    aria-haspopup="dialog"
                    aria-expanded={showFeatures}
                  >
                    <Check className="size-4 text-emerald-400" />
                    <span className="underline-offset-4 group-hover:underline">
                      Acceso total a funcionalidades
                    </span>
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setShowSupport(true)}
                    className="group w-full text-left flex items-center gap-2 rounded-lg px-2 py-1 -mx-2 hover:bg-zinc-800/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                    aria-haspopup="dialog"
                    aria-expanded={showSupport}
                  >
                    <Check className="size-4 text-emerald-400" />
                    <span className="underline-offset-4 group-hover:underline">
                      Soporte prioritario
                    </span>
                  </button>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="size-4 text-emerald-400" /> Cancelación
                  cuando quieras
                </li>
              </ul>

              <div className="mt-8">
                <button
                  onClick={() => handleSubscribe(plan.price?.price_id)}
                  disabled={
                    !plan.price ||
                    busyPrice === plan.price?.price_id ||
                    disabled
                  }
                  className="w-full rounded-xl bg-white text-black hover:bg-zinc-200 disabled:opacity-50 border border-zinc-200 px-4 py-3 font-medium transition"
                >
                  {busyPrice === plan.price?.price_id ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin" /> Redirigiendo…
                    </span>
                  ) : (
                    <>Continuar con Stripe</>
                  )}
                </button>
              </div>

              {(cycle === "annual" || cycle === "semiannual") && (
                <p className="mt-4 text-xs text-zinc-500">
                  *{" "}
                  {cycle === "annual"
                    ? "ANUAL – Ahorra un 16%"
                    : "SEMESTRAL – Ahorra un 8%"}
                </p>
              )}
            </article>

            <aside className="space-y-4 text-sm text-zinc-400">
              <div className="rounded-2xl border border-zinc-800 p-6 bg-zinc-900/40">
                <h4 className="text-zinc-200 font-medium">Transparencia</h4>
                <p className="mt-2">
                  Sin cargos ocultos. Puedes cambiar o cancelar tu suscripción
                  en cualquier momento desde el portal de Stripe.
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-800 p-6 bg-zinc-900/40">
                <h4 className="text-zinc-200 font-medium">Facturación</h4>
                <p className="mt-2">
                  Recibirás tus comprobantes por correo y podrás descargar tus
                  facturas.
                </p>
              </div>
            </aside>
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 bg-black/80">
        <div className="mx-auto max-w-6xl px-6 py-10 text-sm text-zinc-500 flex items-center justify-between">
          <div>
            © {new Date().getFullYear()} – Facturación segura con Stripe.
          </div>
          <Link href="https://blck-sheep.com" target="_blank">
            <img
              src={"/Logos/black_sheep_centro2.png"}
              alt="Logo"
              className="h-9 w-auto opacity-80 hover:opacity-100 transition"
            />
          </Link>
        </div>
      </footer>

      {/* Modales */}
      <Modal
        open={showFeatures}
        onClose={() => setShowFeatures(false)}
        title="Acceso total a funcionalidades"
        icon={<Sparkles className="size-5 text-indigo-400" />}
      >
        <p>Estas son las capacidades incluidas en tu suscripción:</p>
        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          {FEATURES.map((section) => (
            <div
              key={section.group}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <h3 className="text-zinc-200 font-medium">{section.group}</h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                {section.items.map((txt) => (
                  <li key={txt} className="flex items-center gap-2">
                    <Check className="size-4 text-emerald-400" />
                    <span>{txt}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        open={showSupport}
        onClose={() => setShowSupport(false)}
        title="Soporte prioritario"
        icon={<Clock className="size-5 text-emerald-400" />}
      >
        <p>Nuestro equipo responde con prioridad en los siguientes horarios:</p>
        <ul className="mt-3 space-y-1 text-zinc-200">
          <li>Lunes a Viernes: 8:00 AM – 6:00 PM</li>
          <li>Sábados: 8:00 AM – 2:00 PM</li>
        </ul>
      </Modal>
    </div>
  );
}
