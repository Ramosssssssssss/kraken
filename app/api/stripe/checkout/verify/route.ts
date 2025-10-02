// app/api/stripe/checkout/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

export async function GET(req: NextRequest) {
  try {
    const cs =
      req.nextUrl.searchParams.get("session_id") ||
      req.nextUrl.searchParams.get("cs");
    if (!cs)
      return NextResponse.json({ error: "Falta session_id" }, { status: 400 });

    const session = await stripe.checkout.sessions.retrieve(cs, {
      expand: ["payment_intent"],
    });

    // Para pago único (mode: payment) considerar paid/complete
    const paid =
      session.mode === "payment"
        ? session.payment_status === "paid" || session.status === "complete"
        : session.payment_status === "paid" || session.status === "complete";

    const email = session.customer_details?.email ?? null;
    return NextResponse.json({ paid, email, mode: session.mode });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
