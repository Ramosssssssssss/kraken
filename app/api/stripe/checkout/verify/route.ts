// /app/api/stripe/checkout/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lazy init: no crear Stripe en el top-level
let _stripe: Stripe | null = null;
function stripe() {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY_BS;
    if (!key) {
      // Esto solo se evalúa cuando se invoca la ruta, no en build
      throw new Error("Missing env STRIPE_SECRET_KEY_BS");
    }
    _stripe = new Stripe(key, { apiVersion: "2025-09-30.clover" });
  }
  return _stripe!;
}

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Puedes expandir lo que necesites
    const s = await stripe().checkout.sessions.retrieve(sessionId, {
      expand: ["subscription", "payment_intent", "customer"],
    });

    // Lógica de verificación: ajusta a tu caso
    const isPaid = s.payment_status === "paid";
    const hasActiveSub =
      typeof s.subscription === "object" &&
      s.subscription &&
      s.subscription.status === "active";

    return NextResponse.json({
      ok: isPaid || hasActiveSub,
      payment_status: s.payment_status,
      subscription_id:
        typeof s.subscription === "string"
          ? s.subscription
          : s.subscription?.id ?? null,
      customer_id:
        typeof s.customer === "string" ? s.customer : s.customer?.id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error" },
      { status: 500 }
    );
  }
}

// (Opcional) Si expones GET para debug:
export async function GET() {
  return NextResponse.json({ ok: true });
}
