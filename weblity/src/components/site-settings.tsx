"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CodeReveal } from "@/components/code-reveal";
import { Button, Card, Field, Input, Select, Textarea } from "@/components/ui";

type SiteInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  domain: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  notes: string;
  codeHint: string;
  codeCreatedAt: string;
  codeLastUsedAt: string | null;
};

const fmt = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "nog nooit";

export function SiteSettings({ site, loginUrl }: { site: SiteInfo; loginUrl: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    status: site.status,
    slug: site.slug,
    domain: site.domain,
    ownerName: site.ownerName,
    ownerEmail: site.ownerEmail,
    ownerPhone: site.ownerPhone,
    notes: site.notes,
  });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value })) });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/sites/${site.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg({ ok: false, text: data.error ?? "Opslaan is niet gelukt." });
    setMsg({ ok: true, text: "Instellingen opgeslagen." });
    setForm(f => ({ ...f, domain: data.site.domain ?? "" }));
    router.refresh();
  }

  async function newCode() {
    if (!confirm("Een nieuwe code maken? De huidige code werkt dan meteen niet meer en de klant wordt uitgelogd.")) return;
    const res = await fetch(`/api/admin/sites/${site.id}/code`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return alert(data.error ?? "Dat is niet gelukt.");
    setCode(data.code);
    router.refresh();
  }

  async function remove() {
    const answer = prompt(`Dit verwijdert de website van ${site.name} definitief. Typ de naam van het adres (${site.slug}) om te bevestigen.`);
    if (answer?.trim() !== site.slug) return;
    await fetch(`/api/admin/sites/${site.id}`, { method: "DELETE" });
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card>
        <h2 className="font-display text-xl font-bold">Klantcode</h2>
        <p className="mt-1 text-sm text-ink-500">Met deze code past de klant zijn website aan op <b>{loginUrl}</b>.</p>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          <dt className="text-ink-500">Code</dt><dd className="font-mono">WBL-••••-••••-{site.codeHint}</dd>
          <dt className="text-ink-500">Gemaakt</dt><dd>{fmt(site.codeCreatedAt)}</dd>
          <dt className="text-ink-500">Laatst gebruikt</dt><dd>{fmt(site.codeLastUsedAt)}</dd>
        </dl>
        <Button variant="secondary" className="mt-5" onClick={newCode}>Nieuwe code maken</Button>
      </Card>

      <form onSubmit={save} className="contents">
        <Card>
          <h2 className="font-display text-xl font-bold">Publicatie</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Status" hint="Concept = met conceptbalk, niet in Google">
              <Select {...field("status")}>
                <option value="concept">Concept</option>
                <option value="live">Live</option>
                <option value="offline">Offline</option>
              </Select>
            </Field>
            <Field label="Adres op Weblity" hint={`/s/${form.slug}`}><Input required maxLength={60} {...field("slug")} /></Field>
            <Field label="Eigen domein (optioneel)" className="sm:col-span-2" hint="Bv. idrissbakkerij.be. Laat het domein bij de provider naar de Weblity-server wijzen.">
              <Input maxLength={120} placeholder="bakkerij.be" {...field("domain")} />
            </Field>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="font-display text-xl font-bold">Klantgegevens <span className="text-sm font-normal text-ink-500">(alleen voor jou)</span></h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Field label="Contactpersoon"><Input maxLength={80} {...field("ownerName")} /></Field>
            <Field label="E-mail"><Input type="email" maxLength={120} {...field("ownerEmail")} /></Field>
            <Field label="Telefoon"><Input maxLength={40} {...field("ownerPhone")} /></Field>
            <Field label="Notities" className="sm:col-span-3"><Textarea rows={3} maxLength={2000} placeholder="Bv. afspraken, prijs, wanneer live" {...field("notes")} /></Field>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button type="submit" disabled={busy}>{busy ? "Bezig…" : "Instellingen opslaan"}</Button>
              {msg && <span className={`text-sm ${msg.ok ? "text-emerald-700" : "text-red-700"}`} role="status">{msg.text}</span>}
            </div>
            <Button type="button" variant="danger" onClick={remove}>Website verwijderen</Button>
          </div>
        </Card>
      </form>

      {code && <CodeReveal code={code} siteName={site.name} loginUrl={loginUrl} onClose={() => setCode(null)} />}
    </div>
  );
}
