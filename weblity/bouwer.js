/* ==========================================================================
   Weblity — de bouwer
   Stap 1: template kiezen. Stap 2: eigen inhoud invullen met live voorbeeld.
   Stap 3: de klant vraagt de site aan; in de beheerversie download je hem.

   Er is geen server: het ontwerp van de klant reist mee als een code in een
   link (#o=...). Die code bevat alleen tekst en een kleur, geen foto's.
   ========================================================================== */
(() => {
  "use strict";

  const W = window.Weblity;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const BEHEER = document.documentElement.hasAttribute("data-beheer");
  const OPSLAG = "weblity-bouwer";
  // Het WhatsApp-nummer waar aanvragen naartoe gaan (internationaal, zonder +).
  const WHATSAPP = "32484908195";
  const KLEUREN = ["#b4586a", "#e0a23c", "#ef6a3a", "#ffcc00", "#1f9d6b", "#3f6fe8", "#8b6bff", "#111111"];

  // t = gekozen template, edits = alleen wat de klant zelf heeft aangepast.
  // Zo blijft eigen tekst staan als je van template wisselt, en vult de rest
  // zich met de voorbeeldtekst van het nieuwe template.
  const state = { t: null, edits: {}, foto: "", credit: true };

  const tpl = () => W.byId(state.t);
  const waarde = (k) => (k in state.edits ? state.edits[k] : tpl().d[k]);
  const config = () => ({ ...state.edits, t: state.t, foto: state.foto || undefined, credit: state.credit });

  /* ---------- Ontwerp <-> code ---------- */

  const encode = (obj) => {
    let bin = "";
    new TextEncoder().encode(JSON.stringify(obj)).forEach((b) => { bin += String.fromCharCode(b); });
    return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };
  const decode = (code) => {
    try {
      const bin = atob(code.replace(/-/g, "+").replace(/_/g, "/"));
      const json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      const data = W.clean(JSON.parse(json));
      return data.t ? data : null;
    } catch {
      return null;
    }
  };
  const ontwerpCode = () => encode({ t: state.t, ...state.edits });
  // Een link als de bouwer online staat; anders alleen de code.
  const ontwerpLink = () => (
    /^https?:$/.test(location.protocol) ? `${location.origin}${location.pathname}#o=${ontwerpCode()}` : ontwerpCode()
  );
  const codeUit = (tekst) => {
    const m = String(tekst || "").match(/#o=([\w-]+)/);
    return m ? m[1] : String(tekst || "").trim();
  };

  /* ---------- Bewaren in de browser ---------- */

  let bewaarTimer;
  const bewaar = () => {
    clearTimeout(bewaarTimer);
    bewaarTimer = setTimeout(() => {
      try {
        localStorage.setItem(OPSLAG, JSON.stringify({ t: state.t, ...state.edits, foto: state.foto || undefined, credit: state.credit }));
      } catch { /* opslag vol of geblokkeerd: de bouwer werkt gewoon verder */ }
    }, 300);
  };
  const laadOntwerp = (data) => {
    const { t, foto, credit, ...edits } = data;
    state.t = t;
    state.edits = edits;
    state.foto = foto || "";
    state.credit = credit !== false;
  };
  const laadBewaard = () => {
    const uitLink = location.hash.startsWith("#o=") ? decode(location.hash.slice(3)) : null;
    if (uitLink) { laadOntwerp(uitLink); return true; }
    try {
      const data = W.clean(JSON.parse(localStorage.getItem(OPSLAG) || "null"));
      if (data.t) { laadOntwerp(data); return true; }
    } catch { /* niets bewaard */ }
    return false;
  };

  /* ---------- Melding onderaan ---------- */

  const toast = $("#toast");
  let toastTimer;
  const meld = (tekst) => {
    toast.textContent = tekst;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  };

  /* ---------- Stap 1: galerij ---------- */

  function bouwGalerij() {
    const gal = $("#gal");
    gal.innerHTML = W.TEMPLATES.map((t, i) => `
      <article class="tpl-card" style="--i:${i}">
        <div class="tpl-card__shot"><iframe title="Voorbeeld van template ${t.naam}" tabindex="-1" loading="lazy" sandbox=""></iframe></div>
        <div class="tpl-card__info">
          <div><h2>${t.naam}</h2><p>${t.voor}</p></div>
          <button class="btn btn--sm tpl-card__pick" type="button" data-t="${t.id}" aria-label="Kies template ${t.naam}">Kies</button>
        </div>
      </article>`).join("");

    $$(".tpl-card", gal).forEach((card, i) => {
      $("iframe", card).srcdoc = W.html({ t: W.TEMPLATES[i].id }, { preview: true });
    });
    // De voorbeelden zijn 1280 px breed getekend en worden verkleind tot de kaart.
    const schaal = new ResizeObserver((entries) => {
      for (const e of entries) e.target.style.setProperty("--s", e.contentRect.width / 1280);
    });
    $$(".tpl-card__shot", gal).forEach((shot) => schaal.observe(shot));

    gal.addEventListener("click", (e) => {
      const knop = e.target.closest("[data-t]");
      if (knop) kies(knop.dataset.t, true);
    });
  }

  /* ---------- Wisselen tussen de stappen ---------- */

  function toonStap(stap) {
    document.body.dataset.step = stap;
    $("#kies").hidden = stap !== "kies";
    $("#maak").hidden = stap !== "maak";
    scrollTo(0, 0);
    if (stap === "maak") { vulFormulier(); requestAnimationFrame(() => { pas(); teken(true); }); }
  }
  function kies(id, metGeschiedenis) {
    state.t = W.byId(id).id;
    bewaar();
    // Zo brengt de terugknop van de browser je naar de galerij.
    if (metGeschiedenis && document.body.dataset.step !== "maak") history.pushState({ stap: "maak" }, "");
    toonStap("maak");
  }

  /* ---------- Stap 2: het formulier ---------- */

  function vulFormulier() {
    $$("[data-k]").forEach((el) => { el.value = waarde(el.dataset.k) || ""; });
    $("#tplkeuze").innerHTML = W.TEMPLATES.map((t) => (
      `<button type="button" data-t="${t.id}" aria-pressed="${t.id === state.t}">${t.naam}</button>`
    )).join("");
    tekenItems();
    tekenKleuren();
    $("#fotoWeg").hidden = !state.foto;
    $("#credit").checked = state.credit;
  }

  const items = () => (waarde("items") || []).map((it) => ({ ...it }));
  function tekenItems() {
    const lijst = items();
    $("#items").innerHTML = lijst.map((_, i) => `
      <div class="item" data-i="${i}">
        <input type="text" data-f="n" placeholder="Naam" aria-label="Naam, regel ${i + 1}" maxlength="60">
        <input type="text" data-f="p" placeholder="Prijs" aria-label="Prijs, regel ${i + 1}" maxlength="24">
        <input type="text" data-f="d" placeholder="Korte omschrijving" aria-label="Omschrijving, regel ${i + 1}" maxlength="160">
        <button class="item__weg" type="button" aria-label="Regel ${i + 1} verwijderen">×</button>
      </div>`).join("");
    // Waarden via .value zetten: zo kan tekst van de klant nooit als HTML gelezen worden.
    $$("#items .item").forEach((rij, i) => {
      $$("input", rij).forEach((inp) => { inp.value = lijst[i][inp.dataset.f] || ""; });
    });
    $("#itemErbij").hidden = lijst.length >= W.MAX_ITEMS;
  }

  function tekenKleuren() {
    const nu = (state.edits.kleur || tpl().kleur).toLowerCase();
    const lijst = [...new Set([tpl().kleur.toLowerCase(), ...KLEUREN])];
    $("#kleuren").innerHTML = lijst.map((c) => (
      `<button type="button" data-kleur="${c}" style="--c:${c}" aria-label="Kleur ${c}" aria-pressed="${c === nu}"></button>`
    )).join("") + `<input type="color" id="eigenKleur" value="${nu}" aria-label="Eigen kleur kiezen">`;
  }

  function koppelFormulier() {
    const paneel = $("#paneel");

    paneel.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.k) {
        state.edits[el.dataset.k] = el.value;
      } else if (el.dataset.f) {
        const lijst = items();
        lijst[Number(el.closest(".item").dataset.i)][el.dataset.f] = el.value;
        state.edits.items = lijst;
      } else if (el.id === "eigenKleur") {
        state.edits.kleur = el.value;
        $$("#kleuren button").forEach((b) => b.setAttribute("aria-pressed", "false"));
      } else if (el.id === "credit") {
        state.credit = el.checked;
      } else {
        return;
      }
      bewaar();
      teken();
    });

    paneel.addEventListener("click", (e) => {
      const el = e.target;
      const knop = el.closest("button");
      if (!knop) return;
      if (knop.dataset.t) { kies(knop.dataset.t, false); return; }
      if (knop.dataset.kleur) { state.edits.kleur = knop.dataset.kleur; tekenKleuren(); }
      else if (knop.classList.contains("item__weg")) {
        const lijst = items();
        lijst.splice(Number(knop.closest(".item").dataset.i), 1);
        state.edits.items = lijst;
        tekenItems();
      } else if (knop.id === "itemErbij") {
        state.edits.items = [...items(), { n: "", d: "", p: "" }];
        tekenItems();
        $("#items .item:last-child input").focus();
      } else if (knop.id === "fotoWeg") {
        state.foto = "";
        $("#foto").value = "";
        knop.hidden = true;
      } else if (knop.id === "andere") {
        history.back();
        return;
      } else if (knop.id === "opnieuw") {
        if (!confirm("Al je eigen teksten, je kleur en je foto wissen?")) return;
        state.edits = {};
        state.foto = "";
        vulFormulier();
      } else {
        return;
      }
      bewaar();
      teken();
    });

    // Foto verkleinen in de browser, zodat het eindbestand licht blijft.
    $("#foto").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const maat = Math.min(1, 1600 / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * maat);
        canvas.height = Math.round(img.height * maat);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = canvas.toDataURL("image/jpeg", 0.82);
        URL.revokeObjectURL(url);
        if (!W.isPhoto(data)) { meld("Deze foto konden we niet lezen."); return; }
        state.foto = data;
        $("#fotoWeg").hidden = false;
        bewaar();
        teken();
      };
      img.onerror = () => { URL.revokeObjectURL(url); meld("Deze foto konden we niet lezen."); };
      img.src = url;
    });
  }

  /* ---------- Het live voorbeeld ---------- */

  const frame = $("#frame");
  const podium = $("#podium");
  let frameKlaar = false;
  let tekenTimer;

  // Eerste keer laadt het voorbeeld als geheel; daarna vervangen we alleen de
  // stijl en de inhoud, zodat de pagina niet verspringt terwijl je typt.
  function teken(meteen) {
    clearTimeout(tekenTimer);
    tekenTimer = setTimeout(() => {
      const doc = frame.contentDocument;
      const stijl = frameKlaar && doc && doc.getElementById("s");
      if (stijl) {
        const s = W.render(config(), { preview: true });
        stijl.textContent = s.css;
        doc.body.className = s.bodyClass;
        doc.body.innerHTML = s.body;
        doc.title = s.title;
      } else {
        frameKlaar = false;
        frame.srcdoc = W.html(config(), { preview: true });
      }
    }, meteen ? 0 : 140);
  }
  frame.addEventListener("load", () => { frameKlaar = true; });

  // Het voorbeeld wordt op ware breedte getekend en verkleind tot het past.
  function pas() {
    const r = podium.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const smal = podium.dataset.scherm === "smal";
    const rand = smal ? 14 : 0;
    const breedte = smal ? 390 : 1280;
    const ruimteH = r.height - rand * 2;
    const schaal = Math.min(1, (r.width - rand * 2) / breedte, smal ? ruimteH / 700 : 1);
    const hoogte = smal ? Math.min(844, ruimteH / schaal) : ruimteH / schaal;
    frame.style.width = `${breedte}px`;
    frame.style.height = `${hoogte}px`;
    frame.style.transform = `scale(${schaal})`;
    frame.style.left = `${Math.max(0, (r.width - breedte * schaal) / 2)}px`;
    frame.style.top = `${rand + Math.max(0, (ruimteH - hoogte * schaal) / 2)}px`;
  }

  function koppelVoorbeeld() {
    const knoppen = $$("button[data-scherm]");
    const zetScherm = (scherm) => {
      podium.dataset.scherm = scherm;
      knoppen.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.scherm === scherm)));
      pas();
    };
    // Wie op een telefoon bouwt, ziet eerst hoe het er op een telefoon uitziet.
    zetScherm(matchMedia("(max-width: 900px)").matches ? "smal" : "breed");
    knoppen.forEach((knop) => knop.addEventListener("click", () => zetScherm(knop.dataset.scherm)));
    $$(".wissel button").forEach((knop) => knop.addEventListener("click", () => {
      document.body.dataset.view = knop.dataset.view;
      $$(".wissel button").forEach((b) => b.setAttribute("aria-pressed", String(b === knop)));
      scrollTo(0, 0);
      requestAnimationFrame(pas);
    }));
    new ResizeObserver(pas).observe(podium);
  }

  /* ---------- Stap 3 (klant): aanvragen ---------- */

  function koppelAanvraag() {
    const venster = $("#aanvraag");
    const form = $("#aanvraagForm");
    const klaar = $("#aanvraagKlaar");
    const fout = $("#aanvraagFout");
    const knop = $("#aanvraagKnop");
    const rust = knop.textContent;

    const whatsapp = () => {
      const d = new FormData(form);
      const regels = [
        "Hallo Weblity, ik wil graag deze website aanvragen.",
        d.get("naam") ? `Naam: ${d.get("naam")}` : "",
        `Zaak: ${waarde("naam")}`,
        `Template: ${tpl().naam}`,
        `Plan: ${d.get("plan")}`,
        d.get("bericht") ? `Bericht: ${d.get("bericht")}` : "",
        `Mijn ontwerp: ${ontwerpLink()}`,
      ].filter(Boolean);
      const href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(regels.join("\n"))}`;
      $$("[data-wa]", venster).forEach((a) => { a.href = href; });
    };

    $("#vraagAan").addEventListener("click", () => {
      $("#a-template").value = tpl().naam;
      $("#a-ontwerp").value = ontwerpLink();
      form.hidden = false;
      klaar.hidden = true;
      fout.hidden = true;
      whatsapp();
      venster.showModal();
    });
    form.addEventListener("input", whatsapp);
    $$("[data-sluit]", venster).forEach((b) => b.addEventListener("click", () => venster.close()));
    venster.addEventListener("click", (e) => { if (e.target === venster) venster.close(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      fout.hidden = true;
      knop.classList.add("busy");
      knop.textContent = "Bezig met versturen…";
      whatsapp();
      try {
        const res = await fetch("/", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(new FormData(form)).toString(),
        });
        if (!res.ok) throw new Error(`Status ${res.status}`);
        form.hidden = true;
        klaar.hidden = false;
      } catch {
        fout.hidden = false;
        fout.scrollIntoView({ block: "nearest" });
      } finally {
        knop.classList.remove("busy");
        knop.textContent = rust;
      }
    });
  }

  /* ---------- Stap 3 (beheer): ontwerp laden en site downloaden ---------- */

  function koppelBeheer() {
    $("#laad").addEventListener("click", () => {
      const tekst = prompt("Plak hier de link of de code uit de aanvraag van de klant:");
      if (tekst == null) return;
      const data = decode(codeUit(tekst));
      if (!data) { meld("Dit is geen geldige link of code."); return; }
      laadOntwerp(data);
      bewaar();
      if (document.body.dataset.step !== "maak") history.pushState({ stap: "maak" }, "");
      toonStap("maak");
      meld(`Ontwerp geladen: ${waarde("naam")}`);
    });

    $("#download").addEventListener("click", () => {
      const naam = String(waarde("naam") || "website").toLowerCase()
        .normalize("NFD").replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "website";
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([W.html(config())], { type: "text/html" }));
      a.download = `${naam}.html`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      meld(`${naam}.html is gedownload.`);
    });
  }

  /* ---------- Starten ---------- */

  bouwGalerij();
  koppelFormulier();
  koppelVoorbeeld();
  if (BEHEER) koppelBeheer(); else koppelAanvraag();

  addEventListener("popstate", () => toonStap(history.state && history.state.stap === "maak" ? "maak" : "kies"));
  addEventListener("resize", pas);

  // Kom je terug of open je een gedeelde link, dan ga je meteen verder.
  if (laadBewaard()) {
    history.replaceState({ stap: "kies" }, "", location.pathname + location.search);
    history.pushState({ stap: "maak" }, "");
    toonStap("maak");
  } else {
    history.replaceState({ stap: "kies" }, "");
  }
})();
