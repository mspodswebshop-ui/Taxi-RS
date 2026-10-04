/**
 * Bouwt idriss-bakkerij.html: de hele site in één bestand.
 *
 * Handig om de site te bekijken of door te sturen zonder hosting: alle
 * pagina's, de stijl en de scripts zitten erin. De links tussen pagina's
 * werken via #-adressen (bv. #bestellen.html) in plaats van losse bestanden.
 *
 * Gebruik: node build-standalone.mjs
 *
 * Lukt een stap niet, dan stopt het script met een foutmelding in plaats van
 * stilletjes iets halfs op te leveren.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const read = f => fs.readFileSync(path.join(here, f), "utf8");
const PAGES = ["index", "assortiment", "over-ons", "reviews", "bestellen", "contact"];

function between(src, start, end, file) {
  const a = src.indexOf(start), b = src.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`${file}: kon "${start}" … "${end}" niet vinden`);
  return src.slice(a + start.length, b);
}

const head = between(read("index.html"), "<head>", "</head>", "index.html")
  .replace('<link rel="stylesheet" href="style.css">', () => `<style>\n${read("style.css")}\n</style>`)
  .replace(/<title>.*<\/title>/, "<title>Idriss Bakkerij · Concept</title>");

let pages = "", scripts = "";
for (const name of PAGES) {
  const file = `${name}.html`, src = read(file);
  pages += `<div class="route" data-route="${file}" hidden>${between(src, "<main>", "</main>", file)}</div>\n`;
  const extra = src.split('<script src="app.js"></script>')[1];
  if (extra === undefined) throw new Error(`${file}: app.js wordt niet geladen`);
  const inline = extra.match(/<script>([\s\S]*?)<\/script>/);
  if (inline) scripts += `<script>\n// --- ${file} ---\n${inline[1]}</script>\n`;
}

// Wisselt tussen pagina's op basis van het #-adres.
const router = `<script>
(function () {
  const routes = $$('.route').map(r => r.dataset.route);
  function show() {
    const want = decodeURIComponent(location.hash.slice(1)) || 'index.html';
    const page = routes.includes(want) ? want : 'index.html';
    $$('.route').forEach(r => r.hidden = r.dataset.route !== page);
    document.body.dataset.page = page;
    $$('#menu a').forEach(a => a.getAttribute('href') === page ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current'));
    $('#nav').classList.remove('open');
    updateFloatCart();
    renderStatus();
    window.scrollTo(0, 0);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a) return;
    const href = a.getAttribute('href');
    if (routes.includes(href)) { e.preventDefault(); location.hash = href; }
  });
  window.addEventListener('hashchange', show);
  show();
})();
</script>`;

const html = `<!DOCTYPE html>
<html lang="nl">
<head>${head}</head>
<body data-page="index.html">
<div id="site-header"></div>
<main>
${pages}</main>
<div id="site-footer"></div>
<script>
${read("app.js")}
</script>
${scripts}${router}
</body>
</html>
`;

const out = path.join(here, "idriss-bakkerij.html");
fs.writeFileSync(out, html);
console.log(`Klaar: ${path.relative(process.cwd(), out)} (${(html.length / 1024).toFixed(0)} kB)`);
