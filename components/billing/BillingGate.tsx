// /components/billing/BillingGate.tsx
"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/lib/company-context";

type ActiveFromSubs = {
  active: true;
  tenant: string;
  source: "SUSCRIPCIONES";
  status: string;
  subscription_id: string;
  price_id?: string | null;
  current_period_start?: number;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
};

type ActiveFromPayments = {
  active: true;
  tenant: string;
  source: "PAGOS_SUSCRIPCION";
  status: "paid";
  invoice_id: string;
  current_period_start?: number;
  current_period_end?: number;
};

type Inactive = {
  active: false;
  tenant: string;
  reason?: string;
};

export type BillingStatus = ActiveFromSubs | ActiveFromPayments | Inactive;

export function useBillingStatus() {
  const { companyData, isReady } = useCompany();
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;

    const tenant = companyData?.codigo?.toLowerCase().trim();
    if (!tenant) {
      setData(null);
      setLoading(false);
      setErr("Tenant no detectado");
      return;
    }

    let abort = false;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        const res = await fetch(
          `/api/billing/status?tenant=${encodeURIComponent(tenant)}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (abort) return;
        if (!res.ok)
          throw new Error(
            json?.error || "Error consultando estado de suscripción"
          );
        setData(json as BillingStatus);
      } catch (e: any) {
        if (!abort) setErr(e?.message || "Error desconocido");
      } finally {
        if (!abort) setLoading(false);
      }
    })();

    return () => {
      abort = true;
    };
  }, [isReady, companyData?.codigo]);

  return {
    isReady,
    tenant: companyData?.codigo ?? null,
    loading,
    error,
    data,
    active: !!data?.active,
  };
}
