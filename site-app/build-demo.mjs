/**
 * Maakt demo.html: de editor in één los bestand, zonder server. Handig om te
 * laten zien hoe het bewerken werkt. Uploaden, domeinen en online zetten
 * zitten hier niet in; daarvoor is de echte app nodig (npm start).
 *
 * Gebruik: node build-demo.mjs
 */

import fs from "node:fs";

const read = (file) => fs.readFileSync(new URL(file, import.meta.url), "utf8");
const inScript = (text) => JSON.stringify(text).replace(/<\//g, "<\\/");

const css = read("public/style.css");
const inject = read("public/inject.js");
const editor = read("public/editor.js");
// De voorbeeldsite, met de stylesheet erin gezet zodat hij los werkt.
const sample = read("template/index.html").replace(
  '<link rel="stylesheet" href="style.css">',
  `<style>\n${read("template/style.css")}</style>`,
);

// Het zijpaneel is exact dat van de echte editor.
const start = editor.indexOf("function drawPanel()");
const end = editor.indexOf("/* ----------------------- Berichten uit");
if (start === -1 || end === -1) throw new Error("drawPanel niet gevonden in editor.js");
const drawPanel = editor.slice(start, end);

const html = `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Zetlive – demo van de editor</title>
<style>
${css}
</style>
</head>
<body>
<div class="editor">
  <div class="bar-top">
    <span class="logo">zet<span>live</span></span>
    <span class="pill warn">Demo</span>
    <div class="seg" id="devices">
      <button data-w="100%" class="on">Computer</button>
      <button data-w="768px">Tablet</button>
      <button data-w="390px">Telefoon</button>
    </div>
    <button id="undo" disabled title="Ongedaan maken (Ctrl+Z)">↶</button>
    <button id="redo" disabled title="Opnieuw (Ctrl+Shift+Z)">↷</button>
    <div class="spacer"></div>
    <span class="status" id="status"></span>
    <button id="open">Eigen HTML-bestand openen</button>
    <input type="file" id="file" accept=".html,.htm" hidden>
    <button class="primary" id="publish">Download HTML</button>
  </div>
  <div class="work">
    <div class="stage"><iframe id="frame" title="Je website" sandbox="allow-scripts"></iframe></div>
    <aside class="panel" id="panel"></aside>
  </div>
</div>
<script>
const INJECT = ${inScript(inject)};
const SAMPLE = ${inScript(sample)};
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const frame = $("frame");
const panel = $("panel");
const siteId = "demo";
let info = null;
let fileName = "index.html";

const tell = (cmd, data = {}) => frame.contentWindow.postMessage({ zetlive: true, cmd, ...data }, "*");

function toast(html, ms = 4000) {
  document.querySelector(".toast")?.remove();
  const el = Object.assign(document.createElement("div"), { className: "toast", innerHTML: html });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// In de demo is er geen server: een gekozen afbeelding gaat in de pagina zelf.
async function api(method, url, body) {
  const file = body.get("file");
  const data = await new Promise((ok, fail) => {
    const reader = new FileReader();
    reader.onload = () => ok(reader.result);
    reader.onerror = fail;
    reader.readAsDataURL(file);
  });
  return { url: data };
}

${drawPanel}

function load(html) {
  info = null;
  drawPanel();
  $("undo").disabled = $("redo").disabled = true;
  $("status").textContent = "";
  const tag = "<script data-zetlive>" + INJECT + "<\\/script>";
  const at = html.toLowerCase().lastIndexOf("</body>");
  frame.srcdoc = at === -1 ? html + tag : html.slice(0, at) + tag + html.slice(at);
}

const waiting = new Map();
addEventListener("message", (e) => {
  if (e.source !== frame.contentWindow || !e.data?.zetlive) return;
  const msg = e.data;
  if (msg.type === "select") {
    const busy = panel.contains(document.activeElement) && document.activeElement.matches("input[type=color]");
    info = msg.info;
    if (!busy) drawPanel();
  } else if (msg.type === "deselect") {
    info = null;
    drawPanel();
  } else if (msg.type === "dirty") {
    $("status").textContent = "Gewijzigd";
    $("status").className = "status dirty";
  } else if (msg.type === "history") {
    $("undo").disabled = !msg.canUndo;
    $("redo").disabled = !msg.canRedo;
  } else if (msg.type === "save") {
    download();
  } else if (msg.type === "html") {
    waiting.get(msg.requestId)?.(msg.html);
    waiting.delete(msg.requestId);
  }
});

async function download() {
  const html = await new Promise((resolve) => {
    const requestId = Math.random().toString(36).slice(2);
    waiting.set(requestId, resolve);
    tell("getHtml", { requestId });
  });
  const link = Object.assign(document.createElement("a"), {
    href: URL.createObjectURL(new Blob([html], { type: "text/html" })),
    download: fileName,
  });
  link.click();
  toast("De aangepaste pagina is gedownload. In de echte app staat hij met deze knop direct online.");
}

$("publish").onclick = download;
$("undo").onclick = () => tell("undo");
$("redo").onclick = () => tell("redo");
$("open").onclick = () => $("file").click();
$("file").onchange = async () => {
  const file = $("file").files[0];
  if (!file) return;
  fileName = file.name;
  load(await file.text());
  toast("Geopend. Losse bestanden zoals stylesheets en afbeeldingen laden in deze demo niet mee.", 6000);
};
$("devices").onclick = (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  $("devices").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === button));
  frame.style.width = button.dataset.w;
};

load(SAMPLE);
</script>
</body>
</html>
`;

fs.writeFileSync(new URL("demo.html", import.meta.url), html);
console.log(`demo.html gemaakt (${Math.round(html.length / 1024)} kB)`);
