"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Formulier voor inloggen en registreren.
 *
 * Het wachtwoord gaat rechtstreeks naar de server en wordt nergens in de
 * browser bewaard. De server hasht het en bewaart alleen die hash.
 */
export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(null);
    setBezig(true);

    const formulier = new FormData(e.currentTarget);
    const payload = Object.fromEntries(formulier.entries());

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message ?? "Er ging iets mis.");

      if (mode === "signup" && data.apiKey) {
        // De sleutel is hierna niet meer op te vragen, dus we tonen hem nu.
        setApiKey(data.apiKey);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setFout(err instanceof Error ? err.message : "Er ging iets mis.");
    } finally {
      setBezig(false);
    }
  }

  if (apiKey) {
    return (
      <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-5">
        <p className="font-semibold text-emerald-800 dark:text-emerald-200">
          Je account staat klaar
        </p>
        <p className="mt-1.5 text-sm text-emerald-900/80 dark:text-emerald-100/80">
          Dit is je testsleutel. Bewaar hem nu — hij is hierna niet meer op te
          vragen, want wij bewaren alleen een versleutelde afdruk ervan.
        </p>
        <code className="mt-3 block break-all rounded-lg bg-ink-950/80 p-3 font-mono text-xs text-ink-100">
          {apiKey}
        </code>
        <button
          type="button"
          onClick={() => {
            router.push("/dashboard");
            router.refresh();
          }}
          className="mt-4 rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
        >
          Naar het dashboard
        </button>
      </div>
    );
  }

  const veldStijl =
    "w-full rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900";

  return (
    <form onSubmit={verstuur} className="mt-6 space-y-4">
      {mode === "signup" ? (
        <>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-semibold">
              Je naam
            </label>
            <input id="name" name="name" required minLength={2} className={veldStijl} />
          </div>
          <div>
            <label htmlFor="businessName" className="mb-1.5 block text-sm font-semibold">
              Bedrijfsnaam
            </label>
            <input
              id="businessName"
              name="businessName"
              required
              minLength={2}
              className={veldStijl}
            />
          </div>
        </>
      ) : null}

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-semibold">
          E-mailadres
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={veldStijl}
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-semibold">
          Wachtwoord
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          required
          minLength={mode === "signup" ? 10 : 1}
          className={veldStijl}
        />
        {mode === "signup" ? (
          <p className="mt-1 text-xs text-ink-500">Minstens 10 tekens.</p>
        ) : null}
      </div>

      {fout ? (
        <p
          role="alert"
          className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300"
        >
          {fout}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={bezig}
        className="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : mode === "signup" ? "Account aanmaken" : "Inloggen"}
      </button>
    </form>
  );
}
