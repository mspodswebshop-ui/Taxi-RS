/**
 * De kern van het CMS van Prestige Taxi Antwerpen.
 *
 * Eén functie die een verzoek (Request) omzet in een antwoord (Response).
 * Dezelfde code draait als Netlify Function (netlify/functions/site.mjs) en
 * als gewone Node-server (server.js).
 *
 * Bezoekers zien de website. De eigenaar logt in op /admin, past teksten en
 * foto's aan en klikt op "Publiceren": vanaf dan ziet iedereen de nieuwe
 * versie. Wat gepubliceerd is, staat in de opslag (zie store.js) en gaat voor
 * op de oorspronkelijke bestanden van de site.
 */

import crypto from "node:crypto";
import { typeFor } from "./store.js";

export const PAGES = ["index.html", "diensten.html", "luchthaven.html", "over-ons.html", "contact.html"];
// Bestanden die het beheer mag overschrijven. main.js staat erbij omdat daar
// het telefoonnummer en e-mailadres van het reservatieformulier in staan.
const EDITABLE = [...PAGES, "assets/main.js"];
const VERSION_FILE = "meta/versie.json";
const SECRET_FILE = "meta/sessie-geheim.txt";
const MEDIA_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_MEDIA = 4 * 1024 * 1024; // Netlify Functions aanvaarden tot 6 MB per verzoek.
const SESSION_DAYS = 14;
const COOKIE = "pta_sessie";

// Ingebouwd wachtwoord voor /admin, voor als ADMIN_PASSWORD niet ingesteld is.
// Hier staat alleen een versleutelde versie (scrypt), nooit het wachtwoord zelf.
// Zet ADMIN_PASSWORD bij de server om een ander wachtwoord te gebruiken.
const DEFAULT_PASSWORD_HASH = "scrypt:9a9b2badcb66d77ba03c444abdf8ba09:912d5d9cf666018e13f7b0286fe51b5c9281c8125402e4a4a8f0187f150bcace";

/**
 * @param {object} o
 * @param {object} o.store         opslag uit store.js
 * @param {(p: string) => Promise<Uint8Array|null>} o.readOriginal  originele sitebestanden
 * @param {() => Promise<string>} o.adminHtml   de beheerpagina
 * @param {string} [o.adminPassword]  wachtwoord uit ADMIN_PASSWORD (anders het ingebouwde)
 * @param {string} [o.sessionSecret]  geheim uit SESSION_SECRET (anders bewaard in de opslag)
 */
export function createApp({ store, readOriginal, adminHtml, adminPassword = "", sessionSecret = "" }) {
  /* ------------------------------- Inloggen ------------------------------- */

  // Het geheim voor de login-cookie moet vast blijven, ook als Netlify een
  // nieuwe kopie van de functie start. Daarom wordt het één keer gemaakt en
  // in de opslag bewaard (nooit via de website op te vragen).
  let secretPromise = null;
  function secret() {
    if (sessionSecret) return Promise.resolve(sessionSecret);
    if (!secretPromise) {
      secretPromise = store.get(SECRET_FILE).then(async (f) => {
        if (f) return Buffer.from(f.body).toString("utf8");
        const s = crypto.randomBytes(32).toString("hex");
        await store.put(SECRET_FILE, Buffer.from(s), "text/plain");
        return s;
      }).catch((err) => {
        secretPromise = null;
        throw err;
      });
    }
    return secretPromise;
  }

  async function sign(value) {
    return crypto.createHmac("sha256", await secret()).update(value).digest("base64url");
  }

  async function makeToken() {
    const expires = String(Date.now() + SESSION_DAYS * 864e5);
    return `${expires}.${await sign(expires)}`;
  }

  async function validToken(token) {
    if (!token) return false;
    const [expires, mac] = token.split(".");
    if (!expires || !mac || Number(expires) < Date.now()) return false;
    const a = Buffer.from(mac);
    const b = Buffer.from(await sign(expires));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }

  function readCookie(req, name) {
    for (const part of (req.headers.get("cookie") || "").split(";")) {
      const [k, ...v] = part.trim().split("=");
      if (k === name) return decodeURIComponent(v.join("="));
    }
    return null;
  }

  function sessionCookie(req, token, maxAgeSec) {
    const https = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
    return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSec}${https ? "; Secure" : ""}`;
  }

  const isLoggedIn = (req) => validToken(readCookie(req, COOKIE));

  function samePassword(given) {
    if (!adminPassword) {
      const [, salt, hash] = DEFAULT_PASSWORD_HASH.split(":");
      const a = crypto.scryptSync(String(given), salt, 32);
      return crypto.timingSafeEqual(a, Buffer.from(hash, "hex"));
    }
    // Beide eerst hashen, zodat de vergelijking even lang duurt bij elk wachtwoord.
    const a = crypto.createHash("sha256").update(String(given)).digest();
    const b = crypto.createHash("sha256").update(adminPassword).digest();
    return crypto.timingSafeEqual(a, b);
  }

  // Na te veel foute pogingen even wachten, tegen het raden van het wachtwoord.
  const attempts = new Map();
  const MAX_ATTEMPTS = 8;
  const LOCK_MS = 15 * 60 * 1000;

  /* ------------------------------- Hulpjes ------------------------------- */

  const json = (data, status = 200, headers = {}) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers },
    });

  async function readJson(req, limit) {
    const text = await req.text();
    if (text.length > limit) {
      const err = new Error("Te groot");
      err.status = 413;
      throw err;
    }
    try {
      return JSON.parse(text || "{}");
    } catch {
      const err = new Error("Ongeldige gegevens");
      err.status = 400;
      throw err;
    }
  }

  /** Een bestand uit de opslag, en anders het origineel van de site. */
  async function readSiteFile(p) {
    const saved = await store.get(p);
    if (saved) return saved;
    const body = await readOriginal(p);
    return body ? { body, type: typeFor(p) } : null;
  }

  async function readVersion() {
    const v = await store.get(VERSION_FILE);
    if (!v) return { version: 0, publishedAt: null };
    try {
      return JSON.parse(Buffer.from(v.body).toString("utf8"));
    } catch {
      return { version: 0, publishedAt: null };
    }
  }

  const textOf = async (p) => {
    const f = await readSiteFile(p);
    return f ? Buffer.from(f.body).toString("utf8") : "";
  };

  /* ------------------------------ Routes ------------------------------ */

  async function login(req, ip) {
    const now = Date.now();
    const a = attempts.get(ip) || { count: 0, until: 0 };
    if (a.until > now) {
      const min = Math.ceil((a.until - now) / 60000);
      return json({ error: `Te veel foute pogingen. Probeer opnieuw over ${min} minuten.` }, 429);
    }
    const body = await readJson(req, 10_000);
    if (!samePassword(body.password || "")) {
      a.count += 1;
      if (a.count >= MAX_ATTEMPTS) {
        a.count = 0;
        a.until = now + LOCK_MS;
      }
      attempts.set(ip, a);
      return json({ error: "Dat wachtwoord klopt niet." }, 401);
    }
    attempts.delete(ip);
    return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(req, await makeToken(), SESSION_DAYS * 86400) });
  }

  async function getSite() {
    const pages = {};
    for (const p of PAGES) pages[p] = await textOf(p);
    return json({ pages, text: { "assets/main.js": await textOf("assets/main.js") }, ...(await readVersion()) });
  }

  // Eén publicatie per keer, zodat twee snelle klikken elkaar niet kruisen.
  let publishing = Promise.resolve();

  function putSite(req) {
    const run = publishing.then(async () => {
      const { pages = {}, text = {}, version } = await readJson(req, 5 * 1024 * 1024);
      const current = await readVersion();
      if (Number(version) !== Number(current.version)) {
        return json(
          { error: "Iemand anders heeft intussen gepubliceerd. Herlaad het beheer om met de nieuwste versie verder te werken." },
          409,
        );
      }
      const files = [];
      for (const [p, html] of Object.entries({ ...pages, ...text })) {
        if (!EDITABLE.includes(p)) return json({ error: `Dit bestand mag niet gewijzigd worden: ${p}` }, 400);
        if (typeof html !== "string" || !html.trim()) return json({ error: `Lege inhoud voor ${p}` }, 400);
        if (PAGES.includes(p) && !/<html[\s>]/i.test(html)) return json({ error: `${p} is geen geldige pagina` }, 400);
        files.push({ path: p, body: Buffer.from(html, "utf8") });
      }
      const nieuw = { version: current.version + 1, publishedAt: new Date().toISOString() };
      files.push({ path: VERSION_FILE, body: Buffer.from(JSON.stringify(nieuw)) });
      await store.putMany(files);
      return json({ ok: true, ...nieuw });
    });
    publishing = run.catch(() => {});
    return run;
  }

  async function postMedia(req) {
    const { data, type } = await readJson(req, Math.ceil(MAX_MEDIA * 1.4) + 1000);
    const ext = MEDIA_TYPES[type];
    if (!ext || typeof data !== "string") return json({ error: "Alleen JPG-, PNG- of WebP-foto's." }, 400);
    const body = Buffer.from(data, "base64");
    if (body.length < 100 || body.length > MAX_MEDIA) {
      return json({ error: "De foto is te groot of beschadigd (maximaal 4 MB)." }, 400);
    }
    // Controleren dat het echt een foto is en niet iets anders met een fotonaam.
    const isJpg = body[0] === 0xff && body[1] === 0xd8;
    const isPng = body.subarray(0, 4).toString("hex") === "89504e47";
    const isWebp = body.subarray(0, 4).toString() === "RIFF" && body.subarray(8, 12).toString() === "WEBP";
    if (!(isJpg || isPng || isWebp)) return json({ error: "Dit bestand is geen foto." }, 400);
    const name = `media/${Date.now().toString(36)}-${crypto.randomBytes(4).toString("hex")}.${ext}`;
    await store.put(name, body, type);
    return json({ ok: true, path: name });
  }

  async function reset() {
    for (const p of EDITABLE) await store.remove(p);
    const current = await readVersion();
    await store.put(
      VERSION_FILE,
      Buffer.from(JSON.stringify({ version: current.version + 1, publishedAt: new Date().toISOString() })),
    );
    return json({ ok: true });
  }

  async function sendSiteFile(p) {
    const f = await readSiteFile(p);
    if (!f) return null;
    // Altijd even navragen, zodat een publicatie meteen zichtbaar is.
    return new Response(f.body, { headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=0, must-revalidate" } });
  }

  /* ------------------------------ Verdeler ------------------------------ */

  async function route(req, ip) {
    const url = new URL(req.url);
    const p = url.pathname;
    const m = req.method;

    if (p.startsWith("/api/")) {
      if (p === "/api/login" && m === "POST") return login(req, ip);
      if (p === "/api/logout" && m === "POST") return json({ ok: true }, 200, { "Set-Cookie": sessionCookie(req, "", 0) });
      if (p === "/api/me" && m === "GET") {
        return json({ loggedIn: await isLoggedIn(req), passwordSet: true, storage: store.kind });
      }
      if (!(await isLoggedIn(req))) return json({ error: "Je bent niet (meer) ingelogd." }, 401);
      if (p === "/api/site" && m === "GET") return getSite();
      if (p === "/api/site" && m === "PUT") return putSite(req);
      if (p === "/api/media" && m === "POST") return postMedia(req);
      if (p === "/api/reset" && m === "POST") return reset();
      return json({ error: "Onbekend adres." }, 404);
    }

    if (m !== "GET" && m !== "HEAD") return new Response("Niet toegestaan", { status: 405 });

    if (p === "/admin" || p === "/admin/") {
      return new Response(await adminHtml(), {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    // Het oude zip-beheer hoort niet bij het CMS: stuur door naar het echte beheer.
    if (p === "/beheer.html") return Response.redirect(new URL("/admin", url), 301);

    const media = /^\/media\/([a-z0-9-]+\.(jpg|png|webp))$/i.exec(p);
    if (media) {
      const f = await store.get(`media/${media[1]}`);
      if (!f) return new Response("Niet gevonden", { status: 404 });
      // Elke foto krijgt een nieuwe naam, dus de browser mag hem lang bewaren.
      return new Response(f.body, { headers: { "Content-Type": f.type, "Cache-Control": "public, max-age=31536000, immutable" } });
    }

    if (p === "/") return (await sendSiteFile("index.html")) || new Response("Niet gevonden", { status: 404 });

    const name = p.slice(1);
    if (PAGES.includes(name)) return sendSiteFile(name);
    if (PAGES.includes(`${name}.html`)) return sendSiteFile(`${name}.html`);

    if (/^assets\/[a-z0-9_-]+\.(css|js)$/i.test(name)) {
      const res = await sendSiteFile(name);
      if (res) return res;
    }

    return Response.redirect(new URL("/", url), 302);
  }

  return async function handle(req, { ip = "onbekend" } = {}) {
    try {
      return await route(req, ip);
    } catch (err) {
      if (err.status === 413) return json({ error: "Dat is te groot om te versturen." }, 413);
      if (err.status === 400) return json({ error: err.message }, 400);
      console.error(err);
      if (new URL(req.url).pathname.startsWith("/api/")) {
        return json({ error: "Er ging iets mis op de server. Probeer het opnieuw." }, 500);
      }
      return new Response("Er ging iets mis. Probeer het later opnieuw.", { status: 500 });
    }
  };
}
