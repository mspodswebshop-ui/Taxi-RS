import Link from "next/link";
import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { markOrderPaid } from "@/lib/orders";
import { stripe, stripeEnabled } from "@/lib/stripe";
import { getStore } from "@/lib/storefront";

export const metadata = { title: "Je bestelling", robots: { index: false } };

export default async function OrderStatusPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ session_id?: string }> }) {
  const { slug, id } = await params;
  const { session_id } = await searchParams;
  const store = await getStore(slug);
  let order = await db.order.findFirst({ where: { id, storeId: store.id }, include: { items: true } });
  if (!order) notFound();

  // Terug van Stripe: niet wachten op de webhook als de betaling al rond is.
  if (order.status === "pending" && order.paymentProvider === "stripe" && stripeEnabled() && session_id && session_id === order.stripeSessionId) {
    try {
      const session = await stripe().checkout.sessions.retrieve(session_id);
      if (session.payment_status === "paid") {
        await markOrderPaid(order.id, { stripePaymentIntent: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id });
        order = await db.order.findUniqueOrThrow({ where: { id: order.id }, include: { items: true } });
      }
    } catch (err) {
      console.error("Stripe-sessie ophalen mislukt", err);
    }
  }

  const money = (c: number) => formatMoney(c, order.currency);
  const paid = order.status === "paid" || order.status === "refunded";

  return (
    <div className="mx-auto max-w-2xl px-4 pt-14 sm:px-6">
      <div className="text-center">
        {paid ? (
          <>
            <div className="bg-accent text-on-accent mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full text-2xl">✓</div>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">Bedankt, {order.name.split(" ")[0]}!</h1>
            <p className="mt-2 text-ink-600">
              Je bestelling <strong>#{order.number}</strong> is betaald.{" "}
              {order.fulfillment === "fulfilled" ? "Ze is onderweg." : `${store.name} gaat ze zo snel mogelijk versturen.`}
            </p>
            {order.trackingCode && <p className="mt-2 text-sm">Track & trace: <span className="font-mono">{order.trackingCode}</span></p>}
          </>
        ) : order.status === "cancelled" ? (
          <h1 className="font-serif text-3xl font-semibold tracking-tight">Deze bestelling is geannuleerd</h1>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">We wachten nog op je betaling</h1>
            <p className="mt-2 text-ink-600">Bestelling #{order.number}. Ververs deze pagina over een paar seconden.</p>
          </>
        )}
      </div>

      <div className="mt-10 rounded-2xl bg-ink-50 p-6">
        <ul className="space-y-2 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-4">
              <span>
                {i.quantity} × {i.productTitle}
                {i.variantTitle !== "Standaard" && <span className="text-ink-500"> ({i.variantTitle})</span>}
              </span>
              <span className="tabular">{money(i.priceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="tabular mt-4 space-y-1 border-t border-ink-200 pt-4 text-sm">
          {order.discountCents > 0 && <div className="flex justify-between"><dt>Korting</dt><dd>−{money(order.discountCents)}</dd></div>}
          <div className="flex justify-between"><dt>Verzending</dt><dd>{order.shippingCents ? money(order.shippingCents) : "Gratis"}</dd></div>
          <div className="flex justify-between text-base font-semibold"><dt>Totaal</dt><dd>{money(order.totalCents)}</dd></div>
        </dl>
        <div className="mt-6 border-t border-ink-200 pt-4 text-sm text-ink-600">
          <p className="font-medium text-ink-900">Verzenden naar</p>
          <p>{order.name}, {order.address}, {order.postalCode} {order.city}, {order.country}</p>
        </div>
      </div>
      <p className="mt-6 text-center text-sm text-ink-600">
        Vragen? Mail naar <a href={`mailto:${store.email}`} className="underline">{store.email}</a> en vermeld #{order.number}.
      </p>
      <div className="mt-8 text-center">
        <Link href={`/s/${slug}`} className="text-sm font-medium hover:underline">Verder winkelen →</Link>
      </div>
    </div>
  );
}
