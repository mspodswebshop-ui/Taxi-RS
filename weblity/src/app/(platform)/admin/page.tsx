import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin-shell";
import { NewSiteForm } from "@/components/new-site-form";
import { StatusBadge } from "@/components/ui";
import { currentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { appOrigin } from "@/lib/urls";
import { getTemplate, TEMPLATES } from "@/templates";

export const metadata: Metadata = { title: "Klanten", robots: { index: false } };

const fmt = (d: Date | null) => (d ? new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium" }).format(d) : "—");

export default async function AdminHome() {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");

  const sites = await db.site.findMany({
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, slug: true, status: true, template: true, domain: true, ownerName: true, codeHint: true, codeLastUsedAt: true, updatedAt: true },
  });
  const counts = { live: 0, concept: 0, offline: 0 } as Record<string, number>;
  for (const s of sites) counts[s.status] = (counts[s.status] ?? 0) + 1;

  return (
    <AdminShell name={admin.name}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Klanten</h1>
          <p className="mt-1 text-sm text-ink-500">
            {sites.length} website{sites.length === 1 ? "" : "s"} · {counts.live} live · {counts.concept} concept · {counts.offline} offline
          </p>
        </div>
      </div>

      <div className="mt-5">
        <NewSiteForm templates={TEMPLATES.map(t => ({ id: t.id, label: t.label }))} loginUrl={`${await appOrigin()}/beheer`} />
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
        {sites.length === 0 ? (
          <p className="p-8 text-center text-ink-500">Nog geen klanten. Maak je eerste website aan met ‘+ Nieuwe klant’.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 bg-ink-50 text-xs uppercase tracking-wide text-ink-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Website</th>
                <th className="hidden px-4 py-3 font-semibold md:table-cell">Klant</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="hidden px-4 py-3 font-semibold lg:table-cell">Code</th>
                <th className="hidden px-4 py-3 font-semibold sm:table-cell">Gewijzigd</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {sites.map(s => (
                <tr key={s.id} className="hover:bg-ink-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/sites/${s.id}`} className="font-semibold text-ink-900 hover:text-brand-700">{s.name}</Link>
                    <div className="text-xs text-ink-500">{s.domain ?? `/s/${s.slug}`} · {getTemplate(s.template).label}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 md:table-cell">{s.ownerName ?? "—"}</td>
                  <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  <td className="hidden px-4 py-3 lg:table-cell">
                    <span className="font-mono text-xs">…{s.codeHint}</span>
                    <div className="text-xs text-ink-500">{s.codeLastUsedAt ? `gebruikt ${fmt(s.codeLastUsedAt)}` : "nog niet gebruikt"}</div>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-600 sm:table-cell">{fmt(s.updatedAt)}</td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <a href={`/s/${s.slug}`} target="_blank" rel="noreferrer" className="mr-3 text-ink-500 hover:text-ink-800">Bekijk ↗</a>
                    <Link href={`/admin/sites/${s.id}`} className="font-semibold text-brand-700 hover:underline">Beheren</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </AdminShell>
  );
}
