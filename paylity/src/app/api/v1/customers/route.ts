import { NextResponse } from "next/server";

import { handle, jsonError, listResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { createCustomerSchema, listQuerySchema } from "@/lib/validation";

/** GET /api/v1/customers - klanten van dit bedrijf. */
export const GET = handle(async ({ req, ctx }) => {
  const q = listQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );

  const where = {
    businessId: ctx.businessId,
    ...(q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" as const } },
            { email: { contains: q.search, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
      include: { _count: { select: { payments: true } } },
    }),
    db.customer.count({ where }),
  ]);

  return listResponse(customers, total, q.limit, q.offset);
});

/** POST /api/v1/customers - een klant aanmaken. */
export const POST = handle(
  async ({ ctx, body }) => {
    const bestaat = await db.customer.findUnique({
      where: { businessId_email: { businessId: ctx.businessId, email: body.email } },
    });
    if (bestaat) {
      return jsonError(409, "already_exists", "Er is al een klant met dit e-mailadres.");
    }

    const customer = await db.customer.create({
      data: { ...body, businessId: ctx.businessId },
    });
    return NextResponse.json(customer, { status: 201 });
  },
  { schema: createCustomerSchema },
);
