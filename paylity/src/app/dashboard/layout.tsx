import Link from "next/link";
import { redirect } from "next/navigation";

import { Assistant } from "@/components/assistant";
import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";

const nav = [
  ["/dashboard", "Overzicht"],
  ["/dashboard/payments", "Betalingen"],
  ["/dashboard/payment-links", "Betaallinks"],
  ["/dashboard/customers", "Klanten"],
  ["/dashboard/invoices", "Facturen"],
  ["/dashboard/payouts", "Uitbetalingen"],
  ["/dashboard/analytics", "Analyse"],
  ["/dashboard/settings", "Instellingen"],
] as const;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // De toegangscontrole staat op de server. Een bezoeker zonder geldige
  // sessie ziet nooit dashboardgegevens, ook niet kort.
  const user = await currentUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen lg:flex">
      {/* ---------- Zijbalk ---------- */}
      <aside className="border-b border-ink-200 bg-white lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center gap-2 px-5 py-4">
          <Link href="/dashboard">
            <Logo />
          </Link>
          <TestModeBadge compact />
        </div>

        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-col lg:overflow-visible">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-ink-600 transition hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100"
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="hidden border-t border-ink-200 px-5 py-4 lg:block dark:border-ink-800">
          <p className="truncate text-sm font-semibold">{user.businessName}</p>
          <p className="truncate text-xs text-ink-500">{user.email}</p>
          <div className="mt-3 flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* ---------- Inhoud ---------- */}
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl px-5 py-7">{children}</div>
      </div>

      <Assistant />
    </div>
  );
}
