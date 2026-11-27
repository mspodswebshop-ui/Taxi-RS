import { formatMoney } from "@/lib/money";

/** Staafjes per dag, zonder grafiekbibliotheek. */
export function RevenueChart({ days, currency }: { days: { date: Date; cents: number }[]; currency: string }) {
  const max = Math.max(...days.map((d) => d.cents), 1);
  const fmt = new Intl.DateTimeFormat("nl-BE", { day: "numeric", month: "short" });
  return (
    <div>
      <div className="flex h-40 items-end gap-[3px]" role="img" aria-label="Omzet per dag, laatste 30 dagen">
        {days.map((d) => (
          <div key={d.date.toISOString()} className="group relative flex h-full flex-1 items-end">
            <div
              className="w-full rounded-t-[3px] bg-brand-500 transition group-hover:bg-brand-700"
              style={{ height: d.cents > 0 ? `${Math.max(3, (d.cents / max) * 100)}%` : "2px", opacity: d.cents > 0 ? 1 : 0.25 }}
            />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-900 px-2 py-1 text-xs text-white group-hover:block">
              {fmt.format(d.date)}: {formatMoney(d.cents, currency)}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex justify-between text-xs text-ink-500">
        <span>{fmt.format(days[0].date)}</span>
        <span>Vandaag</span>
      </div>
    </div>
  );
}
