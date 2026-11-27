import Link from "next/link";

import { Badge, Card, buttonStyles, EmptyState, Input, Table, cx, orderStatusTone, td, th } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { FULFILLMENT_LABEL, ORDER_STATUS_LABEL } from "@/lib/orders";
import type { Prisma } from "@prisma/client";

const filters = [
  { key: "", label: "Alle" },
  { key: "verzenden", label: "Te verzenden" },
  { key: "open", label: "Wacht op betaling" },
  { key: "verzonden", label: "Verzonden" },
  { key: "geannuleerd", label: "Geannuleerd / terugbetaald" },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string; q?: string }> }) {
  const { store } = await requireMerchant();
  const { filter = "", q = "" } = await searchParams;

  const where: Prisma.OrderWhereInput = { storeId: store.id };
  if (filter === "verzenden") Object.assign(where, { status: "paid", fulfillment: "unfulfilled" });
  if (filter === "open") where.status = "pending";
  if (filter === "verzonden") where.fulfillment = "fulfilled";
  if (filter === "geannuleerd") where.status = { in: ["cancelled", "refunded"] };
  if (q) {
    const n = Number(q.replace("#", ""));
    where.OR = [
      { email: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      ...(Number.isInteger(n) ? [{ number: n }] : []),
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { _count: { select: { items: true } } },
  });
  const dateFmt = new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeStyle: "short" });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Bestellingen</h1>
        {/* Een download, geen pagina: niet vooraf laden. */}
        <Link href="/admin/orders/export" prefetch={false} className={buttonStyles.secondary}>
          Exporteren (CSV)
        </Link>
      </div>
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-ink-100 p-3">
          {filters.map((f) => (
            <Link
              key={f.key}
              href={f.key ? `/admin/orders?filter=${f.key}` : "/admin/orders"}
              className={cx(
                "rounded-full px-3 py-1 text-sm",
                filter === f.key ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100",
              )}
            >
              {f.label}
            </Link>
          ))}
          <form className="ml-auto">
            {filter && <input type="hidden" name="filter" value={filter} />}
            <Input name="q" defaultValue={q} placeholder="Zoek op nummer, naam, e-mail" className="w-64" />
          </form>
        </div>
        {orders.length === 0 ? (
          <EmptyState title="Geen bestellingen" text={q || filter ? "Niets gevonden met dit filter." : "Zodra iemand bestelt, verschijnt het hier."} />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Bestelling</th>
                <th className={th}>Datum</th>
                <th className={th}>Klant</th>
                <th className={th}>Betaling</th>
                <th className={th}>Verzending</th>
                <th className={`${th} text-right`}>Totaal</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="hover:bg-ink-50">
                  <td className={td}>
                    <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">
                      #{o.number}
                    </Link>
                  </td>
                  <td className={`${td} whitespace-nowrap text-ink-600`}>{dateFmt.format(o.createdAt)}</td>
                  <td className={td}>
                    {o.name}
                    <span className="block text-xs text-ink-500">{o.email}</span>
                  </td>
                  <td className={td}>
                    <Badge tone={orderStatusTone(o.status)}>{ORDER_STATUS_LABEL[o.status] ?? o.status}</Badge>
                  </td>
                  <td className={td}>
                    {o.status === "paid" && (
                      <Badge tone={o.fulfillment === "fulfilled" ? "gray" : "amber"}>{FULFILLMENT_LABEL[o.fulfillment]}</Badge>
                    )}
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
