/**
 * Het dashboard: inloggen, sites aanmaken, uploaden, domeinen koppelen.
 * Gewone JavaScript zonder bouwstap, net als de rest van dit project.
 */

const view = document.getElementById("view");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const when = (ms) => new Date(ms).toLocaleString("nl-NL", { dateStyle: "medium", timeStyle: "short" });
const size = (b) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} kB`);

async function api(method, url, body) {
  const res = await fetch(`/api${url}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Er ging iets mis.");
  return data;
}

let me = null;

/* -------------------------------- Inloggen ------------------------------- */

function showAuth(mode = "login") {
  const isLogin = mode === "login";
  document.getElementById("top").hidden = true;
  view.innerHTML = `
    <div class="auth">
      <p class="logo" style="font-size:22px">zet<span>live</span></p>
      <h1>${isLogin ? "Inloggen" : "Account aanmaken"}</h1>
      <p class="muted">Upload je website, koppel je domein en pas teksten en kleuren aan door erop te klikken.</p>
      <form class="card" id="auth">
        <label for="email">E-mailadres</label>
        <input type="email" id="email" autocomplete="email" required>
        <label for="password">Wachtwoord</label>
        <input type="password" id="password" autocomplete="${isLogin ? "current-password" : "new-password"}" minlength="8" required>
        <button class="primary">${isLogin ? "Inloggen" : "Account aanmaken"}</button>
        <div class="error" id="error"></div>
      </form>
      <p class="muted">${isLogin ? "Nog geen account?" : "Al een account?"}
        <button class="link" id="switch">${isLogin ? "Maak er een aan" : "Log in"}</button></p>
    </div>`;
  document.getElementById("switch").onclick = () => showAuth(isLogin ? "register" : "login");
  document.getElementById("auth").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const data = await api("POST", isLogin ? "/login" : "/register", {
        email: document.getElementById("email").value,
        password: document.getElementById("password").value,
      });
      me = data.user;
      route();
    } catch (err) {
      document.getElementById("error").textContent = err.message;
    }
  };
}

/* ------------------------------ Mijn sites ------------------------------- */

async function showSites() {
  const { sites } = await api("GET", "/sites");
  view.innerHTML = `
    <h1>Mijn websites</h1>
    <p class="muted">Elke website staat direct online op een eigen adres.</p>
    <form class="card" id="new">
      <h2>Nieuwe website</h2>
      <div class="row">
        <input type="text" id="name" placeholder="Naam, bijvoorbeeld: Bakkerij Jansen" maxlength="60" required>
        <button class="primary">Aanmaken</button>
      </div>
      <label class="check" style="margin-top:12px"><input type="checkbox" id="template">
        Begin met een voorbeeldwebsite (handig om de editor uit te proberen)</label>
      <div class="error" id="error"></div>
    </form>
    <div class="grid">${sites
      .map(
        (s) => `<a class="card site" href="#/site/${s.id}">
          <strong>${esc(s.name)}</strong>
          <span class="url">${esc((s.domains[0]?.name || s.url).replace(/^https?:\/\//, "").replace(/\/$/, ""))}</span>
          <p style="margin:10px 0 0"><span class="pill ${s.live ? "ok" : ""}">${s.live ? "Online" : "Nog leeg"}</span>
          <span class="muted small"> · ${when(s.updatedAt)}</span></p>
        </a>`,
      )
      .join("")}</div>
    ${sites.length ? "" : '<p class="muted">Je hebt nog geen websites. Maak hierboven je eerste aan.</p>'}`;
  document.getElementById("new").onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { site } = await api("POST", "/sites", {
        name: document.getElementById("name").value,
        template: document.getElementById("template").checked,
      });
      location.hash = `#/site/${site.id}`;
    } catch (err) {
      document.getElementById("error").textContent = err.message;
    }
  };
}

/* ------------------------------- Eén site -------------------------------- */

/** Leest een gesleepte map uit, met behoud van de mappenstructuur. */
async function filesFromDrop(items) {
  const out = [];
  const walk = async (entry, prefix) => {
    if (entry.isFile) {
      const file = await new Promise((ok, fail) => entry.file(ok, fail));
      out.push({ file, path: prefix + entry.name });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      // readEntries geeft de inhoud in stukken; doorlezen tot hij leeg is.
      for (;;) {
        const batch = await new Promise((ok, fail) => reader.readEntries(ok, fail));
        if (!batch.length) break;
        for (const child of batch) await walk(child, `${prefix}${entry.name}/`);
      }
    }
  };
  const entries = [...items].map((i) => i.webkitGetAsEntry?.()).filter(Boolean);
  for (const entry of entries) await walk(entry, "");
  return out;
}

function uploadFiles(siteId, list, onProgress) {
  const form = new FormData();
  for (const { file, path } of list) form.append("files", file, path);
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/sites/${siteId}/deploy`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () => reject(new Error("De upload is afgebroken. Controleer je verbinding."));
    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        // Geen JSON terug (bijvoorbeeld van een proxy): de foutmelding hieronder volstaat.
      }
      if (xhr.status < 300) resolve(data);
      else reject(new Error(data.error || "Uploaden is mislukt."));
    };
    xhr.send(form);
  });
}

async function showSite(siteId) {
  let { site } = await api("GET", `/sites/${siteId}`);
  let notice = "";

  const render = () => {
    const pages = site.files.filter((f) => /\.html?$/i.test(f.path));
    const shown = site.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
    view.innerHTML = `
      <p><a href="#/">← Alle websites</a></p>
      <div class="row" style="margin-bottom:20px">
        <div style="flex:1;min-width:240px">
          <h1>${esc(site.name)}</h1>
          <a href="${esc(site.url)}" target="_blank" rel="noopener">${esc(shown)} ↗</a>
          <span class="pill ${site.live ? "ok" : ""}">${site.live ? "Online" : "Nog leeg"}</span>
        </div>
        ${pages.length ? `<a class="btn primary" href="/editor.html?site=${site.id}">✎ Website bewerken</a>` : ""}
      </div>
      ${notice ? `<div class="card" style="border-color:#12805c;color:#12805c">${esc(notice)}</div>` : ""}

      <div class="card">
        <h2>${site.live ? "Nieuwe versie uploaden" : "Website uploaden"}</h2>
        <div class="drop" id="drop">
          <p style="margin:0 0 12px"><strong>Sleep hier je zipbestand of map naartoe</strong><br>
          <span class="muted small">Zodra de upload klaar is, staat je website online. De map moet een index.html bevatten.</span></p>
          <button id="pickZip">Kies zipbestand</button> <button id="pickDir">Kies map</button>
          <input type="file" id="zip" accept=".zip" hidden>
          <input type="file" id="dir" webkitdirectory multiple hidden>
          <div class="bar" id="bar" hidden><i></i></div>
        </div>
        <div class="error" id="upErr"></div>
      </div>

      ${pages.length ? `<div class="card"><h2>Pagina's</h2><table>${pages
        .map((p) => `<tr><td>${esc(p.path)}</td><td><a href="/editor.html?site=${site.id}&path=${encodeURIComponent(p.path)}">Bewerken</a></td></tr>`)
        .join("")}</table>
        <p class="muted small" style="margin:10px 0 0">${site.files.length} bestanden, ${size(site.files.reduce((n, f) => n + f.size, 0))} in totaal.</p></div>` : ""}

      <div class="card">
        <h2>Eigen domein</h2>
        <form class="row" id="addDomain">
          <input type="text" id="domain" placeholder="www.mijnbedrijf.nl" required>
          <button class="primary">Koppelen</button>
        </form>
        <div class="error" id="domErr"></div>
        ${site.domains.length ? `<table>${site.domains
          .map((d) => `<tr><td><strong>${esc(d.name)}</strong> <span class="pill ${d.status === "actief" ? "ok" : "warn"}">${d.status === "actief" ? "Actief" : "Wacht op DNS"}</span>
            <div class="muted small">${esc(d.detail || "")}</div></td>
            <td><button data-check="${esc(d.name)}">Controleer</button> <button class="danger" data-drop="${esc(d.name)}">Verwijder</button></td></tr>`)
          .join("")}</table>
          <div class="dns"><strong>Zo stel je het in bij je domeinaanbieder:</strong><br>
            Voor <code>www.jouwdomein.nl</code>: maak een <code>CNAME</code>-record dat wijst naar <code>${esc(site.dnsTarget)}</code>.<br>
            Voor het kale domein <code>jouwdomein.nl</code>: gebruik een <code>ALIAS</code>- of <code>ANAME</code>-record naar hetzelfde adres,
            of een <code>A</code>-record naar het IP-adres van deze server.<br>
            <span class="muted">Het kan tot een paar uur duren voordat een DNS-wijziging overal werkt.</span></div>` : ""}
      </div>

      <div class="card">
        <h2>Instellingen</h2>
        <form id="settings">
          <label for="sname">Naam</label>
          <input type="text" id="sname" value="${esc(site.name)}" maxlength="60" required>
          <label for="slug">Adres van de site</label>
          <input type="text" id="slug" value="${esc(site.slug)}" pattern="[a-z0-9][a-z0-9-]{1,38}[a-z0-9]" required>
          <div class="row" style="margin-top:14px"><button class="primary">Opslaan</button></div>
          <div class="error" id="setErr"></div>
        </form>
      </div>

      ${site.deploys.length > 1 ? `<div class="card"><h2>Eerdere uploads</h2><table>${site.deploys
        .map((d) => `<tr><td>${when(d.createdAt)} <span class="muted small">· ${d.files} bestanden, ${size(d.bytes)}</span>
          ${d.current ? '<span class="pill ok">Nu online</span>' : ""}</td>
          <td>${d.current ? "" : `<button data-roll="${d.id}">Terugzetten</button>`}</td></tr>`)
        .join("")}</table></div>` : ""}

      <div class="card">
        <h2>Website verwijderen</h2>
        <p class="muted" style="margin-top:0">De website gaat offline en alle bestanden worden gewist. Dit kan niet ongedaan gemaakt worden.</p>
        <button class="danger" id="delete">Website verwijderen</button>
      </div>`;
    wire();
  };

  const act = async (errId, fn) => {
    try {
      const data = await fn();
      if (data?.site) site = data.site;
      render();
    } catch (err) {
      const box = document.getElementById(errId);
      if (box) box.textContent = err.message;
    }
  };

  const startUpload = (list) => {
    if (!list.length) return;
    const bar = document.getElementById("bar");
    bar.hidden = false;
    notice = "";
    act("upErr", async () => {
      const data = await uploadFiles(site.id, list, (p) => (bar.firstElementChild.style.width = `${Math.round(p * 100)}%`));
      notice = "Gelukt: je website staat online.";
      return data;
    }).finally(() => (bar.hidden = true));
  };

  function wire() {
    const drop = document.getElementById("drop");
    const zip = document.getElementById("zip");
    const dir = document.getElementById("dir");
    document.getElementById("pickZip").onclick = () => zip.click();
    document.getElementById("pickDir").onclick = () => dir.click();
    zip.onchange = () => startUpload([...zip.files].map((file) => ({ file, path: file.name })));
    dir.onchange = () => startUpload([...dir.files].map((file) => ({ file, path: file.webkitRelativePath || file.name })));
    drop.ondragover = (e) => { e.preventDefault(); drop.classList.add("over"); };
    drop.ondragleave = () => drop.classList.remove("over");
    drop.ondrop = async (e) => {
      e.preventDefault();
      drop.classList.remove("over");
      startUpload(await filesFromDrop(e.dataTransfer.items));
    };

    document.getElementById("addDomain").onsubmit = (e) => {
      e.preventDefault();
      act("domErr", () => api("POST", `/sites/${site.id}/domains`, { name: document.getElementById("domain").value }));
    };
    view.querySelectorAll("[data-check]").forEach((b) => (b.onclick = () =>
      act("domErr", () => api("POST", `/sites/${site.id}/domains/${encodeURIComponent(b.dataset.check)}/check`))));
    view.querySelectorAll("[data-drop]").forEach((b) => (b.onclick = () =>
      confirm(`Domein ${b.dataset.drop} loskoppelen?`) &&
      act("domErr", () => api("DELETE", `/sites/${site.id}/domains/${encodeURIComponent(b.dataset.drop)}`))));
    view.querySelectorAll("[data-roll]").forEach((b) => (b.onclick = () =>
      act("upErr", () => api("POST", `/sites/${site.id}/rollback`, { deployId: b.dataset.roll }))));

    document.getElementById("settings").onsubmit = (e) => {
      e.preventDefault();
      act("setErr", () => api("PATCH", `/sites/${site.id}`, {
        name: document.getElementById("sname").value,
        slug: document.getElementById("slug").value,
      }));
    };
    document.getElementById("delete").onclick = async () => {
      if (!confirm(`"${site.name}" definitief verwijderen? De website gaat meteen offline.`)) return;
      await api("DELETE", `/sites/${site.id}`);
      location.hash = "#/";
    };
  }

  render();
}

/* -------------------------------- Routes --------------------------------- */

async function route() {
  if (!me) return showAuth();
  document.getElementById("top").hidden = false;
  document.getElementById("who").textContent = me.email;
  const siteId = location.hash.match(/^#\/site\/([a-f0-9]+)/)?.[1];
  try {
    await (siteId ? showSite(siteId) : showSites());
  } catch (err) {
    view.innerHTML = `<p class="error">${esc(err.message)}</p><p><a href="#/">← Alle websites</a></p>`;
  }
}

document.getElementById("logout").onclick = async () => {
  await api("POST", "/logout");
  me = null;
  route();
};
addEventListener("hashchange", route);
me = (await api("GET", "/me")).user;
route();
