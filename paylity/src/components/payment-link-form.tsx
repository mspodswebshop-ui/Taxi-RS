"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { parseMoney } from "@/lib/money";

/**
 * Een betaallink aanmaken vanuit het dashboard.
 *
 * Het bedrag wordt hier naar centen omgerekend en als geheel getal verstuurd;
 * de server rekent daar verder mee. De server controleert alles opnieuw —
 * wat de browser stuurt is nooit het laatste woord.
 */
export function PaymentLinkForm() {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(null);
    setGelukt(null);

    const formulier = new FormData(e.currentTarget);
    const centen = parseMoney(String(formulier.get("amount") ?? ""));

    if (centen === null || centen < 1) {
      setFout("Vul een geldig bedrag in, bijvoorbeeld 24,50.");
      return;
    }

    setBezig(true);
    try {
      // Vanuit het dashboard gaat dit via de sessie, niet via een API-sleutel:
      // een geheime sleutel hoort niet in code die in de browser draait.
      const res = await fetch("/api/dashboard/payment-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formulier.get("title"),
          description: formulier.get("description") || undefined,
          amount: centen,
          currency: "EUR",
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message ?? "Aanmaken is niet gelukt.");

      setGelukt(`/pay/${data.slug}`);
      (e.target as HTMLFormElement).reset();
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Aanmaken is niet gelukt.");
    } finally {
      setBezig(false);
    }
  }

  const veld =
    "w-full rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-950";

  return (
    <form onSubmit={verstuur} className="mt-4 space-y-3">
      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-semibold">
          Titel
        </label>
        <input id="title" name="title" required maxLength={120} className={veld} />
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-semibold">
          Omschrijving <span className="font-normal text-ink-500">(optioneel)</span>
        </label>
        <input id="description" name="description" maxLength={500} className={veld} />
      </div>

      <div>
        <label htmlFor="amount" className="mb-1 block text-sm font-semibold">
          Bedrag in euro
        </label>
        <input
          id="amount"
          name="amount"
          required
          inputMode="decimal"
          placeholder="24,50"
          className={veld}
        />
      </div>

      {fout ? (
        <p role="alert" className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {fout}
        </p>
      ) : null}

      {gelukt ? (
        <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300">
          Aangemaakt:{" "}
          <a href={gelukt} target="_blank" rel="noreferrer" className="font-mono underline">
            {gelukt}
          </a>
        </p>
      ) : null}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Betaallink maken"}
      </button>
    </form>
  );
}
