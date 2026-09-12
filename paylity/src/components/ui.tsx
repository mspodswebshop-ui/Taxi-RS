/**
 * Gedeelde bouwstenen voor de interface.
 *
 * Bewust klein gehouden: alleen wat op meerdere plekken terugkomt, zodat de
 * pagina's zelf leesbaar blijven.
 */

import Link from "next/link";
import type { ReactNode } from "react";

import { formatMoney } from "@/lib/money";

/* ---------------------------------------------------------------- */
/* Merk                                                              */
/* ---------------------------------------------------------------- */

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-500 text-sm font-bold text-white">
        P
      </span>
      <span className="text-[17px] font-semibold tracking-tight">Paylity</span>
    </span>
  );
}

/**
 * De TEST MODE-melding.
 *
 * Deze staat met opzet op elke pagina waar met bedragen gewerkt wordt. Er
 * wordt geen echt geld verwerkt, en dat moet nooit een verrassing zijn.
 */
export function TestModeBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300"
      title="Paylity verwerkt geen echt geld. Alle bedragen zijn testgegevens."
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {compact ? "TEST" : "TEST MODE"}
    </span>
  );
}

/* ---------------------------------------------------------------- */
/* Bouwstenen                                                        */
/* ---------------------------------------------------------------- */

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-ink-200 bg-white p-5 dark:border-ink-800 dark:bg-ink-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "bad";
}) {
  const toneClass =
    tone === "good"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "bad"
        ? "text-rose-600 dark:text-rose-400"
        : "text-ink-900 dark:text-ink-50";

  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </p>
      <p className={`tabular mt-1.5 text-2xl font-bold tracking-tight ${toneClass}`}>
        {value}
      </p>
      {sub ? <p className="mt-0.5 text-xs text-ink-500">{sub}</p> : null}
    </Card>
  );
}

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  pending: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/30",
  failed: "bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/30",
  refunded: "bg-sky-500/12 text-sky-700 dark:text-sky-400 border-sky-500/30",
  cancelled: "bg-ink-500/12 text-ink-600 dark:text-ink-400 border-ink-500/30",
  open: "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/30",
  draft: "bg-ink-500/12 text-ink-600 dark:text-ink-400 border-ink-500/30",
  void: "bg-ink-500/12 text-ink-600 dark:text-ink-400 border-ink-500/30",
};

const statusLabels: Record<string, string> = {
  paid: "Betaald",
  pending: "In afwachting",
  failed: "Mislukt",
  refunded: "Terugbetaald",
  cancelled: "Geannuleerd",
  open: "Openstaand",
  draft: "Concept",
  void: "Vervallen",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${
        statusStyles[status] ?? statusStyles.cancelled
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

export function MethodLabel({ method }: { method: string | null }) {
  if (!method) return <span className="text-ink-400">—</span>;
  return (
    <span className="text-sm">
      {method === "bancontact" ? "Bancontact" : "Kaart"}
    </span>
  );
}

export function Money({ cents, currency }: { cents: number; currency?: string }) {
  return <span className="tabular">{formatMoney(cents, currency)}</span>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-ink-300 p-10 text-center dark:border-ink-700">
      <p className="font-semibold">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-0.5 text-sm text-ink-500">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition";
  const styles =
    variant === "primary"
      ? "bg-brand-500 text-white hover:bg-brand-600"
      : "border border-ink-200 hover:bg-ink-100 dark:border-ink-700 dark:hover:bg-ink-800";

  return (
    <Link href={href} className={`${base} ${styles}`}>
      {children}
    </Link>
  );
}
