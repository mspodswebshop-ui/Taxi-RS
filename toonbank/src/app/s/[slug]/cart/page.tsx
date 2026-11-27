import type { Metadata } from "next";
import Link from "next/link";

import { readCart, resolveCart } from "@/lib/cart";
import { imageUrl } from "@/lib/images";
import { formatMoney } from "@/lib/money";
import { computeTotals } from "@/lib/pricing";
import { getStore } from "@/lib/storefront";

import { removeCartLine, updateCartLine } from "../actions";

export const metadata: Metadata = { title: "Winkelwagen" };

export default async function CartPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ toegevoegd?: string }> }) {
  const { slug } = await params;
  const { toegevoegd } = await searchParams;
  const store = await getStore(slug);
  const lines = await resolveCart(store.id, await readCart(store.id));
  const totals = computeTotals(lines, store, null);
  const money = (c: number) => formatMoney(c, store.currency);
  const missingForFree =
    store.freeShippingCents != null && totals.subtotalCents < store.freeShippingCents ? store.freeShippingCents - totals.subtotalCents : 0;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <h1 className="mb-8 font-serif text-3xl font-semibold tracking-tight">Winkelwagen</h1>
      {toegevoegd && lines.length > 0 && (
        <p role="status" className="mb-6 rounded-lg bg-ink-50 px-4 py-3 text-sm">✓ Toegevoegd aan je winkelwagen.</p>
      )}
      {lines.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-ink-600">Je winkelwagen is leeg.</p>
          <Link href={`/s/${slug}/products`} className="bg-accent text-on-accent mt-6 inline-block rounded-full px-6 py-3 text-sm font-medium">
            Verder winkelen
          </Link>
        </div>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[1fr_340px]">
          <ul className="divide-y divide-ink-100 border-y border-ink-100">
            {lines.map((l) => {
              const img = imageUrl(l.imageId);
              return (
                <li key={l.variantId} className="flex gap-4 py-5">
                  <Link href={`/s/${slug}/products/${l.productHandle}`} className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-4">
                      <div>
                        <Link href={`/s/${slug}/products/${l.productHandle}`} className="font-medium hover:underline">{l.productTitle}</Link>
                        {l.variantTitle !== "Standaard" && <p className="text-sm text-ink-500">{l.variantTitle}</p>}
                        <p className="tabular text-sm text-ink-600">{money(l.priceCents)}</p>
                      </div>
                      <p className="tabular font-medium">{money(l.priceCents * l.quantity)}</p>
                    </div>
                    <div className="mt-auto flex items-center gap-4 pt-3">
                      <form action={updateCartLine.bind(null, slug, l.variantId)} className="flex items-center gap-2">
                        <select
                          name="quantity"
                          defaultValue={l.quantity}
                          aria-label="Aantal"
                          className="rounded-lg border border-ink-200 px-2 py-1 text-sm"
                        >
                          {Array.from({ length: Math.min(l.available ?? 20, 20) }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                        <button className="text-sm text-ink-600 underline">Wijzig</button>
                      </form>
                      <form action={removeCartLine.bind(null, slug, l.variantId)}>
                        <button className="text-sm text-ink-500 hover:text-red-700">Verwijderen</button>
                      </form>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <aside className="h-fit rounded-2xl bg-ink-50 p-6">
            <dl className="tabular space-y-2 text-sm">
              <div className="flex justify-between"><dt>Subtotaal</dt><dd>{money(totals.subtotalCents)}</dd></div>
              <div className="flex justify-between"><dt>Verzending</dt><dd>{totals.shippingCents ? money(totals.shippingCents) : "Gratis"}</dd></div>
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-semibold"><dt>Totaal</dt><dd>{money(totals.totalCents)}</dd></div>
            </dl>
            {missingForFree > 0 && (
              <p className="mt-4 text-sm text-ink-600">Nog {money(missingForFree)} tot gratis verzending.</p>
            )}
            <Link href={`/s/${slug}/checkout`} className="bg-accent text-on-accent mt-6 block rounded-full px-6 py-3 text-center font-medium hover:opacity-90">
              Afrekenen
            </Link>
            <p className="mt-3 text-center text-xs text-ink-500">Een kortingscode vul je in bij het afrekenen.</p>
          </aside>
        </div>
      )}
    </div>
  );
}
