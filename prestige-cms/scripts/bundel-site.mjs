/**
 * Bouwstap voor Netlify.
 *
 * Stopt de oorspronkelijke website (map prestige-taxi) en de beheerpagina in
 * één JavaScript-bestand, zodat de Netlify Function ze altijd bij de hand heeft.
 * Zet daarnaast een gewone kopie van de site in public/, als reserve.
 */

import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");
// De website staat in de map site/, of (in de repo Taxi-RS) in ../prestige-taxi.
const siteDir = process.env.SITE_DIR
  ? path.resolve(root, process.env.SITE_DIR)
  : [path.join(root, "site"), path.resolve(root, "../prestige-taxi")].find((d) => existsSync(path.join(d, "index.html")));
if (!siteDir) throw new Error("Website niet gevonden: zet de bestanden in de map site/.");

const PAGES = ["index.html", "diensten.html", "luchthaven.html", "over-ons.html", "contact.html"];

const files = {};
for (const p of PAGES) files[p] = await fs.readFile(path.join(siteDir, p));
for (const name of await fs.readdir(path.join(siteDir, "assets"))) {
  if (/\.(css|js)$/i.test(name)) files[`assets/${name}`] = await fs.readFile(path.join(siteDir, "assets", name));
}
const adminHtml = await fs.readFile(path.join(root, "admin.html"), "utf8");

const encoded = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, v.toString("base64")]));
await fs.mkdir(path.join(root, "generated"), { recursive: true });
await fs.writeFile(
  path.join(root, "generated", "site-bundel.mjs"),
  "// Automatisch gemaakt door scripts/bundel-site.mjs. Niet met de hand aanpassen.\n" +
    `export const files = ${JSON.stringify(encoded)};\n` +
    `export const adminHtml = ${JSON.stringify(adminHtml)};\n`,
);

await fs.rm(path.join(root, "public"), { recursive: true, force: true });
await fs.mkdir(path.join(root, "public", "assets"), { recursive: true });
for (const [p, body] of Object.entries(files)) await fs.writeFile(path.join(root, "public", p), body);

console.log(`Site gebundeld: ${Object.keys(files).length} bestanden uit ${siteDir}`);
