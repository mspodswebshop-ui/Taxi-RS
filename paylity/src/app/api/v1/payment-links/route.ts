import { NextResponse } from "next/server";
import { z } from "zod";

import { handle, listResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { newLinkSlug } from "@/lib/payments";
import { createPaymentLinkSchema, listQuerySchema } from "@/lib/validation";

/** GET /api/v1/payment-links - alle betaallinks van dit bedrijf. */
export const GET = handle(async ({ req, ctx }) => {
  const q = listQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );

  const where = {
    businessId: ctx.businessId,
    ...(q.search
      ? { title: { contains: q.search, mode: "insensitive" as const } }
      : {}),
  };

  const [links, total] = await Promise.all([
    db.paymentLink.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
    }),
    db.paymentLink.count({ where }),
  ]);

  return listResponse(links, total, q.limit, q.offset);
});

/** POST /api/v1/payment-links - een nieuwe betaallink aanmaken. */
export const POST = handle(
  async ({ ctx, body }) => {
    const link = await db.paymentLink.create({
      data: { ...body, businessId: ctx.businessId, slug: newLinkSlug() },
    });

    const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return NextResponse.json(
      { ...link, url: `${base}/pay/${link.slug}` },
      { status: 201 },
    );
  },
  { schema: createPaymentLinkSchema as unknown as z.ZodType<z.infer<typeof createPaymentLinkSchema>> },
);
