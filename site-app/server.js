/**
 * Zetlive: klanten uploaden hun website, koppelen een domein en bewerken de
 * pagina's door er gewoon op te klikken. Elke wijziging staat meteen online.
 *
 * Eén server doet drie dingen:
 *   1. het dashboard en de API (inloggen, uploaden, domeinen, opslaan);
 *   2. de websites van klanten uitserveren, gekozen op de hostnaam;
 *   3. dezelfde pagina's in "bewerkmodus" tonen, met de editor erin geladen.
 */

import "dotenv/config";
import path from "node:path";
import fs from "node:fs";
import dns from "node:dns/promises";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import * as store from "./lib/store.js";
import * as deploy from "./lib/deploy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4100);

// Het hoofddomein van het platform, bijvoorbeeld "zetlive.nl". Elke site krijgt
// dan <naam>.zetlive.nl. Zonder deze instelling (lokaal uitproberen) staan de
// sites op /s/<naam>/ van het dashboard zelf.
const BASE_DOMAIN = (process.env.BASE_DOMAIN || "").toLowerCase().replace(/^\.+|\.+$/g, "");
const PATH_MODE = !BASE_DOMAIN;

const RESERVED = new Set(["www", "app", "api", "admin", "mail", "ftp", "dashboard", "zetlive"]);
const IMAGE_TYPES = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"]);

const app = express();
app.disable("x-powered-by");
// Achter een proxy (Render, Caddy, nginx) staat het echte adres in de
// X-Forwarded-kopjes. Zet TRUST_PROXY=0 als de server direct aan internet hangt.
app.set("trust proxy", process.env.TRUST_PROXY === "0" ? false : 1);

const upload = multer({
  dest: store.TMP_DIR,
  preservePath: true, // nodig om de mappenstructuur van een geüploade map te houden
  limits: { fileSize: deploy.MAX_SITE_BYTES, files: 5000 },
});

/* ------------------------- Websites van klanten -------------------------- */

const page = (title, text) => `<!doctype html><html lang="nl"><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<body style="font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:#f6f7f9;color:#1c2330">
<div style="text-align:center;padding:24px"><h1 style="font-size:22px">${title}</h1><p style="color:#5b6577">${text}</p></div>`;

/** Zoekt het bestand dat bij een adres hoort: exact, met .html, of index.html. */
function findFile(root, rel) {
  for (const candidate of rel ? [rel, `${rel}.html`, `${rel}/index.html`] : ["index.html"]) {
    const full = deploy.resolveInside(root, candidate);
    if (full && fs.existsSync(full) && fs.statSync(full).isFile()) return full;
  }
  return null;
}

/** Zet het editorscript in een pagina, zonder de rest aan te raken. */
function withEditor(html, nonce) {
  const tag = `<script data-zetlive nonce="${nonce}" src="/__zetlive/inject.js"></script>`;
  const at = html.toLowerCase().lastIndexOf("</body>");
  return at === -1 ? html + tag : html.slice(0, at) + tag + html.slice(at);
}

function serveSite(req, res, site, urlPath) {
  const root = store.liveDir(site);
  if (!root) return res.status(404).send(page("Nog geen website", "Hier is nog niets geüpload."));

  let rel;
  try {
    rel = decodeURIComponent(urlPath).replace(/^\/+/, "");
  } catch {
    return res.status(400).send("Ongeldig adres");
  }
  const isFolder = rel === "" || rel.endsWith("/");
  rel = rel.replace(/\/+$/, "");
  // Verborgen bestanden (.env, .git) worden nooit uitgeserveerd.
  if (rel.split("/").some((p) => p.startsWith(".") || p === "..")) return res.status(404).end();

  // Een map zonder slash erachter: doorsturen, anders kloppen relatieve links niet.
  const asDir = rel && deploy.resolveInside(root, rel);
  if (!isFolder && asDir && fs.existsSync(asDir) && fs.statSync(asDir).isDirectory()) {
    const query = req.originalUrl.includes("?") ? req.originalUrl.slice(req.originalUrl.indexOf("?")) : "";
    return res.redirect(301, `${req.originalUrl.split("?")[0]}/${query}`);
  }

  let file = findFile(root, rel);
  let status = 200;
  if (!file) {
    file = findFile(root, "404.html");
    status = 404;
    if (!file) return res.status(404).send(page("Pagina niet gevonden", "Deze pagina bestaat niet."));
  }

  const csp = [];
  if (PATH_MODE) {
    // Lokaal delen de sites het adres van het dashboard. De sandbox zorgt dat
    // scripts van een site niet bij de inlog van het dashboard kunnen.
    csp.push("sandbox allow-scripts allow-forms allow-popups allow-modals");
    res.set("Access-Control-Allow-Origin", "*");
  }
  res.set("X-Content-Type-Options", "nosniff");

  const isHtml = /\.html?$/i.test(file);
  if (isHtml && "zetlive-edit" in req.query) {
    // Bewerkmodus: alleen ons eigen script mag draaien. Daardoor is wat je in
    // de editor ziet precies de HTML uit het bestand, niet wat scripts ervan
    // gemaakt hebben, en kunnen we die HTML veilig terugschrijven.
    const nonce = crypto.randomBytes(16).toString("base64");
    csp.push(`script-src 'nonce-${nonce}'`);
    res.set("Content-Security-Policy", csp.join("; "));
    res.set("Cache-Control", "no-store");
    return res.type("html").send(withEditor(fs.readFileSync(file, "utf8"), nonce));
  }

  if (csp.length) res.set("Content-Security-Policy", csp.join("; "));
  // Altijd eerst navragen bij de server: een wijziging is dan direct zichtbaar.
  res.status(status).sendFile(file, { dotfiles: "allow", headers: { "Cache-Control": "public, max-age=0, must-revalidate" } });
}

// Het editorscript moet op elk adres te laden zijn, ook op dat van een klant.
app.get("/__zetlive/inject.js", (req, res) => res.sendFile(path.join(here, "public", "inject.js")));

// Caddy vraagt hier of het een certificaat mag aanvragen voor een domein.
app.get("/__zetlive/domain-check", (req, res) => {
  const host = String(req.query.domain || "").toLowerCase();
  const known = store.siteByDomain(host) || host === BASE_DOMAIN || siteFromSubdomain(host);
  res.status(known ? 200 : 404).end();
});

function siteFromSubdomain(host) {
  if (!BASE_DOMAIN || !host.endsWith(`.${BASE_DOMAIN}`)) return null;
  return store.siteBySlug(host.slice(0, -BASE_DOMAIN.length - 1)) || null;
}

// Kiest op de hostnaam: is dit een site van een klant, of het dashboard?
app.use((req, res, next) => {
  const host = (req.hostname || "").toLowerCase();
  const site = store.siteByDomain(host) || siteFromSubdomain(host);
  if (site) return serveSite(req, res, site, req.path);
  if (BASE_DOMAIN && host.endsWith(`.${BASE_DOMAIN}`) && host !== `www.${BASE_DOMAIN}`) {
    return res.status(404).send(page("Site niet gevonden", "Op dit adres staat geen website."));
  }
  next();
});

if (PATH_MODE) {
  app.use((req, res, next) => {
    const match = req.path.match(/^\/s\/([a-z0-9-]+)(\/.*)?$/);
    if (match) {
      const site = store.siteBySlug(match[1]);
      if (!site) return res.status(404).send(page("Site niet gevonden", "Op dit adres staat geen website."));
      if (!match[2]) return res.redirect(301, `/s/${match[1]}/`);
      return serveSite(req, res, site, match[2]);
    }
    // Een site verwijst vaak naar "/style.css". In deze modus staat de site in
    // een submap, dus sturen we zulke verzoeken door naar de juiste site.
    try {
      const from = new URL(req.get("referer") || "");
      const slug = from.pathname.match(/^\/s\/([a-z0-9-]+)\//)?.[1];
      if (slug && from.host === req.get("host") && req.method === "GET" && !req.path.startsWith("/__zetlive/")) {
        return res.redirect(302, `/s/${slug}${req.originalUrl}`);
      }
    } catch {
      // Geen of ongeldige referer: gewoon verder naar het dashboard.
    }
    next();
  });
}

/* -------------------------------- De API --------------------------------- */

app.use(express.static(path.join(here, "public"), { extensions: ["html"] }));

const api = express.Router();
app.use("/api", api);
api.use(express.json({ limit: "6mb" }));

const COOKIE = "zl_session";
const readCookie = (req) =>
  (req.headers.cookie || "").split(/;\s*/).map((c) => c.split("=")).find(([k]) => k === COOKIE)?.[1];

function setCookie(req, res, token) {
  const parts = [`${COOKIE}=${token || ""}`, "Path=/", "HttpOnly", "SameSite=Lax", `Max-Age=${token ? 30 * 86400 : 0}`];
  if (req.secure) parts.push("Secure");
  res.set("Set-Cookie", parts.join("; "));
}

// Sites van klanten draaien op subdomeinen van hetzelfde hoofddomein. De
// browser stuurt het inlogkoekje dan mee met verzoeken vanaf zo'n site. Daarom
// accepteren we wijzigingen alleen als ze van het dashboard zelf komen.
api.use((req, res, next) => {
  if (req.method === "GET" || req.method === "HEAD") return next();
  const origin = req.get("origin");
  let ok = false;
  try {
    ok = Boolean(origin) && new URL(origin).host === req.get("host");
  } catch {
    ok = false;
  }
  if (!ok) return res.status(403).json({ error: "Verzoek geweigerd." });
  next();
});

api.use((req, res, next) => {
  req.user = store.userFromToken(readCookie(req));
  next();
});

// Rem op inlogpogingen: maximaal 10 per kwartier per adres.
const attempts = new Map();
function tooMany(req) {
  const now = Date.now();
  const list = (attempts.get(req.ip) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now);
  attempts.set(req.ip, list);
  return list.length > 10;
}

const publicUser = (user) => (user ? { id: user.id, email: user.email } : null);
const validEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200;

api.get("/me", (req, res) => {
  res.json({ user: publicUser(req.user), baseDomain: BASE_DOMAIN || null });
});

api.post("/register", (req, res) => {
  const email = String(req.body?.email || "").trim().toLowerCase();
  const password = String(req.body?.password || "");
  if (tooMany(req)) return res.status(429).json({ error: "Te veel pogingen. Probeer het later opnieuw." });
  if (!validEmail(email)) return res.status(400).json({ error: "Vul een geldig e-mailadres in." });
  if (password.length < 8) return res.status(400).json({ error: "Kies een wachtwoord van minstens 8 tekens." });
  const user = store.createUser(email, password);
  if (!user) return res.status(409).json({ error: "Er bestaat al een account met dit e-mailadres." });
  setCookie(req, res, store.createSession(user.id));
  res.json({ user: publicUser(user) });
});

api.post("/login", (req, res) => {
  if (tooMany(req)) return res.status(429).json({ error: "Te veel pogingen. Probeer het later opnieuw." });
  const user = store.login(String(req.body?.email || "").trim().toLowerCase(), String(req.body?.password || ""));
  if (!user) return res.status(401).json({ error: "E-mailadres of wachtwoord klopt niet." });
  setCookie(req, res, store.createSession(user.id));
  res.json({ user: publicUser(user) });
});

api.post("/logout", (req, res) => {
  store.dropSession(readCookie(req));
  setCookie(req, res, null);
  res.json({ ok: true });
});

// Vanaf hier moet je ingelogd zijn.
api.use((req, res, next) => (req.user ? next() : res.status(401).json({ error: "Log eerst in." })));

/** Het adres waarop een site te bekijken is, afgeleid van het huidige verzoek. */
function siteUrl(req, site) {
  const host = req.get("host");
  if (PATH_MODE) return `${req.protocol}://${host}/s/${site.slug}/`;
  const port = host.includes(":") ? host.slice(host.lastIndexOf(":")) : "";
  return `${req.protocol}://${site.slug}.${BASE_DOMAIN}${port}/`;
}

function describe(req, site, full = false) {
  const root = store.liveDir(site);
  const out = {
    id: site.id,
    name: site.name,
    slug: site.slug,
    url: siteUrl(req, site),
    domains: site.domains,
    createdAt: site.createdAt,
    updatedAt: site.deploys[0]?.createdAt || site.createdAt,
    live: Boolean(root),
  };
  if (full) {
    out.files = root ? deploy.listFiles(root) : [];
    out.deploys = site.deploys.map((d) => ({ ...d, current: d.id === site.current }));
    out.dnsTarget = process.env.DNS_TARGET || BASE_DOMAIN || req.hostname;
  }
  return out;
}

function slugFrom(name) {
  const base = name.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30) || "site";
  let slug = base.length < 3 ? `${base}-site` : base;
  while (RESERVED.has(slug) || store.siteBySlug(slug)) slug = `${base}-${store.id(2)}`;
  return slug;
}

/** Haalt de site uit het adres en controleert dat hij van deze gebruiker is. */
api.param("id", (req, res, next, siteId) => {
  const site = store.siteById(siteId);
  if (!site || site.userId !== req.user.id) return res.status(404).json({ error: "Site niet gevonden." });
  req.site = site;
  next();
});

api.get("/sites", (req, res) => {
  res.json({ sites: store.sitesOf(req.user.id).map((s) => describe(req, s)) });
});

api.post("/sites", (req, res) => {
  const name = String(req.body?.name || "").trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: "Geef je site een naam." });
  if (store.sitesOf(req.user.id).length >= 50) return res.status(400).json({ error: "Je hebt het maximum aantal sites bereikt." });
  const site = {
    id: store.id(),
    userId: req.user.id,
    name,
    slug: slugFrom(name),
    domains: [],
    deploys: [],
    current: null,
    createdAt: Date.now(),
  };
  store.addSite(site);
  if (req.body?.template) deploy.publishFolder(site, path.join(here, "template"));
  res.json({ site: describe(req, site, true) });
});

api.get("/sites/:id", (req, res) => res.json({ site: describe(req, req.site, true) }));

api.patch("/sites/:id", (req, res) => {
  const { name, slug } = req.body || {};
  if (typeof name === "string" && name.trim()) req.site.name = name.trim().slice(0, 60);
  if (typeof slug === "string" && slug !== req.site.slug) {
    const wanted = slug.trim().toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(wanted)) {
      return res.status(400).json({ error: "Gebruik 3 tot 40 kleine letters, cijfers of streepjes." });
    }
    if (RESERVED.has(wanted) || store.siteBySlug(wanted)) return res.status(409).json({ error: "Dit adres is al bezet." });
    req.site.slug = wanted;
  }
  store.save();
  res.json({ site: describe(req, req.site, true) });
});

api.delete("/sites/:id", (req, res) => {
  store.removeSite(req.site.id);
  res.json({ ok: true });
});

/* Uploaden: één zipbestand, of losse bestanden / een hele map. */
api.post("/sites/:id/deploy", upload.array("files"), (req, res) => {
  const files = req.files || [];
  try {
    if (!files.length) throw new Error("Kies een zipbestand of een map om te uploaden.");
    const isZip = files.length === 1 && /\.zip$/i.test(files[0].originalname);
    if (isZip) deploy.publishZip(req.site, files[0].path);
    else deploy.publishFiles(req.site, files);
    res.json({ site: describe(req, req.site, true) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    for (const f of files) fs.rm(f.path, { force: true }, () => {});
  }
});

api.post("/sites/:id/rollback", (req, res) => {
  const target = req.site.deploys.find((d) => d.id === req.body?.deployId);
  if (!target) return res.status(404).json({ error: "Deze versie bestaat niet meer." });
  req.site.current = target.id;
  store.save();
  res.json({ site: describe(req, req.site, true) });
});

/* --------------------------- Eigen domeinen ------------------------------ */

async function addresses(host) {
  try {
    return (await dns.lookup(host, { all: true })).map((a) => a.address);
  } catch {
    return [];
  }
}

/** Wijst het domein van de klant al naar deze server? */
async function checkDomain(req, name) {
  const target = process.env.DNS_TARGET || BASE_DOMAIN || req.hostname;
  const [theirs, ours] = await Promise.all([addresses(name), addresses(target)]);
  if (!theirs.length) return { status: "wacht", detail: "Dit domein heeft nog geen DNS-instelling die we kunnen vinden." };
  if (ours.length && theirs.some((a) => ours.includes(a))) return { status: "actief", detail: "Het domein wijst naar Zetlive." };
  return { status: "wacht", detail: `Het domein wijst nu naar ${theirs[0]}, nog niet naar ${target}.` };
}

api.post("/sites/:id/domains", async (req, res) => {
  const name = String(req.body?.name || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/[/:].*$/, "").replace(/\.$/, "");
  if (!/^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(name)) {
    return res.status(400).json({ error: "Dit is geen geldige domeinnaam. Voorbeeld: www.mijnbedrijf.nl" });
  }
  if (BASE_DOMAIN && (name === BASE_DOMAIN || name.endsWith(`.${BASE_DOMAIN}`))) {
    return res.status(400).json({ error: "Dit adres hoort bij Zetlive zelf. Pas hiervoor het site-adres aan." });
  }
  if (store.siteByDomain(name)) return res.status(409).json({ error: "Dit domein is al aan een site gekoppeld." });
  if (req.site.domains.length >= 10) return res.status(400).json({ error: "Maximaal 10 domeinen per site." });
  req.site.domains.push({ name, addedAt: Date.now(), ...(await checkDomain(req, name)) });
  store.save();
  res.json({ site: describe(req, req.site, true) });
});

api.post("/sites/:id/domains/:name/check", async (req, res) => {
  const domain = req.site.domains.find((d) => d.name === req.params.name);
  if (!domain) return res.status(404).json({ error: "Domein niet gevonden." });
  Object.assign(domain, await checkDomain(req, domain.name));
  store.save();
  res.json({ site: describe(req, req.site, true) });
});

api.delete("/sites/:id/domains/:name", (req, res) => {
  req.site.domains = req.site.domains.filter((d) => d.name !== req.params.name);
  store.save();
  res.json({ site: describe(req, req.site, true) });
});

/* ------------------------- Opslaan uit de editor -------------------------- */

/** Het HTML-bestand dat bij een pad hoort, of null als het geen pagina is. */
function pageFile(site, rel) {
  const root = store.liveDir(site);
  const clean = deploy.cleanPath(rel || "");
  if (!root || !clean || !/\.html?$/i.test(clean)) return null;
  const full = deploy.resolveInside(root, clean);
  return full && fs.existsSync(full) ? { full, clean } : null;
}

api.put("/sites/:id/page", (req, res) => {
  const found = pageFile(req.site, req.body?.path);
  const html = req.body?.html;
  if (!found) return res.status(404).json({ error: "Deze pagina bestaat niet." });
  if (typeof html !== "string" || !html.trim()) return res.status(400).json({ error: "Lege pagina, niet opgeslagen." });
  deploy.keepVersion(req.site, found.clean, found.full);
  fs.writeFileSync(found.full, html);
  res.json({ ok: true, versions: deploy.listVersions(req.site, found.clean) });
});

api.get("/sites/:id/versions", (req, res) => {
  const found = pageFile(req.site, req.query.path);
  res.json({ versions: found ? deploy.listVersions(req.site, found.clean) : [] });
});

api.post("/sites/:id/restore", (req, res) => {
  const found = pageFile(req.site, req.body?.path);
  const old = found && deploy.versionFile(req.site, found.clean, req.body?.stamp);
  if (!old) return res.status(404).json({ error: "Deze versie bestaat niet meer." });
  const html = fs.readFileSync(old);
  deploy.keepVersion(req.site, found.clean, found.full);
  fs.writeFileSync(found.full, html);
  res.json({ ok: true });
});

/* Een afbeelding uploaden vanuit de editor. */
api.post("/sites/:id/asset", upload.single("file"), (req, res) => {
  const root = store.liveDir(req.site);
  try {
    const ext = path.extname(req.file?.originalname || "").toLowerCase();
    if (!root) throw new Error("Upload eerst een website.");
    if (!req.file || !IMAGE_TYPES.has(ext)) throw new Error("Kies een afbeelding (png, jpg, gif, webp, svg of avif).");
    if (req.file.size > 15 * 1024 * 1024) throw new Error("De afbeelding is groter dan 15 MB.");
    const name = `${store.id(6)}${ext}`;
    fs.mkdirSync(path.join(root, "zetlive-uploads"), { recursive: true });
    fs.copyFileSync(req.file.path, path.join(root, "zetlive-uploads", name));
    res.json({ url: `/zetlive-uploads/${name}` });
  } catch (err) {
    res.status(400).json({ error: err.message });
  } finally {
    if (req.file) fs.rm(req.file.path, { force: true }, () => {});
  }
});

api.use((req, res) => res.status(404).json({ error: "Onbekend adres." }));

// Fouten netjes als JSON teruggeven, bijvoorbeeld een te groot bestand.
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const tooBig = err.code === "LIMIT_FILE_SIZE" || err.type === "entity.too.large";
  if (!tooBig) console.error(err);
  res.status(tooBig ? 413 : 500).json({ error: tooBig ? "Het bestand is te groot." : "Er ging iets mis op de server." });
});

app.listen(PORT, () => {
  console.log(`Zetlive draait op http://localhost:${PORT}`);
  console.log(BASE_DOMAIN ? `Sites staan op <naam>.${BASE_DOMAIN}` : "Geen BASE_DOMAIN ingesteld: sites staan op /s/<naam>/");
});
