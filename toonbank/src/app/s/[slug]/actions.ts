"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/components/forms";
import { addQuantity, clearCart, readCart, setQuantity, writeCart } from "@/lib/cart";
import { createOrder, createStripeCheckout, quote, readDiscountCode, writeDiscountCode } from "@/lib/checkout";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { checkoutLimiter, clientIp } from "@/lib/rate-limit";
import { stripeEnabled } from "@/lib/stripe";
import { getStore } from "@/lib/storefront";

export async function addToCart(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const store = await getStore(slug);
  const variantId = String(form.get("variantId") ?? "");
  const qty = Math.max(1, Math.min(99, Number(form.get("quantity")) || 1));

  const variant = await db.variant.findFirst({
    where: { id: variantId, product: { storeId: store.id, status: "active" } },
    select: { id: true, inventory: true },
  });
  if (!variant) return { error: "Kies eerst een variant." };

  const cart = await readCart(store.id);
  const inCart = cart.find((e) => e.v === variant.id)?.q ?? 0;
  if (variant.inventory != null && inCart + qty > variant.inventory) {
    return {
      error:
        variant.inventory <= 0
          ? "Dit is helaas uitverkocht."
          : `Er zijn er nog maar ${variant.inventory} op voorraad${inCart ? ` en je hebt er al ${inCart} in je winkelwagen` : ""}.`,
    };
  }

  await writeCart(store.id, addQuantity(cart, variant.id, qty));
  redirect(`/s/${slug}/cart?toegevoegd=1`);
}

export async function updateCartLine(slug: string, variantId: string, form: FormData): Promise<void> {
  const store = await getStore(slug);
  const qty = Number(form.get("quantity"));
  const cart = await readCart(store.id);
  await writeCart(store.id, setQuantity(cart, variantId, Number.isFinite(qty) ? qty : 0));
  redirect(`/s/${slug}/cart`);
}

export async function removeCartLine(slug: string, variantId: string): Promise<void> {
  const store = await getStore(slug);
  const cart = await readCart(store.id);
  await writeCart(store.id, setQuantity(cart, variantId, 0));
  redirect(`/s/${slug}/cart`);
}

/* ---------------------------------------------------------------- */
/* Afrekenen                                                        */
/* ---------------------------------------------------------------- */

export async function applyDiscount(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const store = await getStore(slug);
  const code = String(form.get("code") ?? "").trim().toUpperCase().slice(0, 30);
  if (!code) return { error: "Vul een kortingscode in." };
  const q = await quote(store, await readCart(store.id), code);
  if (q.discountError) return { error: q.discountError };
  await writeDiscountCode(store.id, code);
  revalidatePath(`/s/${slug}/checkout`);
  return { ok: `Code ${code} toegepast.` };
}

export async function removeDiscount(slug: string): Promise<void> {
  const store = await getStore(slug);
  await writeDiscountCode(store.id, null);
  revalidatePath(`/s/${slug}/checkout`);
}

const addressSchema = z.object({
  email: z.email("Vul een geldig e-mailadres in.").trim().toLowerCase().max(200),
  name: z.string().trim().min(2, "Vul je naam in.").max(120),
  phone: z.string().trim().max(40).default(""),
  address: z.string().trim().min(3, "Vul je straat en huisnummer in.").max(200),
  postalCode: z.string().trim().min(3, "Vul je postcode in.").max(12),
  city: z.string().trim().min(2, "Vul je woonplaats in.").max(100),
  country: z.enum(["BE", "NL", "LU", "FR", "DE"], "Kies een land."),
  note: z.string().trim().max(1000).default(""),
});

export async function placeOrder(slug: string, _: FormState, form: FormData): Promise<FormState> {
  const limit = checkoutLimiter.check(`checkout:${clientIp(await headers())}`);
  if (!limit.allowed) return { error: "Te veel pogingen na elkaar. Wacht even en probeer het opnieuw." };

  const store = await getStore(slug);
  if (!store.published) return { error: "Deze winkel is op dit moment gesloten." };
  if (stripeEnabled() && (!store.stripeAccountId || !store.stripeChargesEnabled)) {
    return { error: "Deze winkel kan nog geen betalingen ontvangen. Probeer het later opnieuw of neem contact op met de winkel." };
  }

  const parsed = addressSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const code = await readDiscountCode(store.id);
  const q = await quote(store, await readCart(store.id), code);
  if (q.lines.length === 0) return { error: "Je winkelwagen is leeg." };
  if (q.adjusted) {
    // Voorraad veranderd terwijl de klant aan het winkelen was.
    await writeCart(store.id, q.lines.map((l) => ({ v: l.variantId, q: l.quantity })));
    return { error: "Van een of meer artikelen is er minder op voorraad dan je wilde. We hebben je winkelwagen aangepast; kijk het even na." };
  }
  if (code && q.discountError) {
    await writeDiscountCode(store.id, null);
    return { error: `${q.discountError} We hebben de code weggehaald.` };
  }

  const orderId = await createOrder(store, q, parsed.data);

  let next: string;
  if (stripeEnabled()) {
    try {
      next = await createStripeCheckout(store, orderId);
    } catch (err) {
      console.error("Stripe-checkout mislukt", err);
      return { error: "De betaalpagina kon niet geopend worden. Probeer het opnieuw." };
    }
  } else {
    next = `/s/${slug}/orders/${orderId}/pay`;
  }

  await clearCart(store.id);
  await writeDiscountCode(store.id, null);
  redirect(next);
}

/** Alleen in testmodus: de betaling nabootsen. */
export async function testPay(slug: string, orderId: string, outcome: "success" | "fail"): Promise<void> {
  const store = await getStore(slug);
  const order = await db.order.findFirst({ where: { id: orderId, storeId: store.id, paymentProvider: "test" } });
  if (!order || stripeEnabled()) redirect(`/s/${slug}`);
  if (outcome === "success") {
    await markOrderPaid(order.id);
    redirect(`/s/${slug}/orders/${order.id}`);
  }
  redirect(`/s/${slug}/orders/${order.id}/pay?mislukt=1`);
}
