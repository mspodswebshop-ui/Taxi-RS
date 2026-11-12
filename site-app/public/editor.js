/**
 * Het editorscherm: laadt de pagina van de klant in een venster en toont
 * ernaast de instellingen van het element waarop geklikt is. Het script in de
 * pagina zelf (inject.js) voert de wijzigingen uit; dit scherm bewaart ze.
 */

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const params = new URLSearchParams(location.search);
const siteId = params.get("site");
const frame = $("frame");
const panel = $("panel");

async function api(method, url, body) {
  const isForm = body instanceof FormData;
  const res = await fetch(`/api${url}`, {
    method,
    headers: body && !isForm ? { "Content-Type": "application/json" } : {},
    body: isForm ? body : body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) location.href = "/";
  if (!res.ok) throw new Error(data.error || "Er ging iets mis.");
  return data;
}

let site = null;
let pagePath = params.get("path") || "";
let dirty = false;
let info = null; // het geselecteerde element, zoals de pagina het beschrijft

const tell = (cmd, data = {}) => frame.contentWindow.postMessage({ zetlive: true, cmd, ...data }, "*");

function toast(html, ms = 4000) {
  document.querySelector(".toast")?.remove();
  const el = Object.assign(document.createElement("div"), { className: "toast", innerHTML: html });
  document.body.appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function setDirty(value) {
  dirty = value;
  $("publish").disabled = !value;
  $("status").textContent = value ? "Niet-gepubliceerde wijzigingen" : "";
  $("status").className = `status ${value ? "dirty" : ""}`;
}

/* ------------------------------ Pagina laden ----------------------------- */

const pageUrl = () => site.url + pagePath.split("/").map(encodeURIComponent).join("/");

function loadPage() {
  setDirty(false);
  info = null;
  drawPanel();
  $("undo").disabled = $("redo").disabled = true;
  // Het tijdstempel voorkomt dat de browser een oude versie laat zien.
  frame.src = `${pageUrl()}?zetlive-edit&t=${Date.now()}`;
  history.replaceState(null, "", `?site=${siteId}&path=${encodeURIComponent(pagePath)}`);
  loadVersions();
}

async function loadVersions() {
  const { versions } = await api("GET", `/sites/${siteId}/versions?path=${encodeURIComponent(pagePath)}`);
  $("versions").hidden = !versions.length;
  $("versions").innerHTML =
    `<option value="">Geschiedenis…</option>` +
    versions
      .map((v) => `<option value="${v}">Versie van ${new Date(v).toLocaleString("nl-NL", { dateStyle: "short", timeStyle: "short" })}</option>`)
      .join("");
}

/* ------------------------------ Het zijpaneel ---------------------------- */

function drawPanel() {
  if (!info) {
    panel.innerHTML = `
      <h2>Klik op iets om het aan te passen</h2>
      <p class="muted">Klik op een tekst en begin te typen. Klik op een knop, afbeelding of blok om kleuren,
      grootte en links te veranderen.</p>
      <p class="muted small">Klaar? Druk op <strong>Publiceren</strong> en je wijziging staat direct online.</p>`;
    return;
  }
  const s = info.style;
  const color = (label, prop, value) => `
    <label>${label}</label>
    <div class="field">
      <input type="color" data-style="${prop}" value="${value || "#ffffff"}">
      <span class="muted small">${value || "geen"}</span>
      <button class="link small" data-clear="${prop}">Herstel</button>
    </div>`;
  const number = (label, prop, value, max) => `
    <label>${label}</label>
    <div class="field"><input type="number" min="0" max="${max}" data-px="${prop}" value="${value}"><span class="muted small">pixels</span></div>`;

  panel.innerHTML = `
    <h2>${esc(info.name)}</h2>
    <p class="muted small" style="margin:0">${info.editable ? "Typ direct in de pagina om de tekst te veranderen." : "Dit onderdeel heeft geen eigen tekst."}</p>

    ${info.image ? `<section>
      <label>Afbeelding</label>
      <button id="pickImage">Andere afbeelding kiezen</button>
      <input type="file" id="imageFile" accept="image/*" hidden>
      <label for="alt">Beschrijving (voor zoekmachines en blinden)</label>
      <input type="text" id="alt" value="${esc(info.image.alt)}">
    </section>` : ""}

    ${info.link ? `<section>
      <label for="href">Link gaat naar</label>
      <input type="text" id="href" value="${esc(info.link.href)}" placeholder="https://… of contact.html">
      <label class="check"><input type="checkbox" id="newTab" ${info.link.newTab ? "checked" : ""}> Openen in nieuw tabblad</label>
    </section>` : ""}

    <section>
      ${color("Tekstkleur", "color", s.color)}
      ${color("Achtergrondkleur", "background-color", s.backgroundColor)}
    </section>

    <section>
      ${number("Lettergrootte", "font-size", s.fontSize, 300)}
      <label>Opmaak</label>
      <div class="row">
        <div class="seg">
          <button data-toggle="bold" class="${s.bold ? "on" : ""}" title="Vet"><b>B</b></button>
          <button data-toggle="italic" class="${s.italic ? "on" : ""}" title="Cursief"><i>I</i></button>
          <button data-toggle="underline" class="${s.underline ? "on" : ""}" title="Onderstreept"><u>U</u></button>
        </div>
        <div class="seg">
          ${[["left", "Links"], ["center", "Midden"], ["right", "Rechts"]]
            .map(([v, t]) => `<button data-align="${v}" class="${s.textAlign === v ? "on" : ""}">${t}</button>`)
            .join("")}
        </div>
      </div>
    </section>

    <section>
      ${number("Ronde hoeken", "border-radius", s.borderRadius, 500)}
      ${number("Ruimte boven en onder", "padding-block", s.paddingY, 500)}
      ${number("Ruimte links en rechts", "padding-inline", s.paddingX, 500)}
    </section>

    <section>
      <label>Onderdeel</label>
      <div class="row">
        ${info.canParent ? '<button data-cmd="parent" title="Selecteer het blok eromheen">↑ Blok eromheen</button>' : ""}
        ${info.canRemove ? '<button data-cmd="duplicate">Dupliceren</button><button data-cmd="remove" class="danger">Verwijderen</button>' : ""}
      </div>
    </section>`;

  const style = (prop, value) => tell("style", { prop, value });
  panel.querySelectorAll("[data-style]").forEach((el) => (el.oninput = () => style(el.dataset.style, el.value)));
  // Tijdens het slepen in de kleurkiezer het paneel niet opnieuw opbouwen.
  panel.querySelectorAll("[data-clear]").forEach((el) => (el.onclick = () => style(el.dataset.clear, "")));
  panel.querySelectorAll("[data-px]").forEach((el) => (el.onchange = () => style(el.dataset.px, el.value === "" ? "" : `${el.value}px`)));
  panel.querySelectorAll("[data-align]").forEach((el) => (el.onclick = () => style("text-align", el.dataset.align)));
  panel.querySelectorAll("[data-cmd]").forEach((el) => (el.onclick = () => tell(el.dataset.cmd)));
  panel.querySelectorAll("[data-toggle]").forEach((el) => (el.onclick = () => {
    const on = !el.classList.contains("on");
    if (el.dataset.toggle === "bold") style("font-weight", on ? "700" : "400");
    if (el.dataset.toggle === "italic") style("font-style", on ? "italic" : "normal");
    if (el.dataset.toggle === "underline") style("text-decoration", on ? "underline" : "none");
  }));

  if (info.link) {
    $("href").onchange = () => tell("link", { href: $("href").value.trim() });
    $("newTab").onchange = () => tell("link", { newTab: $("newTab").checked });
  }
  if (info.image) {
    $("alt").onchange = () => tell("image", { alt: $("alt").value });
    $("pickImage").onclick = () => $("imageFile").click();
    $("imageFile").onchange = async () => {
      const file = $("imageFile").files[0];
      if (!file) return;
      const form = new FormData();
      form.append("file", file);
      try {
        const { url } = await api("POST", `/sites/${siteId}/asset`, form);
        tell("image", { src: url });
      } catch (err) {
        toast(esc(err.message));
      }
    };
  }
}

/* ----------------------- Berichten uit de pagina ------------------------- */

const waiting = new Map();

function getHtml() {
  return new Promise((resolve, reject) => {
    const requestId = Math.random().toString(36).slice(2);
    waiting.set(requestId, resolve);
    tell("getHtml", { requestId });
    setTimeout(() => waiting.delete(requestId) && reject(new Error("De pagina reageert niet. Laad de editor opnieuw.")), 8000);
  });
}

addEventListener("message", (e) => {
  if (e.source !== frame.contentWindow || !e.data?.zetlive) return;
  const msg = e.data;
  if (msg.type === "select") {
    // Zit je in een invoerveld van het paneel te slepen of typen? Dan alleen
    // de gegevens bijwerken, anders verlies je halverwege de kleurkiezer.
    const busy = panel.contains(document.activeElement) && document.activeElement.matches("input[type=color]");
    info = msg.info;
    if (!busy) drawPanel();
  } else if (msg.type === "deselect") {
    info = null;
    drawPanel();
  } else if (msg.type === "dirty") {
    setDirty(true);
  } else if (msg.type === "history") {
    $("undo").disabled = !msg.canUndo;
    $("redo").disabled = !msg.canRedo;
  } else if (msg.type === "save") {
    publish();
  } else if (msg.type === "html") {
    waiting.get(msg.requestId)?.(msg.html);
    waiting.delete(msg.requestId);
  }
});

/* ------------------------------ Publiceren ------------------------------- */

async function publish() {
  if (!dirty) return;
  $("publish").disabled = true;
  $("status").textContent = "Bezig met publiceren…";
  try {
    const html = await getHtml();
    await api("PUT", `/sites/${siteId}/page`, { path: pagePath, html });
    setDirty(false);
    $("status").textContent = "Gepubliceerd ✓";
    $("status").className = "status ok";
    toast(`Je wijziging staat online. <a href="${esc(pageUrl())}" target="_blank" rel="noopener">Bekijk ↗</a>`);
    loadVersions();
  } catch (err) {
    setDirty(true);
    toast(esc(err.message));
  }
}

$("publish").onclick = publish;
$("undo").onclick = () => tell("undo");
$("redo").onclick = () => tell("redo");

const leaveOk = () => !dirty || confirm("Je hebt wijzigingen die nog niet gepubliceerd zijn. Toch doorgaan?");

$("pages").onchange = () => {
  if (!leaveOk()) return ($("pages").value = pagePath);
  pagePath = $("pages").value;
  $("view").href = pageUrl();
  loadPage();
};

$("versions").onchange = async () => {
  const stamp = $("versions").value;
  $("versions").value = "";
  if (!stamp || !confirm("Deze eerdere versie terugzetten? Hij staat dan meteen weer online.")) return;
  try {
    await api("POST", `/sites/${siteId}/restore`, { path: pagePath, stamp });
    loadPage();
    toast("De eerdere versie staat weer online.");
  } catch (err) {
    toast(esc(err.message));
  }
};

$("devices").onclick = (e) => {
  const button = e.target.closest("button");
  if (!button) return;
  $("devices").querySelectorAll("button").forEach((b) => b.classList.toggle("on", b === button));
  frame.style.width = button.dataset.w;
};

addEventListener("beforeunload", (e) => dirty && e.preventDefault());
addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    publish();
  }
});

/* --------------------------------- Start --------------------------------- */

try {
  ({ site } = await api("GET", `/sites/${siteId}`));
  const pages = site.files.map((f) => f.path).filter((p) => /\.html?$/i.test(p));
  if (!pages.length) throw new Error("Deze website heeft nog geen pagina's. Upload eerst je website.");
  if (!pages.includes(pagePath)) pagePath = pages.includes("index.html") ? "index.html" : pages[0];
  $("pages").innerHTML = pages.map((p) => `<option ${p === pagePath ? "selected" : ""}>${esc(p)}</option>`).join("");
  $("back").href = `/#/site/${siteId}`;
  $("view").href = pageUrl();
  document.title = `${site.name} bewerken – Zetlive`;
  loadPage();
} catch (err) {
  panel.innerHTML = `<p class="error">${esc(err.message)}</p>`;
}
