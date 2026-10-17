// Maakt bakkerij-elif.html: de hele website (alle pagina's, opmaak en script)
// in één bestand. Elke pagina wordt een blok dat getoond wordt via het adres
// achter de # (bv. bakkerij-elif.html#bestellen).
//
// Gebruik:  node build-standalone.mjs
// Draai dit opnieuw na elke wijziging aan de pagina's, style.css of script.js.

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = dirname(fileURLToPath(import.meta.url));
const lees = (f) => readFileSync(join(dir, f), "utf8");

const PAGINAS = [
  { file: "index.html", id: "home" },
  { file: "assortiment.html", id: "assortiment" },
  { file: "bestellen.html", id: "bestellen" },
  { file: "reviews.html", id: "reviews" },
  { file: "contact.html", id: "contact" },
];

const tussen = (html, begin, eind) => {
  const i = html.indexOf(begin);
  const j = html.indexOf(eind, i);
  if (i < 0 || j < 0) throw new Error(`Niet gevonden: ${begin} … ${eind}`);
  return html.slice(i + begin.length, j);
};

// Links naar andere pagina's worden links naar het juiste blok.
const herschrijfLinks = (html) =>
  PAGINAS.reduce((h, p) => h.replaceAll(`href="${p.file}"`, `href="#${p.id}"`), html);

const home = lees("index.html");
const css = lees("style.css");
const js = lees("script.js");

// Kop van de homepagina (titel, beschrijving, Google-gegevens), met de opmaak erin.
let head = home.slice(0, home.indexOf("<body>"))
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${css}\n[data-page][hidden] { display: none; }\n</style>`);

const header = herschrijfLinks(tussen(home, "<body>", "<main>"))
  .replace(/ aria-current="page"/g, "");
const voet = herschrijfLinks(tussen(home, "</main>", '<script src="script.js"></script>'));

const blokken = PAGINAS.map(({ file, id }) => {
  const html = lees(file);
  const titel = html.match(/<title>(.*?)<\/title>/)[1];
  const inhoud = herschrijfLinks(tussen(html, "<main>", "</main>"));
  return `  <div data-page="${id}" data-title="${titel}"${id === "home" ? "" : " hidden"}>${inhoud}</div>`;
}).join("\n\n");

const router = `
// Toont de juiste pagina volgens het adres achter de #.
(function () {
  const paginas = [...document.querySelectorAll("[data-page]")];
  function toon() {
    const id = location.hash.slice(1) || "home";
    const doel = paginas.find((p) => p.dataset.page === id) || paginas[0];
    paginas.forEach((p) => { p.hidden = p !== doel; });
    document.title = doel.dataset.title;
    document.querySelectorAll('.nav a[href^="#"]').forEach((a) => {
      if (a.getAttribute("href") === "#" + doel.dataset.page) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", toon);
  toon();
})();
`;

const uit = `${head}<body>
${header}<main>

${blokken}

  </main>${voet}<script>
${js}
${router}</script>
</body>
</html>
`;

writeFileSync(join(dir, "bakkerij-elif.html"), uit);
console.log(`bakkerij-elif.html gemaakt (${Math.round(uit.length / 1024)} kB, ${PAGINAS.length} pagina's)`);
