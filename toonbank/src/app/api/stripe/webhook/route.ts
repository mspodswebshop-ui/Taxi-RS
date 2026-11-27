import type Stripe from "stripe";

import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { stripe, stripeEnabled } from "@/lib/stripe";

/**
 * Stripe meldt hier wat er gebeurd is. Instellen in Stripe > Developers >
 * Webhooks, met adres <BASE_URL>/api/stripe/webhook en deze events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.expired, account.updated,
 *   customer.subscription.updated, customer.subscription.deleted
 * Zet bij "Listen to" ook events van Connected accounts aan (voor account.updated).
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripeEnabled() || !secret) return new Response("Webhook niet ingesteld", { status: 503 });

  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Geen handtekening", { status: 400 });

  let event: Stripe.Event;
  try {
    // De ruwe tekst is nodig: de handtekening hoort bij de exacte bytes.
    event = stripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return new Response("Ongeldige handtekening", { status: 400 });
  }

  // Elk event één keer: Stripe stuurt soms opnieuw.
  const seen = await db.processedEvent.findUnique({ where: { id: event.id } });
  if (seen) return Response.json({ received: true, duplicate: true });

  try {
    await handle(event);
  } catch (err) {
    console.error(`Stripe-event ${event.type} mislukt`, err);
    // 500 laat Stripe het later opnieuw proberen.
    return new Response("Verwerken mislukt", { status: 500 });
  }

  await db.processedEvent.create({ data: { id: event.id } }).catch(() => {});
  return Response.json({ received: true });
}

async function handle(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.metadata?.kind === "order" && session.metadata.orderId) {
        // Bij Bancontact is de betaling soms pas later rond (async).
        if (session.payment_status !== "paid") return;
        const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        await markOrderPaid(session.metadata.orderId, { stripePaymentIntent: pi });
      }
      if (session.metadata?.kind === "subscription" && session.metadata.storeId) {
        await db.store.update({
          where: { id: session.metadata.storeId },
          data: {
            plan: "pro",
            stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
            stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : session.subscription?.id,
          },
        });
      }
      return;
    }
    case "checkout.session.expired": {
      const session = event.data.object;
      if (session.metadata?.kind === "order" && session.metadata.orderId) {
        await db.order.updateMany({ where: { id: session.metadata.orderId, status: "pending" }, data: { status: "cancelled" } });
      }
      return;
    }
    case "account.updated": {
      const account = event.data.object;
      await db.store.updateMany({
        where: { stripeAccountId: account.id },
        data: { stripeChargesEnabled: Boolean(account.charges_enabled) },
      });
      return;
    }
    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      const active = event.type === "customer.subscription.updated" && ["active", "trialing", "past_due"].includes(sub.status);
      await db.store.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { plan: active ? "pro" : "free", ...(active ? {} : { stripeSubscriptionId: null }) },
      });
      return;
    }
  }
}
