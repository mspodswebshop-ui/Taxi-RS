import type { Metadata } from "next";

import { Filters } from "@/components/filters";
import { Card, EmptyState, Money, PageHeader, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Klanten" };
export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const user = (await currentUser())!;
  const q = await searchParams;

  const customers = await db.customer.findMany({
    where: {
      businessId: user.businessId,
      ...(q.search
        ? {
            OR: [
              { name: { contains: q.search, mode: "insensitive" } },
              { email: { contains: q.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      payments: { where: { status: { in: ["paid", "refunded"] } }, select: { amount: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Klanten"
        description="Iedereen die bij je betaalde, met hun totaal."
        action={<TestModeBadge />}
      />

      <Filters placeholder="Zoek op naam of e-mailadres…" />

      <Card>
        {customers.length === 0 ? (
          <EmptyState
            title="Nog geen klanten"
            description="Een klant verschijnt hier zodra iemand een betaling doet met een e-mailadres."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800">
                <tr>
                  <th className="py-2 pr-4">Naam</th>
                  <th className="py-2 pr-4">E-mailadres</th>
                  <th className="py-2 pr-4">Betalingen</th>
                  <th className="py-2 pr-4">Totaal</th>
                  <th className="py-2">Sinds</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => {
                  const totaal = c.payments.reduce((som, p) => som + p.amount, 0);
                  return (
                    <tr key={c.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                      <td className="py-2.5 pr-4 font-semibold">{c.name}</td>
                      <td className="py-2.5 pr-4 text-ink-600 dark:text-ink-400">{c.email}</td>
                      <td className="tabular py-2.5 pr-4">{c.payments.length}</td>
                      <td className="py-2.5 pr-4 font-semibold">
                        <Money cents={totaal} />
                      </td>
                      <td className="py-2.5 text-ink-500">
                        {c.createdAt.toLocaleDateString("nl-BE", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
