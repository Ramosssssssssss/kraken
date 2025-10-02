// /app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as fb from "node-firebird";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// === Ajusta con tus credenciales ===
const fbConfig: fb.Options = {
  host: "localhost",
  port: 3050,
  database: "C:\\ELYSSIA\\ELYSSIA.FDB",
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
        try {
          db.detach();
        } catch {}
        reject(e);
      }
    });
  });
}

// Helper unix now
function nowUnix(): number {
  return Math.floor(Date.now() / 1000);
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenant = (url.searchParams.get("tenant") || "").toLowerCase().trim();

    if (!tenant) {
      return NextResponse.json({ error: "Falta tenant" }, { status: 400 });
    }

    const now = nowUnix();

    // 1) ¿Hay suscripción vigente?
    const subRow = await withFb(
      (db) =>
        new Promise<any>((res, rej) => {
          const sql = `
        SELECT FIRST 1
          SUBSCRIPTION_ID,
          STATUS,
          PRICE_ID,
          CURRENT_PERIOD_START,
          CURRENT_PERIOD_END,
          CANCEL_AT_PERIOD_END
        FROM SUSCRIPCIONES
        WHERE TENANT = ?
          AND UPPER(STATUS) IN ('ACTIVE','TRIALING')
          AND CURRENT_PERIOD_END >= ?
        ORDER BY CURRENT_PERIOD_END DESC
      `;
          db.query(sql, [tenant, now], (e, rs) =>
            e ? rej(e) : res(rs?.[0] || null)
          );
        })
    );

    if (subRow) {
      return NextResponse.json({
        tenant,
        active: true,
        source: "SUSCRIPCIONES",
        status: subRow.STATUS,
        subscription_id: subRow.SUBSCRIPTION_ID,
        price_id: subRow.PRICE_ID,
        current_period_start: subRow.CURRENT_PERIOD_START,
        current_period_end: subRow.CURRENT_PERIOD_END,
        cancel_at_period_end: !!subRow.CANCEL_AT_PERIOD_END,
      });
    }

    // 2) Fallback por pagos: ¿el último período pagado cubre hoy?
    const payRow = await withFb(
      (db) =>
        new Promise<any>((res, rej) => {
          const sql = `
        SELECT FIRST 1
          INVOICE_ID,
          STATUS,
          PERIOD_START,
          PERIOD_END
        FROM PAGOS_SUSCRIPCION
        WHERE TENANT = ?
          AND STATUS = 'paid'
          AND PERIOD_END IS NOT NULL
        ORDER BY PERIOD_END DESC
      `;
          db.query(sql, [tenant], (e, rs) =>
            e ? rej(e) : res(rs?.[0] || null)
          );
        })
    );

    if (payRow && payRow.PERIOD_END >= now) {
      return NextResponse.json({
        tenant,
        active: true,
        source: "PAGOS_SUSCRIPCION",
        status: "paid",
        invoice_id: payRow.INVOICE_ID,
        current_period_start: payRow.PERIOD_START,
        current_period_end: payRow.PERIOD_END,
      });
    }

    // 3) Inactivo
    return NextResponse.json({
      tenant,
      active: false,
      reason: "No hay suscripción vigente ni período pagado activo.",
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Error" }, { status: 500 });
  }
}
