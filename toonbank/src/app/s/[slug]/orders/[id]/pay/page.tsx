import { notFound, redirect } from "next/navigation";

import { formatMoney } from "@/lib/money";
import { db } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe";
import { getStore } from "@/lib/storefront";

import { testPay } from "../../../actions";

export const metadata = { title: "Testbetaling", robots: { index: false } };

/** Nagebootste betaalpagina, alleen als het platform geen Stripe-sleutel heeft. */
export default async function TestPayPage({ params, searchParams }: { params: Promise<{ slug: string; id: string }>; searchParams: Promise<{ mislukt?: string }> }) {
  const { slug, id } = await params;
  const { mislukt } = await searchParams;
  const store = await getStore(slug);
  const order = await db.order.findFirst({ where: { id, storeId: store.id } });
  if (!order || order.paymentProvider !== "test" || stripeEnabled()) notFound();
  if (order.status !== "pending") redirect(`/s/${slug}/orders/${order.id}`);

  return (
    <div className="mx-auto max-w-md px-4 pt-16">
      <div className="rounded-2xl border border-ink-200 p-8 text-center shadow-sm">
        <p className="mb-2 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">Testbetaling</p>
        <h1 className="mt-2 text-xl font-semibold">Bestelling #{order.number}</h1>
        <p className="tabular mt-1 text-3xl font-semibold">{formatMoney(order.totalCents, order.currency)}</p>
        <p className="mt-4 text-sm text-ink-600">
          Hier zou de klant normaal met Bancontact of kaart betalen. Er wordt niets afgeschreven.
        </p>
        {mislukt && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">De betaling is mislukt. Probeer het opnieuw.</p>}
        <div className="mt-6 space-y-2">
          <form action={testPay.bind(null, slug, order.id, "success")}>
            <button className="w-full rounded-full bg-brand-600 px-6 py-3 font-medium text-white hover:bg-brand-700">Betaling gelukt</button>
          </form>
          <form action={testPay.bind(null, slug, order.id, "fail")}>
            <button className="w-full rounded-full border border-ink-200 px-6 py-3 font-medium hover:bg-ink-50">Betaling mislukt</button>
          </form>
        </div>
      </div>
    </div>
  );
}
