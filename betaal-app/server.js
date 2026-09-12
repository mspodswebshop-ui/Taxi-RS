/**
 * Betaalterminal voor Taxi R.S.
 *
 * Jij toetst het ritbedrag in, de klant scant een QR-code en betaalt met
 * Bancontact of kaart. Stripe handelt de betaling af.
 *
 * Belangrijk: kaartgegevens komen nooit langs deze server. De klant vult ze in
 * op de betaalpagina van Stripe zelf. Daardoor gelden de zware PCI-eisen niet
 * voor jou.
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import Stripe from "stripe";
import QRCode from "qrcode";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4000);

// Het adres waarop deze app bereikbaar is. De klant wordt hierheen
// teruggestuurd nadat hij betaald heeft, dus dit moet kloppen.
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Grenzen voor een ritbedrag, zodat een typfout geen ramp wordt.
const MIN_CENT = 100; // € 1,00
const MAX_CENT = 100_000; // € 1.000,00

const hasStripeKey = () => Boolean(process.env.STRIPE_SECRET_KEY);
const isTestKey = () => (process.env.STRIPE_SECRET_KEY || "").startsWith("sk_test_");

const stripe = hasStripeKey()
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Voor de tests in dit project kan de SDK naar een lokale nabootsing
      // wijzen. In gebruik staat dit niet aan en praat hij met Stripe zelf.
      ...(process.env.STRIPE_MOCK_HOST
        ? {
            host: process.env.STRIPE_MOCK_HOST,
            port: Number(process.env.STRIPE_MOCK_PORT),
            protocol: "http",
          }
        : {}),
    })
  : null;

/* ---------------------- Eenvoudige ritadministratie ---------------------- */

const DB = path.join(here, "betalingen.json");

function laadBetalingen() {
  try {
    return JSON.parse(fs.readFileSync(DB, "utf8"));
  } catch {
    return [];
  }
}

function bewaarBetaling(betaling) {
  const alles = laadBetalingen();
  // Op sessie-id, zodat dezelfde betaling niet twee keer in de lijst komt
  // (de terminal vraagt de status op en Stripe stuurt ook een melding).
  const bestaat = alles.findIndex((b) => b.id === betaling.id);
  if (bestaat === -1) alles.push(betaling);
  else alles[bestaat] = { ...alles[bestaat], ...betaling };

  try {
    fs.writeFileSync(DB, JSON.stringify(alles, null, 2));
  } catch (err) {
    console.error("Kon de betaling niet opslaan:", err.message);
  }
}

/** De betalingen van vandaag, nieuwste eerst. */
function betalingenVanVandaag() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return laadBetalingen()
    .filter((b) => b.betaaldOp && new Date(b.betaaldOp) >= start)
    .sort((a, b) => new Date(b.betaaldOp) - new Date(a.betaaldOp));
}

/* ---------------------- Hulpfuncties ---------------------- */

const euro = (cent) => `€ ${(cent / 100).toFixed(2).replace(".", ",")}`;

/** Zet een Stripe-fout om in een begrijpelijke melding. */
function beschrijfFout(err) {
  if (err instanceof Stripe.errors.StripeAuthenticationError) {
    return "De Stripe-sleutel klopt niet. Controleer STRIPE_SECRET_KEY in .env.";
  }
  if (err instanceof Stripe.errors.StripeInvalidRequestError) {
    return `Stripe wees het verzoek af: ${err.message}`;
  }
  if (err instanceof Stripe.errors.StripeRateLimitError) {
    return "Te veel verzoeken naar Stripe. Wacht even en probeer opnieuw.";
  }
  if (err instanceof Stripe.errors.StripeConnectionError) {
    return "Geen verbinding met Stripe. Controleer je internet.";
  }
  if (err instanceof Stripe.errors.StripeError) {
    return `Stripe-fout: ${err.message}`;
  }
  return err?.message || "Onbekende fout.";
}

const app = express();

/* ---------------------- Stripe-meldingen (webhook) ----------------------
   Stripe kan zelf melden dat er betaald is. Dat is betrouwbaarder dan alleen
   navragen, want het werkt ook als de terminal net dicht stond. Deze route
   heeft de ruwe body nodig om de handtekening te kunnen controleren, dus hij
   staat vóór express.json().
   ------------------------------------------------------------------------ */

app.post(
  "/api/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return res.status(400).send("Geen webhook-geheim ingesteld.");

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        req.headers["stripe-signature"],
        secret,
      );
    } catch (err) {
      // Handtekening klopt niet: dit komt niet van Stripe.
      console.error("Webhook geweigerd:", err.message);
      return res.status(400).send(`Ongeldige handtekening: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      const sessie = event.data.object;
      if (sessie.payment_status === "paid") {
        bewaarBetaling({
          id: sessie.id,
          bedragCent: sessie.amount_total,
          omschrijving: sessie.metadata?.omschrijving || "Rit",
          betaaldOp: new Date().toISOString(),
          methode: sessie.payment_method_types?.join(", ") || null,
        });
        console.log(`Betaald: ${euro(sessie.amount_total)} (${sessie.id})`);
      }
    }

    res.json({ ontvangen: true });
  },
);

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(here, "public")));

/* ---------------------- Terminal ---------------------- */

app.get("/api/config", (_req, res) => {
  res.json({
    heeftSleutel: hasStripeKey(),
    testmodus: isTestKey(),
    minCent: MIN_CENT,
    maxCent: MAX_CENT,
  });
});

/** Start een betaling en geef de QR-code terug die de klant scant. */
app.post("/api/betaling", async (req, res) => {
  if (!stripe) {
    return res.status(401).json({
      error:
        "Er is geen Stripe-sleutel ingesteld. Kopieer .env.example naar .env, " +
        "vul STRIPE_SECRET_KEY in en start opnieuw.",
    });
  }

  const bedragCent = Number(req.body?.bedragCent);
  const omschrijving = String(req.body?.omschrijving || "").trim() || "Taxirit";

  if (!Number.isInteger(bedragCent)) {
    return res.status(400).json({ error: "Het bedrag is geen geldig getal." });
  }
  if (bedragCent < MIN_CENT || bedragCent > MAX_CENT) {
    return res.status(400).json({
      error: `Het bedrag moet tussen ${euro(MIN_CENT)} en ${euro(MAX_CENT)} liggen.`,
    });
  }
  if (omschrijving.length > 120) {
    return res.status(400).json({ error: "De omschrijving is te lang." });
  }

  try {
    const sessie = await stripe.checkout.sessions.create({
      mode: "payment",
      // Bancontact is in België het meest gebruikt; kaart als terugval.
      payment_method_types: ["bancontact", "card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: { name: omschrijving },
            unit_amount: bedragCent,
          },
          quantity: 1,
        },
      ],
      metadata: { omschrijving },
      success_url: `${BASE_URL}/bedankt.html?sessie={CHECKOUT_SESSION_ID}`,
      cancel_url: `${BASE_URL}/afgebroken.html`,
      // De klant staat op straat naast een taxi: laat de link niet eeuwig open.
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
    });

    // De QR bevat gewoon de betaallink van Stripe. De klant scant hem met zijn
    // camera en komt op de betaalpagina van Stripe uit.
    const qr = await QRCode.toDataURL(sessie.url, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 480,
    });

    res.json({
      id: sessie.id,
      url: sessie.url,
      qr,
      bedragCent,
      omschrijving,
    });
  } catch (err) {
    console.error("Aanmaken betaling mislukt:", err);
    res.status(502).json({ error: beschrijfFout(err) });
  }
});

/**
 * Vraagt de stand van een betaling op bij Stripe.
 *
 * De terminal meldt alleen "betaald" als Stripe dat zegt. Er wordt nooit op
 * de gok een geslaagde betaling getoond.
 */
app.get("/api/betaling/:id", async (req, res) => {
  if (!stripe) return res.status(401).json({ error: "Geen Stripe-sleutel." });

  try {
    const sessie = await stripe.checkout.sessions.retrieve(req.params.id);
    const betaald = sessie.payment_status === "paid";

    if (betaald) {
      bewaarBetaling({
        id: sessie.id,
        bedragCent: sessie.amount_total,
        omschrijving: sessie.metadata?.omschrijving || "Taxirit",
        betaaldOp: new Date().toISOString(),
        methode: sessie.payment_method_types?.join(", ") || null,
      });
    }

    res.json({
      id: sessie.id,
      betaald,
      status: sessie.payment_status,
      verlopen: sessie.status === "expired",
      bedragCent: sessie.amount_total,
    });
  } catch (err) {
    res.status(502).json({ error: beschrijfFout(err) });
  }
});

/** De ritten van vandaag, met het dagtotaal. */
app.get("/api/ritten", (_req, res) => {
  const ritten = betalingenVanVandaag();
  res.json({
    ritten,
    aantal: ritten.length,
    totaalCent: ritten.reduce((som, r) => som + (r.bedragCent || 0), 0),
  });
});

app.use("/api", (_req, res) => res.status(404).json({ error: "Onbekend API-pad." }));
app.use((_req, res) => res.sendFile(path.join(here, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`Betaalterminal draait op http://localhost:${PORT}`);
  if (!hasStripeKey()) {
    console.warn(
      "Let op: geen STRIPE_SECRET_KEY gevonden. Kopieer .env.example naar .env.",
    );
  } else if (isTestKey()) {
    console.log("Testmodus: er wordt geen echt geld overgemaakt.");
  } else {
    console.log("LET OP: live modus. Betalingen zijn echt.");
  }
});
