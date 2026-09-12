import { handle, listResponse } from "@/lib/api";
import { db } from "@/lib/db";
import { listQuerySchema } from "@/lib/validation";

/** GET /api/v1/payments - betalingen, met filter op status en zoekterm. */
export const GET = handle(async ({ req, ctx }) => {
  const q = listQuerySchema.parse(
    Object.fromEntries(new URL(req.url).searchParams),
  );

  const where = {
    businessId: ctx.businessId,
    ...(q.status ? { status: q.status } : {}),
    ...(q.search
      ? {
          OR: [
            { id: { contains: q.search } },
            { description: { contains: q.search, mode: "insensitive" as const } },
            { customer: { email: { contains: q.search, mode: "insensitive" as const } } },
            { customer: { name: { contains: q.search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: q.limit,
      skip: q.offset,
      include: { customer: true, order: true },
    }),
    db.payment.count({ where }),
  ]);

  return listResponse(payments, total, q.limit, q.offset);
});
