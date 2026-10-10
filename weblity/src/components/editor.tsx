"use client";

/**
 * De editor: hiermee past een klant (of jij als beheerder) de inhoud van een
 * website aan. Dezelfde editor wordt op beide plekken gebruikt; alleen het
 * adres waarnaar opgeslagen wordt, verschilt.
 */

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button, Card, Field, Input, Select, Textarea, Toggle } from "@/components/ui";
import {
  ART,
  ART_LABELS,
  DAY_NAMES,
  PALETTES,
  formatPrice,
  parsePrice,
  type Product,
  type Review,
  type SiteContent,
} from "@/lib/content";

type Props = {
  initial: SiteContent;
  /** Versie van de inhoud waarop deze editor verder bouwt. */
  initialVersion: number;
  /** Waar GET/PUT naartoe gaat. */
  apiPath: string;
  /** Adres van de website, voor de voorbeeldweergave. */
  siteUrl: string;
};

const TABS = [
  { id: "algemeen", label: "Gegevens", icon: "🏪" },
  { id: "home", label: "Homepagina", icon: "🏠" },
  { id: "producten", label: "Producten", icon: "🥖" },
  { id: "uren", label: "Openingsuren", icon: "🕒" },
  { id: "reviews", label: "Reviews", icon: "⭐" },
  { id: "over", label: "Over ons", icon: "📖" },
  { id: "bestellen", label: "Bestellen", icon: "🧺" },
  { id: "kleuren", label: "Kleuren", icon: "🎨" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const newId = (prefix: string) => `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function Editor({ initial, initialVersion, apiPath, siteUrl }: Props) {
  const [content, setContent] = useState<SiteContent>(initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(initial));
  const [tab, setTab] = useState<TabId>("algemeen");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [version, setVersion] = useState(initialVersion);
  const dirty = useMemo(() => JSON.stringify(content) !== saved, [content, saved]);

  // Waarschuwen bij weggaan met niet-opgeslagen wijzigingen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const set = <K extends keyof SiteContent>(key: K, value: SiteContent[K]) => setContent(c => ({ ...c, [key]: value }));
  const setIn = <K extends "business" | "hero" | "about" | "ordering" | "theme">(key: K, patch: Partial<SiteContent[K]>) =>
    setContent(c => ({ ...c, [key]: { ...c[key], ...patch } }));

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch(apiPath, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content, baseVersion: version }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Opslaan is niet gelukt.");
      setSaved(JSON.stringify(content));
      setVersion(data.version);
      setMessage({ kind: "ok", text: "Opgeslagen! Je website is bijgewerkt." });
      setPreviewKey(k => k + 1);
    } catch (e) {
      setMessage({ kind: "error", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  // Ctrl/Cmd+S slaat op.
  const saveRef = useRef(save);
  saveRef.current = save;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const b = content.business;

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] 2xl:grid-cols-[220px_minmax(0,1fr)_420px]">
      {/* Menu */}
      <nav className="-mx-4 flex gap-1 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-none items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition ${
              tab === t.id ? "bg-white text-brand-700 shadow-sm ring-1 ring-ink-200" : "text-ink-600 hover:bg-white/70"
            }`}
          >
            <span aria-hidden="true">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>

      {/* Inhoud */}
      <div className="min-w-0 space-y-5 pb-28">
        {tab === "algemeen" && (
          <Section title="Gegevens van je zaak" intro="Deze gegevens staan op meerdere plekken op je website: bovenaan, in de footer en op de contactpagina.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Naam van de zaak"><Input value={b.name} maxLength={80} onChange={e => setIn("business", { name: e.target.value })} /></Field>
              <Field label="Korte zin onder je naam" hint="Bv. ‘Elke dag vers brood in Boom’"><Input value={b.tagline} maxLength={160} onChange={e => setIn("business", { tagline: e.target.value })} /></Field>
              <Field label="Straat en nummer"><Input value={b.street} maxLength={120} onChange={e => setIn("business", { street: e.target.value })} /></Field>
              <Field label="Postcode en gemeente"><Input value={b.city} maxLength={80} placeholder="2850 Boom" onChange={e => setIn("business", { city: e.target.value })} /></Field>
              <Field label="Telefoon"><Input value={b.phone} maxLength={40} placeholder="03 123 45 67" onChange={e => setIn("business", { phone: e.target.value })} /></Field>
              <Field label="WhatsApp-nummer" hint="Internationaal, alleen cijfers: bv. 32470123456. Bestellingen komen hierop binnen.">
                <Input value={b.whatsapp} inputMode="numeric" placeholder="32470123456" onChange={e => setIn("business", { whatsapp: e.target.value.replace(/\D/g, "").replace(/^00/, "").slice(0, 15) })} />
              </Field>
              <Field label="E-mail (optioneel)"><Input type="email" value={b.email} maxLength={120} onChange={e => setIn("business", { email: e.target.value })} /></Field>
            </div>
          </Section>
        )}

        {tab === "algemeen" && (
          <Section title="Google" intro="Je score en een link naar je Google-pagina, waar klanten ook een review kunnen schrijven.">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Link naar je Google-pagina" className="sm:col-span-3" hint="Begint met https://, bv. de link uit Google Maps → Delen.">
                <Input value={b.googleUrl} maxLength={500} placeholder="https://maps.app.goo.gl/..." onChange={e => setIn("business", { googleUrl: e.target.value.trim() })} />
              </Field>
              <Field label="Gemiddelde score" hint="0 = niet tonen">
                <Input type="number" min={0} max={5} step={0.1} value={b.googleRating} onChange={e => setIn("business", { googleRating: clamp(Number(e.target.value), 0, 5) })} />
              </Field>
              <Field label="Aantal reviews">
                <Input type="number" min={0} step={1} value={b.googleCount} onChange={e => setIn("business", { googleCount: Math.max(0, Math.round(Number(e.target.value) || 0)) })} />
              </Field>
            </div>
          </Section>
        )}

        {tab === "home" && (
          <>
            <Section title="Grote titel bovenaan" intro="Het middelste woord krijgt een opvallende kleur.">
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Begin"><Input value={content.hero.title} maxLength={80} onChange={e => setIn("hero", { title: e.target.value })} /></Field>
                <Field label="Opvallend woord"><Input value={content.hero.highlight} maxLength={40} onChange={e => setIn("hero", { highlight: e.target.value })} /></Field>
                <Field label="Einde"><Input value={content.hero.titleEnd} maxLength={80} onChange={e => setIn("hero", { titleEnd: e.target.value })} /></Field>
              </div>
              <p className="mt-3 rounded-xl bg-ink-50 px-4 py-3 font-display text-lg text-ink-800">
                {content.hero.title} <span style={{ color: content.theme.primary }}>{content.hero.highlight}</span> {content.hero.titleEnd}
              </p>
              <Field label="Introductie" className="mt-4"><Textarea rows={3} maxLength={400} value={content.hero.intro} onChange={e => setIn("hero", { intro: e.target.value })} /></Field>
            </Section>
            <Section title="Drie sterke punten" intro="Staan in de donkere balk onder de titel. Laat leeg wat je niet nodig hebt.">
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map(i => (
                  <Input
                    key={i}
                    value={content.highlights[i] ?? ""}
                    maxLength={60}
                    placeholder={`Punt ${i + 1}`}
                    onChange={e => {
                      set("highlights", [0, 1, 2].map(j => (j === i ? e.target.value : content.highlights[j] ?? "")));
                    }}
                  />
                ))}
              </div>
            </Section>
          </>
        )}

        {tab === "producten" && <Products content={content} setContent={setContent} />}

        {tab === "uren" && (
          <Section title="Openingsuren" intro="Op je website staat automatisch of je nu open of gesloten bent.">
            <div className="divide-y divide-ink-100">
              {[1, 2, 3, 4, 5, 6, 0].map(i => {
                const h = content.hours[i];
                const update = (patch: Partial<typeof h>) => set("hours", content.hours.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                return (
                  <div key={i} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="w-24 text-sm font-medium">{DAY_NAMES[i]}</span>
                    <Toggle checked={!h.closed} onChange={v => update({ closed: !v })} label={h.closed ? "Gesloten" : "Open"} />
                    {!h.closed && (
                      <span className="flex items-center gap-2">
                        <Input type="time" value={h.open} onChange={e => e.target.value && update({ open: e.target.value })} className="w-32" aria-label={`${DAY_NAMES[i]} open`} />
                        <span className="text-ink-400">tot</span>
                        <Input type="time" value={h.close} onChange={e => e.target.value && update({ close: e.target.value })} className="w-32" aria-label={`${DAY_NAMES[i]} sluit`} />
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <Field label="Extra melding (optioneel)" className="mt-4" hint="Bv. ‘Op feestdagen open tot 12:00’ of ‘Gesloten van 1 tot 15 augustus’">
              <Input value={content.hoursNote} maxLength={200} onChange={e => set("hoursNote", e.target.value)} />
            </Field>
          </Section>
        )}

        {tab === "reviews" && <Reviews content={content} setContent={setContent} />}

        {tab === "over" && (
          <Section title="Over ons" intro="Vertel je verhaal. Een witregel begint een nieuwe alinea.">
            <Field label="Titel"><Input value={content.about.title} maxLength={100} onChange={e => setIn("about", { title: e.target.value })} /></Field>
            <Field label="Tekst" className="mt-4"><Textarea rows={10} maxLength={3000} value={content.about.body} onChange={e => setIn("about", { body: e.target.value })} /></Field>
            <Field label="Citaat (optioneel)" className="mt-4"><Input value={content.about.quote} maxLength={200} onChange={e => setIn("about", { quote: e.target.value })} /></Field>
          </Section>
        )}

        {tab === "bestellen" && (
          <Section title="Bestellen via WhatsApp" intro="Klanten stellen een mandje samen en sturen dat als WhatsApp-bericht naar jou. Betalen gebeurt bij het afhalen.">
            <Toggle checked={content.ordering.enabled} onChange={v => setIn("ordering", { enabled: v })} label="Bestellen aanzetten op mijn website" />
            {content.ordering.enabled && !b.whatsapp && (
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Vul eerst je WhatsApp-nummer in bij <b>Gegevens</b>, anders komen er geen bestellingen binnen.</p>
            )}
            <Field label="Begin van het bericht" className="mt-5"><Input value={content.ordering.greeting} maxLength={80} onChange={e => setIn("ordering", { greeting: e.target.value })} /></Field>
            <Field label="Opmerking bij bestellen" className="mt-4" hint="Bv. ‘Taarten minstens 48 uur op voorhand bestellen’"><Input value={content.ordering.note} maxLength={300} onChange={e => setIn("ordering", { note: e.target.value })} /></Field>
          </Section>
        )}

        {tab === "kleuren" && (
          <Section title="Kleuren" intro="Kies een kleurenset of stel je eigen kleuren in.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
              {PALETTES.map(p => {
                const active = p.primary === content.theme.primary && p.accent === content.theme.accent && p.secondary === content.theme.secondary;
                return (
                  <button
                    key={p.name}
                    onClick={() => setIn("theme", { primary: p.primary, accent: p.accent, secondary: p.secondary })}
                    className={`rounded-2xl border p-3 text-left transition ${active ? "border-brand-500 ring-4 ring-brand-100" : "border-ink-200 hover:border-ink-300"}`}
                  >
                    <span className="flex gap-1">
                      {[p.primary, p.accent, p.secondary].map(col => <span key={col} className="h-8 flex-1 rounded-lg" style={{ background: col }} />)}
                    </span>
                    <span className="mt-2 block text-sm font-medium">{p.name}</span>
                  </button>
                );
              })}
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {([["primary", "Hoofdkleur", "Knoppen, titels"], ["accent", "Accent", "Sterren, details"], ["secondary", "Tweede kleur", "Grote blokken"]] as const).map(([k, label, hint]) => (
                <Field key={k} label={label} hint={hint}>
                  <span className="flex items-center gap-3">
                    <input type="color" value={content.theme[k]} onChange={e => setIn("theme", { [k]: e.target.value })} className="h-11 w-14 cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />
                    <code className="text-sm text-ink-500">{content.theme[k]}</code>
                  </span>
                </Field>
              ))}
            </div>
          </Section>
        )}
      </div>

      {/* Voorbeeld */}
      <aside className="hidden 2xl:block">
        <div className="sticky top-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium text-ink-600">Voorbeeld {dirty && <span className="text-ink-400">(na opslaan)</span>}</span>
            <a href={siteUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-700 hover:underline">Openen ↗</a>
          </div>
          <div className="h-[78vh] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-sm">
            <iframe key={previewKey} src={siteUrl} title="Voorbeeld van je website" className="h-[156%] w-[200%] origin-top-left scale-50 border-0" />
          </div>
        </div>
      </aside>

      {/* Opslaan-balk */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-ink-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className={`text-sm ${message?.kind === "error" ? "text-red-700" : message ? "text-emerald-700" : "text-ink-500"}`} role="status">
            {message?.text ?? (dirty ? "Je hebt wijzigingen die nog niet opgeslagen zijn." : "Alles is opgeslagen.")}
          </p>
          <div className="flex gap-2">
            {dirty && (
              <Button variant="secondary" onClick={() => { setContent(JSON.parse(saved)); setMessage(null); }}>Ongedaan maken</Button>
            )}
            <Button onClick={save} disabled={!dirty || saving}>{saving ? "Bezig…" : "Opslaan"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min;
}

function Section({ title, intro, children, action }: { title: string; intro?: string; children: ReactNode; action?: ReactNode }) {
  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold text-ink-900">{title}</h2>
          {intro && <p className="mt-1 text-sm text-ink-500">{intro}</p>}
        </div>
        {action}
      </div>
      {children}
    </Card>
  );
}

/* ---------- producten ---------- */

function PriceInput({ cents, onChange }: { cents: number; onChange: (c: number) => void }) {
  const [text, setText] = useState(() => (cents / 100).toFixed(2).replace(".", ","));
  const [bad, setBad] = useState(false);
  return (
    <Input
      value={text}
      inputMode="decimal"
      aria-invalid={bad}
      className={bad ? "border-red-400" : ""}
      onChange={e => {
        setText(e.target.value);
        const v = parsePrice(e.target.value);
        setBad(v === null);
        if (v !== null) onChange(v);
      }}
      onBlur={() => !bad && setText((cents / 100).toFixed(2).replace(".", ","))}
    />
  );
}

type SetContent = React.Dispatch<React.SetStateAction<SiteContent>>;

function Products({ content, setContent }: { content: SiteContent; setContent: SetContent }) {
  const [newCat, setNewCat] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const products = content.products;

  const setProducts = (fn: (p: Product[]) => Product[]) => setContent(c => ({ ...c, products: fn(c.products) }));
  const update = (id: string, patch: Partial<Product>) => setProducts(ps => ps.map(p => (p.id === id ? { ...p, ...patch } : p)));
  const move = (i: number, dir: -1 | 1) =>
    setProducts(ps => {
      const j = i + dir;
      if (j < 0 || j >= ps.length) return ps;
      const next = [...ps];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = () => {
    const id = newId("p");
    setProducts(ps => [
      ...ps,
      { id, name: "Nieuw product", description: "", priceCents: 0, category: content.categories[0] ?? "", art: "loaf", featured: false, visible: true },
    ]);
    setOpen(id);
  };

  return (
    <>
      <Section title="Categorieën" intro="Op je website kunnen bezoekers per categorie filteren.">
        <div className="flex flex-wrap gap-2">
          {content.categories.map(cat => (
            <span key={cat} className="inline-flex items-center gap-1.5 rounded-full bg-ink-100 py-1.5 pr-1.5 pl-3.5 text-sm">
              {cat}
              <button
                className="grid h-6 w-6 place-items-center rounded-full text-ink-500 hover:bg-ink-200"
                aria-label={`${cat} verwijderen`}
                onClick={() => {
                  const used = products.filter(p => p.category === cat).length;
                  if (used && !confirm(`${used} product(en) staan in "${cat}". Die krijgen geen categorie meer. Doorgaan?`)) return;
                  setContent(c => ({
                    ...c,
                    categories: c.categories.filter(x => x !== cat),
                    products: c.products.map(p => (p.category === cat ? { ...p, category: "" } : p)),
                  }));
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <form
          className="mt-4 flex gap-2"
          onSubmit={e => {
            e.preventDefault();
            const v = newCat.trim();
            if (!v || content.categories.includes(v)) return;
            setContent(c => ({ ...c, categories: [...c.categories, v] }));
            setNewCat("");
          }}
        >
          <Input value={newCat} maxLength={40} placeholder="Nieuwe categorie" onChange={e => setNewCat(e.target.value)} className="max-w-xs" />
          <Button type="submit" variant="secondary">Toevoegen</Button>
        </form>
      </Section>

      <Section
        title={`Producten (${products.length})`}
        intro="Klik op een product om het aan te passen. ★ = staat op de homepagina."
        action={<Button onClick={add}>+ Product</Button>}
      >
        <ul className="divide-y divide-ink-100">
          {products.map((p, i) => (
            <li key={p.id} className="py-2">
              <div className="flex items-center gap-2">
                <button className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-ink-50" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                  <span className={`min-w-0 flex-1 truncate font-medium ${p.visible ? "" : "text-ink-400 line-through"}`}>
                    {p.featured && <span className="mr-1 text-amber-500">★</span>}
                    {p.name}
                  </span>
                  <span className="hidden text-sm text-ink-500 sm:inline">{p.category}</span>
                  <span className="w-20 text-right text-sm font-medium tabular-nums">{formatPrice(p.priceCents)}</span>
                </button>
                <span className="flex">
                  <button className="h-8 w-8 rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Omhoog">↑</button>
                  <button className="h-8 w-8 rounded-lg text-ink-500 hover:bg-ink-100 disabled:opacity-30" disabled={i === products.length - 1} onClick={() => move(i, 1)} aria-label="Omlaag">↓</button>
                </span>
              </div>
              {open === p.id && (
                <div className="mt-2 grid gap-4 rounded-2xl bg-ink-50 p-4 sm:grid-cols-2">
                  <Field label="Naam"><Input value={p.name} maxLength={80} onChange={e => update(p.id, { name: e.target.value })} /></Field>
                  <Field label="Prijs (€)"><PriceInput cents={p.priceCents} onChange={v => update(p.id, { priceCents: v })} /></Field>
                  <Field label="Beschrijving" className="sm:col-span-2"><Input value={p.description} maxLength={240} onChange={e => update(p.id, { description: e.target.value })} /></Field>
                  <Field label="Categorie">
                    <Select value={p.category} onChange={e => update(p.id, { category: e.target.value })}>
                      <option value="">— geen —</option>
                      {content.categories.map(c => <option key={c}>{c}</option>)}
                    </Select>
                  </Field>
                  <Field label="Tekening">
                    <Select value={p.art} onChange={e => update(p.id, { art: e.target.value as Product["art"] })}>
                      {ART.map(a => <option key={a} value={a}>{ART_LABELS[a]}</option>)}
                    </Select>
                  </Field>
                  <div className="flex flex-wrap gap-5 sm:col-span-2">
                    <Toggle checked={p.visible} onChange={v => update(p.id, { visible: v })} label="Zichtbaar op de website" />
                    <Toggle checked={p.featured} onChange={v => update(p.id, { featured: v })} label="Op de homepagina (★)" />
                  </div>
                  <div className="sm:col-span-2">
                    <Button
                      variant="danger"
                      onClick={() => {
                        if (confirm(`"${p.name}" verwijderen?`)) setProducts(ps => ps.filter(x => x.id !== p.id));
                      }}
                    >
                      Verwijderen
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
        {!products.length && <p className="text-sm text-ink-500">Nog geen producten. Klik op ‘+ Product’.</p>}
      </Section>
    </>
  );
}

/* ---------- reviews ---------- */

function Reviews({ content, setContent }: { content: SiteContent; setContent: SetContent }) {
  const reviews = content.reviews;
  const setReviews = (fn: (r: Review[]) => Review[]) => setContent(c => ({ ...c, reviews: fn(c.reviews) }));
  const update = (id: string, patch: Partial<Review>) => setReviews(rs => rs.map(r => (r.id === id ? { ...r, ...patch } : r)));

  return (
    <Section
      title={`Reviews (${reviews.length})`}
      intro="Zet hier reviews die klanten echt over je zaak schreven, bv. op Google. Vraag even of ze ermee akkoord zijn."
      action={
        <Button onClick={() => setReviews(rs => [{ id: newId("r"), name: "", when: "", stars: 5, text: "", tags: [] }, ...rs])}>+ Review</Button>
      }
    >
      <Toggle checked={content.showReviews} onChange={v => setContent(c => ({ ...c, showReviews: v }))} label="Reviews tonen op mijn website" />
      <div className="mt-5 space-y-4">
        {reviews.map(r => (
          <div key={r.id} className="rounded-2xl bg-ink-50 p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
              <Field label="Naam"><Input value={r.name} maxLength={60} placeholder="Sara B." onChange={e => update(r.id, { name: e.target.value })} /></Field>
              <Field label="Wanneer"><Input value={r.when} maxLength={40} placeholder="2 weken geleden" onChange={e => update(r.id, { when: e.target.value })} /></Field>
              <Field label="Sterren">
                <span className="flex h-[42px] items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button" aria-label={`${n} sterren`} onClick={() => update(r.id, { stars: n })} className={`text-2xl leading-none ${n <= r.stars ? "text-amber-500" : "text-ink-300"}`}>★</button>
                  ))}
                </span>
              </Field>
            </div>
            <Field label="Tekst" className="mt-3"><Textarea rows={3} maxLength={800} value={r.text} onChange={e => update(r.id, { text: e.target.value })} /></Field>
            <Field label="Labels (optioneel, met komma's)" className="mt-3">
              <Input
                defaultValue={r.tags.join(", ")}
                placeholder="Brood, Vriendelijk"
                onBlur={e => update(r.id, { tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean).slice(0, 6) })}
              />
            </Field>
            <Button variant="danger" className="mt-3" onClick={() => confirm("Deze review verwijderen?") && setReviews(rs => rs.filter(x => x.id !== r.id))}>Verwijderen</Button>
          </div>
        ))}
        {!reviews.length && <p className="text-sm text-ink-500">Nog geen reviews. Zolang er geen zijn, verschijnt de reviewpagina niet op je website.</p>}
      </div>
    </Section>
  );
}
