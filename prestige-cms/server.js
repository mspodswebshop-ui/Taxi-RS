/**
 * Website met CMS voor Prestige Taxi Antwerpen.
 *
 * Bezoekers zien de gewone website. De eigenaar logt in op /admin, past daar
 * teksten en foto's aan en klikt op "Publiceren": vanaf dan ziet iedereen de
 * nieuwe versie. Er is geen zip of upload naar Netlify meer nodig.
 *
 * De oorspronkelijke pagina's komen uit de map prestige-taxi. Alles wat in het
 * beheer gewijzigd is, staat in de opslag (zie store.js) en gaat daarboven.
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import { openStore, typeFor } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5000);
const SITE_DIR = path.resolve(here, process.env.SITE_DIR || "../prestige-taxi");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const SESSION_DAYS = 14;
const COOKIE = "pta_sessie";

const PAGES = ["index.html", "diensten.html", "luchthaven.html", "over-ons.html", "contact.html"];
// Bestanden die het beheer mag overschrijven. main.js staat erbij omdat daar
// het telefoonnummer en e-mailadres van het reservatieformulier in staan.
const EDITABLE = [...PAGES, "assets/main.js"];
const VERSION_FILE = "meta/versie.json";
const MEDIA_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

const store = await openStore({
  databaseUrl: process.env.DATABASE_URL,
  dataDir: path.join(here, "data"),
});

const app = express();
app.disable("x-powered-by");
// Achter de proxy van Render, Railway enz. komt https binnen als http.
app.set("trust proxy", 1);

/* ------------------------------- Inloggen ------------------------------- */

function sign(value) {
  return crypto.createHmac("sha256", SESSION_SECRET).update(value).digest("base64url");
}

function makeToken() {
  const expires = String(Date.now() + SESSION_DAYS * 864e5);
  return `${expires}.${sign(expires)}`;
}

function validToken(token) {
  if (!token) return false;
  const [expires, mac] = token.split(".");
  if (!expires || !mac || Number(expires) < Date.now()) return false;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(expires));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

function setSession(req, res, token, maxAgeSec) {
  const secure = req.secure ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${secure}`,
  );
}

const isLoggedIn = (req) => validToken(readCookie(req, COOKIE));

function requireLogin(req, res, next) {
  if (isLoggedIn(req)) return next();
  res.status(401).json({ error: "Je bent niet (meer) ingelogd." });
}

function samePassword(given) {
  // Beide eerst hashen, zodat de vergelijking even lang duurt bij elk wachtwoord.
  const a = crypto.createHash("sha256").update(String(given)).digest();
  const b = crypto.createHash("sha256").update(ADMIN_PASSWORD).digest();
  return crypto.timingSafeEqual(a, b);
}

// Na te veel foute pogingen even wachten, tegen het raden van het wachtwoord.
const attempts = new Map();
const MAX_ATTEMPTS = 8;
const LOCK_MS = 15 * 60 * 1000;

app.post("/api/login", express.json({ limit: "10kb" }), (req, res) => {
  if (!ADMIN_PASSWORD) {
    return res.status(503).json({ error: "Er is nog geen wachtwoord ingesteld. Zet ADMIN_PASSWORD bij de instellingen van de server." });
  }
  const ip = req.ip || "onbekend";
  const now = Date.now();
  const a = attempts.get(ip) || { count: 0, until: 0 };
  if (a.until > now) {
    const min = Math.ceil((a.until - now) / 60000);
    return res.status(429).json({ error: `Te veel foute pogingen. Probeer opnieuw over ${min} minuten.` });
  }
  if (!samePassword(req.body?.password || "")) {
    a.count += 1;
    if (a.count >= MAX_ATTEMPTS) {
      a.count = 0;
      a.until = now + LOCK_MS;
    }
    attempts.set(ip, a);
    return res.status(401).json({ error: "Dat wachtwoord klopt niet." });
  }
  attempts.delete(ip);
  setSession(req, res, makeToken(), SESSION_DAYS * 86400);
  res.json({ ok: true });
});

app.post("/api/logout", (req, res) => {
  setSession(req, res, "", 0);
  res.json({ ok: true });
});

app.get("/api/me", (req, res) => {
  res.json({ loggedIn: isLoggedIn(req), passwordSet: Boolean(ADMIN_PASSWORD), storage: store.kind });
});

/* ------------------------------ De website ------------------------------ */

/** Een bestand uit de opslag, en anders het origineel uit de map van de site. */
async function readSiteFile(p) {
  const saved = await store.get(p);
  if (saved) return saved;
  try {
    return { body: await fs.readFile(path.join(SITE_DIR, p)), type: typeFor(p) };
  } catch {
    return null;
  }
}

async function readVersion() {
  const v = await store.get(VERSION_FILE);
  if (!v) return { version: 0, publishedAt: null };
  try {
    return JSON.parse(v.body.toString("utf8"));
  } catch {
    return { version: 0, publishedAt: null };
  }
}

/* ------------------------------ Beheer-API ------------------------------ */

app.get("/api/site", requireLogin, async (req, res, next) => {
  try {
    const pages = {};
    const text = {};
    for (const p of PAGES) pages[p] = (await readSiteFile(p))?.body.toString("utf8") || "";
    text["assets/main.js"] = (await readSiteFile("assets/main.js"))?.body.toString("utf8") || "";
    res.set("Cache-Control", "no-store").json({ pages, text, ...(await readVersion()) });
  } catch (err) {
    next(err);
  }
});

// Eén publicatie per keer, zodat twee snelle klikken elkaar niet kruisen.
let publishing = Promise.resolve();

app.put("/api/site", requireLogin, express.json({ limit: "8mb" }), (req, res, next) => {
  publishing = publishing.then(async () => {
    try {
      const { pages = {}, text = {}, version } = req.body || {};
      const current = await readVersion();
      if (Number(version) !== Number(current.version)) {
        return res.status(409).json({
          error: "Iemand anders heeft intussen gepubliceerd. Herlaad het beheer om met de nieuwste versie verder te werken.",
        });
      }
      const files = [];
      for (const [p, html] of Object.entries({ ...pages, ...text })) {
        if (!EDITABLE.includes(p)) return res.status(400).json({ error: `Dit bestand mag niet gewijzigd worden: ${p}` });
        if (typeof html !== "string" || !html.trim()) return res.status(400).json({ error: `Lege inhoud voor ${p}` });
        if (PAGES.includes(p) && !/<html[\s>]/i.test(html)) return res.status(400).json({ error: `${p} is geen geldige pagina` });
        files.push({ path: p, body: Buffer.from(html, "utf8") });
      }
      const nieuw = { version: current.version + 1, publishedAt: new Date().toISOString() };
      files.push({ path: VERSION_FILE, body: Buffer.from(JSON.stringify(nieuw)) });
      await store.putMany(files);
      res.json({ ok: true, ...nieuw });
    } catch (err) {
      next(err);
    }
  });
});

app.post("/api/media", requireLogin, express.json({ limit: "12mb" }), async (req, res, next) => {
  try {
    const { data, type } = req.body || {};
    const ext = MEDIA_TYPES[type];
    if (!ext || typeof data !== "string") return res.status(400).json({ error: "Alleen JPG-, PNG- of WebP-foto's." });
    const body = Buffer.from(data, "base64");
    if (body.length < 100 || body.length > 8 * 1024 * 1024) {
      return res.status(400).json({ error: "De foto is te groot of beschadigd (maximaal 8 MB)." });
    }
    // Controleren dat het echt een foto is en niet iets anders met een fotonaam.
    const isJpg = body[0] === 0xff && body[1] === 0xd8;
    const isPng = body.subarray(0, 4).toString("hex") === "89504e47";
    const isWebp = body.subarray(0, 4).toString() === "RIFF" && body.subarray(8, 12).toString() === "WEBP";
    if (!(isJpg || isPng || isWebp)) return res.status(400).json({ error: "Dit bestand is geen foto." });
    const name = `media/${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    await store.put(name, body, type);
    res.json({ ok: true, path: name });
  } catch (err) {
    next(err);
  }
});

app.post("/api/reset", requireLogin, async (req, res, next) => {
  try {
    for (const p of EDITABLE) await store.remove(p);
    const current = await readVersion();
    await store.put(VERSION_FILE, Buffer.from(JSON.stringify({ version: current.version + 1, publishedAt: new Date().toISOString() })));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

/* ------------------------------ Pagina's ------------------------------ */

app.get(["/admin", "/admin/"], (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Robots-Tag", "noindex, nofollow");
  res.sendFile(path.join(here, "admin.html"));
});

// Het oude zip-beheer hoort niet bij het CMS: stuur door naar het echte beheer.
app.get("/beheer.html", (req, res) => res.redirect(301, "/admin"));

app.get("/media/:name", async (req, res, next) => {
  try {
    if (!/^[a-z0-9-]+\.(jpg|png|webp)$/i.test(req.params.name)) return res.sendStatus(404);
    const f = await store.get(`media/${req.params.name}`);
    if (!f) return res.sendStatus(404);
    // Elke foto krijgt een nieuwe naam, dus de browser mag hem lang bewaren.
    res.set("Cache-Control", "public, max-age=31536000, immutable").type(f.type).send(f.body);
  } catch (err) {
    next(err);
  }
});

async function sendSiteFile(res, p) {
  const f = await readSiteFile(p);
  if (!f) return false;
  // Altijd even navragen, zodat een publicatie meteen zichtbaar is.
  res.set("Cache-Control", "no-cache").type(f.type).send(f.body);
  return true;
}

app.get("/", async (req, res, next) => {
  try {
    await sendSiteFile(res, "index.html");
  } catch (err) {
    next(err);
  }
});

app.get("/:page", async (req, res, next) => {
  try {
    const p = req.params.page;
    if (PAGES.includes(p) && (await sendSiteFile(res, p))) return;
    // Ook zonder .html, bv. /contact
    if (PAGES.includes(`${p}.html`) && (await sendSiteFile(res, `${p}.html`))) return;
    next();
  } catch (err) {
    next(err);
  }
});

app.get("/assets/main.js", async (req, res, next) => {
  try {
    if (!(await sendSiteFile(res, "assets/main.js"))) next();
  } catch (err) {
    next(err);
  }
});

app.use("/assets", express.static(path.join(SITE_DIR, "assets"), { maxAge: "1h" }));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Onbekend adres." });
  res.redirect("/");
});

app.use((err, req, res, _next) => {
  console.error(err);
  if (req.path.startsWith("/api/")) return res.status(500).json({ error: "Er ging iets mis op de server. Probeer het opnieuw." });
  res.status(500).send("Er ging iets mis. Probeer het later opnieuw.");
});

app.listen(PORT, () => {
  console.log(`Prestige Taxi draait op http://localhost:${PORT}`);
  console.log(`Beheer: http://localhost:${PORT}/admin`);
  console.log(`Opslag: ${store.kind === "postgres" ? "Postgres-database" : "map data/"}`);
  if (!ADMIN_PASSWORD) console.warn("Let op: ADMIN_PASSWORD is niet ingesteld, inloggen op /admin kan nog niet.");
  if (!process.env.SESSION_SECRET) console.warn("Tip: zet SESSION_SECRET, anders moet je na elke herstart opnieuw inloggen.");
});
