import Link from "next/link";

import { RevenueChart } from "@/components/revenue-chart";
import {
  ButtonLink,
  Card,
  EmptyState,
  Money,
  PageHeader,
  StatCard,
  StatusPill,
  TestModeBadge,
} from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import { businessStats } from "@/lib/payments";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await currentUser())!;
  const stats = await businessStats(user.businessId);

  return (
    <>
      <PageHeader
        title={`Dag, ${user.name.split(" ")[0]}`}
        description="Zo staat het ervoor bij je bedrijf."
        action={
          <div className="flex items-center gap-2">
            <TestModeBadge />
            <ButtonLink href="/dashboard/payment-links">Nieuwe betaallink</ButtonLink>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Totale omzet"
          value={formatMoney(stats.omzetCent)}
          sub="na aftrek van terugbetalingen"
        />
        <StatCard
          label="Succesvolle betalingen"
          value={String(stats.geslaagd)}
          tone="good"
        />
        <StatCard label="Mislukte betalingen" value={String(stats.mislukt)} tone="bad" />
        <StatCard
          label="Terugbetalingen"
          value={formatMoney(stats.terugbetaaldCent)}
          sub={`${stats.terugbetalingen} ${stats.terugbetalingen === 1 ? "betaling" : "betalingen"}`}
        />
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold">Omzet, laatste 30 dagen</h2>
        <p className="mt-0.5 text-xs text-ink-500">
          Per dag, na aftrek van terugbetalingen.
        </p>
        <div className="mt-4">
          <RevenueChart data={stats.grafiek} />
        </div>
      </Card>

      <Card className="mt-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Recente betalingen</h2>
          <Link
            href="/dashboard/payments"
            className="text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400"
          >
            Alles bekijken
          </Link>
        </div>

        {stats.recent.length === 0 ? (
          <EmptyState
            title="Nog geen betalingen"
            description="Maak een betaallink en doe een testbetaling om hier iets te zien."
            action={<ButtonLink href="/dashboard/payment-links">Betaallink maken</ButtonLink>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800">
                <tr>
                  <th className="py-2 pr-4">Klant</th>
                  <th className="py-2 pr-4">Bedrag</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Wanneer</th>
                </tr>
              </thead>
              <tbody>
                {stats.recent.map((p) => (
                  <tr key={p.id} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                    <td className="py-2.5 pr-4">
                      {p.customer?.name ?? p.customer?.email ?? (
                        <span className="text-ink-400">Onbekend</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">
                      <Money cents={p.amount} currency={p.currency} />
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
