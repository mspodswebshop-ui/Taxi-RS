/**
 * Bouwt de losse bestanden van Weblity: elke pagina in één HTML-bestand.
 *
 *   weblity.html          de website zelf
 *   weblity-bouwer.html   de bouwer zoals de klant hem ziet
 *   weblity-beheer.html   de bouwer voor jou: ontwerp laden en site downloaden
 *
 * Zo'n bestand kun je doorsturen en met een dubbelklik openen. Stijl, script,
 * lettertypes en icoon zitten erin; er is geen map of server omheen nodig.
 *
 * De beheerversie staat nergens online: ze bestaat alleen als dit gebouwde
 * bestand, op je eigen toestel.
 *
 * Gebruik: node build-standalone.mjs
 *
 * De bestanden worden samengesteld uit dezelfde bronnen als de online versie,
 * zodat ze niet uit elkaar lopen. Lukt een vervanging niet, dan stopt het
 * script met een foutmelding in plaats van iets halfs op te leveren.
 *
 * Let op: formulieren versturen werkt alleen op de versie die op Netlify
 * staat. In een los bestand krijgt de bezoeker de WhatsApp-knop.
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

// De gedeelde stijl, met de lettertypes erin gebakken.
let basisCss = read("styles.css");
for (const font of ["bricolage-grotesque-latin-wght-normal.woff2", "inter-latin-wght-normal.woff2"]) {
  basisCss = vervang(basisCss, `url("fonts/${font}")`, `url("data:font/woff2;base64,${base64("fonts", font)}")`, font);
}
const icoon = `data:image/svg+xml;base64,${base64("favicon.svg")}`;

// Een afsluitende scripttag in de code zou het script voortijdig beëindigen.
const script = (bestand) => `<script>\n${read(bestand).replaceAll("</script", "<\\/script")}\n</script>`;

/** Bakt stijl, scripts en icoon in een pagina en schrijft het resultaat weg. */
function bouw({ bron, doel, stijlen, scripts, links = {}, bewerk = (html) => html }) {
  let html = read(bron);

  // Eerst nagaan of we elke verwijzing naar een los bestand kennen. Dat doen
  // we op de bron, vóór het inbakken: in de scripts zelf staat ook "href=".
  const bekend = new Set([...stijlen, ...scripts.map((s) => s.bestand), "favicon.svg", ...Object.keys(links)]);
  const onbekend = (html.match(/(?:href|src)="[^"]*"/g) || [])
    .map((attr) => attr.slice(attr.indexOf('"') + 1, -1))
    .filter((doelwit) => !/^(#|https?:|tel:|data:|fonts\/|\/bedankt\.html$)/.test(doelwit) && !bekend.has(doelwit));
  if (onbekend.length) throw new Error(`${bron}: onbekende verwijzingen naar losse bestanden: ${onbekend.join(", ")}`);

  // Eigen aanpassingen ook vóór het inbakken, zodat ze alleen de pagina raken
  // en niet toevallig dezelfde tekst in een script.
  html = bewerk(html);

  for (const bestand of stijlen) {
    const css = bestand === "styles.css" ? basisCss : read(bestand);
    html = vervang(html, `<link rel="stylesheet" href="${bestand}">`, `<style>\n${css}\n</style>`, bestand);
  }
  for (const { tag, bestand } of scripts) {
    html = vervang(html, tag, script(bestand), bestand);
  }
  html = vervang(html, '<link rel="icon" href="favicon.svg" type="image/svg+xml">', `<link rel="icon" href="${icoon}" type="image/svg+xml">`, "icoon");
  // De lettertypes zitten nu in de stijl; vooraf laden hoeft niet meer.
  html = html.replace(/\s*<link rel="preload" href="fonts\/[^>]+>/g, "");
  // Links naar andere pagina's wijzen naar hun losse versie.
  for (const [van, naar] of Object.entries(links)) {
    if (!html.includes(`href="${van}"`)) throw new Error(`Geen link naar ${van} gevonden in ${bron}.`);
    html = html.replaceAll(`href="${van}"`, `href="${naar}"`);
  }

  fs.writeFileSync(path.join(here, doel), html);
  console.log(`Gebouwd: ${doel} (${Math.round(fs.statSync(path.join(here, doel)).size / 1024)} KB)`);
}

bouw({
  bron: "index.html",
  doel: "weblity.html",
  stijlen: ["styles.css"],
  scripts: [{ tag: '<script src="app.js" defer></script>', bestand: "app.js" }],
  links: { "bouwer.html": "weblity-bouwer.html" },
});

const bouwer = {
  bron: "bouwer.html",
  stijlen: ["styles.css", "bouwer.css"],
  scripts: [
    { tag: '<script src="templates.js"></script>', bestand: "templates.js" },
    { tag: '<script src="bouwer.js"></script>', bestand: "bouwer.js" },
  ],
  links: { "index.html": "weblity.html" },
};

bouw({ ...bouwer, doel: "weblity-bouwer.html" });

bouw({
  ...bouwer,
  doel: "weblity-beheer.html",
  // Dit ene kenmerk zet de beheerknoppen aan (zie bouwer.css en bouwer.js).
  bewerk: (html) => vervang(html, '<html lang="nl">', '<html lang="nl" data-beheer>', "html-tag")
    .replace("<title>Kies je template — Weblity</title>", "<title>Beheer — Weblity</title>"),
});
