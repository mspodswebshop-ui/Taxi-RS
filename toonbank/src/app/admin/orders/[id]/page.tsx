import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, Field, Input, PageHeader, buttonStyles, orderStatusTone } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from "@/lib/orders";
import { includedTax } from "@/lib/pricing";

import { cancelOrder, fulfillOrder, markPaidManually, refundOrder, unfulfillOrder } from "../actions";

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireMerchant();
  const { id } = await params;
  const order = await db.order.findFirst({
    where: { id, storeId: store.id },
    include: { items: { include: { variant: { select: { productId: true } } } }, customer: { select: { id: true, _count: { select: { orders: true } } } } },
  });
  if (!order) notFound();

  const money = (c: number) => formatMoney(c, order.currency);
  const dateFmt = new Intl.DateTimeFormat("nl-BE", { dateStyle: "long", timeStyle: "short" });

  return (
    <div>
      <PageHeader
        title={`Bestelling #${order.number}`}
        description={dateFmt.format(order.createdAt)}
        back={{ href: "/admin/orders", label: "Bestellingen" }}
        action={
          <div className="flex gap-2">
            <Badge tone={orderStatusTone(order.status)}>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Badge>
            {order.status === "paid" && (
              <Badge tone={order.fulfillment === "fulfilled" ? "gray" : "amber"}>{FULFILLMENT_LABEL[order.fulfillment]}</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Artikelen" />
            <ul className="divide-y divide-ink-100">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start justify-between gap-4 px-5 py-3 text-sm">
                  <div>
                    {item.variant ? (
                      <Link href={`/admin/products/${item.variant.productId}`} className="font-medium hover:underline">
                        {item.productTitle}
                      </Link>
                    ) : (
                      <span className="font-medium">{item.productTitle}</span>
                    )}
                    {item.variantTitle !== "Standaard" && <span className="block text-ink-500">{item.variantTitle}</span>}
                  </div>
                  <div className="tabular text-right whitespace-nowrap">
                    {item.quantity} × {money(item.priceCents)}
                    <span className="block font-medium">{money(item.quantity * item.priceCents)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <dl className="tabular space-y-1 border-t border-ink-100 px-5 py-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-500">Subtotaal</dt><dd>{money(order.subtotalCents)}</dd></div>
              {order.discountCents > 0 && (
                <div className="flex justify-between"><dt className="text-ink-500">Korting ({order.discountCode})</dt><dd>−{money(order.discountCents)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-ink-500">Verzending</dt><dd>{order.shippingCents ? money(order.shippingCents) : "Gratis"}</dd></div>
              <div className="flex justify-between pt-1 text-base font-semibold"><dt>Totaal</dt><dd>{money(order.totalCents)}</dd></div>
              <div className="flex justify-between text-xs text-ink-500"><dt>Waarvan btw ({store.taxPercent}%)</dt><dd>{money(includedTax(order.totalCents, store.taxPercent))}</dd></div>
              {order.platformFeeCents > 0 && (
                <div className="flex justify-between text-xs text-ink-500"><dt>Platformkosten</dt><dd>{money(order.platformFeeCents)}</dd></div>
              )}
            </dl>
          </Card>

          {order.status === "paid" && (
            <Card>
              <CardHeader title="Verzending" />
              <div className="p-5">
                {order.fulfillment === "fulfilled" ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <p>
                      Verzonden.{" "}
                      {order.trackingCode && (
                        <>
                          Track & trace: <span className="font-mono">{order.trackingCode}</span>
                        </>
                      )}
                    </p>
                    <form action={unfulfillOrder.bind(null, order.id)}>
                      <button className={buttonStyles.ghost}>Toch nog niet verzonden</button>
                    </form>
                  </div>
                ) : (
                  <ActionForm action={fulfillOrder.bind(null, order.id)} className="flex flex-wrap items-end gap-3">
                    <Field label="Track & trace (optioneel)" className="min-w-60 flex-1">
                      <Input name="trackingCode" placeholder="Bijv. 3SABCD1234567" />
                    </Field>
                    <SubmitButton variant="brand">Markeer als verzonden</SubmitButton>
                  </ActionForm>
                )}
              </div>
            </Card>
          )}

          {order.status === "pending" && (
            <Card>
              <CardHeader title="Wacht op betaling" description="De klant heeft nog niet afgerekend, of de betaling is mislukt." />
              <div className="flex flex-wrap gap-2 p-5">
                <form action={markPaidManually.bind(null, order.id)}>
                  <ConfirmButton variant="secondary" message="Heb je het geld op een andere manier ontvangen, bijvoorbeeld per overschrijving? Dan zet je de bestelling op betaald en gaat de voorraad eraf.">
                    Markeer als betaald
                  </ConfirmButton>
                </form>
                <form action={cancelOrder.bind(null, order.id)}>
                  <ConfirmButton message="Bestelling annuleren?">Annuleren</ConfirmButton>
                </form>
              </div>
            </Card>
          )}

          {order.status === "paid" && (
            <Card>
              <CardHeader title="Terugbetalen" description={order.paymentProvider === "stripe" ? "Het volledige bedrag gaat via Stripe terug naar de klant." : "Testbestelling: er gaat geen echt geld terug."} />
              <ActionForm action={refundOrder.bind(null, order.id)} className="flex flex-wrap items-center gap-4 p-5">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="restock" defaultChecked /> Artikelen terug in voorraad
                </label>
                <ConfirmButton message={`${money(order.totalCents)} terugbetalen aan ${order.name}? Dit kan niet ongedaan gemaakt worden.`}>
                  Volledig terugbetalen
                </ConfirmButton>
              </ActionForm>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card className="p-5 text-sm">
            <h3 className="mb-2 font-semibold">Klant</h3>
            <p>{order.name}</p>
            <a href={`mailto:${order.email}`} className="block text-brand-700 hover:underline">{order.email}</a>
            {order.phone && <a href={`tel:${order.phone}`} className="block">{order.phone}</a>}
            {order.customer && (
              <p className="mt-2 text-ink-500">
                {order.customer._count.orders === 1 ? "Eerste bestelling" : `${order.customer._count.orders} bestellingen in totaal`}
              </p>
            )}
          </Card>
          <Card className="p-5 text-sm">
            <h3 className="mb-2 font-semibold">Verzendadres</h3>
            <address className="not-italic">
              {order.name}<br />
              {order.address}<br />
              {order.postalCode} {order.city}<br />
              {order.country}
            </address>
          </Card>
          {order.note && (
            <Card className="p-5 text-sm">
              <h3 className="mb-2 font-semibold">Opmerking van de klant</h3>
              <p className="whitespace-pre-wrap">{order.note}</p>
            </Card>
          )}
          <Card className="p-5 text-sm">
            <h3 className="mb-2 font-semibold">Betaling</h3>
            <p>{order.paymentProvider === "stripe" ? "Stripe" : "Testbetaling (geen echt geld)"}</p>
            {order.paidAt && <p className="text-ink-500">Betaald op {dateFmt.format(order.paidAt)}</p>}
          </Card>
        </div>
      </div>
    </div>
  );
}
