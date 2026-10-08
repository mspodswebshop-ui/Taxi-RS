/**
 * Abonnementen voor de AI-app, via Stripe.
 *
 * Er zijn drie abonnementen (zie lib/plannen.js). De prijzen hoef je niet zelf
 * in Stripe aan te maken: de server zoekt ze op via een vaste `lookup_key` en
 * maakt ze de eerste keer zelf aan. Alleen STRIPE_SECRET_KEY is dus nodig.
 *
 * Hoe herkennen we een abonnee?
 *
 * Na het afrekenen krijgt de bezoeker een ondertekend token in een cookie:
 * zijn Stripe-klantnummer plus een handtekening die alleen de server kan
 * maken. Er is dus geen eigen database nodig, en het werkt ook op Netlify,
 * waar functies geen bestanden kunnen bewaren. Bij elk verzoek vragen we
 * (hooguit eens per minuut) aan Stripe welk abonnement er loopt.
 *
 * Het verbruik per betaalperiode staat in de metadata van de klant bij
 * Stripe. Zo blijft het bewaard, ook als de server herstart.
 *
 * De controle staat bewust op de server. In de browser zou een bezoeker hem
 * gewoon kunnen uitzetten.
 */

import crypto from "node:crypto";
import Stripe from "stripe";

import { kostenVan } from "./models.js";
import { PLANNEN, PRIJS_VERSIE, planVan } from "./plannen.js";

const COOKIE = "mijn_ai_toegang";
const COOKIE_DAGEN = 365;

// Hoe lang we de uitkomst van een controle bij Stripe hergebruiken. Zonder dit
// zou elke vraag aan de assistent ook een verzoek naar Stripe opleveren.
//
// Keerzijde: zegt iemand op, dan houdt hij nog zo lang toegang. Een minuut is
// daarvoor een redelijke afweging.
const CACHE_MS = Number(process.env.ABO_CACHE_MS || 60_000);

// Namen van de velden in de metadata van een klant bij Stripe.
const META_PERIODE = "mijn_ai_periode";
const META_VERBRUIK = "mijn_ai_verbruik";
const META_PLAN = "mijn_ai_plan";

export const heeftStripe = () => Boolean(process.env.STRIPE_SECRET_KEY);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Voor tests kan de SDK naar een lokale nabootsing wijzen. In gebruik
      // staat dit niet aan.
      ...(process.env.STRIPE_MOCK_HOST
        ? {
            host: process.env.STRIPE_MOCK_HOST,
            port: Number(process.env.STRIPE_MOCK_PORT),
            protocol: "http",
          }
        : {}),
    })
  : null;

/* ---------------------- Toegangscode ---------------------- */

/**
 * De sleutel waarmee toegangscodes worden ondertekend.
 *
 * Standaard afgeleid van de Stripe-sleutel, zodat je niets extra's hoeft in
 * te stellen. Vervang je die sleutel, dan vervallen alle toegangscodes; zet
 * in dat geval een eigen APP_SECRET.
 */
function geheim() {
  const basis = process.env.APP_SECRET || process.env.STRIPE_SECRET_KEY || "";
  return crypto.createHmac("sha256", basis).update("mijn-ai-toegang-v1").digest();
}

function handtekening(klantId) {
  return crypto.createHmac("sha256", geheim()).update(klantId).digest("base64url");
}

/** Maakt de toegangscode voor een Stripe-klant. */
function tokenVoorKlant(klantId) {
  return `${klantId}.${handtekening(klantId)}`;
}

/** Geeft het klantnummer terug als de code echt van ons komt, anders null. */
export function klantUitToken(token) {
  if (typeof token !== "string" || !heeftStripe()) return null;

  const punt = token.lastIndexOf(".");
  if (punt <= 0) return null;

  const klantId = token.slice(0, punt);
  if (!/^cus_[A-Za-z0-9]+$/.test(klantId)) return null;

  const gekregen = Buffer.from(token.slice(punt + 1));
  const verwacht = Buffer.from(handtekening(klantId));
  if (gekregen.length !== verwacht.length) return null;
  return crypto.timingSafeEqual(gekregen, verwacht) ? klantId : null;
}

/* ---------------------- Cookie ---------------------- */

/** Leest ons cookie uit de Cookie-kop van een verzoek. */
export function tokenUitCookies(cookieKop) {
  if (!cookieKop) return null;

  for (const deel of cookieKop.split(";")) {
    const scheiding = deel.indexOf("=");
    if (scheiding === -1) continue;
    if (deel.slice(0, scheiding).trim() !== COOKIE) continue;
    try {
      return decodeURIComponent(deel.slice(scheiding + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

/** De Set-Cookie-waarde die het token bewaart. */
export function cookieVoor(token, basisUrl) {
  const veilig = basisUrl.startsWith("https:") ? "; Secure" : "";
  return (
    `${COOKIE}=${encodeURIComponent(token)}; Path=/; ` +
    `Max-Age=${COOKIE_DAGEN * 24 * 60 * 60}; HttpOnly; SameSite=Lax${veilig}`
  );
}

/** De Set-Cookie-waarde die het cookie weer wist. */
export const cookieWissen = () => `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;

/* ---------------------- Prijzen bij Stripe ---------------------- */

const prijsCache = new Map(); // plan-id -> prijs-id

const lookupKey = (plan) => `mijn_ai_${plan.id}_${PRIJS_VERSIE}`;

/** Een eigen prijs-id uit de omgevingsvariabelen, bv. STRIPE_PRICE_PRO. */
const prijsUitOmgeving = (plan) => process.env[`STRIPE_PRICE_${plan.id.toUpperCase()}`] || null;

/** Zoekt de Stripe-prijs voor een abonnement op, en maakt hem zo nodig aan. */
async function prijsIdVoor(plan) {
  const eigen = prijsUitOmgeving(plan);
  if (eigen) return eigen;
  if (prijsCache.has(plan.id)) return prijsCache.get(plan.id);

  const zoek = async () => {
    const gevonden = await stripe.prices.list({
      lookup_keys: [lookupKey(plan)],
      active: true,
      limit: 1,
    });
    return gevonden.data[0]?.id ?? null;
  };

  let id = await zoek();
  if (!id) {
    try {
      const prijs = await stripe.prices.create({
        currency: "eur",
        unit_amount: plan.bedrag,
        recurring: { interval: "month" },
        // Het bedrag is inclusief btw. Zet je later Stripe Tax aan, dan
        // blijft de klant hetzelfde bedrag betalen.
        tax_behavior: "inclusive",
        lookup_key: lookupKey(plan),
        metadata: { [META_PLAN]: plan.id },
        product_data: { name: `Mijn AI ${plan.naam}`, metadata: { [META_PLAN]: plan.id } },
      });
      id = prijs.id;
    } catch (err) {
      // Maakte een ander verzoek hem net tegelijk aan? Dan bestaat hij nu.
      id = await zoek();
      if (!id) throw err;
    }
  }

  prijsCache.set(plan.id, id);
  return id;
}

/** Bij welk van onze abonnementen hoort deze Stripe-prijs? */
function planVoorPrijs(prijs) {
  if (!prijs) return null;
  for (const plan of PLANNEN) {
    if (prijsUitOmgeving(plan) === prijs.id) return plan;
  }
  const uitMeta = planVan(prijs.metadata?.[META_PLAN]);
  if (uitMeta) return uitMeta;
  const uitSleutel = prijs.lookup_key?.match(/^mijn_ai_([a-z]+)_/);
  return uitSleutel ? planVan(uitSleutel[1]) : null;
}

/* ---------------------- Stand van het abonnement ---------------------- */

const cache = new Map(); // klantId -> { tot, stand }

const LEEG = Object.freeze({
  actief: false,
  klantId: null,
  plan: null,
  email: null,
  eindigtOp: null,
  opgezegd: false,
  proef: false,
  periode: null,
  verbruikt: 0,
});

/**
 * Geeft de stand van het abonnement bij dit token.
 *
 * Loopt het abonnement af maar is het nog niet verstreken (opgezegd per einde
 * periode), dan blijft het gewoon actief tot die datum. Dat is wat de klant
 * heeft betaald.
 */
export async function standVanAbonnement(token) {
  const klantId = klantUitToken(token);
  if (!klantId || !stripe) return LEEG;

  const bewaard = cache.get(klantId);
  if (bewaard && bewaard.tot > Date.now()) return bewaard.stand;

  try {
    const klant = await stripe.customers.retrieve(klantId, { expand: ["subscriptions"] });
    if (klant.deleted) return LEEG;

    // "trialing" telt ook als actief: een proefperiode is toegang.
    const abo = klant.subscriptions?.data.find(
      (a) => a.status === "active" || a.status === "trialing",
    );
    const item = abo?.items.data[0];

    // Het verbruik geldt per betaalperiode. Begint er een nieuwe periode, dan
    // telt het weer vanaf nul.
    const periode = item?.current_period_start ? String(item.current_period_start) : null;
    const verbruikt =
      periode && klant.metadata?.[META_PERIODE] === periode
        ? Number(klant.metadata?.[META_VERBRUIK]) || 0
        : 0;

    const stand = {
      actief: Boolean(abo),
      klantId,
      abonnementId: abo?.id ?? null,
      itemId: item?.id ?? null,
      plan: planVoorPrijs(item?.price)?.id ?? null,
      email: klant.email ?? null,
      eindigtOp: item?.current_period_end
        ? new Date(item.current_period_end * 1000).toISOString()
        : null,
      opgezegd: Boolean(abo?.cancel_at_period_end || abo?.cancel_at),
      proef: abo?.status === "trialing",
      periode,
      verbruikt,
    };

    cache.set(klantId, { tot: Date.now() + CACHE_MS, stand });
    return stand;
  } catch (err) {
    console.error("Kon abonnement niet controleren:", err.message);
    // Bij een storing bij Stripe geven we geen toegang weg, maar een eerdere
    // uitkomst blijft even geldig.
    return bewaard?.stand ?? LEEG;
  }
}

/** Vergeet de opgeslagen uitkomst, bijvoorbeeld na een wijziging. */
export function vergeetCache(token) {
  const klantId = klantUitToken(token);
  if (klantId) cache.delete(klantId);
}

/** Welk deel van het budget is gebruikt, in procenten (0-100). */
export function gebruikVan(stand) {
  const plan = planVan(stand?.plan);
  if (!plan) return null;
  return {
    procent: Math.min(100, Math.round((stand.verbruikt / plan.budget) * 100)),
    resetOp: stand.eindigtOp,
  };
}

/** Wat de browser over het abonnement te zien krijgt. */
export function publiekeStand(stand) {
  return {
    actief: stand.actief,
    plan: stand.plan,
    email: stand.email,
    eindigtOp: stand.eindigtOp,
    opgezegd: stand.opgezegd,
    proef: stand.proef,
    gebruik: gebruikVan(stand),
  };
}

/* ---------------------- Verbruik bijhouden ---------------------- */

/**
 * Telt de kosten van een antwoord op bij het verbruik van deze periode.
 *
 * Geeft het bijgewerkte gebruik terug, zodat de browser de meter kan bijwerken.
 */
export async function boekVerbruik(stand, usage, modelId) {
  if (!stripe || !stand?.klantId || !stand.periode) return null;

  const kosten = kostenVan(usage, modelId);
  if (!kosten) return gebruikVan(stand);

  const nieuw = { ...stand, verbruikt: stand.verbruikt + kosten };
  const bewaard = cache.get(stand.klantId);
  cache.set(stand.klantId, { tot: bewaard?.tot ?? Date.now() + CACHE_MS, stand: nieuw });

  try {
    await stripe.customers.update(stand.klantId, {
      metadata: {
        [META_PERIODE]: stand.periode,
        [META_VERBRUIK]: nieuw.verbruikt.toFixed(6),
      },
    });
  } catch (err) {
    console.error("Kon verbruik niet opslaan:", err.message);
  }

  return gebruikVan(nieuw);
}

/* ---------------------- Afrekenen en wijzigen ---------------------- */

/**
 * Start het afrekenen van een abonnement en geeft de Stripe-pagina terug.
 *
 * Heeft de bezoeker al een lopend abonnement, dan wordt dat omgezet naar het
 * nieuwe abonnement. Het verschil wordt meteen naar rato verrekend: bij een
 * upgrade betaalt de klant direct bij, bij een downgrade krijgt hij tegoed.
 */
export async function startAfrekenen(planId, basisUrl, token) {
  if (!heeftStripe()) {
    throw new Error("Abonnementen staan niet aan. Zet STRIPE_SECRET_KEY in de omgevingsvariabelen.");
  }

  const plan = planVan(planId);
  if (!plan) throw new Error("Onbekend abonnement.");

  const prijs = await prijsIdVoor(plan);
  const stand = await standVanAbonnement(token);

  if (stand.actief && stand.abonnementId) {
    if (stand.plan === plan.id) return { gewijzigd: false, stand: publiekeStand(stand) };

    const abo = await stripe.subscriptions.update(stand.abonnementId, {
      items: [{ id: stand.itemId, price: prijs }],
      proration_behavior: "always_invoice",
      // Lukt de bijbetaling niet, dan blijft het oude abonnement gewoon staan.
      payment_behavior: "pending_if_incomplete",
    });

    vergeetCache(token);
    if (abo.pending_update) {
      throw new Error(
        "De betaling voor deze wijziging is niet gelukt. Controleer je betaalgegevens " +
          "via Abonnement beheren en probeer het opnieuw.",
      );
    }
    return { gewijzigd: true, stand: publiekeStand(await standVanAbonnement(token)) };
  }

  const proefdagen = Number(process.env.STRIPE_PROEFDAGEN || 0);

  const sessie = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: prijs, quantity: 1 }],
    // Een bekende klant die opnieuw abonneert, houdt zijn klantnummer.
    ...(stand.klantId ? { customer: stand.klantId } : {}),
    allow_promotion_codes: true,
    locale: "nl",
    success_url: `${basisUrl}/abonnement/terug?sessie={CHECKOUT_SESSION_ID}`,
    cancel_url: `${basisUrl}/?afgebroken=1`,
    subscription_data: {
      metadata: { [META_PLAN]: plan.id },
      ...(proefdagen > 0 ? { trial_period_days: proefdagen } : {}),
    },
  });

  return { url: sessie.url };
}

/**
 * Handelt de terugkeer van de betaalpagina af.
 *
 * De sessie wordt bij Stripe nagevraagd; we vertrouwen niet op wat er in de
 * adresbalk staat. Pas als Stripe zegt dat het afrekenen klaar is, krijgt de
 * bezoeker een toegangscode.
 */
export async function verwerkTerugkeer(sessieId) {
  if (!stripe) throw new Error("Stripe staat niet aan.");
  if (!sessieId) throw new Error("Er ontbreekt een betaalsessie.");

  const sessie = await stripe.checkout.sessions.retrieve(sessieId);
  if (sessie.mode !== "subscription" || sessie.status !== "complete") {
    throw new Error("Deze betaling is niet afgerond.");
  }

  const klantId = typeof sessie.customer === "string" ? sessie.customer : sessie.customer?.id;
  if (!klantId) throw new Error("Geen klantnummer gevonden bij deze betaling.");

  const token = tokenVoorKlant(klantId);
  vergeetCache(token);
  return token;
}

/** Maakt een link naar de beheerpagina van Stripe (opzeggen, facturen, kaart). */
export async function beheerLink(token, basisUrl) {
  const klantId = klantUitToken(token);
  if (!klantId) throw new Error("Onbekende toegangscode.");

  const sessie = await stripe.billingPortal.sessions.create({
    customer: klantId,
    return_url: basisUrl,
    locale: "nl",
  });
  return sessie.url;
}
