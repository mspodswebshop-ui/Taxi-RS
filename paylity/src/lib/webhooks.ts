/**
 * Uitgaande webhooks.
 *
 * Elke melding krijgt een handtekening mee, zodat de ontvanger kan nagaan dat
 * het bericht echt van Paylity komt en onderweg niet is aangepast. De opzet is
 * dezelfde als bij bekende betaalplatformen: een tijdstempel plus een HMAC over
 * "tijdstempel.payload".
 *
 *   Paylity-Signature: t=1736600000,v1=<hex>
 *
 * De ontvanger berekent dezelfde HMAC met het gedeelde geheim en vergelijkt.
 * Wijkt het af, of is de tijdstempel oud, dan hoort hij het bericht te weigeren.
 */

import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { db } from "@/lib/db";

/** Hoe oud een melding maximaal mag zijn, tegen het opnieuw afspelen ervan. */
const MAX_AGE_SECONDS = 300;

function secret(): string {
  return process.env.WEBHOOK_SIGNING_SECRET ?? "whsec_test_ontbreekt";
}

export function signPayload(payload: string, timestamp: number): string {
  const mac = createHmac("sha256", secret())
    .update(`${timestamp}.${payload}`)
    .digest("hex");
  return `t=${timestamp},v1=${mac}`;
}

/** Controleert een binnengekomen handtekening. */
export function verifySignature(payload: string, header: string | null): boolean {
  if (!header) return false;

  const parts = Object.fromEntries(
    header.split(",").map((deel) => {
      const i = deel.indexOf("=");
      return [deel.slice(0, i).trim(), deel.slice(i + 1).trim()];
    }),
  );

  const timestamp = Number(parts.t);
  const given = parts.v1;
  if (!Number.isFinite(timestamp) || !given) return false;

  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > MAX_AGE_SECONDS) return false;

  const expected = createHmac("sha256", secret())
    .update(`${timestamp}.${payload}`)
    .digest("hex");

  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // Vergelijking die niet sneller stopt bij een verschil, tegen timing-aanvallen.
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Legt een gebeurtenis vast, met handtekening, klaar om te versturen. */
export async function recordEvent(
  businessId: string,
  type: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payload = JSON.stringify({ type, data, createdAt: new Date().toISOString() });
  const timestamp = Math.floor(Date.now() / 1000);

  await db.webhookEvent.create({
    data: {
      businessId,
      type,
      payload: JSON.parse(payload),
      signature: signPayload(payload, timestamp),
    },
  });
}
