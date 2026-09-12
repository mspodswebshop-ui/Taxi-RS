/**
 * POST /api/v1/webhooks/payment
 *
 * Hier meldt een betaalprovider dat een betaling van stand is veranderd.
 *
 * Deze route werkt bewust anders dan de rest van de API:
 *
 * - Geen API-sleutel. Een provider heeft die niet; hij bewijst zich met een
 *   HANDTEKENING over de ruwe body.
 * - De ruwe tekst wordt gelezen vóór het ontleden. De handtekening geldt over
 *   exact die bytes; eerst JSON maken en dan weer tekst ervan maken levert een
 *   andere string op en dus een mislukte controle.
 * - Klopt de handtekening niet, dan gaat er niets naar de database. Zonder die
 *   controle kan iedereen die het adres kent betalingen op "betaald" zetten.
 */

import { NextResponse, type NextRequest } from "next/server";

import { jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { checkoutLimiter, clientIp } from "@/lib/rate-limit";
import { settlePayment } from "@/lib/payments";
import { incomingWebhookSchema } from "@/lib/validation";
import { verifySignature } from "@/lib/webhooks";

export async function POST(req: NextRequest) {
  const limit = checkoutLimiter.check(`webhook:${clientIp(req.headers)}`);
  if (!limit.allowed) {
    return jsonError(429, "rate_limited", "Te veel meldingen. Probeer het later opnieuw.");
  }

  const raw = await req.text();

  if (!verifySignature(raw, req.headers.get("paylity-signature"))) {
    return jsonError(
      401,
      "invalid_signature",
      "De handtekening klopt niet. Deze melding wordt niet verwerkt.",
    );
  }

  let parsed;
  try {
    parsed = incomingWebhookSchema.parse(JSON.parse(raw));
  } catch {
    return jsonError(400, "invalid_payload", "De inhoud van de melding klopt niet.");
  }

  const paymentId = String(parsed.data.paymentId ?? "");
  if (!paymentId) {
    return jsonError(400, "missing_payment", "Er is geen paymentId meegestuurd.");
  }

  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) {
    return jsonError(404, "not_found", "Deze betaling bestaat niet.");
  }

  switch (parsed.type) {
    case "payment.succeeded":
      await settlePayment(paymentId, "success");
      break;
    case "payment.failed":
      await settlePayment(paymentId, "failure");
      break;
    case "payment.cancelled":
      if (payment.status === "pending") {
        await db.payment.update({
          where: { id: paymentId },
          data: { status: "cancelled" },
        });
      }
      break;
    default:
      // Onbekende soorten netjes bevestigen, zodat de provider niet eindeloos
      // opnieuw probeert voor iets wat wij toch niet gebruiken.
      return NextResponse.json({ received: true, handled: false });
  }

  return NextResponse.json({ received: true, handled: true });
}
