"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function SortSelect() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <select
      aria-label="Sorteren"
      defaultValue={params.get("sort") ?? ""}
      className="rounded-full border border-ink-200 bg-white px-3 py-1.5 text-sm"
      onChange={(e) => {
        const next = new URLSearchParams(params);
        if (e.target.value) next.set("sort", e.target.value);
        else next.delete("sort");
        router.push(`${pathname}?${next}`);
      }}
    >
      <option value="">Nieuwste eerst</option>
      <option value="price-asc">Prijs: laag naar hoog</option>
      <option value="price-desc">Prijs: hoog naar laag</option>
      <option value="name">Naam A–Z</option>
    </select>
  );
}
