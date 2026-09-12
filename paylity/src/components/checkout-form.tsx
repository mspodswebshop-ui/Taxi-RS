"use client";

import { useState } from "react";

/**
 * De testcheckout.
 *
 * Er staat hier met opzet GEEN veld voor een kaartnummer, CVC/CVV, pincode of
 * IBAN — niet verborgen, niet uitgeschakeld, helemaal niet. De gesimuleerde
 * provider heeft die gegevens niet nodig, en wat je niet vraagt kan ook niet
 * lekken.
 *
 * Bij een erkende provider zou de klant zijn gegevens invullen in een
 * beveiligd veld van die provider zelf. Ook dan komen ze niet langs Paylity.
 */

type Methode = "bancontact" | "card";
type Uitkomst = "success" | "failure";

type Resultaat = {
  status: string;
  paymentId: string;
  failureReason?: string | null;
};

export function CheckoutForm({
  slug,
  amountLabel,
}: {
  slug: string;
  amountLabel: string;
}) {
  const [methode, setMethode] = useState<Methode>("bancontact");
  const [uitkomst, setUitkomst] = useState<Uitkomst>("success");
  const [naam, setNaam] = useState("");
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState<Resultaat | null>(null);

  async function betaal(e: React.FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);

    try {
      const res = await fetch("/api/checkout/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          method: methode,
          simulate: uitkomst,
          customerName: naam || undefined,
          customerEmail: email || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "De betaling is niet gelukt.");
      setKlaar(data);
    } catch (err) {
      setFout(err instanceof Error ? err.message : "De betaling is niet gelukt.");
    } finally {
      setBezig(false);
    }
  }

  /* ---------- Afgerond ---------- */
  if (klaar) {
    const geslaagd = klaar.status === "paid";
    return (
      <div className="pt-6 text-center">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full ${
            geslaagd ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600"
          }`}
        >
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            {geslaagd ? <path d="m4 12 6 6L20 6" /> : <path d="M18 6 6 18M6 6l12 12" />}
          </svg>
        </div>

        <h2 className="mt-4 text-lg font-bold">
          {geslaagd ? "Betaling geslaagd" : "Betaling mislukt"}
        </h2>
        <p className="mt-1 text-sm text-ink-500">
          {geslaagd
            ? `${amountLabel} is betaald.`
            : (klaar.failureReason ?? "De betaling is geweigerd.")}
        </p>

        <p className="mt-4 break-all font-mono text-xs text-ink-400">{klaar.paymentId}</p>

        <p className="mt-5 rounded-lg border border-amber-400/40 bg-amber-400/10 px-3 py-2 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          Dit was een testbetaling. Er is geen geld afgeschreven of overgemaakt.
        </p>

        {!geslaagd ? (
          <button
            type="button"
            onClick={() => setKlaar(null)}
            className="mt-4 rounded-lg border border-ink-200 px-4 py-2 text-sm font-semibold hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800"
          >
            Opnieuw proberen
          </button>
        ) : null}
      </div>
    );
  }

  /* ---------- Betaalscherm ---------- */
  const veld =
    "w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-950";

  return (
    <form onSubmit={betaal} className="pt-5">
      {/* Betaalmethode */}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Betaalmethode</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["bancontact", "Bancontact"],
              ["card", "Kaart"],
            ] as const
          ).map(([waarde, label]) => (
            <label
              key={waarde}
              className={`flex cursor-pointer items-center gap-2.5 rounded-lg border p-3 text-sm font-medium transition ${
                methode === waarde
                  ? "border-brand-500 bg-brand-500/8"
                  : "border-ink-200 hover:border-ink-300 dark:border-ink-700"
              }`}
            >
              <input
                type="radio"
                name="method"
                value={waarde}
                checked={methode === waarde}
                onChange={() => setMethode(waarde)}
                className="accent-brand-500"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {/* Klantgegevens: optioneel, en uitsluitend naam en e-mail. */}
      <div className="mt-5 space-y-3">
        <div>
          <label htmlFor="naam" className="mb-1 block text-sm font-semibold">
            Naam <span className="font-normal text-ink-500">(optioneel)</span>
          </label>
          <input
            id="naam"
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            maxLength={120}
            className={veld}
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-1 block text-sm font-semibold">
            E-mailadres <span className="font-normal text-ink-500">(optioneel)</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={veld}
          />
        </div>
      </div>

      {/* Testkeuze. Dit blok verdwijnt zodra er een echte provider gekoppeld is. */}
      <fieldset className="mt-5 rounded-lg border border-amber-400/40 bg-amber-400/10 p-3.5">
        <legend className="px-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
          Testmodus
        </legend>
        <p className="mb-2.5 text-xs leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          Er wordt geen geld verwerkt en er worden geen kaartgegevens gevraagd.
          Kies welke uitkomst je wilt nabootsen.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["success", "Betaling slaagt"],
              ["failure", "Betaling mislukt"],
            ] as const
          ).map(([waarde, label]) => (
            <label
              key={waarde}
              className={`flex cursor-pointer items-center gap-2 rounded-md border bg-white p-2.5 text-xs font-semibold transition dark:bg-ink-900 ${
                uitkomst === waarde
                  ? "border-amber-500"
                  : "border-ink-200 dark:border-ink-700"
              }`}
            >
              <input
                type="radio"
                name="simulate"
                value={waarde}
                checked={uitkomst === waarde}
                onChange={() => setUitkomst(waarde)}
                className="accent-amber-500"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      {fout ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {fout}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={bezig}
        className="mt-5 w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-600 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : `Betaal ${amountLabel}`}
      </button>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-ink-500">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        Beveiligde verbinding — geen kaartgegevens nodig
      </p>
    </form>
  );
}
