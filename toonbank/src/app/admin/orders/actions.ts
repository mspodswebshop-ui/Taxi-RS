"use server";

import { revalidatePath } from "next/cache";

import type { FormState } from "@/components/forms";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { stripe } from "@/lib/stripe";

async function ownOrder(orderId: string) {
  const { store } = await requireMerchant();
  const order = await db.order.findFirst({ where: { id: orderId, storeId: store.id }, include: { items: true } });
  return { store, order };
}

function refresh(orderId: string) {
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/orders");
  revalidatePath("/admin", "layout");
}

export async function fulfillOrder(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const { order } = await ownOrder(orderId);
  if (!order) return { error: "Bestelling niet gevonden." };
  if (order.status !== "paid") return { error: "Alleen betaalde bestellingen kun je als verzonden markeren." };
  const trackingCode = String(form.get("trackingCode") ?? "").trim().slice(0, 200);
  await db.order.update({ where: { id: order.id }, data: { fulfillment: "fulfilled", trackingCode } });
  refresh(order.id);
  return { ok: "Gemarkeerd als verzonden." };
}

export async function unfulfillOrder(orderId: string): Promise<void> {
  const { order } = await ownOrder(orderId);
  if (!order) return;
  await db.order.update({ where: { id: order.id }, data: { fulfillment: "unfulfilled" } });
  refresh(order.id);
}

/** Voor betalingen buiten de winkel om, zoals een overschrijving of contant. */
export async function markPaidManually(orderId: string): Promise<void> {
  const { order } = await ownOrder(orderId);
  if (!order || order.status !== "pending") return;
  await markOrderPaid(order.id);
  refresh(order.id);
}

export async function cancelOrder(orderId: string): Promise<void> {
  const { order } = await ownOrder(orderId);
  if (!order || order.status !== "pending") return;
  await db.order.update({ where: { id: order.id }, data: { status: "cancelled" } });
  refresh(order.id);
}

async function restock(orderId: string) {
  const items = await db.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (!item.variantId) continue;
    await db.variant.updateMany({
      where: { id: item.variantId, inventory: { not: null } },
      data: { inventory: { increment: item.quantity } },
    });
  }
}

export async function refundOrder(orderId: string, _: FormState, form: FormData): Promise<FormState> {
  const { order } = await ownOrder(orderId);
  if (!order) return { error: "Bestelling niet gevonden." };
  if (order.status !== "paid") return { error: "Alleen betaalde bestellingen kun je terugbetalen." };

  if (order.paymentProvider === "stripe") {
    if (!order.stripePaymentIntent) return { error: "Er is geen Stripe-betaling gevonden bij deze bestelling." };
    try {
      // Het geld komt terug van de rekening van de winkel, en het platform
      // geeft zijn kosten op deze verkoop ook terug.
      await stripe().refunds.create({
        payment_intent: order.stripePaymentIntent,
        reverse_transfer: true,
        refund_application_fee: true,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "onbekende fout";
      return { error: `Stripe weigerde de terugbetaling: ${message}` };
    }
  }

  const updated = await db.order.updateMany({ where: { id: order.id, status: "paid" }, data: { status: "refunded" } });
  if (updated.count && form.get("restock") === "on") await restock(order.id);
  refresh(order.id);
  return { ok: order.paymentProvider === "stripe" ? "Terugbetaald via Stripe. De klant ziet het binnen enkele dagen op zijn rekening." : "Gemarkeerd als terugbetaald." };
}
