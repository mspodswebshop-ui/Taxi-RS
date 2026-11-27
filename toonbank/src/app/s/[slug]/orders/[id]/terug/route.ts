import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { writeCart } from "@/lib/cart";

/**
 * De klant brak de betaling bij Stripe af. De winkelwagen was al geleegd bij
 * het bestellen; hier zetten we de artikelen terug, zodat hij verder kan.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const order = await db.order.findFirst({
    where: { id, store: { slug } },
    include: { items: true },
  });
  if (order && order.status === "pending") {
    await writeCart(
      order.storeId,
      order.items.filter((i) => i.variantId).map((i) => ({ v: i.variantId!, q: i.quantity })),
    );
  }
  return NextResponse.redirect(new URL(`/s/${slug}/cart`, request.url));
}
