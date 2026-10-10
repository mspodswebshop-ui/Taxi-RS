"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { CodeReveal } from "@/components/code-reveal";
import { Button, Field, Input, Select } from "@/components/ui";

export function NewSiteForm({ templates, loginUrl }: { templates: { id: string; label: string }[]; loginUrl: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", template: templates[0]?.id ?? "", ownerName: "", ownerEmail: "", ownerPhone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ code: string; name: string; id: string } | null>(null);
  const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value })) });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/sites", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error ?? "Aanmaken is niet gelukt.");
    setCreated({ code: data.code, name: form.name, id: data.site.id });
    setForm(f => ({ ...f, name: "", slug: "", ownerName: "", ownerEmail: "", ownerPhone: "" }));
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {!open ? (
        <Button onClick={() => setOpen(true)}>+ Nieuwe klant</Button>
      ) : (
        <form onSubmit={submit} className="w-full rounded-2xl border border-ink-200 bg-white p-5 shadow-sm">
          <h2 className="font-display text-lg font-bold">Nieuwe klantwebsite</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Naam van de zaak"><Input required maxLength={80} placeholder="Idriss Bakkerij" {...field("name")} /></Field>
            <Field label="Adres (optioneel)" hint="Leeg = afgeleid van de naam"><Input maxLength={60} placeholder="idriss-bakkerij" {...field("slug")} /></Field>
            <Field label="Ontwerp">
              <Select {...field("template")}>{templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}</Select>
            </Field>
            <Field label="Contactpersoon"><Input maxLength={80} {...field("ownerName")} /></Field>
            <Field label="E-mail klant"><Input type="email" maxLength={120} {...field("ownerEmail")} /></Field>
            <Field label="Telefoon klant"><Input maxLength={40} {...field("ownerPhone")} /></Field>
          </div>
          {error && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
          <div className="mt-5 flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Bezig…" : "Aanmaken en code maken"}</Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Annuleren</Button>
          </div>
        </form>
      )}
      {created && (
        <CodeReveal
          code={created.code}
          siteName={created.name}
          loginUrl={loginUrl}
          onClose={() => {
            const id = created.id;
            setCreated(null);
            router.push(`/admin/sites/${id}`);
          }}
        />
      )}
    </>
  );
}
