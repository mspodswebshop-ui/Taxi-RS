/**
 * Bouwt weblity.html: de hele site in één bestand.
 *
 * Dat bestand kun je doorsturen en met een dubbelklik openen. Stijl, script,
 * lettertypes en icoon zitten erin; er is geen map of server omheen nodig.
 *
 * Gebruik: node build-standalone.mjs
 *
 * Het script stelt het bestand samen uit index.html, styles.css en app.js,
 * zodat beide versies niet uit elkaar lopen. Lukt een vervanging niet, dan
 * stopt het met een foutmelding in plaats van iets halfs op te leveren.
 *
 * Let op: het formulier versturen werkt alleen op de versie die op Netlify
 * staat. In het losse bestand krijgt de bezoeker de WhatsApp-melding.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(here, ...p), "utf8");
const base64 = (...p) => fs.readFileSync(path.join(here, ...p)).toString("base64");

/** Vervangt precies één keer; anders klopt de bron niet meer met dit script. */
function vervang(tekst, zoek, door, wat) {
  const aantal = tekst.split(zoek).length - 1;
  if (aantal !== 1) {
    throw new Error(`"${wat}" komt ${aantal} keer voor in de bron, verwacht: 1.`);
  }
  return tekst.replace(zoek, () => door);
}

// Lettertypes in de stijl bakken.
let css = read("styles.css");
for (const font of ["bricolage-grotesque-latin-wght-normal.woff2", "inter-latin-wght-normal.woff2"]) {
  css = vervang(css, `url("fonts/${font}")`, `url("data:font/woff2;base64,${base64("fonts", font)}")`, font);
}

// Een afsluitende scripttag in de code zou het script voortijdig beëindigen.
const js = read("app.js").replaceAll("</script", "<\\/script");
const icoon = `data:image/svg+xml;base64,${base64("favicon.svg")}`;

let html = read("index.html");
html = vervang(html, '<link rel="stylesheet" href="styles.css">', `<style>\n${css}\n</style>`, "stylesheet");
html = vervang(html, '<script src="app.js" defer></script>', `<script>\n${js}\n</script>`, "script");
html = vervang(html, '<link rel="icon" href="favicon.svg" type="image/svg+xml">', `<link rel="icon" href="${icoon}" type="image/svg+xml">`, "icoon");
// De lettertypes zitten nu in de stijl; vooraf laden hoeft niet meer.
html = html.replace(/\s*<link rel="preload" href="fonts\/[^>]+>/g, "");

const over = html.match(/(?:href|src)="(?!#|https?:|tel:|data:|\/bedankt\.html)[^"]*"/g);
if (over) throw new Error(`Nog verwijzingen naar losse bestanden: ${over.join(", ")}`);

const doel = path.join(here, "weblity.html");
fs.writeFileSync(doel, html);
console.log(`Gebouwd: weblity.html (${Math.round(fs.statSync(doel).size / 1024)} KB)`);
