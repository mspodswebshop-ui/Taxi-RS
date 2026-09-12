import Link from "next/link";

import { ButtonLink, Card } from "@/components/ui";

const features = [
  {
    title: "Betaallinks in seconden",
    body: "Maak een link met een bedrag en een omschrijving, deel hem, klaar. Geen webshop-integratie nodig.",
  },
  {
    title: "Bancontact en kaart",
    body: "De twee methodes die je klanten in België verwachten, in één checkout.",
  },
  {
    title: "Eén helder dashboard",
    body: "Omzet, geslaagde en mislukte betalingen, terugbetalingen en klanten bij elkaar.",
  },
  {
    title: "REST API",
    body: "Alles wat het dashboard kan, kan je code ook. Sleutels per bedrijf, validatie op elk verzoek.",
  },
  {
    title: "Webhooks met handtekening",
    body: "Elke melding is ondertekend, zodat je zeker weet dat hij van Paylity komt.",
  },
  {
    title: "AI-assistent",
    body: "Vraag in gewone taal hoeveel je vandaag ontving of welke betalingen mislukten.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* ---------- Kop ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-20 sm:py-28">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-ink-200 px-3 py-1 text-xs font-semibold text-ink-600 dark:border-ink-700 dark:text-ink-300">
            Paylity v1 · testomgeving
          </span>

          <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight sm:text-6xl">
            Payments made simple.
          </h1>

          <p className="mt-5 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            Paylity is een betaalplatform voor webshops. Maak betaallinks, volg je
            omzet en koppel je eigen systemen via de API — zonder dat je zelf iets
            met kaartgegevens te maken krijgt.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup">Gratis testaccount</ButtonLink>
            <ButtonLink href="/docs" variant="ghost">
              Bekijk de documentatie
            </ButtonLink>
          </div>
        </div>

        {/* ---------- Waarschuwing testmodus ---------- */}
        <div className="mt-12 rounded-xl border border-amber-400/40 bg-amber-400/10 p-5">
          <p className="font-semibold text-amber-800 dark:text-amber-200">
            Deze versie verwerkt geen echt geld
          </p>
          <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
            Paylity v1 draait op een gesimuleerde betaalprovider. Je kunt de
            volledige flow doorlopen — betaallink, checkout, geslaagde en mislukte
            betaling, terugbetaling — maar er wordt niets afgeschreven of
            overgemaakt. Er wordt ook nooit om een kaartnummer, CVC, pincode of
            IBAN gevraagd. Om echt geld te ontvangen koppel je later een erkende
            betaalprovider; het systeem is daarop voorbereid.
          </p>
        </div>
      </section>

      {/* ---------- Wat het kan ---------- */}
      <section className="border-t border-ink-200 bg-white py-20 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-2xl font-bold tracking-tight">Wat erin zit</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title}>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-400">
                  {f.body}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Hoe het werkt ---------- */}
      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-2xl font-bold tracking-tight">In drie stappen</h2>
        <ol className="mt-8 grid gap-5 sm:grid-cols-3">
          {[
            ["Maak een betaallink", "Titel, bedrag, valuta. Je krijgt een link zoals /pay/pl_a1b2c3."],
            ["Deel hem met je klant", "Per mail, chat of als knop in je webshop."],
            ["Volg het in je dashboard", "Status, omzet en terugbetalingen, live bijgewerkt."],
          ].map(([titel, uitleg], i) => (
            <li key={titel} className="relative pl-11">
              <span className="absolute left-0 top-0 grid h-8 w-8 place-items-center rounded-full bg-brand-500 text-sm font-bold text-white">
                {i + 1}
              </span>
              <h3 className="font-semibold">{titel}</h3>
              <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{uitleg}</p>
            </li>
          ))}
        </ol>

        <p className="mt-10 text-sm text-ink-500">
          Al een account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Inloggen
          </Link>
        </p>
      </section>
    </>
  );
}
