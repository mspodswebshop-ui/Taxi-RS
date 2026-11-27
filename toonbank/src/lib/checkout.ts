import "server-only";

import { cookies } from "next/headers";
import type { Store } from "@prisma/client";

import type { CartEntry, CartLine } from "@/lib/cart";
import { resolveCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { computeTotals, discountProblem, platformFee, type DiscountRule, type Totals } from "@/lib/pricing";
import { baseUrl, feePercentFor, stripe, stripeEnabled } from "@/lib/stripe";

const discountCookie = (storeId: string) => `disc_${storeId}`;

export async function readDiscountCode(storeId: string): Promise<string | null> {
  const jar = await cookies();
  return jar.get(discountCookie(storeId))?.value ?? null;
}

export async function writeDiscountCode(storeId: string, code: string | null): Promise<void> {
  const jar = await cookies();
  if (!code) jar.delete(discountCookie(storeId));
  else
    jar.set(discountCookie(storeId), code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
}

export async function findDiscount(storeId: string, code: string | null): Promise<DiscountRule | null> {
  if (!code) return null;
  return db.discountCode.findUnique({ where: { storeId_code: { storeId, code: code.trim().toUpperCase() } } });
}

export type CheckoutQuote = {
  lines: CartLine[];
  totals: Totals;
  discount: DiscountRule | null;
  discountError: string | null;
  // true als er minder op voorraad is dan in de wagen zat
  adjusted: boolean;
};

/** Rekent de bestelling uit zoals de server hem zou aanmaken. */
export async function quote(store: Store, entries: CartEntry[], code: string | null): Promise<CheckoutQuote> {
  const lines = await resolveCart(store.id, entries);
  const requested = entries.reduce((s, e) => s + e.q, 0);
  const got = lines.reduce((s, l) => s + l.quantity, 0);
  const rule = await findDiscount(store.id, code);
  const sub = lines.reduce((s, l) => s + l.priceCents * l.quantity, 0);
  const discountError = code ? (rule ? discountProblem(rule, sub) : "Deze kortingscode bestaat niet.") : null;
  const discount = rule && !discountError ? rule : null;
  return { lines, totals: computeTotals(lines, store, discount), discount, discountError, adjusted: got !== requested };
}

export type Address = {
  email: string;
  name: string;
  phone: string;
  address: string;
  postalCode: string;
  city: string;
  country: string;
  note: string;
};

/** Maakt de bestelling aan (status pending) en geeft het ID terug. */
export async function createOrder(store: Store, q: CheckoutQuote, a: Address): Promise<string> {
  const provider = stripeEnabled() ? "stripe" : "test";
  const fee = provider === "stripe" ? platformFee(q.totals.totalCents, feePercentFor(store.plan)) : 0;

  return db.$transaction(async (tx) => {
    // Bestelnummer ophogen in dezelfde transactie: twee gelijktijdige
    // bestellingen krijgen nooit hetzelfde nummer.
    const { nextOrderNumber } = await tx.store.update({
      where: { id: store.id },
      data: { nextOrderNumber: { increment: 1 } },
      select: { nextOrderNumber: true },
    });
    const customer = await tx.customer.upsert({
      where: { storeId_email: { storeId: store.id, email: a.email } },
      create: { storeId: store.id, email: a.email, name: a.name, phone: a.phone },
      update: { name: a.name, ...(a.phone ? { phone: a.phone } : {}) },
    });
    const order = await tx.order.create({
      data: {
        storeId: store.id,
        number: nextOrderNumber - 1,
        customerId: customer.id,
        ...a,
        subtotalCents: q.totals.subtotalCents,
        discountCents: q.totals.discountCents,
        shippingCents: q.totals.shippingCents,
        totalCents: q.totals.totalCents,
        platformFeeCents: fee,
        discountCode: q.discount?.code ?? null,
        currency: store.currency,
        paymentProvider: provider,
        items: {
          create: q.lines.map((l) => ({
            variantId: l.variantId,
            productTitle: l.productTitle,
            variantTitle: l.variantTitle,
            priceCents: l.priceCents,
            quantity: l.quantity,
          })),
        },
      },
    });
    return order.id;
  });
}

/**
 * Maakt een Stripe-betaalpagina voor de bestelling. Het geld gaat naar de
 * winkel (destination charge); de platformkosten blijven bij het platform.
 */
export async function createStripeCheckout(store: Store, orderId: string): Promise<string> {
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId }, include: { items: true } });
  const s = stripe();

  // Korting als eenmalige coupon, zodat de klant de echte prijzen ziet.
  let discounts: { coupon: string }[] | undefined;
  if (order.discountCents > 0) {
    const coupon = await s.coupons.create({
      amount_off: order.discountCents,
      currency: order.currency.toLowerCase(),
      duration: "once",
      name: order.discountCode ?? "Korting",
      max_redemptions: 1,
    });
    discounts = [{ coupon: coupon.id }];
  }

  const session = await s.checkout.sessions.create({
    mode: "payment",
    customer_email: order.email,
    client_reference_id: order.id,
    locale: "nl",
    line_items: order.items.map((i) => ({
      quantity: i.quantity,
      price_data: {
        currency: order.currency.toLowerCase(),
        unit_amount: i.priceCents,
        product_data: { name: i.variantTitle === "Standaard" ? i.productTitle : `${i.productTitle} (${i.variantTitle})` },
      },
    })),
    discounts,
    shipping_options: [
      {
        shipping_rate_data: {
          type: "fixed_amount",
          display_name: order.shippingCents ? "Verzending" : "Gratis verzending",
          fixed_amount: { amount: order.shippingCents, currency: order.currency.toLowerCase() },
        },
      },
    ],
    payment_intent_data: {
      application_fee_amount: order.platformFeeCents || undefined,
      transfer_data: { destination: store.stripeAccountId! },
      description: `${store.name} bestelling #${order.number}`,
      metadata: { orderId: order.id, storeId: store.id },
    },
    metadata: { kind: "order", orderId: order.id, storeId: store.id },
    success_url: `${baseUrl()}/s/${store.slug}/orders/${order.id}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl()}/s/${store.slug}/orders/${order.id}/terug`,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
  });

  await db.order.update({ where: { id: order.id }, data: { stripeSessionId: session.id } });
  return session.url!;
}
