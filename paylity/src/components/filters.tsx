"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Zoekveld en statusfilter.
 *
 * De keuzes staan in de URL, niet in de component. Daardoor kun je een
 * gefilterde weergave bewaren of delen, en blijft hij na verversen staan.
 */
export function Filters({
  statuses,
  placeholder = "Zoeken…",
}: {
  statuses?: { waarde: string; label: string }[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pad = usePathname();
  const params = useSearchParams();
  const [zoek, setZoek] = useState(params.get("search") ?? "");

  function pas(aan: Record<string, string>) {
    const nieuw = new URLSearchParams(params.toString());
    for (const [sleutel, waarde] of Object.entries(aan)) {
      if (waarde) nieuw.set(sleutel, waarde);
      else nieuw.delete(sleutel);
    }
    nieuw.delete("offset"); // na filteren weer op de eerste pagina beginnen
    router.push(`${pad}?${nieuw.toString()}`);
  }

  const veld =
    "rounded-lg border border-ink-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        pas({ search: zoek });
      }}
      className="mb-4 flex flex-wrap gap-2"
    >
      <input
        value={zoek}
        onChange={(e) => setZoek(e.target.value)}
        placeholder={placeholder}
        aria-label="Zoeken"
        className={`${veld} min-w-0 flex-1 sm:max-w-xs`}
      />

      {statuses ? (
        <select
          value={params.get("status") ?? ""}
          onChange={(e) => pas({ status: e.target.value })}
          aria-label="Filter op status"
          className={veld}
        >
          <option value="">Alle statussen</option>
          {statuses.map((s) => (
            <option key={s.waarde} value={s.waarde}>
              {s.label}
            </option>
          ))}
        </select>
      ) : null}

      <button
        type="submit"
        className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
      >
        Zoeken
      </button>

      {params.toString() ? (
        <button
          type="button"
          onClick={() => router.push(pad)}
          className="rounded-lg border border-ink-200 px-3 py-2 text-sm text-ink-600 hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
        >
          Wissen
        </button>
      ) : null}
    </form>
  );
}
