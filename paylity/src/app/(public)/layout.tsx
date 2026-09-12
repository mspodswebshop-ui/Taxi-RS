import Link from "next/link";

import { Logo, TestModeBadge } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-ink-200 bg-ink-50/85 backdrop-blur dark:border-ink-800 dark:bg-ink-950/85">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3">
          <Link href="/" className="shrink-0">
            <Logo />
          </Link>
          <span className="hidden sm:inline-flex">
            <TestModeBadge />
          </span>

          <nav className="ml-auto flex items-center gap-0.5 text-sm sm:gap-1">
            <Link className="rounded-lg px-3 py-2 hover:bg-ink-100 dark:hover:bg-ink-800" href="/pricing">
              Tarieven
            </Link>
            <Link className="hidden rounded-lg px-3 py-2 hover:bg-ink-100 sm:block dark:hover:bg-ink-800" href="/docs">
              Documentatie
            </Link>
            <Link className="rounded-lg px-3 py-2 hover:bg-ink-100 dark:hover:bg-ink-800" href="/login">
              Inloggen
            </Link>
            <Link
              className="rounded-lg bg-brand-500 px-3.5 py-2 font-semibold text-white hover:bg-brand-600"
              href="/signup"
            >
              Aan de slag
            </Link>
            <div className="ml-1">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-ink-200 py-8 dark:border-ink-800">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-5 text-sm text-ink-500">
          <Logo className="opacity-70" />
          <span>Payments made simple.</span>
          <span className="ml-auto">
            Testomgeving — er wordt geen echt geld verwerkt.
          </span>
        </div>
      </footer>
    </div>
  );
}
