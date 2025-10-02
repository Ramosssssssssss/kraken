// app/api/stripe/connect/account-link/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL!;

export async function POST(req: NextRequest) {
  try {
    const { accountId } = await req.json();
    if (!accountId)
      return NextResponse.json({ error: "Falta accountId" }, { status: 400 });

    const link = await stripe.accountLinks.create({
      account: accountId,
      type: "account_onboarding",
      refresh_url: `${APP_URL}/onboarding/refresh?account=${accountId}`,
      return_url: `${APP_URL}/onboarding?account=${accountId}`,
    });

    return NextResponse.json({ url: link.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
