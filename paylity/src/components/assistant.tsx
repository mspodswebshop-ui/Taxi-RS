"use client";

import { useState } from "react";

type Bericht = { van: "jij" | "assistent"; tekst: string; tool?: string };

const voorbeelden = [
  "Hoeveel heb ik vandaag ontvangen?",
  "Toon mijn laatste betalingen.",
  "Hoeveel betalingen zijn mislukt?",
  "Wat was mijn omzet deze maand?",
];

/**
 * De AI-assistent in het dashboard.
 *
 * De vraag gaat naar /api/assistant; daar bepaalt de serverkant welke
 * gegevens erbij gehaald worden, altijd beperkt tot het eigen bedrijf.
 */
export function Assistant() {
  const [open, setOpen] = useState(false);
  const [vraag, setVraag] = useState("");
  const [bezig, setBezig] = useState(false);
  const [gesprek, setGesprek] = useState<Bericht[]>([
    {
      van: "assistent",
      tekst:
        "Dag! Vraag me iets over je omzet, je betalingen of je terugbetalingen.",
    },
  ]);

  async function stel(tekst: string) {
    const schoon = tekst.trim();
    if (!schoon || bezig) return;

    setGesprek((g) => [...g, { van: "jij", tekst: schoon }]);
    setVraag("");
    setBezig(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: schoon }),
      });
      const data = await res.json();

      setGesprek((g) => [
        ...g,
        {
          van: "assistent",
          tekst: res.ok
            ? data.answer
            : (data?.error?.message ?? "Dat lukte niet."),
          tool: res.ok ? data.usedTool : undefined,
        },
      ]);
    } catch {
      setGesprek((g) => [
        ...g,
        { van: "assistent", tekst: "Ik kon de server niet bereiken." },
      ]);
    } finally {
      setBezig(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-brand-600"
      >
        <span aria-hidden>✦</span> Assistent
      </button>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 flex max-h-[min(560px,80vh)] w-[min(380px,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl dark:border-ink-700 dark:bg-ink-900">
      <div className="flex items-center gap-2 border-b border-ink-200 px-4 py-3 dark:border-ink-800">
        <span aria-hidden className="text-brand-500">✦</span>
        <span className="text-sm font-semibold">Assistent</span>
        <span className="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500 dark:border-ink-700">
          demo-data
        </span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Sluiten"
          className="ml-auto rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {gesprek.map((b, i) => (
          <div key={i} className={b.van === "jij" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-left text-sm ${
                b.van === "jij"
                  ? "bg-brand-500 text-white"
                  : "bg-ink-100 dark:bg-ink-800"
              }`}
            >
              {b.tekst}
            </div>
            {b.tool && b.tool !== "geen" ? (
              <p className="mt-1 text-[11px] text-ink-400">via {b.tool}</p>
            ) : null}
          </div>
        ))}
        {bezig ? <p className="text-sm text-ink-400">Even kijken…</p> : null}
      </div>

      {gesprek.length <= 1 ? (
        <div className="flex flex-wrap gap-1.5 border-t border-ink-200 px-4 py-3 dark:border-ink-800">
          {voorbeelden.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => stel(v)}
              className="rounded-full border border-ink-200 px-2.5 py-1 text-xs text-ink-600 transition hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
            >
              {v}
            </button>
          ))}
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          stel(vraag);
        }}
        className="flex gap-2 border-t border-ink-200 p-3 dark:border-ink-800"
      >
        <input
          value={vraag}
          onChange={(e) => setVraag(e.target.value)}
          placeholder="Stel je vraag…"
          aria-label="Vraag aan de assistent"
          className="min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-950"
        />
        <button
          type="submit"
          disabled={bezig}
          className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Vraag
        </button>
      </form>
    </div>
  );
}
