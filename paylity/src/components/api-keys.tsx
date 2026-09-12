"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Sleutel = {
  id: string;
  name: string;
  prefix: string;
  revoked: boolean;
  lastUsed: string | null;
  created: string;
};

export function ApiKeys({ keys }: { keys: Sleutel[] }) {
  const router = useRouter();
  const [nieuw, setNieuw] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function maak() {
    setBezig(true);
    try {
      const res = await fetch("/api/dashboard/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Testsleutel" }),
      });
      const data = await res.json();
      if (res.ok) {
        setNieuw(data.key);
        router.refresh();
      }
    } finally {
      setBezig(false);
    }
  }

  async function trekIn(id: string) {
    if (!confirm("Deze sleutel intrekken? Aanroepen ermee werken daarna niet meer.")) return;
    await fetch(`/api/dashboard/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="mt-4">
      {nieuw ? (
        <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3.5">
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">
            Bewaar deze sleutel nu — hij is hierna niet meer op te vragen.
          </p>
          <code className="mt-2 block break-all rounded-md bg-ink-950/80 p-2.5 font-mono text-xs text-ink-100">
            {nieuw}
          </code>
        </div>
      ) : null}

      {keys.length > 0 ? (
        <ul className="mb-4 space-y-2">
          {keys.map((k) => (
            <li
              key={k.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-ink-200 px-3.5 py-2.5 dark:border-ink-800"
            >
              <span className="font-mono text-xs">{k.prefix}…</span>
              <span className="text-sm text-ink-500">{k.name}</span>
              {k.revoked ? (
                <span className="rounded-full border border-rose-500/30 bg-rose-500/12 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-400">
                  Ingetrokken
                </span>
              ) : (
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                  Actief
                </span>
              )}
              <span className="text-xs text-ink-500">
                {k.lastUsed
                  ? `laatst gebruikt ${new Date(k.lastUsed).toLocaleDateString("nl-BE")}`
                  : "nog niet gebruikt"}
              </span>
              {!k.revoked ? (
                <button
                  type="button"
                  onClick={() => trekIn(k.id)}
                  className="ml-auto text-xs font-semibold text-rose-600 hover:underline dark:text-rose-400"
                >
                  Intrekken
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}

      <button
        type="button"
        onClick={maak}
        disabled={bezig}
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Nieuwe testsleutel"}
      </button>
    </div>
  );
}
