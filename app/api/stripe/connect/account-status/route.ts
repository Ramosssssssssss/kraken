// app/api/stripe/connect/account-status/route.ts
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

// Función helper robusta para convertir cualquier valor de Firebird a booleano
const toBoolean = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const str = String(value).toLowerCase().trim();
    if (
      str === "true" ||
      str === "t" ||
      str === "1" ||
      str === "yes" ||
      str === "'1'"
    )
      return true;
    if (
      str === "false" ||
      str === "f" ||
      str === "0" ||
      str === "no" ||
      str === "'0'"
    )
      return false;
    return false;
  }
  return Boolean(value);
};

const handle = async (usuarioId: number) => {
  if (!usuarioId) {
    return NextResponse.json({ error: "Falta usuarioId" }, { status: 400 });
  }

  const row = await withDbRetry(
    async (db) => {
      const rows = await new Promise<any[]>((res, rej) => {
        db.query(
          `SELECT 
           STRIPE_ACCOUNT_ID, 
           STRIPE_ONBOARDING_STATUS,
           PAYOUTS_ENABLED,
           DEFAULT_EXTERNAL_ACCOUNT_ID
         FROM USUARIOS
         WHERE USUARIO_ID = ?`,
          [usuarioId],
          (e, r) => {
            if (e) {
              console.error("Query error:", e);
              rej(e);
            } else {
              console.log("Raw database row:", r[0]);
              res(r);
            }
          }
        );
      });
      return rows[0];
    },
    3,
    1000
  );

  if (!row) {
    return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
  }

  const accountId: string | null = row?.STRIPE_ACCOUNT_ID || null;

  // Si no hay cuenta Stripe, devolver datos básicos de la BD
  if (!accountId) {
    const payoutsEnabledBool = toBoolean(row.PAYOUTS_ENABLED);

    return NextResponse.json({
      ok: true,
      stripeAccountId: null,
      onboardingStatus: row?.STRIPE_ONBOARDING_STATUS ?? "pending",
      payoutsEnabled: payoutsEnabledBool,
      defaultExternalAccountId: row?.DEFAULT_EXTERNAL_ACCOUNT_ID ?? null,
    });
  }

  try {
    // Refrescar desde Stripe
    const acc = await stripe.accounts.retrieve(accountId);

    const onboardingStatus = acc.requirements?.currently_due?.length
      ? "requirements_due"
      : "complete";
    const payoutsEnabled = !!acc.payouts_enabled;

    // Buscar cuenta por defecto
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

          db.query(sql, [onboardingStatus, defaultExtAcc, accountId], (e) =>
            e ? rej(e) : res()
          );
        });
      },
      3,
      1000
    );

    return NextResponse.json({
      ok: true,
      stripeAccountId: acc.id,
      onboardingStatus,
      payoutsEnabled,
      defaultExternalAccountId: defaultExtAcc,
    });
  } catch (stripeError: any) {
    console.error("Stripe API error:", stripeError);

    // Si hay error con Stripe, devolver datos de la BD como fallback
    const payoutsEnabledBool = toBoolean(row.PAYOUTS_ENABLED);

    return NextResponse.json({
      ok: true,
      stripeAccountId: accountId,
      onboardingStatus: row?.STRIPE_ONBOARDING_STATUS ?? "pending",
      payoutsEnabled: payoutsEnabledBool,
      defaultExternalAccountId: row?.DEFAULT_EXTERNAL_ACCOUNT_ID ?? null,
    });
  }
};

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json();
    return await handle(Number(usuarioId));
  } catch (err: any) {
    console.error("account-status POST error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const uid = Number(new URL(req.url).searchParams.get("usuarioId"));
    return await handle(uid);
  } catch (err: any) {
    console.error("account-status GET error:", err);
    return NextResponse.json(
      { error: err.message ?? "Server error" },
      { status: 500 }
    );
  }
}
