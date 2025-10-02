// scripts/stripe-seed-catalog.ts
// Crea/actualiza el plan KRKN y lo expone solo a los tenants listados.
// Ejecuta: pnpm tsx scripts/stripe-seed-catalog.ts

import * as dotenv from "dotenv";
import Stripe from "stripe";

dotenv.config({ path: ".env.local" });

function required(name: string) {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing env ${name} (.env.local)`);
  return v;
}

const stripe = new Stripe(required("STRIPE_SECRET_KEY_BS"));

/* ========= CONFIG ========= */
const PRODUCT_KEY = "krkn_plan_unico"; // único y estable
const ALLOWED_TENANTS = ["goumam", "fyttsa"]; //
const SCOPE = "private"; // oculta si no pasas tenant

// Precios (centavos MXN)
const PRICE_MXN_MONTHLY = 210_000; // 2,100
const PRICE_MXN_SEMESTRAL = 1_159_000; // 11,590
const PRICE_MXN_YEARLY = 2_116_000; // 21,160

// lookup_keys (pueden ser genéricos porque el plan es compartido)
const LOOKUP_MONTHLY = "plan_unico_mxn_monthly";
const LOOKUP_SEMESTRAL = "plan_unico_mxn_semestral";
const LOOKUP_YEARLY = "plan_unico_mxn_yearly";

/* ========= HELPERS ========= */

async function findProductByKey(productKey: string) {
  const res = await stripe.products.search({
    query: `metadata['product_key']:'${productKey}'`,
    limit: 1,
  });
  return res.data[0] ?? null;
}

async function upsertProduct() {
  const existing = await findProductByKey(PRODUCT_KEY);
  const base = {
    name: "Plan KRKN",
    description: "Acceso a funcionalidades de KRKN",
    metadata: {
      product_key: PRODUCT_KEY,
      tenants: ALLOWED_TENANTS.join(","), // <- visibilidad para empresas
      scope: SCOPE,
    },
  } as const;

  if (existing) {
    return stripe.products.update(existing.id, { ...base, active: true });
  }
  return stripe.products.create(base);
}

async function upsertRecurringPriceByLookupKey(
  productId: string,
  def: {
    lookup_key: string;
    currency: string;
    unit_amount: number;
    interval: "month" | "year";
    interval_count?: number;
    nickname?: string;
  }
) {
  const all = await stripe.prices.list({
    lookup_keys: [def.lookup_key],
    limit: 100,
    expand: ["data.product"],
  });
  const existing = all.data[0] || null;

  const matches =
    existing &&
    existing.currency === def.currency &&
    existing.unit_amount === def.unit_amount &&
    existing.recurring?.interval === def.interval &&
    (existing.recurring?.interval_count ?? 1) === (def.interval_count ?? 1) &&
    typeof existing.product !== "string" &&
    existing.product.id === productId;

  const sharedMetadata = {
    tenants: ALLOWED_TENANTS.join(","), // <- mismas empresas
    scope: SCOPE,
  };

  if (matches) {
    const patch: Stripe.PriceUpdateParams = {
      metadata: { ...(existing.metadata || {}), ...sharedMetadata },
    };
    if (def.nickname && def.nickname !== existing.nickname)
      patch.nickname = def.nickname;
    if (!existing.active) patch.active = true;
    await stripe.prices.update(existing.id, patch);
    return existing;
  }

  if (existing) {
    await stripe.prices.update(existing.id, {
      active: false,
      lookup_key: `${def.lookup_key}_archived_${Date.now()
        .toString()
        .slice(-6)}`,
    });
  }

  return stripe.prices.create({
    product: productId,
    currency: def.currency,
    unit_amount: def.unit_amount,
    recurring: { interval: def.interval, interval_count: def.interval_count },
    nickname: def.nickname,
    lookup_key: def.lookup_key,
    active: true,
    metadata: sharedMetadata,
  });
}

async function main() {
  const product = await upsertProduct();

  const p1 = await upsertRecurringPriceByLookupKey(product.id, {
    lookup_key: LOOKUP_MONTHLY,
    currency: "mxn",
    unit_amount: PRICE_MXN_MONTHLY,
    interval: "month",
    interval_count: 1,
    nickname: "KRKN Mensual",
  });

  const p2 = await upsertRecurringPriceByLookupKey(product.id, {
    lookup_key: LOOKUP_SEMESTRAL,
    currency: "mxn",
    unit_amount: PRICE_MXN_SEMESTRAL,
    interval: "month",
    interval_count: 6,
    nickname: "KRKN Semestral",
  });

  const p3 = await upsertRecurringPriceByLookupKey(product.id, {
    lookup_key: LOOKUP_YEARLY,
    currency: "mxn",
    unit_amount: PRICE_MXN_YEARLY,
    interval: "year",
    interval_count: 1,
    nickname: "KRKN Anual",
  });

  console.table([
    {
      product_key: PRODUCT_KEY,
      product_id: product.id,
      monthly: p1.id,
      semestral: p2.id,
      yearly: p3.id,
      tenants: ALLOWED_TENANTS.join(","),
    },
  ]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
