import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Editor } from "@/components/editor";
import { LogoutButton } from "@/components/logout-button";
import { Logo, StatusBadge } from "@/components/ui";
import { currentClientSite } from "@/lib/auth";
import { siteContent } from "@/lib/sites";

export const metadata: Metadata = { title: "Mijn website", robots: { index: false } };

export default async function ClientEditor() {
  const site = await currentClientSite();
  if (!site) redirect("/beheer");

  return (
    <div>
      <header className="border-b border-ink-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <Logo className="hidden sm:inline-flex" />
            <span className="hidden h-6 w-px bg-ink-200 sm:block" />
            <span className="min-w-0">
              <span className="block truncate font-semibold">{site.name}</span>
              <span className="flex items-center gap-2 text-xs text-ink-500"><StatusBadge status={site.status} /> /s/{site.slug}</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/s/${site.slug}`} target="_blank" rel="noreferrer" className="rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-200">
              Bekijk website ↗
            </a>
            <LogoutButton kind="client" to="/beheer" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Editor initial={siteContent(site)} initialVersion={site.contentVersion} apiPath="/api/site" siteUrl={`/s/${site.slug}`} />
      </main>
    </div>
  );
}
