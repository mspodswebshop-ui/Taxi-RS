/**
 * Bouwt mijn-ai.html: de hele app in één bestand.
 *
 * Dat bestand heeft geen server nodig. De pagina praat rechtstreeks met de
 * Claude API, met een sleutel die de bezoeker zelf invult en die alleen in
 * zijn eigen browser wordt bewaard. Je kunt het dus gewoon ergens neerzetten
 * (Netlify, GitHub Pages, een eigen webruimte) zonder iets te installeren.
 *
 * Gebruik: npm run build
 *
 * Het script stelt het bestand samen uit de bronnen die de serverversie ook
 * gebruikt, zodat beide versies niet uit elkaar lopen. Lukt een vervanging
 * niet, dan stopt het script met een foutmelding in plaats van stilletjes
 * iets halfs op te leveren.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = (...p) => fs.readFileSync(path.join(here, ...p), "utf8");

/**
 * Bundelt de Anthropic-SDK tot één stuk browser-JavaScript.
 *
 * De SDK wordt meegebakken in plaats van van een CDN gehaald. Een CDN is een
 * extra ding dat stuk kan: is hij traag, geblokkeerd door een netwerk of een
 * adblocker, dan doet de pagina stilzwijgend niets. Meebakken kost ongeveer
 * 65 KB en maakt het bestand volledig zelfstandig.
 */
async function bundelSDK() {
  const resultaat = await esbuild.build({
    entryPoints: [path.join(here, "standalone", "sdk-entry.js")],
    bundle: true,
    format: "iife",
    globalName: "AnthropicSDK",
    platform: "browser",
    minify: true,
    write: false,
    logLevel: "warning",
  });
  return resultaat.outputFiles[0].text;
}

/**
 * Vervangt een stuk tekst en klaagt als het niet gevonden wordt.
 *
 * De vervanging gaat via een functie, niet via een tekenreeks. In een
 * vervangende tekenreeks hebben `$&`, `$\`` en `$'` namelijk een speciale
 * betekenis, en de geminificeerde SDK bevat zulke combinaties. Dat plakte de
 * gezochte tekst midden in de code terug en brak het script af.
 */
function vervang(bron, oud, nieuw, wat) {
  if (!bron.includes(oud)) {
    throw new Error(
      `Bouwen mislukt: ${wat} niet gevonden. Is de broncode gewijzigd?\n` +
        `Gezocht naar:\n${oud.slice(0, 120)}…`,
    );
  }
  return bron.replace(oud, () => nieuw);
}

/** Haalt het blok tussen twee markeringen op, inclusief de markeringen. */
function blokTussen(bron, begin, eind, wat) {
  const a = bron.indexOf(begin);
  const b = bron.indexOf(eind);
  if (a === -1 || b === -1) throw new Error(`Bouwen mislukt: ${wat} niet gevonden.`);
  return bron.slice(a, b + eind.length);
}

const MARKER_BEGIN = "// === NETWERKLAAG: begin ===";
const MARKER_EIND = "// === NETWERKLAAG: einde ===";

// ---------- 1. Bronnen inlezen ----------

const html = read("public", "index.html");
const css = read("public", "styles.css");
let app = read("public", "app.js");
const browser = read("standalone", "browser.js");
const models = read("lib", "models.js");

// ---------- 2. De netwerklaag omwisselen ----------

app = vervang(
  app,
  blokTussen(app, MARKER_BEGIN, MARKER_EIND, "de netwerklaag in app.js"),
  blokTussen(browser, MARKER_BEGIN, MARKER_EIND, "de netwerklaag in browser.js"),
  "de netwerklaag",
);

// ---------- 3. Instellingen komen niet van een server maar uit models.js ----

app = vervang(
  app,
  `  try {
    const res = await fetch("/api/config");
    if (!res.ok) throw new Error(String(res.status));
    config = { ...config, ...(await res.json()) };
  } catch {
    blockWith("Geen verbinding met de server van de app.", [
      "Kijk of 'npm start' nog draait in je terminal.",
      "Staat er een foutmelding in die terminal? Die vertelt wat er mis is.",
      "Controleer of je het adres gebruikt dat de server noemt, meestal http://localhost:3000",
    ]);
    return;
  }`,
  `  config = {
    models: MODELS,
    defaultModel: DEFAULT_MODEL,
    defaultEffort: DEFAULT_EFFORT,
    defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    hasCredentials: Boolean(getApiKey()),
  };`,
  "het ophalen van de instellingen",
);

// ---------- 4. Geen servercontrole meer, maar een sleutelcontrole ----------

app = vervang(
  app,
  `  // Rechtstreeks geopend bestand (file://): er is dan geen server die de
  // Claude API kan aanroepen, dus chatten kan sowieso niet werken.
  if (location.protocol === "file:") {
    blockWith("Je hebt index.html rechtstreeks geopend. Zo kan de app niet werken.", [
      "Open een terminal in de map ai-app.",
      "Voer 'npm install' uit (eenmalig).",
      "Maak een bestand .env met daarin ANTHROPIC_API_KEY=sk-ant-...",
      "Voer 'npm start' uit.",
      "Ga in je browser naar http://localhost:3000",
    ]);
    return;
  }`,
  `  // Vanaf de schijf geopend (file://): browsers blokkeren dan verzoeken naar
  // de API. De pagina moet via http(s) geopend worden.
  if (location.protocol === "file:") {
    blockWith("Dit bestand is vanaf je schijf geopend. Zo blokkeert je browser de API.", [
      "Zet het bestand online, bijvoorbeeld door mijn-ai.html naar netlify.com/drop te slepen.",
      "Of open het via een lokale webserver, bijvoorbeeld: npx serve",
      "Daarna werkt alles normaal.",
    ]);
    return;
  }`,
  "de controle op rechtstreeks openen",
);

app = vervang(
  app,
  `  if (!config.hasCredentials) {
    showNotice(
      "Er is nog geen API-sleutel ingesteld op de server. Kopieer .env.example naar .env, " +
        "vul ANTHROPIC_API_KEY in en start de server opnieuw.",
      "error",
    );
  }`,
  `  if (!config.hasCredentials) {
    ui.input.disabled = true;
    ui.input.placeholder = "Vul eerst je API-sleutel in";
    openKeyScreen({ canCancel: false });
  }`,
  "de melding over een ontbrekende sleutel",
);

// ---------- 5. Alles samenvoegen tot één bestand ----------

// models.js is een module; in het losse bestand worden het gewone constanten.
const modelsPlat = models
  .replace(/^export (const|function) /gm, "$1 ")
  .replace(/^export \{[^}]*\};?$/gm, "");

// De hulpfuncties uit browser.js die buiten de netwerklaag staan.
const browserRest = browser
  .slice(browser.indexOf("const KEY_STORAGE"), browser.indexOf(MARKER_BEGIN))
  .concat(browser.slice(browser.indexOf(MARKER_EIND) + MARKER_EIND.length));

const sleutelScherm = `
<div class="modal-backdrop" id="keyModal" hidden>
  <div class="modal" role="dialog" aria-modal="true" aria-labelledby="keyTitle">
    <div class="modal-head">
      <h2 id="keyTitle">Je API-sleutel</h2>
    </div>
    <div class="modal-body">
      <p style="margin:0;color:var(--text-soft);font-size:14px;line-height:1.6">
        Deze pagina praat rechtstreeks met de Claude API. Daarvoor heb je een
        eigen sleutel nodig. Die haal je op bij
        <a href="https://console.anthropic.com/settings/keys" target="_blank"
           rel="noopener noreferrer" style="color:var(--accent)">console.anthropic.com</a>
        onder <em>API keys</em>.
      </p>
      <label class="field">
        <span class="field-label">Sleutel</span>
        <textarea id="keyInput" rows="3" placeholder="sk-ant-..." spellcheck="false"
                  style="font-family:var(--mono);font-size:12.5px"></textarea>
        <span class="field-hint">
          De sleutel wordt alleen in deze browser bewaard en gaat verder nergens
          heen. Wie deze pagina op een ander apparaat opent, vult zijn eigen
          sleutel in. Gebruik je een gedeelde computer, wis hem dan na afloop
          bij Instellingen.
        </span>
      </label>
    </div>
    <div class="modal-foot">
      <button class="ghost-btn" id="keyCancelBtn" hidden>Annuleren</button>
      <div class="modal-foot-right">
        <button class="primary-btn" id="keySaveBtn">Opslaan</button>
      </div>
    </div>
  </div>
</div>
`;

// De knop om de sleutel later te wijzigen, in het instellingenscherm.
const sleutelKnop = `      <button class="ghost-btn danger" id="clearAllBtn">Alle gesprekken wissen</button>
      <button class="ghost-btn" id="changeKeyBtn">API-sleutel wijzigen</button>`;

const bindingen = `
/* ---------------------- Sleutelscherm koppelen ---------------------- */

el("keySaveBtn").addEventListener("click", saveKeyFromScreen);
el("keyCancelBtn").addEventListener("click", () => {
  el("keyModal").hidden = true;
});
el("keyInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) saveKeyFromScreen();
});
el("changeKeyBtn").addEventListener("click", () => {
  closeSettings();
  openKeyScreen({ canCancel: true });
});
`;

let uit = html;

// Stylesheet en script inline zetten.
uit = vervang(
  uit,
  '  <link rel="stylesheet" href="styles.css">',
  `  <style>\n${css}\n  </style>`,
  "de stylesheet-verwijzing",
);

uit = vervang(
  uit,
  '      <button class="ghost-btn danger" id="clearAllBtn">Alle gesprekken wissen</button>',
  sleutelKnop,
  "de knoppenrij in het instellingenscherm",
);

uit = vervang(
  uit,
  '<script src="app.js"></script>',
  `${sleutelScherm}
<script>
/* ===== De Anthropic-SDK, meegebakken zodat er geen CDN nodig is ===== */
${await bundelSDK()}
const Anthropic = AnthropicSDK.Anthropic;

/* ===== Modellen en verzoekopbouw (uit lib/models.js) ===== */
${modelsPlat}

/* ===== Browserlaag: sleutel en API-aanroepen (uit standalone/browser.js) ===== */
${browserRest}

/* ===== De app zelf (uit public/app.js) ===== */
${app}
${bindingen}
</script>`,
  "de script-verwijzing",
);

// De titel van het bestand hoeft niet naar een server te verwijzen.
uit = uit.replace(
  '<meta name="description" content="Een eigen AI-assistent op basis van de Claude API.">',
  '<meta name="description" content="Een eigen AI-assistent op basis van de Claude API. Werkt zonder server.">',
);

const doel = path.join(here, "mijn-ai.html");
fs.writeFileSync(doel, uit);

const kb = (fs.statSync(doel).size / 1024).toFixed(0);
console.log(`mijn-ai.html gebouwd (${kb} KB)`);
console.log("Eén bestand, geen server nodig. Zet het online en vul je sleutel in.");
