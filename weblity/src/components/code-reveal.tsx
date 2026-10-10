"use client";

import { useState } from "react";

import { Button } from "@/components/ui";

/**
 * Toont een nieuwe klantcode. Dit is de enige keer dat de code zichtbaar is:
 * in de database staat alleen een hash.
 */
export function CodeReveal({ code, siteName, loginUrl, onClose }: { code: string; siteName: string; loginUrl: string; onClose: () => void }) {
  const [copied, setCopied] = useState<"" | "code" | "msg">("");
  const message = `Hallo! Je website van ${siteName} kun je nu zelf aanpassen.\n\n1. Ga naar ${loginUrl}\n2. Vul deze code in: ${code}\n\nBewaar de code goed en deel hem niet met anderen.`;

  const copy = async (text: string, what: "code" | "msg") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(""), 2000);
    } catch {
      /* klembord niet beschikbaar: dan maar selecteren en kopiëren */
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-900/50 p-4" role="dialog" aria-modal="true" aria-labelledby="code-title">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-8">
        <h2 id="code-title" className="font-display text-2xl font-bold">Klantcode voor {siteName}</h2>
        <p className="mt-2 text-sm text-ink-500">
          Geef deze code aan je klant. <b className="text-ink-800">Je ziet hem maar één keer</b>: Weblity bewaart alleen een versleutelde versie. Kwijt? Maak dan een nieuwe.
        </p>
        <div className="mt-5 rounded-2xl bg-brand-50 px-4 py-5 text-center font-mono text-2xl font-semibold tracking-widest text-brand-700 select-all sm:text-3xl">{code}</div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="secondary" onClick={() => copy(code, "code")}>{copied === "code" ? "Gekopieerd ✓" : "Code kopiëren"}</Button>
          <Button variant="secondary" onClick={() => copy(message, "msg")}>{copied === "msg" ? "Gekopieerd ✓" : "Bericht voor klant kopiëren"}</Button>
        </div>
        <a
          className="mt-2 flex w-full items-center justify-center rounded-xl bg-[#1f9d55] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#178346]"
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
        >
          Versturen via WhatsApp
        </a>
        <Button className="mt-6 w-full" onClick={onClose}>Ik heb de code genoteerd</Button>
      </div>
    </div>
  );
}
