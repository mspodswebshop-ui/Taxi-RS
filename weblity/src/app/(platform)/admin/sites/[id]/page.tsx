import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { Editor } from "@/components/editor";
import { SiteSettings } from "@/components/site-settings";
import { Card, StatusBadge } from "@/components/ui";
import { currentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { siteContent } from "@/lib/sites";
import { appOrigin } from "@/lib/urls";

export const metadata: Metadata = { title: "Website beheren", robots: { index: false } };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export default async function AdminSite({ params, searchParams }: Props) {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  const { id } = await params;
  const tab = (await searchParams).tab === "inhoud" ? "inhoud" : "instellingen";

  const site = await db.site.findUnique({
    where: { id },
    include: { changes: { orderBy: { createdAt: "desc" }, take: 15 } },
  });
  if (!site) notFound();

  const tabClass = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-semibold ${active ? "bg-white text-brand-700 shadow-sm ring-1 ring-ink-200" : "text-ink-600 hover:bg-white/70"}`;

  return (
    <AdminShell name={admin.name}>
      <Link href="/admin" className="text-sm text-ink-500 hover:text-ink-800">← Alle klanten</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-bold">{site.name}</h1>
          <StatusBadge status={site.status} />
        </div>
        <a href={`/s/${site.slug}`} target="_blank" rel="noreferrer" className="rounded-xl bg-ink-100 px-4 py-2.5 text-sm font-semibold text-ink-800 hover:bg-ink-200">Bekijk website ↗</a>
      </div>

      <div className="mt-5 mb-5 flex gap-1">
        <Link href={`/admin/sites/${site.id}`} className={tabClass(tab === "instellingen")}>Instellingen &amp; code</Link>
        <Link href={`/admin/sites/${site.id}?tab=inhoud`} className={tabClass(tab === "inhoud")}>Inhoud aanpassen</Link>
      </div>

      {tab === "inhoud" ? (
        <Editor initial={siteContent(site)} initialVersion={site.contentVersion} apiPath={`/api/admin/sites/${site.id}/content`} siteUrl={`/s/${site.slug}`} />
      ) : (
        <>
          <SiteSettings
            site={{
              id: site.id,
              name: site.name,
              slug: site.slug,
              status: site.status,
              domain: site.domain ?? "",
              ownerName: site.ownerName ?? "",
              ownerEmail: site.ownerEmail ?? "",
              ownerPhone: site.ownerPhone ?? "",
              notes: site.notes ?? "",
              codeHint: site.codeHint,
              codeCreatedAt: site.codeCreatedAt.toISOString(),
              codeLastUsedAt: site.codeLastUsedAt?.toISOString() ?? null,
            }}
            loginUrl={`${await appOrigin()}/beheer`}
          />
          <Card className="mt-5">
            <h2 className="font-display text-xl font-bold">Logboek</h2>
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {site.changes.map(c => (
                <li key={c.id} className="flex justify-between gap-4 py-2">
                  <span>{c.action} <span className="text-ink-400">· {c.by === "client" ? "klant" : "beheer"}</span></span>
                  <span className="text-ink-500">{new Intl.DateTimeFormat("nl-BE", { dateStyle: "short", timeStyle: "short" }).format(c.createdAt)}</span>
                </li>
              ))}
              {!site.changes.length && <li className="py-2 text-ink-500">Nog niets gebeurd.</li>}
            </ul>
          </Card>
        </>
      )}
    </AdminShell>
  );
}
