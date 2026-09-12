import type { Metadata } from "next";

import { ButtonLink, Card } from "@/components/ui";

export const metadata: Metadata = { title: "Tarieven" };

const plans = [
  {
    naam: "Start",
    prijs: "€ 0",
    periode: "per maand",
    beschrijving: "Om te bouwen en te testen.",
    punten: [
      "Onbeperkt betaallinks in testmodus",
      "Volledig dashboard",
      "REST API en webhooks",
      "AI-assistent",
    ],
    uitgelicht: false,
  },
  {
    naam: "Groei",
    prijs: "€ 29",
    periode: "per maand",
    beschrijving: "Voor een webshop die draait.",
    punten: [
      "Alles uit Start",
      "Meerdere gebruikers",
      "Facturen en klantenbeheer",
      "Ondersteuning per e-mail",
    ],
    uitgelicht: true,
  },
  {
    naam: "Zakelijk",
    prijs: "Op maat",
    periode: "",
    beschrijving: "Voor grotere volumes.",
    punten: [
      "Alles uit Groei",
      "Eigen tarieven per transactie",
      "Meerdere bedrijven onder één account",
      "Ondersteuning met vaste reactietijd",
    ],
    uitgelicht: false,
  },
];

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-5 py-16">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tarieven</h1>
        <p className="mt-3 text-ink-600 dark:text-ink-300">
          Zolang Paylity in testmodus draait kost alles niets en wordt er niets
          in rekening gebracht. De prijzen hieronder laten zien hoe het eruit
          zou zien.
        </p>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {plans.map((plan) => (
          <Card
            key={plan.naam}
            className={plan.uitgelicht ? "ring-2 ring-brand-500" : ""}
          >
            {plan.uitgelicht ? (
              <span className="mb-3 inline-block rounded-full bg-brand-500/12 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:text-brand-400">
                Meest gekozen
              </span>
            ) : null}

            <h2 className="text-lg font-semibold">{plan.naam}</h2>
            <p className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold tracking-tight">{plan.prijs}</span>
              <span className="text-sm text-ink-500">{plan.periode}</span>
            </p>
            <p className="mt-1.5 text-sm text-ink-600 dark:text-ink-400">
              {plan.beschrijving}
            </p>

            <ul className="mt-5 space-y-2 text-sm">
              {plan.punten.map((punt) => (
                <li key={punt} className="flex gap-2">
                  <span aria-hidden className="mt-0.5 text-brand-500">✓</span>
                  <span>{punt}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6">
              <ButtonLink href="/signup" variant={plan.uitgelicht ? "primary" : "ghost"}>
                Aan de slag
              </ButtonLink>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-10 rounded-xl border border-amber-400/40 bg-amber-400/10 p-5 text-sm text-amber-900/80 dark:text-amber-100/80">
        In testmodus wordt er niets afgeschreven en zijn er geen
        transactiekosten. Zodra je een erkende betaalprovider koppelt, gelden
        diens tarieven per transactie naast het abonnement hierboven.
      </div>
    </div>
  );
}
