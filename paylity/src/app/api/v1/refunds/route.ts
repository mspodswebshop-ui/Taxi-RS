import { NextResponse } from "next/server";

import { handle, jsonError } from "@/lib/api";
import { refundPayment } from "@/lib/payments";
import { createRefundSchema } from "@/lib/validation";

/** POST /api/v1/refunds - (een deel van) een betaling terugbetalen. */
export const POST = handle(
  async ({ ctx, body }) => {
    try {
      const { refund, payment } = await refundPayment({
        businessId: ctx.businessId,
        paymentId: body.paymentId,
        amount: body.amount,
        reason: body.reason,
      });
      return NextResponse.json({ ...refund, payment }, { status: 201 });
    } catch (err) {
      // Deze meldingen zijn voor de gebruiker geschreven en mogen zo terug.
      return jsonError(
        400,
        "refund_failed",
        err instanceof Error ? err.message : "Terugbetalen is niet gelukt.",
      );
    }
  },
  { schema: createRefundSchema },
);
