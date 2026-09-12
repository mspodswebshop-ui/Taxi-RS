import { NextResponse } from "next/server";

import { handle, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { updatePaymentLinkSchema } from "@/lib/validation";

/** GET /api/v1/payment-links/[id] - een betaallink opvragen. */
export const GET = handle(async ({ ctx, params }) => {
  // Altijd op businessId filteren: een sleutel mag nooit bij een link van een
  // ander bedrijf kunnen, ook niet met een gegokt id.
  const link = await db.paymentLink.findFirst({
    where: { id: params.id, businessId: ctx.businessId },
    include: { _count: { select: { payments: true } } },
  });

  if (!link) return jsonError(404, "not_found", "Deze betaallink bestaat niet.");

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return NextResponse.json({ ...link, url: `${base}/pay/${link.slug}` });
});

/** PATCH /api/v1/payment-links/[id] - een betaallink aanpassen. */
export const PATCH = handle(
  async ({ ctx, params, body }) => {
    const bestaat = await db.paymentLink.findFirst({
      where: { id: params.id, businessId: ctx.businessId },
      select: { id: true },
    });
    if (!bestaat) return jsonError(404, "not_found", "Deze betaallink bestaat niet.");

    const link = await db.paymentLink.update({ where: { id: params.id }, data: body });
    return NextResponse.json(link);
  },
  { schema: updatePaymentLinkSchema },
);
