// /lib/hooks/useBillingStatus.ts
"use client";

import { useEffect, useState } from "react";
import { useCompany } from "@/lib/company-context";

type BillingStatus =
  | {
      active: true;
      tenant: string;
      source: "SUSCRIPCIONES" | "PAGOS_SUSCRIPCION";
      status: string;
      subscription_id?: string;
      price_id?: string;
      invoice_id?: string;
      current_period_start?: number;
      current_period_end?: number;
      cancel_at_period_end?: boolean;
    }
  | {
      active: false;
      tenant: string;
      reason?: string;
    };

export function useBillingStatus() {
  const { companyData, isReady } = useCompany();
  const [data, setData] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!isReady) return;
    if (!companyData?.codigo) {
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
          `/api/billing/status?tenant=${encodeURIComponent(
            companyData.codigo.toLowerCase()
          )}`,
          { cache: "no-store" }
        );
        const json = await res.json();
        if (abort) return;
        if (!res.ok) throw new Error(json?.error || "Error");
        setData(json as BillingStatus);
      } catch (e: any) {
        if (!abort) setErr(e?.message || "Error");
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
    tenant: companyData?.codigo || null,
    loading,
    error,
    data,
    active: !!data?.active,
  };
}
