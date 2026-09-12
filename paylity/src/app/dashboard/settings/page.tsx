import type { Metadata } from "next";

import { ApiKeys } from "@/components/api-keys";
import { Card, PageHeader, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";

export const metadata: Metadata = { title: "Instellingen" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = (await currentUser())!;
  const provider = getProvider();

  const [business, keys] = await Promise.all([
    db.business.findUnique({ where: { id: user.businessId } }),
    db.apiKey.findMany({
      where: { businessId: user.businessId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Instellingen"
        description="Je bedrijf, je sleutels en je betaalprovider."
        action={<TestModeBadge />}
      />

      <div className="space-y-4">
        <Card>
          <h2 className="font-semibold">Bedrijf</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              ["Naam", business?.name ?? "—"],
              ["E-mailadres", business?.email ?? "—"],
              ["Land", business?.country ?? "—"],
              ["Valuta", business?.currency ?? "—"],
            ].map(([label, waarde]) => (
              <div key={label}>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                  {label}
                </dt>
                <dd className="mt-0.5 text-sm">{waarde}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <h2 className="font-semibold">Betaalprovider</h2>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Actief
              </dt>
              <dd className="mt-0.5 text-sm">{provider.label}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Verwerkt echt geld
              </dt>
              <dd className="mt-0.5 text-sm">
                {provider.handlesRealMoney ? "Ja" : "Nee — er wordt niets afgeschreven"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Methodes
              </dt>
              <dd className="mt-0.5 text-sm">
                {provider.methods
                  .map((m) => (m === "bancontact" ? "Bancontact" : "Kaart"))
                  .join(", ")}
              </dd>
            </div>
          </dl>

          <p className="mt-4 rounded-lg border border-ink-200 bg-ink-100 p-3 text-sm leading-relaxed text-ink-600 dark:border-ink-800 dark:bg-ink-950 dark:text-ink-400">
            Om echt geld te ontvangen koppel je een erkende betaalprovider. Schrijf
            daarvoor een bestand in <code className="font-mono text-xs">src/lib/providers/</code>{" "}
            dat de interface <code className="font-mono text-xs">PaymentProvider</code>{" "}
            implementeert en zet hem in{" "}
            <code className="font-mono text-xs">PAYMENT_PROVIDER</code>. De rest van
            Paylity hoeft daarvoor niet te wijzigen.
          </p>
        </Card>

        <Card>
          <h2 className="font-semibold">API-sleutels</h2>
          <p className="mt-1 text-sm text-ink-500">
            Voor toegang tot de REST API. Een sleutel is maar één keer zichtbaar:
            wij bewaren er alleen een versleutelde afdruk van. Zet een geheime
            sleutel nooit in code die in de browser draait.
          </p>
          <ApiKeys
            keys={keys.map((k) => ({
              id: k.id,
              name: k.name,
              prefix: k.keyPrefix,
              revoked: Boolean(k.revokedAt),
              lastUsed: k.lastUsedAt?.toISOString() ?? null,
              created: k.createdAt.toISOString(),
            }))}
          />
        </Card>
      </div>
    </>
  );
}
