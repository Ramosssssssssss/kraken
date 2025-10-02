// app/api/stripe/connect/sync-account/route.ts
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

export async function GET(req: NextRequest) {
  try {
    const accountId = new URL(req.url).searchParams.get("account");
    if (!accountId) {
      return NextResponse.json({ error: "Falta account" }, { status: 400 });
    }

    // 1) Buscar usuario por STRIPE_ACCOUNT_ID con reintentos
    const usuario = await withDbRetry(
      async (db) => {
        const rows = await new Promise<any[]>((res, rej) => {
          db.query(
            `SELECT USUARIO_ID, PAYOUTS_ENABLED FROM USUARIOS WHERE STRIPE_ACCOUNT_ID = ?`,
            [accountId],
            (e, r) => (e ? rej(e) : res(r))
          );
        });
        return rows[0] ?? null;
      },
      3,
      1000
    );

    if (!usuario) {
      return NextResponse.json(
        { error: "No se encontró usuario para esa cuenta", accountId },
        { status: 404 }
      );
    }

    // 2) Traer estado fresco de Stripe
    const acc = await stripe.accounts.retrieve(accountId);
    const onboardingStatus = acc.requirements?.currently_due?.length
      ? "requirements_due"
      : "complete";
    const payoutsEnabled = !!acc.payouts_enabled;

    // Default external account (prefiere MXN)
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

    // 3) Actualizar BD con reintentos - usar TRUE/FALSE directamente para Firebird
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
      usuarioId: usuario.USUARIO_ID,
      accountId,
      onboardingStatus,
      payoutsEnabled,
      defaultExternalAccountId: defaultExtAcc,
    });
  } catch (err: any) {
    console.error("Error en sync-account:", err);
    return NextResponse.json(
      {
        error: err.message ?? "Server error",
        details: "Fallaron todos los reintentos de conexión a la base de datos",
      },
      { status: 500 }
    );
  }
}
