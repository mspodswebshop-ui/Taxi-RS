import "server-only";

import { db } from "@/lib/db";

/**
 * Zet een bestelling op betaald. Veilig om meerdere keren aan te roepen (de
 * testknop, de terugkeer van Stripe en de webhook kunnen allemaal tegelijk
 * komen): alleen de eerste aanroep boekt voorraad en kortingsgebruik af.
 */
export async function markOrderPaid(
  orderId: string,
  extra: { stripePaymentIntent?: string | null } = {},
): Promise<boolean> {
  return db.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: orderId, status: "pending", stockApplied: false },
      data: {
        status: "paid",
        paidAt: new Date(),
        stockApplied: true,
        ...(extra.stripePaymentIntent ? { stripePaymentIntent: extra.stripePaymentIntent } : {}),
      },
    });
    if (updated.count === 0) return false;

    const order = await tx.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });

    for (const item of order.items) {
      if (!item.variantId) continue;
      // Alleen varianten met een bijgehouden voorraad.
      await tx.variant.updateMany({
        where: { id: item.variantId, inventory: { not: null } },
        data: { inventory: { decrement: item.quantity } },
      });
    }

    if (order.discountCode) {
      await tx.discountCode.updateMany({
        where: { storeId: order.storeId, code: order.discountCode },
        data: { usedCount: { increment: 1 } },
      });
    }
    return true;
  });
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  pending: "Wacht op betaling",
  paid: "Betaald",
  cancelled: "Geannuleerd",
  refunded: "Terugbetaald",
};

export const FULFILLMENT_LABEL: Record<string, string> = {
  unfulfilled: "Nog te verzenden",
  fulfilled: "Verzonden",
};
