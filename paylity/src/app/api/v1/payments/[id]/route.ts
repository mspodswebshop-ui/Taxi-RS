import { NextResponse } from "next/server";

import { handle, jsonError } from "@/lib/api";
import { db } from "@/lib/db";

/** GET /api/v1/payments/[id] - een betaling met klant, order en terugbetalingen. */
export const GET = handle(async ({ ctx, params }) => {
  const payment = await db.payment.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
    include: { customer: true, order: true, refunds: true, paymentLink: true },
  });

  if (!payment) return jsonError(404, "not_found", "Deze betaling bestaat niet.");
  return NextResponse.json(payment);
});
