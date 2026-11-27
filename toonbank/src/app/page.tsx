import Link from "next/link";

import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui";
import { currentMerchant } from "@/lib/auth";
import { feePercentFor } from "@/lib/stripe";

const features = [
  {
    title: "Je winkel in vijf minuten",
    text: "Naam kiezen, producten toevoegen, klaar. Je krijgt meteen een eigen winkeladres om te delen.",
  },
  {
    title: "Bancontact, kaart en meer",
    text: "Klanten betalen veilig via Stripe. Het geld komt rechtstreeks op je eigen rekening.",
  },
  {
    title: "Varianten en voorraad",
    text: "Maten, kleuren, eigen prijzen per variant. De voorraad loopt vanzelf af bij elke verkoop.",
  },
  {
    title: "Bestellingen op één plek",
    text: "Zie wat betaald is, wat nog weg moet en wie je beste klanten zijn. Met track-and-trace.",
  },
  {
    title: "Kortingscodes",
    text: "Procent of vast bedrag, met minimumbedrag, einddatum en maximaal aantal keer gebruiken.",
  },
  {
    title: "Jouw merk, jouw kleuren",
    text: "Logo, hoofdfoto, accentkleur en teksten op de voorpagina. Werkt op elke telefoon.",
  },
];

export default async function Home() {
  const merchant = await currentMerchant();
  const freeFee = feePercentFor("free").toLocaleString("nl-BE");
  const proFee = feePercentFor("pro").toLocaleString("nl-BE");
  // Vanaf welke maandomzet Pro goedkoper is dan Start.
  const feeGap = feePercentFor("free") - feePercentFor("pro");
  const breakEven = feeGap > 0 ? Math.ceil(29 / (feeGap / 100) / 100) * 100 : null;

  return (
    <div className="bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          {merchant ? (
            <ButtonLink href="/admin">Naar mijn winkel</ButtonLink>
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost">
                Inloggen
              </ButtonLink>
              <ButtonLink href="/signup" variant="brand">
                Gratis starten
              </ButtonLink>
            </>
          )}
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-4 pt-14 pb-20 text-center sm:px-6 sm:pt-24">
        <p className="mb-4 inline-block rounded-full bg-brand-50 px-3 py-1 text-sm font-medium text-brand-700">
          Gemaakt voor ondernemers in België en Nederland
        </p>
        <h1 className="mx-auto max-w-3xl font-serif text-4xl leading-tight font-semibold tracking-tight text-ink-950 sm:text-6xl">
          Verkoop online, zonder gedoe.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-ink-600">
          Toonbank geeft je een complete webshop: producten, winkelwagen, betalen met Bancontact en
          bestellingen beheren. Geen technische kennis nodig.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/signup" variant="brand" className="px-6 py-3 text-base">
            Open je winkel gratis
          </ButtonLink>
          <ButtonLink href="/s/demo" variant="secondary" className="px-6 py-3 text-base">
            Bekijk een voorbeeldwinkel
          </ButtonLink>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-ink-50">
        <div className="mx-auto grid max-w-6xl gap-px px-4 py-16 sm:grid-cols-2 sm:px-6 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="p-6">
              <h3 className="font-semibold text-ink-900">{f.title}</h3>
              <p className="mt-2 text-ink-600">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="prijzen" className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <h2 className="text-center font-serif text-3xl font-semibold tracking-tight">Eerlijke prijzen</h2>
        <p className="mt-3 text-center text-ink-600">
          Je betaalt pas als je verkoopt. Daarbovenop rekent Stripe zijn eigen betaalkosten.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-2xl border border-ink-200 p-7">
            <h3 className="font-semibold">Start</h3>
            <p className="mt-3">
              <span className="text-4xl font-semibold">€0</span>
              <span className="text-ink-500"> per maand</span>
            </p>
            <p className="mt-1 text-ink-600">+ {freeFee}% per verkoop</p>
            <ul className="mt-6 space-y-2 text-sm text-ink-700">
              <li>✓ Onbeperkt producten</li>
              <li>✓ Alle betaalmethoden van Stripe</li>
              <li>✓ Kortingscodes en voorraadbeheer</li>
            </ul>
          </div>
          <div className="rounded-2xl border-2 border-brand-600 p-7">
            <h3 className="font-semibold text-brand-700">Pro</h3>
            <p className="mt-3">
              <span className="text-4xl font-semibold">€29</span>
              <span className="text-ink-500"> per maand</span>
            </p>
            <p className="mt-1 text-ink-600">+ {proFee}% per verkoop</p>
            <ul className="mt-6 space-y-2 text-sm text-ink-700">
              <li>✓ Alles van Start</li>
              <li>✓ Veel lagere kosten per verkoop</li>
              {breakEven && (
                <li>✓ Goedkoper vanaf ongeveer €{breakEven.toLocaleString("nl-BE")} omzet per maand</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      <footer className="bg-ink-950 py-10 text-center text-sm text-ink-400">
        <Logo light />
        <p className="mt-3">
          © {new Date().getFullYear()} Toonbank ·{" "}
          <Link href="/login" className="hover:text-white">
            Inloggen
          </Link>
        </p>
      </footer>
    </div>
  );
}
