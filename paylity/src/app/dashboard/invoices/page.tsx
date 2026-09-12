import type { Metadata } from "next";

import { Filters } from "@/components/filters";
import { Card, EmptyState, Money, PageHeader, StatusPill, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Facturen" };
export const dynamic = "force-dynamic";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = (await currentUser())!;
  const q = await searchParams;

  const invoices = await db.invoice.findMany({
    where: {
      businessId: user.businessId,
      ...(q.search ? { number: { contains: q.search, mode: "insensitive" } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true },
  });

  return (
    <>
      <PageHeader
        title="Facturen"
        description="Facturen aan je klanten, met hun status."
        action={<TestModeBadge />}
      />

      <Filters placeholder="Zoek op factuurnummer…" />

      <Card>
        {invoices.length === 0 ? (
          <EmptyState
            title="Nog geen facturen"
            description="Maak er een aan via POST /api/v1/invoices. In de documentatie staat hoe."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800">
                <tr>
                  <th className="py-2 pr-4">Nummer</th>
                  <th className="py-2 pr-4">Klant</th>
                  <th className="py-2 pr-4">Bedrag</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Vervalt</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((f) => (
                  <tr key={f.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                    <td className="py-2.5 pr-4 font-mono text-xs">{f.number}</td>
                    <td className="py-2.5 pr-4">{f.customer.name}</td>
                    <td className="py-2.5 pr-4 font-semibold">
                      <Money cents={f.amount} currency={f.currency} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill status={f.status} />
                    </td>
                    <td className="py-2.5 text-ink-500">
                      {f.dueAt
                        ? f.dueAt.toLocaleDateString("nl-BE", { day: "numeric", month: "short" })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
