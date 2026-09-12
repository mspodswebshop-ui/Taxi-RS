/**
 * Abonnementen voor de AI-app, via Stripe.
 *
 * Hoe herkennen we een abonnee?
 *
 * Na het afrekenen krijgt de bezoeker een willekeurig, niet te raden token in
 * een cookie. Dat token staat bij ons in een bestand, gekoppeld aan zijn
 * Stripe-klantnummer. Bij elk verzoek zoeken we dat op en vragen we (hooguit
 * eens per minuut) aan Stripe of het abonnement nog loopt.
 *
 * De bezoeker krijgt datzelfde token ook als toegangscode te zien, zodat hij
 * op een tweede apparaat naar binnen kan zonder dat we e-mail hoeven te
 * versturen.
 *
 * De controle staat bewust op de server. In de browser zou een bezoeker hem
 * gewoon kunnen uitzetten.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Stripe from "stripe";

const here = path.dirname(fileURLToPath(import.meta.url));
const DB = path.join(here, "..", "abonnees.json");

const COOKIE = "mijn_ai_toegang";
const COOKIE_DAGEN = 365;

// Hoe lang we de uitkomst van een controle bij Stripe hergebruiken. Zonder dit
// zou elke vraag aan de assistent ook een verzoek naar Stripe opleveren.
//
// Keerzijde: zegt iemand op, dan houdt hij nog zo lang toegang. Een minuut is
// daarvoor een redelijke afweging. Wil je dat het onmiddellijk ingaat, zet dit
// dan lager of laat Stripe het melden via een webhook.
const CACHE_MS = Number(process.env.ABO_CACHE_MS || 60_000);

export const heeftStripe = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Voor de tests in dit project kan de SDK naar een lokale nabootsing
      // wijzen. In gebruik staat dit niet aan.
      ...(process.env.STRIPE_MOCK_HOST
        ? {
            host: process.env.STRIPE_MOCK_HOST,
            port: Number(process.env.STRIPE_MOCK_PORT),
            protocol: "http",
          }
        : {}),
    })
  : null;

/* ---------------------- Opslag van abonnees ---------------------- */

function laad() {
  try {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    return {};
  }
}

function bewaar(alles) {
  try {
    fs.writeFileSync(DB, JSON.stringify(alles, null, 2));
  } catch (err) {
    console.error("Kon abonnees niet opslaan:", err.message);
  }
}

/** Maakt of hergebruikt een token voor een Stripe-klant. */
function tokenVoorKlant(klantId, email) {
  const alles = laad();

  for (const [token, rij] of Object.entries(alles)) {
    if (rij.klantId === klantId) {
      alles[token] = { ...rij, email: email ?? rij.email };
      bewaar(alles);
      return token;
    }
  }

  // 32 willekeurige bytes: niet te raden, ook niet met heel veel pogingen.
  const token = crypto.randomBytes(32).toString("base64url");
  alles[token] = { klantId, email: email ?? null, aangemaakt: Date.now() };
  bewaar(alles);
  return token;
}

function rijVoorToken(token) {
  if (!token) return null;
  return laad()[token] ?? null;
}

/* ---------------------- Cookie ---------------------- */

/** Leest ons eigen cookie uit de verzoekkop. */
export function tokenUitVerzoek(req) {
  const ruw = req.headers.cookie;
  if (!ruw) return null;

  for (const deel of ruw.split(";")) {
    const scheiding = deel.indexOf("=");
    if (scheiding === -1) continue;
    if (deel.slice(0, scheiding).trim() !== COOKIE) continue;
    return decodeURIComponent(deel.slice(scheiding + 1).trim());
  }
  return null;
}

export function zetCookie(res, token) {
  res.cookie(COOKIE, token, {
    httpOnly: true, // niet uit te lezen door scripts in de pagina
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: COOKIE_DAGEN * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

export function wisCookie(res) {
  res.clearCookie(COOKIE, { path: "/" });
}

/* ---------------------- Stand van het abonnement ---------------------- */

const cache = new Map(); // token -> { tot, stand }

/**
 * Geeft terug of dit token bij een lopend abonnement hoort.
 *
 * Loopt het abonnement af maar is het nog niet verstreken (opgezegd per einde
 * periode), dan blijft het gewoon actief tot die datum. Dat is wat de klant
 * heeft betaald.
 */
export async function standVanAbonnement(token) {
  const leeg = { actief: false, email: null, eindigtOp: null, opgezegd: false };
  if (!token || !stripe) return leeg;

  const rij = rijVoorToken(token);
  if (!rij) return leeg;

  const bewaard = cache.get(token);
  if (bewaard && bewaard.tot > Date.now()) return bewaard.stand;

  try {
    const abos = await stripe.subscriptions.list({
      customer: rij.klantId,
      status: "all",
      limit: 10,
    });

    // "trialing" telt ook als actief: een proefperiode is toegang.
    const lopend = abos.data.find(
      (a) => a.status === "active" || a.status === "trialing",
    );

    const stand = {
      actief: Boolean(lopend),
      email: rij.email,
      eindigtOp: lopend?.current_period_end
        ? new Date(lopend.current_period_end * 1000).toISOString()
        : null,
      opgezegd: Boolean(lopend?.cancel_at_period_end),
      proef: lopend?.status === "trialing",
    };

    cache.set(token, { tot: Date.now() + CACHE_MS, stand });
    return stand;
  } catch (err) {
    console.error("Kon abonnement niet controleren:", err.message);
    // Bij een storing bij Stripe geven we geen toegang weg, maar we laten het
    // ook niet oud nieuws worden: een eerdere uitkomst blijft even geldig.
    return bewaard?.stand ?? leeg;
  }
}

/** Vergeet de opgeslagen uitkomst, bijvoorbeeld na een wijziging. */
export function vergeetCache(token) {
  cache.delete(token);
}

/* ---------------------- Afrekenen ---------------------- */

/** Start het afrekenen van een abonnement en geeft de Stripe-pagina terug. */
export async function startAfrekenen(basisUrl) {
  if (!heeftStripe()) {
    throw new Error(
      "Abonnementen staan niet aan. Zet STRIPE_SECRET_KEY en STRIPE_PRICE_ID in .env.",
    );
  }

  const proefdagen = Number(process.env.STRIPE_PROEFDAGEN || 0);

  const sessie = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
    // Zonder e-mailadres kan de klant later niets terugvinden bij Stripe.
    customer_creation: "always",
    success_url: `${basisUrl}/abonnement/terug?sessie={CHECKOUT_SESSION_ID}`,
    cancel_url: `${basisUrl}/?afgebroken=1`,
    ...(proefdagen > 0
      ? { subscription_data: { trial_period_days: proefdagen } }
      : {}),
  });

  return sessie.url;
}

/**
 * Handelt de terugkeer van de betaalpagina af.
 *
 * De sessie wordt bij Stripe nagevraagd; we vertrouwen niet op wat er in de
 * adresbalk staat. Pas als Stripe zegt dat er een abonnement is, krijgt de
 * bezoeker een token.
 */
export async function verwerkTerugkeer(sessieId) {
  if (!stripe) throw new Error("Stripe staat niet aan.");

  const sessie = await stripe.checkout.sessions.retrieve(sessieId);

  if (sessie.mode !== "subscription" || sessie.payment_status === "unpaid") {
    throw new Error("Deze betaling is niet afgerond.");
  }

  const klantId =
    typeof sessie.customer === "string" ? sessie.customer : sessie.customer?.id;
  if (!klantId) throw new Error("Geen klantnummer gevonden bij deze betaling.");

  const email =
    sessie.customer_details?.email ?? sessie.customer_email ?? null;

  return tokenVoorKlant(klantId, email);
}

/** Maakt een link naar de beheerpagina van Stripe (opzeggen, facturen, kaart). */
export async function beheerLink(token, basisUrl) {
  const rij = rijVoorToken(token);
  if (!rij) throw new Error("Onbekende toegangscode.");

  const sessie = await stripe.billingPortal.sessions.create({
    customer: rij.klantId,
    return_url: basisUrl,
  });
  return sessie.url;
}

/** Controleert of een ingetypte toegangscode bestaat. */
export function codeBestaat(code) {
  return Boolean(rijVoorToken(code));
}

/** Prijsgegevens om op het aanmeldscherm te tonen. */
export async function prijsInfo() {
  if (!heeftStripe()) return null;

  try {
    const prijs = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID);
    return {
      bedrag: prijs.unit_amount,
      valuta: prijs.currency,
      periode: prijs.recurring?.interval ?? "month",
      proefdagen: Number(process.env.STRIPE_PROEFDAGEN || 0),
    };
  } catch (err) {
    console.error("Kon de prijs niet ophalen:", err.message);
    return null;
  }
}
