import type { Metadata } from "next";

import { Filters } from "@/components/filters";
import {
  ButtonLink,
  Card,
  EmptyState,
  MethodLabel,
  Money,
  PageHeader,
  StatusPill,
  TestModeBadge,
} from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Betalingen" };
export const dynamic = "force-dynamic";

type Zoek = { search?: string; status?: string };

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Zoek>;
}) {
  const user = (await currentUser())!;
  const q = await searchParams;

  const geldigeStatussen = ["pending", "paid", "failed", "refunded", "cancelled"];
  const status = geldigeStatussen.includes(q.status ?? "") ? q.status : undefined;

  const payments = await db.payment.findMany({
    where: {
      businessId: user.businessId,
      ...(status ? { status: status as never } : {}),
      ...(q.search
        ? {
            OR: [
              { id: { contains: q.search } },
              { description: { contains: q.search, mode: "insensitive" } },
              { customer: { email: { contains: q.search, mode: "insensitive" } } },
              { customer: { name: { contains: q.search, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { customer: true },
  });

  return (
    <>
      <PageHeader
        title="Betalingen"
        description="Alles wat er binnenkwam, met status en methode."
        action={<TestModeBadge />}
      />

      <Filters
        placeholder="Zoek op klant, omschrijving of id…"
        statuses={[
          { waarde: "paid", label: "Betaald" },
          { waarde: "pending", label: "In afwachting" },
          { waarde: "failed", label: "Mislukt" },
          { waarde: "refunded", label: "Terugbetaald" },
          { waarde: "cancelled", label: "Geannuleerd" },
        ]}
      />

      <Card>
        {payments.length === 0 ? (
          <EmptyState
            title="Geen betalingen gevonden"
            description="Pas je zoekopdracht aan, of doe een testbetaling via een betaallink."
            action={<ButtonLink href="/dashboard/payment-links">Naar betaallinks</ButtonLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800">
                <tr>
                  <th className="py-2 pr-4">Betaling</th>
                  <th className="py-2 pr-4">Klant</th>
                  <th className="py-2 pr-4">Bedrag</th>
                  <th className="py-2 pr-4">Methode</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Datum</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                    <td className="py-2.5 pr-4 font-mono text-xs text-ink-500">
                      {p.id.slice(0, 14)}…
                    </td>
                    <td className="py-2.5 pr-4">
                      {p.customer?.name ?? p.customer?.email ?? (
                        <span className="text-ink-400">Onbekend</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">
                      <Money cents={p.amount} currency={p.currency} />
                      {p.refundedAmount > 0 ? (
                        <span className="ml-1.5 text-xs font-normal text-ink-500">
                          (−<Money cents={p.refundedAmount} currency={p.currency} />)
                        </span>
                      ) : null}
                    </td>
                    <td className="py-2.5 pr-4">
                      <MethodLabel method={p.method} />
                    </td>
                    <td className="py-2.5 pr-4">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="py-2.5 text-ink-500">
                      {p.createdAt.toLocaleString("nl-BE", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
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
