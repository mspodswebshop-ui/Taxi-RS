/**
 * Alles rond de bestanden van een site: een upload uitpakken tot een nieuwe
 * "deploy", bestanden opsommen, en veilig paden binnen een site opzoeken.
 *
 * Elke upload wordt een eigen map. Pas als die helemaal klaar is wijst de site
 * ernaar. Bezoekers zien dus nooit een half geüploade website, en een vorige
 * versie terugzetten is alleen een verwijzing omzetten.
 */

import fs from "node:fs";
import path from "node:path";
import AdmZip from "adm-zip";
import { SITES_DIR, id, save } from "./store.js";

export const MAX_SITE_BYTES = Number(process.env.MAX_SITE_MB || 200) * 1024 * 1024;
const MAX_FILES = 5000;
const KEEP_DEPLOYS = 5;
const KEEP_VERSIONS = 20;

/**
 * Maakt van een pad uit een upload een veilig, relatief pad. Geeft null terug
 * voor alles wat buiten de sitemap zou vallen of wat we niet willen bewaren.
 */
export function cleanPath(raw) {
  const parts = String(raw).replace(/\\/g, "/").split("/").filter((p) => p && p !== ".");
  if (!parts.length || parts.some((p) => p === ".." || p.startsWith(".") || p.includes("\0"))) return null;
  if (parts[0] === "__MACOSX" || parts.at(-1) === "Thumbs.db") return null;
  return parts.join("/");
}

/** Zoekt een bestand binnen een map op, zonder dat je eruit kunt ontsnappen. */
export function resolveInside(root, rel) {
  const full = path.resolve(root, rel);
  return full === root || full.startsWith(root + path.sep) ? full : null;
}

/**
 * Zit de hele site in één bovenliggende map (zoals bij een zip van een map)?
 * Dan halen we die map eraf, zodat index.html in de hoofdmap terechtkomt.
 */
function stripCommonFolder(entries) {
  if (entries.some((e) => !e.path.includes("/"))) return entries;
  const first = entries[0]?.path.split("/")[0];
  if (!first || entries.some((e) => e.path.split("/")[0] !== first)) return entries;
  return entries.map((e) => ({ ...e, path: e.path.slice(first.length + 1) }));
}

/**
 * Maakt een nieuwe deploy van een lijst { path, read() }-bestanden en zet hem
 * meteen online.
 */
function publish(site, entries) {
  entries = stripCommonFolder(entries.filter((e) => e.path));
  if (!entries.length) throw new Error("Er zaten geen bruikbare bestanden in de upload.");
  if (entries.length > MAX_FILES) throw new Error(`Te veel bestanden (maximaal ${MAX_FILES}).`);

  const deployId = `${Date.now()}-${id(3)}`;
  const dir = path.join(SITES_DIR, site.id, "deploys", deployId);
  let bytes = 0;
  try {
    for (const entry of entries) {
      const target = resolveInside(dir, entry.path);
      if (!target) continue;
      const data = entry.read();
      bytes += data.length;
      if (bytes > MAX_SITE_BYTES) throw new Error("De website is te groot.");
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, data);
    }
  } catch (err) {
    fs.rmSync(dir, { recursive: true, force: true });
    throw err;
  }

  site.deploys.unshift({ id: deployId, createdAt: Date.now(), files: entries.length, bytes });
  site.current = deployId;
  for (const old of site.deploys.splice(KEEP_DEPLOYS)) {
    fs.rmSync(path.join(SITES_DIR, site.id, "deploys", old.id), { recursive: true, force: true });
  }
  save();
  return site.deploys[0];
}

/** Een geüpload zipbestand uitpakken en online zetten. */
export function publishZip(site, zipFile) {
  let zip;
  try {
    zip = new AdmZip(zipFile);
  } catch {
    throw new Error("Dit zipbestand kan niet gelezen worden.");
  }
  const entries = zip
    .getEntries()
    .filter((e) => !e.isDirectory)
    .map((e) => ({ path: cleanPath(e.entryName), read: () => e.getData() }));
  // Een zip kan klein lijken en uitgepakt enorm zijn. Vooraf controleren.
  const total = zip.getEntries().reduce((sum, e) => sum + e.header.size, 0);
  if (total > MAX_SITE_BYTES) throw new Error("De website is te groot.");
  return publish(site, entries);
}

/** Losse bestanden of een hele map (met relatieve paden) online zetten. */
export function publishFiles(site, files) {
  return publish(
    site,
    files.map((f) => ({ path: cleanPath(f.originalname), read: () => fs.readFileSync(f.path) })),
  );
}

/** Een map van de schijf kopiëren, gebruikt voor de voorbeeldwebsite. */
export function publishFolder(site, folder) {
  return publish(site, listFiles(folder).map((f) => ({ path: f.path, read: () => fs.readFileSync(path.join(folder, f.path)) })));
}

/** Alle bestanden in een map, als { path, size }. */
export function listFiles(root, sub = "") {
  const out = [];
  for (const entry of fs.readdirSync(path.join(root, sub), { withFileTypes: true })) {
    const rel = sub ? `${sub}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...listFiles(root, rel));
    else if (entry.isFile()) out.push({ path: rel, size: fs.statSync(path.join(root, rel)).size });
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

/* --------------------- Versies van een bewerkte pagina -------------------- */

const versionDir = (site, pagePath) =>
  path.join(SITES_DIR, site.id, "versions", encodeURIComponent(pagePath));

/** Bewaart de huidige inhoud voordat de editor hem overschrijft. */
export function keepVersion(site, pagePath, file) {
  const dir = versionDir(site, pagePath);
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(file, path.join(dir, `${Date.now()}.html`));
  for (const old of fs.readdirSync(dir).sort().reverse().slice(KEEP_VERSIONS)) {
    fs.rmSync(path.join(dir, old));
  }
}

export function listVersions(site, pagePath) {
  try {
    return fs.readdirSync(versionDir(site, pagePath)).map((f) => Number(f.replace(".html", ""))).sort((a, b) => b - a);
  } catch {
    return [];
  }
}

export function versionFile(site, pagePath, stamp) {
  const file = path.join(versionDir(site, pagePath), `${Number(stamp)}.html`);
  return fs.existsSync(file) ? file : null;
}
