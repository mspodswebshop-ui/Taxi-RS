import { NextResponse } from "next/server";

import { handle, jsonError, listResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { createInvoiceSchema, listQuerySchema } from "@/lib/validation";

/** GET /api/v1/invoices - facturen van dit bedrijf. */
export const GET = handle(async ({ req, ctx }) => {
  const q = listQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );

  const where = {
    businessId: ctx.businessId,
    ...(q.search ? { number: { contains: q.search, mode: "insensitive" as const } } : {}),
  };

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
      include: { customer: true },
    }),
    db.invoice.count({ where }),
  ]);

  return listResponse(invoices, total, q.limit, q.offset);
});

/** POST /api/v1/invoices - een factuur aanmaken. */
export const POST = handle(
  async ({ ctx, body }) => {
    const klant = await db.customer.findFirst({
      where: { id: body.customerId, businessId: ctx.businessId },
      select: { id: true },
    });
    if (!klant) return jsonError(404, "not_found", "Deze klant bestaat niet.");

    // Doorlopende nummering per bedrijf en per jaar.
    const jaar = new Date().getFullYear();
    const aantal = await db.invoice.count({
      where: { businessId: ctx.businessId, number: { startsWith: `${jaar}-` } },
    });

    const invoice = await db.invoice.create({
      data: {
        businessId: ctx.businessId,
        customerId: body.customerId,
        number: `${jaar}-${String(aantal + 1).padStart(4, "0")}`,
        amount: body.amount,
        currency: body.currency,
        description: body.description,
        dueAt: body.dueAt,
        status: "open",
      },
      include: { customer: true },
    });

    return NextResponse.json(invoice, { status: 201 });
  },
  { schema: createInvoiceSchema },
);
