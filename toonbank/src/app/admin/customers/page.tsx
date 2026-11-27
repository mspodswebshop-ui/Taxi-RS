import Link from "next/link";

import { Card, EmptyState, Input, Table, td, th } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { store } = await requireMerchant();
  const { q = "" } = await searchParams;

  const customers = await db.customer.findMany({
    where: {
      storeId: store.id,
      ...(q ? { OR: [{ email: { contains: q, mode: "insensitive" } }, { name: { contains: q, mode: "insensitive" } }] } : {}),
    },
    take: 300,
    include: { orders: { where: { status: "paid" }, select: { totalCents: true, createdAt: true } } },
  });

  const rows = customers
    .map((c) => ({
      ...c,
      spent: c.orders.reduce((s, o) => s + o.totalCents, 0),
      last: c.orders.reduce<Date | null>((d, o) => (!d || o.createdAt > d ? o.createdAt : d), null),
    }))
    .sort((a, b) => b.spent - a.spent);
  const dateFmt = new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium" });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Klanten</h1>
      <p className="mb-6 text-ink-500">Je beste klanten staan bovenaan.</p>
      <Card>
        <form className="border-b border-ink-100 p-3">
          <Input name="q" defaultValue={q} placeholder="Zoek op naam of e-mail" className="max-w-sm" />
        </form>
        {rows.length === 0 ? (
          <EmptyState title="Nog geen klanten" text="Iedereen die bestelt, komt hier vanzelf te staan." />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Klant</th>
                <th className={th}>Bestellingen</th>
                <th className={th}>Laatste</th>
                <th className={`${th} text-right`}>Besteed</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <tr key={c.id} className="hover:bg-ink-50">
                  <td className={td}>
                    <Link href={`/admin/orders?q=${encodeURIComponent(c.email)}`} className="font-medium hover:underline">
                      {c.name}
                    </Link>
                    <span className="block text-xs text-ink-500">{c.email}</span>
                  </td>
                  <td className={`${td} tabular`}>{c.orders.length}</td>
                  <td className={`${td} text-ink-600`}>{c.last ? dateFmt.format(c.last) : "—"}</td>
                  <td className={`${td} tabular text-right font-medium`}>{formatMoney(c.spent, store.currency)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
