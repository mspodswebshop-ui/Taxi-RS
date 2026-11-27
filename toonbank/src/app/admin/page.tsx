import Link from "next/link";

import { RevenueChart } from "@/components/revenue-chart";
import { Badge, ButtonLink, Card, CardHeader, EmptyState, Table, td, th, orderStatusTone } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ORDER_STATUS_LABEL } from "@/lib/orders";
import { baseUrl, stripeEnabled } from "@/lib/stripe";

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ welkom?: string }> }) {
  const { store, user } = await requireMerchant();
  const { welkom } = await searchParams;

  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 29);

  const [paid, recent, productCount, customerCount] = await Promise.all([
    db.order.findMany({
      where: { storeId: store.id, status: "paid", paidAt: { gte: since } },
      select: { totalCents: true, paidAt: true },
    }),
    db.order.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.product.count({ where: { storeId: store.id } }),
    db.customer.count({ where: { storeId: store.id } }),
  ]);

  const days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date(since);
    date.setDate(since.getDate() + i);
    return { date, cents: 0 };
  });
  for (const o of paid) {
    if (!o.paidAt) continue;
    const idx = Math.floor((o.paidAt.getTime() - since.getTime()) / 86_400_000);
    if (days[idx]) days[idx].cents += o.totalCents;
  }
  const revenue = paid.reduce((s, o) => s + o.totalCents, 0);
  const average = paid.length ? Math.round(revenue / paid.length) : 0;

  const paymentsReady = !stripeEnabled() || store.stripeChargesEnabled;
  const steps = [
    { done: productCount > 0, label: "Voeg je eerste product toe", href: "/admin/products/new" },
    { done: Boolean(store.logoImageId || store.heroImageId), label: "Zet je logo en een hoofdfoto in je winkel", href: "/admin/settings" },
    { done: paymentsReady, label: "Koppel je rekening om betalingen te ontvangen", href: "/admin/payments" },
    { done: paid.length > 0, label: "Deel je winkel en maak je eerste verkoop", href: `/s/${store.slug}` },
  ];
  const stepsLeft = steps.filter((s) => !s.done).length;
  const storeUrl = `${baseUrl()}/s/${store.slug}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {welkom ? `Welkom, ${user.name.split(" ")[0]}!` : `Goeiedag, ${user.name.split(" ")[0]}`}
        </h1>
        <p className="mt-1 text-ink-500">
          Je winkel staat op{" "}
          <a href={`/s/${store.slug}`} target="_blank" className="font-medium text-brand-700 hover:underline">
            {storeUrl.replace(/^https?:\/\//, "")}
          </a>
        </p>
      </div>

      {stepsLeft > 0 && (
        <Card>
          <CardHeader title="Aan de slag" description={`Nog ${stepsLeft} ${stepsLeft === 1 ? "stap" : "stappen"} tot je eerste verkoop.`} />
          <ul className="divide-y divide-ink-100">
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 px-5 py-3 hover:bg-ink-50">
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-xs ${
                      s.done ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300"
                    }`}
                  >
                    {s.done ? "✓" : ""}
                  </span>
                  <span className={s.done ? "text-ink-400 line-through" : "font-medium"}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Omzet, 30 dagen", value: formatMoney(revenue, store.currency) },
          { label: "Betaalde bestellingen", value: String(paid.length) },
          { label: "Gemiddelde bestelling", value: formatMoney(average, store.currency) },
          { label: "Klanten", value: String(customerCount) },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="text-sm text-ink-500">{k.label}</p>
            <p className="tabular mt-1 text-2xl font-semibold">{k.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Omzet per dag</h2>
        <RevenueChart days={days} currency={store.currency} />
      </Card>

      <Card>
        <CardHeader title="Laatste bestellingen" action={<ButtonLink href="/admin/orders" variant="secondary">Alles bekijken</ButtonLink>} />
        {recent.length === 0 ? (
          <EmptyState title="Nog geen bestellingen" text="Zodra iemand iets koopt in je winkel, zie je het hier." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Bestelling</th>
                <th className={th}>Klant</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50">
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      #{o.number}
                    </Link>
                  </td>
                  <td className={td}>{o.name}</td>
                  <td className={td}>
                    <Badge tone={orderStatusTone(o.status)}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                  </td>
                  <td className={`${td} tabular text-right`}>{formatMoney(o.totalCents, o.currency)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
