// Moet de eerste import blijven: controleert de Node-versie voordat er
// iets anders geladen wordt.
import "./check-node.js";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";

import {
  DEFAULT_EFFORT,
  DEFAULT_MODEL,
  chatEvents,
  hasCredentials,
  parseChatRequest,
  publicConfig,
  toSSE,
} from "./lib/chat-core.js";
import {
  beheerLink,
  codeBestaat,
  heeftStripe,
  prijsInfo,
  standVanAbonnement,
  startAfrekenen,
  tokenUitVerzoek,
  vergeetCache,
  verwerkTerugkeer,
  wisCookie,
  zetCookie,
} from "./lib/abonnement.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(here, "public")));

/** Simpele rate limit per IP: max N verzoeken per tijdvenster. */
const RATE_LIMIT = { windowMs: 60_000, max: 20 };
const hits = new Map();

function rateLimit(req, res, next) {
  const key = req.ip ?? "onbekend";
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return next();
  }
  if (entry.count >= RATE_LIMIT.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: `Te veel verzoeken. Probeer het over ${retryAfter} seconden opnieuw.`,
    });
  }
  entry.count += 1;
  next();
}

// Verlopen entries opruimen zodat de Map niet eindeloos groeit.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, RATE_LIMIT.windowMs).unref();

app.get("/api/config", (_req, res) => {
  res.json(publicConfig());
});

app.post("/api/chat", rateLimit, vereistAbonnement, async (req, res) => {
  if (!hasCredentials()) {
    return res.status(401).json({
      error:
        "Er is geen API-sleutel ingesteld op de server. Kopieer .env.example naar .env, " +
        "vul ANTHROPIC_API_KEY in en start de server opnieuw.",
    });
  }

  let parsed;
  try {
    parsed = parseChatRequest(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  // Sluit de browser het tabblad of klikt de gebruiker op stop, dan stoppen we
  // ook het API-verzoek - anders blijven er tokens doorlopen die niemand leest.
  const controller = new AbortController();
  res.on("close", () => controller.abort());

  for await (const event of chatEvents(parsed, controller.signal)) {
    res.write(toSSE(event));
  }
  if (!controller.signal.aborted) res.end();
});

/* ---------------------- Abonnementen ---------------------- */

// Het adres waarop deze app bereikbaar is. Stripe stuurt de klant hierheen
// terug, dus dit moet kloppen zodra de app online staat.
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/**
 * Laat een verzoek alleen door als er een lopend abonnement bij hoort.
 *
 * Staan er geen Stripe-gegevens ingesteld, dan is de app gewoon vrij
 * toegankelijk. Zo blijft hij bruikbaar voor jezelf, zonder dat je eerst
 * een abonnement op je eigen app moet nemen.
 */
async function vereistAbonnement(req, res, next) {
  if (!heeftStripe()) return next();

  const stand = await standVanAbonnement(tokenUitVerzoek(req));
  if (stand.actief) return next();

  res.status(402).json({
    error: "Hiervoor heb je een abonnement nodig.",
    abonnementNodig: true,
  });
}

app.get("/api/abonnement", async (req, res) => {
  if (!heeftStripe()) {
    return res.json({ vereist: false, actief: true, prijs: null });
  }

  const stand = await standVanAbonnement(tokenUitVerzoek(req));
  res.json({ vereist: true, ...stand, prijs: await prijsInfo() });
});

app.post("/api/abonnement/start", async (_req, res) => {
  try {
    res.json({ url: await startAfrekenen(BASE_URL) });
  } catch (err) {
    console.error("Afrekenen starten mislukt:", err);
    res.status(502).json({ error: err.message });
  }
});

// Hier komt de klant terug van de betaalpagina van Stripe.
app.get("/abonnement/terug", async (req, res) => {
  try {
    const token = await verwerkTerugkeer(String(req.query.sessie || ""));
    zetCookie(res, token);
    vergeetCache(token);
    res.redirect("/?welkom=1");
  } catch (err) {
    console.error("Terugkeer mislukt:", err);
    res.redirect("/?fout=" + encodeURIComponent(err.message));
  }
});

// Inloggen op een tweede apparaat met de toegangscode.
app.post("/api/abonnement/code", (req, res) => {
  const code = String(req.body?.code || "").trim();
  if (!codeBestaat(code)) {
    return res.status(404).json({ error: "Deze toegangscode kennen we niet." });
  }
  zetCookie(res, code);
  vergeetCache(code);
  res.json({ ok: true });
});

// De eigen toegangscode opvragen, om op een ander apparaat te gebruiken.
app.get("/api/abonnement/code", async (req, res) => {
  const token = tokenUitVerzoek(req);
  const stand = await standVanAbonnement(token);
  if (!stand.actief) return res.status(403).json({ error: "Geen lopend abonnement." });
  res.json({ code: token });
});

// Opzeggen, facturen en betaalgegevens: dat regelt Stripe zelf.
app.post("/api/abonnement/beheer", async (req, res) => {
  try {
    const token = tokenUitVerzoek(req);
    const stand = await standVanAbonnement(token);
    if (!stand.actief) return res.status(403).json({ error: "Geen lopend abonnement." });
    res.json({ url: await beheerLink(token, BASE_URL) });
  } catch (err) {
    console.error("Beheerlink mislukt:", err);
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/abonnement/afmelden", (req, res) => {
  vergeetCache(tokenUitVerzoek(req));
  wisCookie(res);
  res.json({ ok: true });
});

// Onbekend API-pad: een nette JSON-fout in plaats van een HTML-pagina.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Onbekend API-pad." });
});

// Elk ander onbekend pad toont gewoon de app. Zo krijg je geen kale
// "Page not found" meer als je bijvoorbeeld /index.html of /chat intikt.
app.use((_req, res) => {
  res.sendFile(path.join(here, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AI-app draait op http://localhost:${PORT}`);
  console.log(`Standaardmodel: ${DEFAULT_MODEL} (denkkracht: ${DEFAULT_EFFORT})`);
  if (!hasCredentials()) {
    console.warn(
      "Let op: geen ANTHROPIC_API_KEY gevonden. Kopieer .env.example naar .env en vul je sleutel in.",
    );
  }
});
