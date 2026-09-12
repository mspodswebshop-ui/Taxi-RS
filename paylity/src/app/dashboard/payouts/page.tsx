import type { Metadata } from "next";

import { Card, Money, PageHeader, StatCard, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const metadata: Metadata = { title: "Uitbetalingen" };
export const dynamic = "force-dynamic";

/**
 * Uitbetalingen.
 *
 * Een echte uitbetaling is geld dat van de betaalprovider naar je bankrekening
 * gaat. Die stap bestaat in deze versie niet: de gesimuleerde provider
 * verwerkt geen geld, dus er valt niets uit te betalen.
 *
 * Wat hier staat is daarom een berekening, geen werkelijke overboeking: het
 * bedrag dat bij een echte provider klaar zou staan. Dat verschil wordt
 * expliciet benoemd, want een scherm dat uitbetalingen suggereert die niet
 * bestaan is misleidend.
 */
export default async function PayoutsPage() {
  const user = (await currentUser())!;

  const betalingen = await db.payment.findMany({
    where: { businessId: user.businessId, status: { in: ["paid", "refunded"] } },
    select: { amount: true, refundedAmount: true, paidAt: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const netto = betalingen.reduce((som, p) => som + p.amount - p.refundedAmount, 0);

  // Per week groeperen, zoals een provider meestal uitbetaalt.
  const perWeek = new Map<string, number>();
  for (const p of betalingen) {
    const d = new Date(p.paidAt ?? p.createdAt);
    const maandag = new Date(d);
    maandag.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    maandag.setHours(0, 0, 0, 0);
    const sleutel = maandag.toISOString().slice(0, 10);
    perWeek.set(sleutel, (perWeek.get(sleutel) ?? 0) + p.amount - p.refundedAmount);
  }

  const weken = [...perWeek.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 12);

  return (
    <>
      <PageHeader
        title="Uitbetalingen"
        description="Wat er bij een echte betaalprovider naar je rekening zou gaan."
        action={<TestModeBadge />}
      />

      <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-400/10 p-4 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
        <strong className="font-semibold text-amber-800 dark:text-amber-200">
          Er worden geen uitbetalingen gedaan.
        </strong>{" "}
        De gesimuleerde provider verwerkt geen geld, dus er staat ook niets klaar
        op een rekening. De bedragen hieronder zijn een berekening op basis van je
        testbetalingen — ze laten zien hoe dit scherm eruitziet zodra je een
        erkende betaalprovider koppelt.
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Netto ontvangen" value={formatMoney(netto)} sub="alle testbetalingen" />
        <StatCard label="Betalingen" value={String(betalingen.length)} />
        <StatCard
          label="Volgende uitbetaling"
          value="—"
          sub="pas van toepassing met een echte provider"
        />
      </div>

      <Card className="mt-4">
        <h2 className="mb-4 font-semibold">Per week</h2>
        {weken.length === 0 ? (
          <p className="text-sm text-ink-500">Nog geen geslaagde betalingen.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800">
                <tr>
                  <th className="py-2 pr-4">Week van</th>
                  <th className="py-2 pr-4">Netto</th>
                  <th className="py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {weken.map(([week, cent]) => (
                  <tr key={week} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                    <td className="py-2.5 pr-4">
                      {new Date(week).toLocaleDateString("nl-BE", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">
                      <Money cents={cent} />
                    </td>
                    <td className="py-2.5 text-ink-500">Berekend (testmodus)</td>
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
