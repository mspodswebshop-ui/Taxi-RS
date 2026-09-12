import type { Metadata } from "next";

import { RevenueChart } from "@/components/revenue-chart";
import { Card, PageHeader, StatCard, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { businessStats } from "@/lib/payments";

export const metadata: Metadata = { title: "Analyse" };
export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const user = (await currentUser())!;
  const stats = await businessStats(user.businessId);

  const [perMethode, alle] = await Promise.all([
    db.payment.groupBy({
      by: ["method"],
      where: { businessId: user.businessId, status: { in: ["paid", "refunded"] } },
      _count: true,
      _sum: { amount: true },
    }),
    db.payment.count({ where: { businessId: user.businessId } }),
  ]);

  const slagingspercentage =
    alle > 0 ? Math.round((stats.geslaagd / alle) * 100) : 0;
  const gemiddelde = stats.geslaagd > 0 ? Math.round(stats.omzetCent / stats.geslaagd) : 0;
  const totaalPerMethode = perMethode.reduce((som, m) => som + m._count, 0);

  return (
    <>
      <PageHeader
        title="Analyse"
        description="Hoe je betalingen zich verhouden."
        action={<TestModeBadge />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Netto omzet" value={formatMoney(stats.omzetCent)} />
        <StatCard
          label="Slagingspercentage"
          value={`${slagingspercentage}%`}
          sub={`${stats.geslaagd} van ${alle}`}
          tone={slagingspercentage >= 80 ? "good" : slagingspercentage >= 50 ? "default" : "bad"}
        />
        <StatCard label="Gemiddeld bedrag" value={formatMoney(gemiddelde)} />
        <StatCard label="Mislukt" value={String(stats.mislukt)} tone="bad" />
      </div>

      <Card className="mt-4">
        <h2 className="font-semibold">Omzet per dag</h2>
        <p className="mt-0.5 text-xs text-ink-500">Laatste 30 dagen, na terugbetalingen.</p>
        <div className="mt-4">
          <RevenueChart data={stats.grafiek} />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="mb-1 font-semibold">Per betaalmethode</h2>
        <p className="mb-4 text-xs text-ink-500">
          Aandeel in het aantal geslaagde betalingen.
        </p>

        {perMethode.length === 0 ? (
          <p className="text-sm text-ink-500">Nog geen geslaagde betalingen.</p>
        ) : (
          <ul className="space-y-3">
            {perMethode.map((m) => {
              const aandeel =
                totaalPerMethode > 0 ? Math.round((m._count / totaalPerMethode) * 100) : 0;
              const naam = m.method === "bancontact" ? "Bancontact" : m.method === "card" ? "Kaart" : "Onbekend";

              return (
                <li key={m.method ?? "onbekend"}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium">{naam}</span>
                    <span className="tabular text-ink-500">
                      {m._count}× · {formatMoney(m._sum.amount ?? 0)} · {aandeel}%
                    </span>
                  </div>
                  {/* Een enkele maatstaf tegen een geheel: een balk, geen taart. */}
                  <div className="h-2 overflow-hidden rounded-full bg-ink-200 dark:bg-ink-800">
                    <div
                      className="h-full rounded-full bg-brand-500"
                      style={{ width: `${aandeel}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
