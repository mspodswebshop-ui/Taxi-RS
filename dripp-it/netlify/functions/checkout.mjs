// Netlify-functie voor POST /api/checkout.
//
// De afrekenpagina stuurt alleen wat er in de tas zit: product-id, maat en aantal.
// Deze functie zoekt de prijzen zelf op in assets/catalog.js, telt de verzendkosten
// erbij en maakt bij Stripe een betaling (PaymentIntent) klaar. Zo kan niemand
// met de prijzen in zijn browser knoeien.
//
// Nodig in Netlify (Site configuration → Environment variables):
//   STRIPE_SECRET_KEY       sk_test_... (later sk_live_...)
//   STRIPE_PUBLISHABLE_KEY  pk_test_... (later pk_live_...)
import "../../assets/catalog.js";

const { SHOP, PRODUCTS } = globalThis.DRIPP_CATALOG;
const MAX_LINES = 20;

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const cents = (euro) => Math.round(euro * 100);
const euro = (c) => `€${(c / 100).toFixed(2).replace(".", ",")}`;

/* Controleert de tas en rekent alles uit in centen. Gooit een Error met een
   Nederlandse uitleg als er iets niet klopt. */
export function priceCart(items) {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Je tas is leeg.");
  if (items.length > MAX_LINES) throw new Error(`Maximaal ${MAX_LINES} verschillende producten per bestelling.`);

  const lines = items.map((item) => {
    const p = PRODUCTS.find((x) => x.id === item?.id);
    if (!p) throw new Error("Een product in je tas bestaat niet meer. Haal het uit je tas en probeer opnieuw.");
    const qty = Number(item.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > SHOP.maxQty) {
      throw new Error(`Je kunt van ${p.name} tussen 1 en ${SHOP.maxQty} stuks bestellen.`);
    }
    const size = String(item.size ?? "");
    if (p.sizes?.length) {
      if (!p.sizes.includes(size)) throw new Error(`Kies een geldige maat voor ${p.name}.`);
      if (p.soldOut?.includes(size)) throw new Error(`${p.name} in maat ${size} is uitverkocht.`);
    } else if (size) {
      throw new Error(`${p.name} heeft geen maten.`);
    }
    return { id: p.id, name: p.name, size, qty, unit: cents(p.price), total: cents(p.price) * qty };
  });

  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const shipping = subtotal >= cents(SHOP.freeShipFrom) ? 0 : cents(SHOP.shipping);
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

const orderNumber = () =>
  `DI-${Date.now().toString(36).toUpperCase()}${Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, "0")}`;

export default async (req) => {
  if (req.method !== "POST") return json(405, { error: "Gebruik POST." });

  const secret = process.env.STRIPE_SECRET_KEY;
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  if (!secret || !publishableKey) return json(503, { error: "not_configured" });

  let cart;
  try {
    const body = await req.json();
    cart = priceCart(body?.items);
  } catch (err) {
    return json(400, { error: err instanceof Error ? err.message : "Ongeldige bestelling." });
  }

  const order = orderNumber();
  const form = new URLSearchParams({
    amount: String(cart.total),
    currency: SHOP.currency,
    "automatic_payment_methods[enabled]": "true",
    description: `Dripp It bestelling ${order}`,
    "metadata[order]": order,
    "metadata[subtotal]": euro(cart.subtotal),
    "metadata[shipping]": euro(cart.shipping),
  });
  cart.lines.forEach((l, i) => {
    form.append(`metadata[line_${String(i + 1).padStart(2, "0")}]`,
      `${l.qty}× ${l.name}${l.size ? ` (${l.size})` : ""} · ${euro(l.total)} · ${l.id}`);
  });

  const res = await fetch("https://api.stripe.com/v1/payment_intents", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Idempotency-Key": order,
    },
    body: form,
  });
  const intent = await res.json();
  if (!res.ok) {
    console.error("Stripe-fout", intent?.error?.message);
    return json(502, { error: "De betaling kon niet worden klaargezet. Probeer het over een paar minuten opnieuw." });
  }

  return json(200, {
    order,
    clientSecret: intent.client_secret,
    publishableKey,
    amount: cart.total,
    subtotal: cart.subtotal,
    shipping: cart.shipping,
  });
};

export const config = { path: "/api/checkout" };
