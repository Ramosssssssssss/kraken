// /app/api/stripe/portal/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import * as fb from "node-firebird";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===== Stripe (lazy init) =====
let _stripe: Stripe | null = null;
function stripe() {
    if (!_stripe) {
        const key = process.env.STRIPE_SECRET_KEY_BS;
        if (!key) throw new Error("Missing env STRIPE_SECRET_KEY_BS");
        _stripe = new Stripe(key, { apiVersion: "2025-09-30.clover" });
    }
    return _stripe!;
}

// ===== Firebird (ajusta a tu conexión) =====
const fbConfig: fb.Options = {
    host: "localhost",
    port: 3050,
    database: "C:\\BS\\BLACKSHEEP.FDB",
    user: "SYSDBA",
    password: "BlueMamut$23",
    lowercase_keys: false,
};

function withFb<T = any>(fn: (db: fb.Database) => Promise<T>) {
    return new Promise<T>((resolve, reject) => {
        fb.attach(fbConfig, async (err, db) => {
            if (err) return reject(err);
            try {
                const out = await fn(db);
                db.detach();
                resolve(out);
            } catch (e) {
                try { db.detach(); } catch { }
                reject(e);
            }
        });
    });
}

async function getCustomerIdByTenant(tenant: string): Promise<string | null> {
    // 1) Intenta desde SUSCRIPCIONES
    const subRow = await withFb((db) => new Promise<any>((res, rej) => {
        const sql = `
      SELECT FIRST 1 CUSTOMER_ID
      FROM SUSCRIPCIONES
      WHERE TENANT = ?
      ORDER BY UPDATED_AT DESC
    `;
        db.query(sql, [tenant], (e, rs) => (e ? rej(e) : res(rs?.[0] || null)));
    }));
    if (subRow?.CUSTOMER_ID) return String(subRow.CUSTOMER_ID);

    // 2) Fallback: último pago del tenant
    const payRow = await withFb((db) => new Promise<any>((res, rej) => {
        const sql = `
      SELECT FIRST 1 CUSTOMER_ID
      FROM PAGOS_SUSCRIPCION
      WHERE TENANT = ?
      ORDER BY CREATED_AT DESC
    `;
        db.query(sql, [tenant], (e, rs) => (e ? rej(e) : res(rs?.[0] || null)));
    }));
    if (payRow?.CUSTOMER_ID) return String(payRow.CUSTOMER_ID);

    return null;
}

export async function POST(req: NextRequest) {
    try {
        const { tenant, returnUrl } = await req.json();
        if (!tenant) {
            return NextResponse.json({ error: "Falta tenant" }, { status: 400 });
        }

        const customerId = await getCustomerIdByTenant(String(tenant).toLowerCase());
        if (!customerId) {
            return NextResponse.json(
                { error: "No se encontró customer para el tenant" },
                { status: 404 }
            );
        }

        const origin =
            req.headers.get("origin") || `${req.nextUrl.protocol}//${req.nextUrl.host}`;
        const portal = await stripe().billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl || `${origin}/dashboard`,
        });

        return NextResponse.json({ url: portal.url }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
    }
}
