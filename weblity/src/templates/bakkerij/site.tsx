"use client";

/**
 * Ontwerp "bakkerij": de publieke website van een klant.
 *
 * Alle teksten, producten, uren, reviews en kleuren komen uit de inhoud die
 * de klant in zijn beheeromgeving invult. React toont alles als tekst, dus
 * wat een klant ook intypt, het wordt nooit als HTML of script uitgevoerd.
 */

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";

import { DAY_NAMES, formatPrice, type Product, type Review, type SiteContent } from "@/lib/content";
import { PAGES, type PagePath } from "@/templates";

type Props = {
  content: SiteContent;
  page: PagePath;
  /** Begin van elk adres: "/s/slug" op het platform, "" op een eigen domein. */
  base: string;
  slug: string;
  concept: boolean;
  /** Voorbeeldweergave in de editor: links en bestellen doen dan niets. */
  preview?: boolean;
};

/* ---------- kleine hulpjes ---------- */

const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

function shade(hex: string, amount: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * (1 + amount))));
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

const stars = (n: number) => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
const ratingText = (n: number) => n.toFixed(1).replace(".", ",");
const AVATAR_COLORS = ["#b5492b", "#2c4a9a", "#4f6b45", "#c7712a", "#7a3e6b", "#2f7f7a"];
const BGS = ["bg1", "bg3", "bg4", "bg5", "bg2"];

function openStatus(hours: SiteContent["hours"], now: Date): { open: boolean; text: string } {
  const d = now.getDay(), mins = now.getHours() * 60 + now.getMinutes();
  const today = hours[d];
  if (!today.closed && mins >= toMin(today.open) && mins < toMin(today.close)) {
    return { open: true, text: `Nu open · tot ${today.close}` };
  }
  for (let k = 0; k < 7; k++) {
    const i = (d + k) % 7, h = hours[i];
    if (h.closed || (k === 0 && mins >= toMin(h.open))) continue;
    const when = k === 0 ? `opent om ${h.open}` : k === 1 ? `morgen open om ${h.open}` : `${DAY_NAMES[i].toLowerCase()} open om ${h.open}`;
    return { open: false, text: `Nu gesloten · ${when}` };
  }
  return { open: false, text: "Nu gesloten" };
}

/* ---------- winkelmandje ---------- */

function useCart(slug: string, products: Product[]) {
  const key = `weblity-cart-${slug}`;
  const [cart, setCart] = useState<Record<string, number>>({});

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(key) || "{}") as Record<string, number>;
      // Producten die intussen verdwenen zijn, vallen eruit.
      const valid = Object.fromEntries(Object.entries(saved).filter(([id, n]) => n > 0 && products.some(p => p.id === id)));
      setCart(valid);
    } catch {
      /* geen opslag beschikbaar: dan maar een leeg mandje */
    }
  }, [key, products]);

  const change = useCallback(
    (id: string, delta: number) => {
      setCart(prev => {
        const next = { ...prev, [id]: Math.max(0, (prev[id] || 0) + delta) };
        if (!next[id]) delete next[id];
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {}
        return next;
      });
    },
    [key],
  );

  const count = Object.values(cart).reduce((a, b) => a + b, 0);
  const total = Object.entries(cart).reduce((sum, [id, n]) => sum + (products.find(p => p.id === id)?.priceCents ?? 0) * n, 0);
  return { cart, change, count, total };
}

/* ---------- tekeningen ---------- */

function Sprite() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        <linearGradient id="crust" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#e6a557" /><stop offset="1" stopColor="#9a531d" /></linearGradient>
        <linearGradient id="flat" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f3d39c" /><stop offset="1" stopColor="#c98a43" /></linearGradient>
        <symbol id="loaf" viewBox="0 0 120 80"><path d="M10 60 C10 20 40 8 60 8 C80 8 110 20 110 60 Q110 72 98 72 H22 Q10 72 10 60Z" fill="url(#crust)" /><path d="M35 28 l12 18 M55 22 l12 20 M75 26 l12 18" stroke="#f6d39c" strokeWidth="5" strokeLinecap="round" /></symbol>
        <symbol id="baguette" viewBox="0 0 120 80"><rect x="6" y="30" width="108" height="26" rx="13" fill="url(#crust)" transform="rotate(-12 60 43)" /><path d="M26 44 l10 -8 M48 40 l10 -8 M70 35 l10 -8 M92 31 l8 -6" stroke="#f6d39c" strokeWidth="4" strokeLinecap="round" /></symbol>
        <symbol id="round" viewBox="0 0 120 80"><ellipse cx="60" cy="48" rx="52" ry="26" fill="url(#flat)" /><ellipse cx="60" cy="44" rx="40" ry="17" fill="#e8b878" opacity=".6" /><g fill="#7a4a24" opacity=".55"><circle cx="45" cy="42" r="1.8" /><circle cx="60" cy="38" r="1.8" /><circle cx="75" cy="44" r="1.8" /><circle cx="54" cy="50" r="1.8" /><circle cx="68" cy="52" r="1.8" /></g></symbol>
        <symbol id="square" viewBox="0 0 120 80"><rect x="22" y="14" width="76" height="56" rx="8" fill="url(#flat)" transform="rotate(-6 60 42)" /><path d="M30 30 H90 M30 44 H90 M30 58 H90" stroke="#b9772f" strokeWidth="2" opacity=".45" transform="rotate(-6 60 42)" /></symbol>
        <symbol id="croissant" viewBox="0 0 120 80"><path d="M12 54 Q20 22 60 18 Q100 22 108 54 Q96 46 86 50 Q74 36 60 36 Q46 36 34 50 Q24 46 12 54Z" fill="url(#crust)" /><path d="M44 24 L50 44 M60 20 V40 M76 24 L70 44" stroke="#f6d39c" strokeWidth="3" strokeLinecap="round" /></symbol>
        <symbol id="cookie" viewBox="0 0 120 80"><circle cx="45" cy="44" r="24" fill="#e9c48a" /><path d="M33 36 l4 -3 M50 34 l4 2 M42 50 l4 -2 M55 48 l3 3" stroke="#b07a3a" strokeWidth="2.5" strokeLinecap="round" /><circle cx="80" cy="40" r="22" fill="#c98a43" /><circle cx="80" cy="40" r="14" fill="none" stroke="#f3d39c" strokeWidth="3" strokeDasharray="4 5" /></symbol>
        <symbol id="cake" viewBox="0 0 120 80"><rect x="24" y="36" width="72" height="34" rx="6" fill="#f3d9bd" /><rect x="24" y="36" width="72" height="10" rx="5" fill="#fff6ea" /><path d="M24 50 H96" stroke="var(--terracotta)" strokeWidth="4" /><circle cx="44" cy="30" r="5" fill="var(--terracotta)" /><circle cx="60" cy="28" r="5" fill="var(--terracotta)" /><circle cx="76" cy="30" r="5" fill="var(--terracotta)" /></symbol>
        <symbol id="wheat" viewBox="0 0 24 24"><path d="M12 22V8" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" /><g fill="currentColor"><ellipse cx="9" cy="10" rx="2.2" ry="3.4" transform="rotate(-30 9 10)" /><ellipse cx="15" cy="10" rx="2.2" ry="3.4" transform="rotate(30 15 10)" /><ellipse cx="9" cy="15" rx="2.2" ry="3.4" transform="rotate(-30 9 15)" /><ellipse cx="15" cy="15" rx="2.2" ry="3.4" transform="rotate(30 15 15)" /><ellipse cx="12" cy="5" rx="2" ry="3.2" /></g></symbol>
        <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z" fill="none" stroke="currentColor" strokeWidth="2" /><circle cx="12" cy="10" r="2.5" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
        <symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2z" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
        <symbol id="i-chat" viewBox="0 0 24 24"><path d="M20 12a8 8 0 0 1-11.8 7L4 20l1.1-4A8 8 0 1 1 20 12z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
        <symbol id="i-mail" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M3 7l9 6 9-6" fill="none" stroke="currentColor" strokeWidth="2" /></symbol>
        <symbol id="i-heart" viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></symbol>
        <symbol id="i-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></symbol>
      </defs>
    </svg>
  );
}

const Art = ({ id, className }: { id: string; className?: string }) => (
  <svg viewBox="0 0 120 80" className={className} aria-hidden="true"><use href={`#${id}`} /></svg>
);
const Icon = ({ id }: { id: string }) => (
  <svg aria-hidden="true"><use href={`#${id}`} /></svg>
);

/* ---------- bouwstenen ---------- */

function StatusBadge({ status, dark = false }: { status: { open: boolean; text: string } | null; dark?: boolean }) {
  return (
    <span className="badge" style={dark ? { background: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.15)", color: "#f6e7cf" } : undefined}>
      <span className={`dot ${status ? (status.open ? "open" : "closed") : ""}`} />
      <span>{status?.text ?? "Openingsuren"}</span>
    </span>
  );
}

function Card({ p, i, onAdd }: { p: Product; i: number; onAdd?: (p: Product) => void }) {
  return (
    <article className="card">
      <div className={`art ${BGS[i % BGS.length]}`}>
        {p.category && <span className="tag">{p.category}</span>}
        <Art id={p.art} />
      </div>
      <div className="body">
        <h3>{p.name}</h3>
        <p>{p.description}</p>
        <div className="row">
          <span className="price">{formatPrice(p.priceCents)}</span>
          {onAdd && (
            <button className="add" type="button" aria-label={`${p.name} toevoegen`} onClick={() => onAdd(p)}>+</button>
          )}
        </div>
      </div>
    </article>
  );
}

function ReviewCard({ r, i }: { r: Review; i: number }) {
  return (
    <article className="review">
      <header>
        <span className="avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>
          {r.name.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        </span>
        <span className="who"><b>{r.name}</b><span>{r.when}</span></span>
      </header>
      <span className="stars" aria-label={`${r.stars} van 5 sterren`}>{stars(r.stars)}</span>
      <p>{r.text}</p>
      {r.tags.length > 0 && <div className="liked">{r.tags.map(t => <span className="chip" key={t}>{t}</span>)}</div>}
    </article>
  );
}

function PageHead({ title, intro, crumb, home }: { title: string; intro: string; crumb: string; home: string }) {
  return (
    <header className="page-head">
      <div className="wrap">
        <div className="crumbs"><Link href={home}>Home</Link> / {crumb}</div>
        <h1>{title}</h1>
        {intro && <p>{intro}</p>}
      </div>
    </header>
  );
}

function Cta({ title, text, to, label }: { title: string; text: string; to: string; label: string }) {
  return (
    <section style={{ paddingTop: 0 }}>
      <div className="wrap">
        <div className="cta">
          <div><h2>{title}</h2><p>{text}</p></div>
          <Link href={to} className="btn light">{label}</Link>
        </div>
      </div>
    </section>
  );
}

function HoursTable({ hours, today }: { hours: SiteContent["hours"]; today: number }) {
  return (
    <table className="hours">
      <tbody>
        {[1, 2, 3, 4, 5, 6, 0].map(i => {
          const h = hours[i];
          return (
            <tr key={i} className={i === today ? "today" : undefined}>
              <td>{DAY_NAMES[i]}{i === today ? " (vandaag)" : ""}</td>
              <td>{h.closed ? "Gesloten" : `${h.open} – ${h.close}`}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

const TIMES: string[] = [];
for (let m = toMin("06:00"); m <= toMin("20:00"); m += 30) {
  TIMES.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
}

/* ---------- de site ---------- */

export default function BakkerijSite({ content: c, page, base, slug, concept, preview = false }: Props) {
  const products = useMemo(() => c.products.filter(p => p.visible), [c.products]);
  const { cart, change, count, total } = useCart(slug, products);
  const [menuOpen, setMenuOpen] = useState(false);
  const [status, setStatus] = useState<{ open: boolean; text: string } | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Staat van de afzonderlijke pagina's. Die staat hier bovenaan, zodat hij
  // niet verloren gaat als het mandje of de klok de site opnieuw tekent.
  const [cat, setCat] = useState("Alles");
  const [reviewFilter, setReviewFilter] = useState(0);
  const [form, setForm] = useState({ name: "", phone: "", date: "", time: "08:00", msg: "" });
  const [today, setToday] = useState("");

  useEffect(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    const iso = d.toISOString().slice(0, 10);
    setToday(iso);
    setForm(f => (f.date ? f : { ...f, date: iso }));
  }, []);

  // Open/gesloten hangt af van de klok van de bezoeker; pas na het laden
  // berekenen, anders verschilt de server-HTML van wat de browser toont.
  useEffect(() => {
    const tick = () => setStatus(openStatus(c.hours, new Date()));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [c.hours]);

  const notify = (msg: string) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  };
  const add = (p: Product) => {
    change(p.id, 1);
    notify(`${p.name} toegevoegd`);
  };

  const b = c.business;
  const showReviews = c.showReviews && c.reviews.length > 0;
  const hasRating = b.googleRating > 0;
  const address = [b.street, b.city].filter(Boolean).join(", ");
  const href = (path: string) => (preview ? "#" : `${base}/${path}`.replace(/\/$/, "") || "/");
  const visiblePages = PAGES.filter(
    p => (p.path !== "reviews" || showReviews) && (p.path !== "bestellen" || c.ordering.enabled),
  );

  const style = {
    "--terracotta": c.theme.primary,
    "--terracotta-dark": shade(c.theme.primary, -0.25),
    "--saffron": c.theme.accent,
    "--majorelle": c.theme.secondary,
    "--majorelle-dark": shade(c.theme.secondary, -0.3),
  } as CSSProperties;

  const Nav = (
    <nav className={`nav${menuOpen ? " open" : ""}`}>
      <div className="wrap">
        <Link href={href("")} className="logo">
          <svg viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="var(--terracotta)" /><use href="#wheat" x="8" y="8" width="24" height="24" style={{ color: "#f6c77f" }} /></svg>
          {b.name}
        </Link>
        <button className="burger" aria-label="Menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><span /></button>
        <div className="menu">
          {visiblePages.map(p => (
            <Link
              key={p.path}
              href={href(p.path)}
              className={p.path === "bestellen" ? "btn" : undefined}
              aria-current={p.path === page ? "page" : undefined}
              onClick={() => setMenuOpen(false)}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );

  let main: ReactNode;
  switch (page) {
    case "assortiment":
      main = Assortiment();
      break;
    case "over-ons":
      main = OverOns();
      break;
    case "reviews":
      main = Reviews();
      break;
    case "bestellen":
      main = Bestellen();
      break;
    case "contact":
      main = Contact();
      break;
    default:
      main = Home();
  }

  function Home() {
    const featured = products.filter(p => p.featured).slice(0, 8);
    return (
      <>
        <header className="hero">
          <div className="wrap">
            <div>
              <StatusBadge status={status} />
              <h1>
                {c.hero.title} {c.hero.highlight && <em>{c.hero.highlight}</em>} {c.hero.titleEnd}
              </h1>
              <p className="lead">{c.hero.intro}</p>
              <div className="actions">
                {c.ordering.enabled && <Link href={href("bestellen")} className="btn">Bestel vooraf</Link>}
                <Link href={href("assortiment")} className="btn ghost">Bekijk assortiment</Link>
              </div>
            </div>
            <div className="hero-art" aria-hidden="true">
              <Art id="loaf" />
              {address && <div className="sticker s1">{b.street}<span>{b.city}</span></div>}
              {hasRating && (
                <div className="sticker s2"><span className="stars">{stars(b.googleRating)}</span><span><b>{ratingText(b.googleRating)}</b> op Google</span></div>
              )}
            </div>
          </div>
        </header>

        {c.highlights.some(h => h.trim()) && (
          <div className="strip">
            <div className="wrap">
              {c.highlights.filter(h => h.trim()).map(h => <div key={h}><Icon id="wheat" /> {h}</div>)}
            </div>
          </div>
        )}

        <section>
          <div className="wrap">
            <div className="tiles">
              <Link className="tile t1" href={href("assortiment")}>
                <Art id="croissant" className="icon" /><span className="arrow">→</span>
                <h3>Assortiment</h3><p className="muted">Bekijk alles wat we bakken.</p>
              </Link>
              {c.ordering.enabled ? (
                <Link className="tile t2" href={href("bestellen")}>
                  <Art id="cake" className="icon" /><span className="arrow">→</span>
                  <h3>Bestellen</h3><p className="muted">Bestel vooraf, haal vers af.</p>
                </Link>
              ) : (
                <Link className="tile t2" href={href("over-ons")}>
                  <Art id="cake" className="icon" /><span className="arrow">→</span>
                  <h3>Over ons</h3><p className="muted">Het verhaal achter de zaak.</p>
                </Link>
              )}
              {showReviews ? (
                <Link className="tile t3" href={href("reviews")}>
                  <Art id="cookie" className="icon" /><span className="arrow">→</span>
                  <h3>Reviews</h3><p className="muted">Wat klanten over ons zeggen.</p>
                </Link>
              ) : (
                <Link className="tile t3" href={href("contact")}>
                  <Art id="cookie" className="icon" /><span className="arrow">→</span>
                  <h3>Contact</h3><p className="muted">Adres en openingsuren.</p>
                </Link>
              )}
            </div>
          </div>
        </section>

        {featured.length > 0 && (
          <section style={{ paddingTop: 0 }}>
            <div className="wrap">
              <div className="section-head">
                <div className="eyebrow">Favorieten</div>
                <h2>Onze klanten kiezen vaak voor…</h2>
                {c.ordering.enabled && <p>Tik op <b>+</b> om het meteen aan je bestelling toe te voegen.</p>}
              </div>
              <div className="grid">{featured.map((p, i) => <Card key={p.id} p={p} i={i} onAdd={c.ordering.enabled ? add : undefined} />)}</div>
              <div style={{ marginTop: 26 }}><Link href={href("assortiment")} className="btn ghost">Alles bekijken</Link></div>
            </div>
          </section>
        )}

        {showReviews && (
          <section style={{ background: "var(--paper)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
            <div className="wrap">
              <div className="section-head">
                <div className="eyebrow">Reviews</div>
                <h2>{hasRating ? <>Gemiddeld {ratingText(b.googleRating)} <span className="stars">★</span> op Google</> : "Wat klanten zeggen"}</h2>
              </div>
              <div className="review-strip">{c.reviews.slice(0, 3).map((r, i) => <ReviewCard key={r.id} r={r} i={i} />)}</div>
              <div style={{ marginTop: 22 }}><Link href={href("reviews")} className="btn ghost">Alle reviews</Link></div>
            </div>
          </section>
        )}

        {c.ordering.enabled && (
          <section>
            <div className="wrap">
              <div className="cta">
                <div><h2>Iets te vieren?</h2><p>{c.ordering.note || "Bestel vooraf en haal je bestelling vers af."}</p></div>
                <Link href={href("bestellen")} className="btn light">Plaats je bestelling</Link>
              </div>
            </div>
          </section>
        )}
      </>
    );
  }

  function Assortiment() {
    const cats = ["Alles", ...c.categories.filter(x => products.some(p => p.category === x))];
    const list = products.filter(p => cat === "Alles" || p.category === cat);
    return (
      <>
        <PageHead home={href("")} title="Ons assortiment" intro="Kies wat je wilt en haal het vers af." crumb="Assortiment" />
        <section>
          <div className="wrap">
            {cats.length > 2 && (
              <div className="tabs" role="tablist">
                {cats.map(x => (
                  <button key={x} className="tab" role="tab" aria-selected={x === cat} onClick={() => setCat(x)}>{x}</button>
                ))}
              </div>
            )}
            {list.length ? (
              <div className="grid">{list.map((p, i) => <Card key={p.id} p={p} i={i} onAdd={c.ordering.enabled ? add : undefined} />)}</div>
            ) : (
              <p className="muted">Hier komen binnenkort onze producten.</p>
            )}
            <p className="note" style={{ marginTop: 22 }}>Prijzen zijn indicatief. Het aanbod kan per dag verschillen.</p>
          </div>
        </section>
        {c.ordering.enabled && <Cta title="Klaar met kiezen?" text="Bekijk je bestelling en stuur ze naar de zaak." to={href("bestellen")} label="Naar bestellen" />}
      </>
    );
  }

  function OverOns() {
    const paragraphs = c.about.body.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
    return (
      <>
        <PageHead home={href("")} title="Over ons" intro={b.tagline} crumb="Over ons" />
        <section>
          <div className="wrap split">
            <div>
              <div className="eyebrow">Ons verhaal</div>
              <h2 style={{ fontSize: "clamp(1.8rem,4vw,2.5rem)" }}>{c.about.title}</h2>
              {paragraphs.map((p, i) => <p key={i} style={{ whiteSpace: "pre-line" }}>{p}</p>)}
            </div>
            <div className="panel-art" aria-hidden="true"><Art id="round" /></div>
          </div>
        </section>
        <section style={{ background: "var(--paper)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
          <div className="wrap">
            <div className="values">
              <div className="value"><div className="ic" style={{ background: "var(--sand)", color: "var(--terracotta)" }}><Icon id="i-sun" /></div><h3>Elke dag vers</h3><p>Wat je bij ons koopt, is dezelfde dag gemaakt.</p></div>
              <div className="value"><div className="ic" style={{ background: "var(--mint)", color: "var(--olive)" }}><Icon id="wheat" /></div><h3>Eerlijke ingrediënten</h3><p>Goede grondstoffen en tijd: meer heeft goed brood niet nodig.</p></div>
              <div className="value"><div className="ic" style={{ background: "#e3e8f6", color: "var(--majorelle)" }}><Icon id="i-heart" /></div><h3>Gastvrij</h3><p>Iedereen is welkom, vaste klant of eerste bezoek.</p></div>
            </div>
          </div>
        </section>
        {c.about.quote && (
          <section>
            <div className="wrap">
              <blockquote className="big">“{c.about.quote}”</blockquote>
            </div>
          </section>
        )}
        <Cta title="Kom eens proeven" text={address ? `Je vindt ons in ${address}.` : "We kijken uit naar je bezoek."} to={href("contact")} label="Route & openingsuren" />
      </>
    );
  }

  function Reviews() {
    const list = c.reviews.filter(r => !reviewFilter || r.stars === reviewFilter);
    return (
      <>
        <PageHead home={href("")} title="Wat klanten zeggen" intro="Bedankt voor elke review!" crumb="Reviews" />
        <section>
          <div className="wrap">
            {(hasRating || b.googleUrl) && (
              <div className="rating-card">
                {hasRating ? <div className="score">{ratingText(b.googleRating)}</div> : <div />}
                <div>
                  {hasRating && <div className="stars">{stars(b.googleRating)}</div>}
                  {hasRating && <div className="muted">Gemiddelde score op Google{b.googleCount ? <>, op basis van <b>{b.googleCount}</b> reviews</> : null}</div>}
                </div>
                {b.googleUrl && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                    <a className="btn" href={b.googleUrl} target="_blank" rel="noopener noreferrer">Schrijf een review</a>
                    <a className="btn ghost" href={b.googleUrl} target="_blank" rel="noopener noreferrer">Bekijk op Google</a>
                  </div>
                )}
              </div>
            )}
            <div className="tabs" role="tablist">
              {[[0, "Alle reviews"], [5, "5 sterren"], [4, "4 sterren"]].map(([n, l]) => (
                <button key={n} className="tab" role="tab" aria-selected={n === reviewFilter} onClick={() => setReviewFilter(n as number)}>{l}</button>
              ))}
            </div>
            <div className="reviews">
              {list.length ? list.map((r, i) => <ReviewCard key={r.id} r={r} i={i} />) : <p className="muted">Geen reviews in deze selectie.</p>}
            </div>
          </div>
        </section>
      </>
    );
  }

  function Bestellen() {
    const ids = Object.keys(cart);

    const submit = (e: React.FormEvent) => {
      e.preventDefault();
      if (preview) return;
      if (!ids.length) return notify("Kies eerst een product");
      if (!b.whatsapp) return notify("Bestellen via WhatsApp is nog niet ingesteld. Bel ons gerust!");
      const lines = ids.map(id => `• ${cart[id]}× ${products.find(p => p.id === id)?.name}`).join("\n");
      const text = `${c.ordering.greeting || "Hallo, ik wil graag bestellen:"}\n${lines}\n\nNaam: ${form.name}\nTel: ${form.phone}\nAfhalen: ${form.date} om ${form.time}${form.msg ? `\nOpmerking: ${form.msg}` : ""}`;
      window.open(`https://wa.me/${b.whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener");
    };
    const field = (k: keyof typeof form) => ({ value: form[k], onChange: (e: { target: { value: string } }) => setForm(f => ({ ...f, [k]: e.target.value })) });

    return (
      <>
        <PageHead home={href("")} title="Bestel vooraf" intro="Je bestelling gaat rechtstreeks via WhatsApp naar de zaak. Betalen doe je bij het afhalen." crumb="Bestellen" />
        <section>
          <div className="wrap">
            <div className="steps">
              <div className="step"><b>1</b><span>Kies je producten</span></div>
              <div className="step"><b>2</b><span>Vul naam en afhaaltijd in</span></div>
              <div className="step"><b>3</b><span>Verstuur via WhatsApp</span></div>
            </div>
            <div className="order-grid">
              <div className="panel">
                <h3>Jouw bestelling</h3>
                {ids.length ? ids.map(id => {
                  const p = products.find(x => x.id === id)!;
                  return (
                    <div className="line-item" key={id}>
                      <span>{p.name}<small>{formatPrice(p.priceCents)} per stuk</small></span>
                      <span className="qty">
                        <button type="button" aria-label={`Minder ${p.name}`} onClick={() => change(id, -1)}>−</button>
                        <b>{cart[id]}</b>
                        <button type="button" aria-label={`Meer ${p.name}`} onClick={() => change(id, 1)}>+</button>
                      </span>
                    </div>
                  );
                }) : <p className="basket-empty">Nog niets gekozen. Voeg hieronder snel iets toe of kijk in het assortiment.</p>}
                <div className="total"><span>Totaal (indicatief)</span><span>{formatPrice(total)}</span></div>
                <p className="note" style={{ marginTop: 18 }}>Snel toevoegen:</p>
                <div className="quick">
                  {products.slice(0, 8).map(p => <button type="button" key={p.id} onClick={() => add(p)}>+ {p.name}</button>)}
                </div>
                <p style={{ margin: "16px 0 0" }}><Link href={href("assortiment")}>Bekijk het volledige assortiment →</Link></p>
              </div>
              <form className="panel" onSubmit={submit}>
                <h3>Afhaalgegevens</h3>
                <label htmlFor="o-name">Naam</label>
                <input id="o-name" required autoComplete="name" placeholder="Je naam" {...field("name")} />
                <label htmlFor="o-phone">Telefoon</label>
                <input id="o-phone" type="tel" required autoComplete="tel" placeholder="04xx xx xx xx" {...field("phone")} />
                <div className="two">
                  <div>
                    <label htmlFor="o-date">Afhaaldag</label>
                    <input id="o-date" type="date" required min={today} {...field("date")} />
                  </div>
                  <div>
                    <label htmlFor="o-time">Tijdstip</label>
                    <select id="o-time" {...field("time")}>{TIMES.map(t => <option key={t}>{t}</option>)}</select>
                  </div>
                </div>
                <label htmlFor="o-msg">Opmerking (optioneel)</label>
                <textarea id="o-msg" rows={3} placeholder="Bv. taart met tekst ‘Gefeliciteerd Sara’" {...field("msg")} />
                <div style={{ marginTop: 18 }}><button className="btn whatsapp" type="submit"><Icon id="i-chat" />Verstuur via WhatsApp</button></div>
                {c.ordering.note && <p className="note">{c.ordering.note}</p>}
              </form>
            </div>
          </div>
        </section>
      </>
    );
  }

  function Contact() {
    return (
      <>
        <PageHead home={href("")} title="Contact & openingsuren" intro="Kom langs, bel ons of stuur een berichtje." crumb="Contact" />
        <section>
          <div className="wrap contact-grid">
            <div className="panel">
              <StatusBadge status={status} />
              <h2 style={{ marginTop: 16 }}>Openingsuren</h2>
              <HoursTable hours={c.hours} today={status ? new Date().getDay() : -1} />
              {c.hoursNote && <p className="note">{c.hoursNote}</p>}
              <h2 style={{ marginTop: 28 }}>Contact</h2>
              <ul className="contact-list">
                {address && <li><Icon id="i-pin" /><span>{address}</span></li>}
                {b.phone && <li><Icon id="i-phone" /><a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a></li>}
                {b.whatsapp && <li><Icon id="i-chat" /><a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer">Stuur ons een WhatsApp</a></li>}
                {b.email && <li><Icon id="i-mail" /><a href={`mailto:${b.email}`}>{b.email}</a></li>}
              </ul>
              {address && (
                <div className="actions" style={{ marginTop: 18 }}>
                  <a className="btn" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}>Routebeschrijving</a>
                </div>
              )}
            </div>
            {address && (
              <div className="map">
                <iframe
                  title={`Kaart ${b.name}`}
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&z=16&output=embed`}
                />
              </div>
            )}
          </div>
        </section>
      </>
    );
  }

  return (
    <div className="wb" style={style}>
      <Sprite />
      {concept && (
        <div className="concept-bar">Concept · deze website is nog in opbouw. Gegevens en reviews kunnen voorbeelden zijn.</div>
      )}
      {Nav}
      <main>{main}</main>
      <footer className="footer">
        <div className="wrap">
          <div className="cols">
            <div>
              <h4>{b.name}</h4>
              {b.tagline && <p style={{ margin: "0 0 8px" }}>{b.tagline}</p>}
              <StatusBadge status={status} dark />
            </div>
            <div>
              <h4>Pagina&apos;s</h4>
              {visiblePages.map(p => <Link key={p.path} href={href(p.path)}>{p.label}</Link>)}
            </div>
            <div>
              <h4>Contact</h4>
              {address && <span style={{ display: "block", padding: "3px 0" }}>{address}</span>}
              {b.phone && <a href={`tel:${b.phone.replace(/[^\d+]/g, "")}`}>{b.phone}</a>}
              {b.whatsapp && <a href={`https://wa.me/${b.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              {b.googleUrl && <a href={b.googleUrl} target="_blank" rel="noopener noreferrer">Google Maps</a>}
            </div>
          </div>
          <div className="bottom">
            <span>© {new Date().getFullYear()} {b.name}</span>
            <span>Website door Weblity</span>
          </div>
        </div>
      </footer>
      {c.ordering.enabled && page !== "bestellen" && count > 0 && (
        <Link href={href("bestellen")} className="btn float-cart show">🧺 Bestelling ({count})</Link>
      )}
      <div className={`toast${toast ? " show" : ""}`} role="status" aria-live="polite">{toast}</div>
    </div>
  );
}
