// /app/api/billing/status/route.ts
import { NextRequest, NextResponse } from "next/server";
import * as fb from "node-firebird";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ⚠️ AJUSTA si tu BD es otra. Usa la misma que el webhook.
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

async function tableExists(db: fb.Database, name: string): Promise<boolean> {
  const sql = `
    SELECT 1
    FROM RDB$RELATIONS
    WHERE RDB$SYSTEM_FLAG = 0
      AND TRIM(UPPER(RDB$RELATION_NAME)) = ?
  `;
  return await new Promise<boolean>((res, rej) => {
    db.query(sql, [name.trim().toUpperCase()], (e, rows: any[]) => {
      if (e) return rej(e);
      res(!!rows?.length);
    });
  });
}

type RespActiveFromSubs = {
  active: true;
  tenant: string;
  source: "SUSCRIPCIONES";
  status: string;
  subscription_id: string;
  price_id?: string | null;
  current_period_start?: number | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean;
};
type RespActiveFromPays = {
  active: true;
  tenant: string;
  source: "PAGOS_SUSCRIPCION";
  status: "paid";
  invoice_id: string;
  current_period_start?: number | null;
  current_period_end?: number | null;
};
type RespInactive = { active: false; tenant: string; reason?: string };

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const tenant = (url.searchParams.get("tenant") || "").trim().toLowerCase();
    if (!tenant) {
      return NextResponse.json({ error: "Falta tenant" }, { status: 400 });
    }

    const out = await withFb(async (db) => {
      // 1) SUSCRIPCIONES: trae la última con estado activo (con TRIM/UPPER en SQL)
      if (await tableExists(db, "SUSCRIPCIONES")) {
        const sqlSubs = `
          SELECT FIRST 1
                 SUBSCRIPTION_ID,
                 PRICE_ID,
                 STATUS,
                 CURRENT_PERIOD_START,
                 CURRENT_PERIOD_END,
                 CANCEL_AT_PERIOD_END
          FROM SUSCRIPCIONES
          WHERE TRIM(LOWER(TENANT)) = ?
            AND UPPER(TRIM(STATUS)) IN ('ACTIVE','TRIALING','PAST_DUE')
          ORDER BY COALESCE(UPDATED_AT, CREATED_AT) DESC
        `;
        const subs = await new Promise<any[]>((res, rej) => {
          db.query(sqlSubs, [tenant], (e, rows) => (e ? rej(e) : res(rows || [])));
        });

        if (subs.length) {
          const r = subs[0];
          const status = String(r.STATUS ?? "").trim().toLowerCase();
          const resp: RespActiveFromSubs = {
            active: true,
            tenant,
            source: "SUSCRIPCIONES",
            status,
            subscription_id: String(r.SUBSCRIPTION_ID || ""),
            price_id: r.PRICE_ID || null,
            current_period_start:
              typeof r.CURRENT_PERIOD_START === "number" ? r.CURRENT_PERIOD_START : null,
            current_period_end:
              typeof r.CURRENT_PERIOD_END === "number" ? r.CURRENT_PERIOD_END : null,
            cancel_at_period_end: !!r.CANCEL_AT_PERIOD_END,
          };
          return resp;
        }
      }

      // 2) Si no hay suscripción activa, intenta con pagos "paid"
      if (await tableExists(db, "PAGOS_SUSCRIPCION")) {
        const sqlPays = `
          SELECT FIRST 1
                 INVOICE_ID,
                 STATUS,
                 PERIOD_START,
                 PERIOD_END,
                 CREATED_AT
          FROM PAGOS_SUSCRIPCION
          WHERE TRIM(LOWER(TENANT)) = ?
            AND UPPER(TRIM(STATUS)) = 'PAID'
          ORDER BY CREATED_AT DESC
        `;
        const pays = await new Promise<any[]>((res, rej) => {
          db.query(sqlPays, [tenant], (e, rows) => (e ? rej(e) : res(rows || [])));
        });

        if (pays.length) {
          const p = pays[0];
          const nowSec = Math.floor(Date.now() / 1000);

          // Manejo de periodos (si vienen en 0/NULL estimamos 30 días desde CREATED_AT)
          const periodStart =
            typeof p.PERIOD_START === "number" && p.PERIOD_START > 0
              ? p.PERIOD_START
              : p.CREATED_AT instanceof Date
                ? Math.floor(p.CREATED_AT.getTime() / 1000)
                : null;

          const periodEnd =
            typeof p.PERIOD_END === "number" && p.PERIOD_END > 0
              ? p.PERIOD_END
              : periodStart
                ? periodStart + 30 * 24 * 60 * 60
                : null;

          const stillActive = periodEnd ? periodEnd > nowSec : true;

          if (stillActive) {
            const resp: RespActiveFromPays = {
              active: true,
              tenant,
              source: "PAGOS_SUSCRIPCION",
              status: "paid",
              invoice_id: String(p.INVOICE_ID || ""),
              current_period_start: periodStart,
              current_period_end: periodEnd,
            };
            return resp;
          }
        }
      }

      const resp: RespInactive = { active: false, tenant, reason: "Sin registros activos" };
      return resp;
    });

    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Error consultando estado de suscripción" },
      { status: 500 }
    );
  }
}
