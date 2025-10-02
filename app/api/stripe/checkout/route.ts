import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function required(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

const stripe = new Stripe(required("STRIPE_SECRET_KEY_BS"), {
  apiVersion: "2025-09-30.clover",
});

export async function POST(req: NextRequest) {
  try {
    const { email, priceId, tenant, successUrl, cancelUrl, userId } =
      await req.json();

    if (!email || !priceId || !tenant || !successUrl || !cancelUrl) {
      return NextResponse.json(
        {
          error:
            "Faltan parámetros: email, priceId, tenant, successUrl, cancelUrl",
        },
        { status: 400 }
      );
    }

    // Reutiliza customer por email si existe
    const existing = await stripe.customers.list({ email, limit: 1 });
    const customer =
      existing.data[0] ??
      (await stripe.customers.create({
        email,
        metadata: {
          tenant,
          userId: String(userId ?? ""),
          solution: "KRNK", // <- marca la solución origen
        },
      }));

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
      // Metadata a nivel de sesión
      metadata: {
        tenant,
        userEmail: email,
        userId: String(userId ?? ""),
        solution: "KRNK",
      },
      // Metadata embebida en la suscripción creada por el checkout
      subscription_data: {
        metadata: {
          tenant,
          userEmail: email,
          userId: String(userId ?? ""),
          solution: "KRNK",
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e: any) {
    console.error("[/api/stripe/checkout] error:", e);
    return NextResponse.json(
      { error: e?.message || "Error creando checkout" },
      { status: 500 }
    );
  }
}
