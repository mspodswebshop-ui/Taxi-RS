import { NextResponse } from "next/server";

import { handle, methodNotAllowed } from "@/lib/api";
import { refundPayment } from "@/lib/payments";
import { createRefundSchema } from "@/lib/validation";

/** POST /api/v1/refunds - (een deel van) een betaling terugbetalen. */
export const POST = handle(
  async ({ ctx, body }) => {
    // Geen try/catch hier: refundPayment gooit fouten met hun eigen statuscode
    // (404 als de betaling niet bestaat of niet van jou is, 422 als er niets
    // terug te betalen valt), en `handle` zet die om in het juiste antwoord.
    const { refund, payment } = await refundPayment({
      businessId: ctx.businessId,
      paymentId: body.paymentId,
      amount: body.amount,
      reason: body.reason,
    });
    return NextResponse.json({ ...refund, payment }, { status: 201 });
  },
  { schema: createRefundSchema },
);

/* Andere methoden op dit pad: JSON met status 405, geen leeg antwoord. */
export const GET = methodNotAllowed(["POST"]);
export const PUT = methodNotAllowed(["POST"]);
export const PATCH = methodNotAllowed(["POST"]);
export const DELETE = methodNotAllowed(["POST"]);
