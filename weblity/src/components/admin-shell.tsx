import Link from "next/link";
import type { ReactNode } from "react";

import { LogoutButton } from "@/components/logout-button";
import { Logo } from "@/components/ui";

export function AdminShell({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo />
            <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-white">Beheer</span>
          </Link>
          <div className="flex items-center gap-3 text-sm text-ink-500">
            <span className="hidden sm:inline">{name}</span>
            <LogoutButton kind="admin" to="/admin/login" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
