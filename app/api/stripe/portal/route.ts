// app/api/stripe/portal/route.ts
// Crea una sesión del Stripe Billing Portal y te regresa la URL para que el usuario abra su “panel de suscripciones” de Stripe.
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

// Inicializa Stripe (recorta espacios accidentales del .env)
const secret = process.env.STRIPE_SECRET_KEY_BS?.trim();
if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY_BS");
}
const stripe = new Stripe(secret);

export async function POST(req: Request) {
    try {
        const { customerId, email, returnUrl } = await req.json();

        // 1) Resolver el customerId (cid)
        let cid: string | undefined = customerId;
        if (!cid) {
            if (!email) {
                return NextResponse.json(
                    { error: "Falta customerId o email" },
                    { status: 400 }
                );
            }

            // a) Intentar Search (rápido)
            try {
                const found = await stripe.customers.search({
                    query: `email:'${email}'`,
                    limit: 1,
                });
                cid = found.data[0]?.id;
            } catch {
                // si Search no está disponible, seguimos abajo
            }

            // b) Fallback a List
            if (!cid) {
                const list = await stripe.customers.list({ email, limit: 1 });
                cid = list.data[0]?.id;
            }

            // c) Crear si no existe
            if (!cid) {
                cid = (await stripe.customers.create({ email })).id;
            }
        }

        // 2) Crear sesión del Portal
        const session = await stripe.billingPortal.sessions.create({
            customer: cid!,
            return_url:
                (returnUrl as string | undefined)?.trim() ||
                process.env.NEXT_PUBLIC_BASE_URL?.trim() ||
                "http://localhost:3000",
        });

        // 3) Asegurarnos de devolver URL ABSOLUTA (Stripe normalmente ya la da así)
        let url = session.url;
        if (!/^https?:\/\//i.test(url)) {
            url = `https://billing.stripe.com${url.startsWith("/") ? "" : "/"}${url}`;
        }

        console.log("[portal session url]", url);
        return NextResponse.json({ url });
    } catch (e: any) {
        console.error("[/api/stripe/portal] error:", {
            message: e?.message,
            type: e?.type,
            code: e?.code,
        });
        return NextResponse.json(
            { error: "No fue posible crear la sesión del portal" },
            { status: 500 }
        );
    }
}
