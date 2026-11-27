import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Field, Input, Select, Textarea } from "@/components/ui";
import { readCart } from "@/lib/cart";
import { quote, readDiscountCode } from "@/lib/checkout";
import { imageUrl } from "@/lib/images";
import { formatMoney } from "@/lib/money";
import { includedTax } from "@/lib/pricing";
import { stripeEnabled } from "@/lib/stripe";
import { getStore } from "@/lib/storefront";

import { applyDiscount, placeOrder, removeDiscount } from "../actions";

export const metadata: Metadata = { title: "Afrekenen", robots: { index: false } };

export default async function CheckoutPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);
  const code = await readDiscountCode(store.id);
  const q = await quote(store, await readCart(store.id), code);
  if (q.lines.length === 0) redirect(`/s/${slug}/cart`);

  const money = (c: number) => formatMoney(c, store.currency);
  const cannotPay = stripeEnabled() && !store.stripeChargesEnabled;

  return (
    <div className="mx-auto max-w-5xl px-4 pt-10 sm:px-6">
      <h1 className="mb-8 font-serif text-3xl font-semibold tracking-tight">Afrekenen</h1>
      <div className="grid gap-10 lg:grid-cols-[1fr_360px]">
        <ActionForm action={placeOrder.bind(null, slug)} className="space-y-8">
          <section className="space-y-4">
            <h2 className="font-medium">Contact</h2>
            <Field label="E-mailadres" hint="Hier sturen we de bevestiging naartoe.">
              <Input name="email" type="email" autoComplete="email" required />
            </Field>
            <Field label="Telefoon (optioneel)" hint="Handig voor de koerier.">
              <Input name="phone" type="tel" autoComplete="tel" />
            </Field>
          </section>
          <section className="space-y-4">
            <h2 className="font-medium">Verzendadres</h2>
            <Field label="Volledige naam">
              <Input name="name" autoComplete="name" required />
            </Field>
            <Field label="Straat en huisnummer">
              <Input name="address" autoComplete="street-address" required />
            </Field>
            <div className="grid grid-cols-[120px_1fr] gap-3">
              <Field label="Postcode">
                <Input name="postalCode" autoComplete="postal-code" required />
              </Field>
              <Field label="Plaats">
                <Input name="city" autoComplete="address-level2" required />
              </Field>
            </div>
            <Field label="Land">
              <Select name="country" defaultValue="BE" autoComplete="country">
                <option value="BE">België</option>
                <option value="NL">Nederland</option>
                <option value="LU">Luxemburg</option>
                <option value="FR">Frankrijk</option>
                <option value="DE">Duitsland</option>
              </Select>
            </Field>
            <Field label="Opmerking bij je bestelling (optioneel)">
              <Textarea name="note" rows={2} />
            </Field>
          </section>
          {cannotPay ? (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Deze winkel kan nog geen betalingen ontvangen. Probeer het later opnieuw.
            </p>
          ) : (
            <SubmitButton className="bg-accent text-on-accent w-full rounded-full! py-3.5! text-base! hover:opacity-90" pendingText="Even geduld…">
              {stripeEnabled() ? `Betalen: ${money(q.totals.totalCents)}` : `Bestellen (test): ${money(q.totals.totalCents)}`}
            </SubmitButton>
          )}
          <p className="text-center text-xs text-ink-500">
            {stripeEnabled()
              ? "Je betaalt veilig op de betaalpagina van Stripe, met Bancontact, kaart of een andere methode."
              : "Testwinkel: je kunt de betaling op de volgende pagina nabootsen."}
          </p>
        </ActionForm>

        <aside className="h-fit space-y-5 rounded-2xl bg-ink-50 p-6 lg:sticky lg:top-24">
          <ul className="space-y-4">
            {q.lines.map((l) => {
              const img = imageUrl(l.imageId);
              return (
                <li key={l.variantId} className="flex items-center gap-3 text-sm">
                  <div className="relative h-14 w-12 shrink-0 overflow-hidden rounded-md bg-ink-200">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-700 px-1 text-[11px] text-white">
                      {l.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{l.productTitle}</p>
                    {l.variantTitle !== "Standaard" && <p className="text-ink-500">{l.variantTitle}</p>}
                  </div>
                  <p className="tabular">{money(l.priceCents * l.quantity)}</p>
                </li>
              );
            })}
          </ul>

          {q.discount ? (
            <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
              <span>
                Code <span className="font-mono font-medium">{q.discount.code}</span>
              </span>
              <form action={removeDiscount.bind(null, slug)}>
                <button className="text-ink-500 hover:text-red-700">Weghalen</button>
              </form>
            </div>
          ) : (
            <ActionForm action={applyDiscount.bind(null, slug)} className="text-sm">
              <div className="flex gap-2">
                <Input name="code" placeholder="Kortingscode" aria-label="Kortingscode" className="font-mono uppercase" />
                <SubmitButton variant="secondary">Toepassen</SubmitButton>
              </div>
            </ActionForm>
          )}

          <dl className="tabular space-y-2 border-t border-ink-200 pt-4 text-sm">
            <div className="flex justify-between"><dt>Subtotaal</dt><dd>{money(q.totals.subtotalCents)}</dd></div>
            {q.totals.discountCents > 0 && (
              <div className="flex justify-between text-brand-700"><dt>Korting</dt><dd>−{money(q.totals.discountCents)}</dd></div>
            )}
            <div className="flex justify-between"><dt>Verzending</dt><dd>{q.totals.shippingCents ? money(q.totals.shippingCents) : "Gratis"}</dd></div>
            <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-semibold"><dt>Totaal</dt><dd>{money(q.totals.totalCents)}</dd></div>
            <div className="flex justify-between text-xs text-ink-500"><dt>Inclusief btw</dt><dd>{money(includedTax(q.totals.totalCents, store.taxPercent))}</dd></div>
          </dl>
          <Link href={`/s/${slug}/cart`} className="block text-center text-sm text-ink-600 hover:underline">
            ← Terug naar winkelwagen
          </Link>
        </aside>
      </div>
    </div>
  );
}
