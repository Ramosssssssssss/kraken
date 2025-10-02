// app/api/stripe/webhookConnect/route.ts
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import * as fb from "node-firebird";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-08-27.basil",
});

const fbConfig = {
  host: "localhost",
  port: 3050,
  database: "C:\\ELYSSIA\\ELYSSIA.FDB",
  user: "SYSDBA",
  password: "BlueMamut$23",
};

// Función con reintentos para conexión a base de datos
function withDbRetry<T>(
  fn: (db: fb.Database) => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  return new Promise<T>(async (resolve, reject) => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await new Promise<T>((res, rej) => {
          fb.attach(fbConfig, async (err, db) => {
            if (err) {
              rej(err);
              return;
            }
            try {
              const fnResult = await fn(db);
              res(fnResult);
            } catch (e) {
              rej(e);
            } finally {
              db.detach();
            }
          });
        });

        return resolve(result);
      } catch (error: any) {
        lastError = error;
        console.warn(`Intento ${attempt}/${maxRetries} falló:`, error.message);

        if (attempt < maxRetries) {
          console.log(`Reintentando en ${delayMs}ms...`);
          await new Promise((resolve) =>
            setTimeout(resolve, delayMs * attempt)
          );
        }
      }
    }

    reject(lastError || new Error("Todos los reintentos fallaron"));
  });
}

async function readRawBody(req: Request) {
  const buf = await req.arrayBuffer();
  return Buffer.from(buf);
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature")!;
  const rawBody = await readRawBody(req as any);

  try {
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );

    if (event.type === "account.updated") {
      const acc = event.data.object as Stripe.Account;

      const requirementsDue = acc.requirements?.currently_due?.length
        ? "requirements_due"
        : "complete";
      const payoutsEnabled = !!acc.payouts_enabled;

      // Buscar default external account
      let defaultExtAcc: string | null = null;
      const external = (acc.external_accounts as any)?.data as
        | Array<any>
        | undefined;
      if (external?.length) {
        const defMxn =
          external.find(
            (ea) => ea?.default_for_currency === true && ea?.currency === "mxn"
          ) ||
          external.find((ea) => ea?.default_for_currency === true) ||
          null;
        defaultExtAcc = defMxn?.id ?? null;
      }

      // Actualizar BD con reintentos - usar TRUE/FALSE directamente para Firebird
      await withDbRetry(
        async (db) => {
          await new Promise<void>((res, rej) => {
            // Usar TRUE/FALSE directamente (Firebird SQL)
            const payoutsEnabledValue = payoutsEnabled ? "TRUE" : "FALSE";

            const sql = `
            UPDATE USUARIOS
            SET STRIPE_ONBOARDING_STATUS = ?,
                DEFAULT_EXTERNAL_ACCOUNT_ID = ?,
                PAYOUTS_ENABLED = ${payoutsEnabledValue}
            WHERE STRIPE_ACCOUNT_ID = ?
          `;

            db.query(sql, [requirementsDue, defaultExtAcc, acc.id], (e) =>
              e ? rej(e) : res()
            );
          });
        },
        3,
        1000
      );
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("webhookConnect error:", err?.message || err);
    return NextResponse.json(
      { error: `Webhook error: ${err.message}` },
      { status: 400 }
    );
  }
}
