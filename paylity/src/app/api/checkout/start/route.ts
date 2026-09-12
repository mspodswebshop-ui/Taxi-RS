/**
 * POST /api/checkout/start
 *
 * Wordt aangeroepen vanaf de checkoutpagina van de klant. Maakt een betaling
 * in stand `pending` aan en handelt daarna de testuitkomst af.
 *
 * Hier is geen API-sleutel nodig: de klant is geen ontwikkelaar met een
 * sleutel, hij komt via een betaallink. De betaallink zelf is het bewijs dat
 * hij hier mag betalen. Het bedrag komt daarom ALTIJD van de betaallink uit de
 * database, nooit uit het verzoek: anders zou iemand zijn eigen bedrag kunnen
 * meesturen.
 */

import { NextResponse, type NextRequest } from "next/server";

import { jsonError } from "@/lib/api";
import { settlePayment, startPaymentForLink } from "@/lib/payments";
import { checkoutLimiter, clientIp } from "@/lib/rate-limit";
import { checkoutSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const limit = checkoutLimiter.check(`checkout:${clientIp(req.headers)}`);
  if (!limit.allowed) {
    return jsonError(
      429,
      "rate_limited",
      `Te veel pogingen. Probeer het over ${limit.retryAfterSeconds} seconden opnieuw.`,
    );
  }

  const body = await req.json().catch(() => null);
  const slug = String(body?.slug ?? "");
  if (!slug) return jsonError(400, "missing_slug", "Er is geen betaallink meegegeven.");

  let input;
  try {
    input = checkoutSchema.parse(body);
  } catch {
    return jsonError(422, "validation_failed", "Kies een betaalmethode en een testuitkomst.");
  }

  try {
    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const { payment } = await startPaymentForLink({
      linkSlug: slug,
      method: input.method,
      customerName: input.customerName,
      customerEmail: input.customerEmail || undefined,
      returnUrl: `${base}/pay/${slug}`,
    });

    // Bij de gesimuleerde provider bepaalt de keuze op de testpagina de
    // uitkomst. Bij een erkende provider gebeurt dit via diens webhook en
    // valt dit stuk weg.
    const afgerond = await settlePayment(payment.id, input.simulate);

    return NextResponse.json({
      paymentId: afgerond.id,
      status: afgerond.status,
      amount: afgerond.amount,
      currency: afgerond.currency,
      failureReason: afgerond.failureReason,
    });
  } catch (err) {
    return jsonError(
      400,
      "checkout_failed",
      err instanceof Error ? err.message : "De betaling kon niet worden gestart.",
    );
  }
}
