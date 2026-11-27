/**
 * Stripe is optioneel. Zonder STRIPE_SECRET_KEY draait het platform in
 * testmodus: alles werkt, maar betalen gebeurt met een testknop.
 *
 * Met een sleutel werkt het via Stripe Connect:
 * - elke winkelier koppelt zijn eigen Stripe-rekening (Express-account);
 * - de klant betaalt op de betaalpagina van Stripe;
 * - het geld gaat naar de winkelier, Stripe houdt de platformkosten in en
 *   zet die op de rekening van het platform. Zo verdien jij aan elke verkoop.
 */

import "server-only";

import Stripe from "stripe";

import { db } from "@/lib/db";

let client: Stripe | null = null;

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY ontbreekt.");
  client ??= new Stripe(key, { appInfo: { name: "Toonbank" } });
  return client;
}

export function proBillingEnabled(): boolean {
  return stripeEnabled() && Boolean(process.env.STRIPE_PRO_PRICE_ID);
}

export function baseUrl(): string {
  return (process.env.BASE_URL || "http://localhost:3100").replace(/\/+$/, "");
}

/** Platformkosten in procenten voor het abonnement van de winkel. */
export function feePercentFor(plan: string): number {
  const raw =
    plan === "pro"
      ? process.env.PLATFORM_FEE_PERCENT_PRO ?? "0.5"
      : process.env.PLATFORM_FEE_PERCENT_FREE ?? "2";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 && n < 50 ? n : 0;
}

/** Haalt bij Stripe op of de winkel al betalingen mag ontvangen. */
export async function syncStripeAccount(storeId: string, accountId: string): Promise<boolean> {
  const account = await stripe().accounts.retrieve(accountId);
  const enabled = Boolean(account.charges_enabled);
  await db.store.update({ where: { id: storeId }, data: { stripeChargesEnabled: enabled } });
  return enabled;
}
