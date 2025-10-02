// app/api/stripe/connect/create-account/route.ts
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

function withDb<T>(fn: (db: fb.Database) => Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    fb.attach(fbConfig, async (err, db) => {
      if (err) return reject(err);
      try {
        resolve(await fn(db));
      } catch (e) {
        reject(e);
      } finally {
        db.detach();
      }
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const { usuarioId } = await req.json();

    // 1) Cargar usuario (EMAIL y si ya tiene STRIPE_ACCOUNT_ID)
    const user = await withDb(async (db) => {
      const rows = await new Promise<any[]>((res, rej) => {
        db.query(
          `SELECT USUARIO_ID, EMAIL, STRIPE_ACCOUNT_ID
           FROM USUARIOS WHERE USUARIO_ID = ?`,
          [usuarioId],
          (e, r) => (e ? rej(e) : res(r))
        );
      });
      return rows[0];
    });

    if (!user)
      return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });
    if (user.STRIPE_ACCOUNT_ID) {
      return NextResponse.json({ ok: true, accountId: user.STRIPE_ACCOUNT_ID });
    }

    // 2) Crear cuenta Express
    const account = await stripe.accounts.create({
      type: "express",
      country: "MX",
      email: user.EMAIL,
      capabilities: {
        transfers: { requested: true },
        card_payments: { requested: true }, // si no procesarán pagos, puedes omitir
      },
      business_type: "individual",
      metadata: { usuarioId: String(user.USUARIO_ID) },
    });

    // 3) Guardar en BD
    await withDb(async (db) => {
      await new Promise<void>((res, rej) => {
        db.query(
          `UPDATE USUARIOS
             SET STRIPE_ACCOUNT_ID = ?, STRIPE_ONBOARDING_STATUS = ?
           WHERE USUARIO_ID = ?`,
          [account.id, "pending", usuarioId],
          (e) => (e ? rej(e) : res())
        );
      });
    });

    return NextResponse.json({ ok: true, accountId: account.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
