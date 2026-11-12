/**
 * Opslag: één JSON-bestand voor accounts en sites, en mappen voor de
 * websitebestanden zelf. Bewust simpel gehouden: geen database nodig om te
 * starten. Alles staat in DATA_DIR, dus die map moet op een schijf staan die
 * een herstart overleeft.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import * as mirror from "./mirror.js";

export const DATA_DIR = path.resolve(process.env.DATA_DIR || "data");
const DB_FILE = path.join(DATA_DIR, "db.json");
export const SITES_DIR = path.join(DATA_DIR, "sites");
export const TMP_DIR = path.join(DATA_DIR, "tmp");

for (const dir of [DATA_DIR, SITES_DIR, TMP_DIR]) fs.mkdirSync(dir, { recursive: true });

let db = { users: [], sessions: [], sites: [] };
try {
  db = { ...db, ...JSON.parse(fs.readFileSync(DB_FILE, "utf8")) };
} catch (err) {
  // Alleen een ontbrekend bestand is normaal (eerste start). Bij een kapot
  // bestand stoppen we liever dan dat we alle accounts overschrijven.
  if (err.code !== "ENOENT") throw err;
}

/* --------------------- Kopie in de database (optioneel) ------------------- */

// Schrijfacties naar de database gaan één voor één, in volgorde. Een verzoek
// wacht met antwoorden tot zijn acties klaar zijn (zie flush), zodat "opgeslagen"
// ook echt betekent dat het een herstart overleeft.
let tail = Promise.resolve();
let failed = null;

function queue(job) {
  if (!mirror.enabled) return;
  tail = tail.then(job).catch((err) => {
    console.error("Opslaan in de database mislukt:", err.message);
    failed = err;
  });
}

export async function flush() {
  await tail;
  if (failed) {
    failed = null;
    throw new Error("Opslaan is niet gelukt. Probeer het opnieuw.");
  }
}

/** Eén bestand (pad binnen de sitesmap) ook in de database zetten. */
export const mirrorFile = (key) => queue(() => mirror.put(key, fs.readFileSync(path.join(SITES_DIR, key))));
/** Een hele map gelijk trekken: nieuwe bestanden erbij, verdwenen eruit. */
export const mirrorDir = (prefix) => queue(() => mirror.syncDir(SITES_DIR, prefix));

if (mirror.enabled) {
  await mirror.init();
  db = { ...db, ...((await mirror.loadState()) || {}) };
}

// Sites waarvan de bestanden op deze schijf staan. Na een herstart is dit leeg
// en haalt ensureLocal ze bij het eerste bezoek terug uit de database.
const onDisk = new Map();

export function ensureLocal(site) {
  if (!mirror.enabled) return Promise.resolve();
  if (!onDisk.has(site.id)) {
    const job = mirror.restore(SITES_DIR, `${site.id}/`).catch((err) => {
      onDisk.delete(site.id); // volgende bezoek opnieuw proberen
      throw err;
    });
    onDisk.set(site.id, job);
  }
  return onDisk.get(site.id);
}

/** Schrijft eerst naar een tijdelijk bestand, zodat een crash niets sloopt. */
export function save() {
  const tmp = `${DB_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
  const copy = structuredClone(db);
  queue(() => mirror.saveState(copy));
}

export const id = (bytes = 8) => crypto.randomBytes(bytes).toString("hex");
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");

/* ------------------------------- Accounts ------------------------------- */

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function checkPassword(password, stored) {
  const [salt, hash] = stored.split(":");
  const test = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(test, Buffer.from(hash, "hex"));
}

export function createUser(email, password) {
  if (db.users.some((u) => u.email === email)) return null;
  const user = { id: id(), email, password: hashPassword(password), createdAt: Date.now() };
  db.users.push(user);
  save();
  return user;
}

export function login(email, password) {
  const user = db.users.find((u) => u.email === email);
  if (!user || !checkPassword(password, user.password)) return null;
  return user;
}

const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

/** Geeft het token terug; in de opslag staat alleen de hash ervan. */
export function createSession(userId) {
  const token = id(32);
  db.sessions = db.sessions.filter((s) => s.expires > Date.now());
  db.sessions.push({ hash: sha(token), userId, expires: Date.now() + SESSION_MS });
  save();
  return token;
}

export function userFromToken(token) {
  if (!token) return null;
  const session = db.sessions.find((s) => s.hash === sha(token) && s.expires > Date.now());
  return session ? db.users.find((u) => u.id === session.userId) || null : null;
}

export function dropSession(token) {
  if (!token) return;
  db.sessions = db.sessions.filter((s) => s.hash !== sha(token));
  save();
}

/* --------------------------------- Sites -------------------------------- */

export const sitesOf = (userId) => db.sites.filter((s) => s.userId === userId);
export const siteById = (siteId) => db.sites.find((s) => s.id === siteId);
export const siteBySlug = (slug) => db.sites.find((s) => s.slug === slug);
export const siteByDomain = (host) => db.sites.find((s) => s.domains.some((d) => d.name === host));

export function addSite(site) {
  db.sites.push(site);
  onDisk.set(site.id, Promise.resolve()); // nieuw: er valt niets terug te halen
  save();
}

export function removeSite(siteId) {
  db.sites = db.sites.filter((s) => s.id !== siteId);
  save();
  fs.rmSync(path.join(SITES_DIR, siteId), { recursive: true, force: true });
  queue(() => mirror.removePrefix(`${siteId}/`));
}

/** De map met de bestanden die nu online staan (of null zonder upload). */
export function liveDir(site) {
  return site.current ? path.join(SITES_DIR, site.id, "deploys", site.current) : null;
}
