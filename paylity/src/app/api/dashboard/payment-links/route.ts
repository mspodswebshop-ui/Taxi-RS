import { NextResponse } from "next/server";

import { jsonError, toErrorResponse } from "@/lib/api";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { newLinkSlug } from "@/lib/payments";
import { createPaymentLinkSchema } from "@/lib/validation";

/**
 * POST /api/dashboard/payment-links
 *
 * Dezelfde handeling als de publieke API, maar met de sessie als bewijs in
 * plaats van een API-sleutel. Zo hoeft het dashboard geen geheime sleutel in
 * de browser te hebben.
 */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError(401, "unauthorized", "Je bent niet ingelogd.");

  try {
    const body = createPaymentLinkSchema.parse(await req.json());
    const link = await db.paymentLink.create({
      data: { ...body, businessId: user.businessId, slug: newLinkSlug() },
    });
    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    return toErrorResponse(err);
  }
}
