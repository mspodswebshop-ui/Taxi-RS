/**
 * Sahli Candy - de werking van de website.
 *
 * Deze file leest window.WINKEL en window.PRODUCTEN uit producten.js en
 * bouwt daarmee de pagina op: de kaartjes, de filters en de bestellijst.
 * Wil je iets aan de winkel veranderen, dan hoef je hier niets te doen.
 */

const winkel = window.WINKEL || {};
const producten = (window.PRODUCTEN || []).map((p, i) => ({
  ...p,
  // Een vast kenmerk per product, zodat de bestellijst blijft kloppen
  // nadat de pagina ververst is.
  id: `${i}-${p.naam.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
  voorraad: p.voorraad !== false,
}));

const euro = new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" });
const $ = (sel) => document.querySelector(sel);

// De bestellijst: { productId: aantal }. Blijft bewaard in de browser.
const OPSLAG = "sahli-candy-lijst";
let lijst = laadLijst();

let categorieFilter = "Alles";
let zoekterm = "";


/* ==================================================================
   De winkelgegevens op de pagina zetten
   ================================================================== */

function vulWinkel() {
  document.querySelectorAll("[data-winkel]").forEach((el) => {
    const waarde = winkel[el.dataset.winkel];
    if (waarde) el.textContent = waarde;
  });

  if (winkel.naam) document.title = `${winkel.naam} — ${winkel.slogan || "Snoep"}`;

  const opVoorraad = producten.filter((p) => p.voorraad).length;
  $("#aantalProducten").textContent = opVoorraad;

  // Zolang er geen echt telefoonnummer ingevuld is, kan de bestelling
  // alleen gekopieerd worden. De knop zegt dan ook dat.
  if (!heeftWhatsapp()) $("#bestelKnop").textContent = "Bestelling kopiëren";
  if (!winkel.email) $("#mailKnop").hidden = true;
}

function vulUren() {
  const tabel = $("#uren");
  if (!Array.isArray(winkel.uren)) return;

  // getDay() geeft 0 voor zondag; onze lijst begint op maandag.
  const vandaag = (new Date().getDay() + 6) % 7;

  tabel.innerHTML = "";
  winkel.uren.forEach((rij, i) => {
    const tr = document.createElement("tr");
    if (i === vandaag) tr.className = "vandaag";
    tr.innerHTML = `<td>${rij.dag}</td><td>${rij.tijd}</td>`;
    tabel.append(tr);
  });
}

function vulContact() {
  const lijstEl = $("#contactlijst");
  const regels = [];

  if (heeftWhatsapp()) {
    regels.push(`<a href="https://wa.me/${winkel.whatsapp}">WhatsApp ${winkel.telefoonZichtbaar || ""}</a>`);
  } else if (winkel.telefoonZichtbaar) {
    regels.push(`Telefoon: ${winkel.telefoonZichtbaar}`);
  }
  if (winkel.email) regels.push(`<a href="mailto:${winkel.email}">${winkel.email}</a>`);
  if (winkel.instagram) {
    regels.push(`<a href="https://instagram.com/${winkel.instagram}">@${winkel.instagram}</a>`);
  }

  lijstEl.innerHTML = regels.map((r) => `<li>${r}</li>`).join("");
}

// Het voorbeeldnummer uit producten.js bevat nog X-en. Zolang dat zo is
// sturen we niets door, maar geven we de bestelling als tekst mee.
function heeftWhatsapp() {
  return Boolean(winkel.whatsapp) && /^\d{8,15}$/.test(winkel.whatsapp);
}

function vulLoper() {
  const woorden = [...new Set(producten.map((p) => p.categorie))];
  const tekst = [...woorden, "Vers binnen", "Af te halen vandaag"].join(" ✦ ");
  // Twee keer dezelfde tekst, anders springt de lopende balk zichtbaar terug.
  $("#loperSpoor").innerHTML = `<span>${tekst} ✦ </span><span>${tekst} ✦ </span>`;
}


/* ==================================================================
   Categorieën en producten tonen
   ================================================================== */

function vulCategorieen() {
  const namen = ["Alles", ...new Set(producten.map((p) => p.categorie))];
  const houder = $("#categorieen");

  houder.innerHTML = "";
  namen.forEach((naam) => {
    const knop = document.createElement("button");
    knop.className = "cat";
    knop.type = "button";
    knop.textContent = naam;
    knop.setAttribute("aria-pressed", String(naam === categorieFilter));
    knop.addEventListener("click", () => {
      categorieFilter = naam;
      vulCategorieen();
      toonProducten();
    });
    houder.append(knop);
  });
}

function gefilterd() {
  const zoek = zoekterm.trim().toLowerCase();
  return producten.filter((p) => {
    const inCategorie = categorieFilter === "Alles" || p.categorie === categorieFilter;
    const inZoek = !zoek ||
      p.naam.toLowerCase().includes(zoek) ||
      p.categorie.toLowerCase().includes(zoek) ||
      (p.beschrijving || "").toLowerCase().includes(zoek);
    return inCategorie && inZoek;
  });
}

function toonProducten() {
  const rooster = $("#rooster");
  const gevonden = gefilterd();

  rooster.innerHTML = "";
  gevonden.forEach((p) => rooster.append(maakKaart(p)));

  $("#geenResultaat").hidden = gevonden.length > 0;
  $("#resultaatTelling").textContent = gevonden.length === producten.length
    ? `${producten.length} producten`
    : `${gevonden.length} van ${producten.length} producten`;
}

function maakKaart(p) {
  const kaart = document.createElement("article");
  kaart.className = "kaart" + (p.voorraad ? "" : " op");

  const etiket = p.voorraad ? p.label : "uitverkocht";
  const etiketKlasse = { nieuw: "nieuw", populair: "populair", "bijna op": "bijna", uitverkocht: "uit" }[etiket];

  kaart.innerHTML = `
    <div class="kaart-beeld">${p.emoji || "🍬"}</div>
    ${etiket ? `<span class="etiket ${etiketKlasse || ""}">${etiket}</span>` : ""}
    <h3></h3>
    <p class="kaart-inhoud"></p>
    <p class="kaart-tekst"></p>
    ${zuurmeter(p.zuur)}
    <div class="kaart-voet">
      <span class="prijs">${typeof p.prijs === "number" ? euro.format(p.prijs) : "op aanvraag"}</span>
      <button class="toevoeg" type="button">Toevoegen</button>
    </div>`;

  // De teksten via textContent, zodat een apostrof of < in een naam
  // de pagina niet in de war stuurt.
  kaart.querySelector("h3").textContent = p.naam;
  kaart.querySelector(".kaart-inhoud").textContent = [p.categorie, p.inhoud].filter(Boolean).join(" · ");
  kaart.querySelector(".kaart-tekst").textContent = p.beschrijving || "";

  const knop = kaart.querySelector(".toevoeg");
  if (!p.voorraad) {
    knop.disabled = true;
    knop.textContent = "Uitverkocht";
  } else {
    knop.addEventListener("click", () => voegToe(p));
  }

  return kaart;
}

function zuurmeter(niveau) {
  if (!niveau) return "";
  const bollen = [1, 2, 3, 4, 5]
    .map((n) => `<i class="bol ${n <= niveau ? "aan" : ""}"></i>`)
    .join("");
  return `<p class="zuurmeter">Zuur <b>${bollen}</b> ${niveau}/5</p>`;
}


/* ==================================================================
   De bestellijst
   ================================================================== */

function laadLijst() {
  try {
    return JSON.parse(localStorage.getItem(OPSLAG)) || {};
  } catch {
    return {};
  }
}

function bewaarLijst() {
  try {
    localStorage.setItem(OPSLAG, JSON.stringify(lijst));
  } catch {
    // Privémodus of geen opslag: de lijst werkt gewoon, ze wordt alleen
    // niet onthouden na het sluiten van het tabblad.
  }
}

function voegToe(p) {
  lijst[p.id] = (lijst[p.id] || 0) + 1;
  bewaarLijst();
  toonLijst();
  meld(`${p.naam} toegevoegd`);
}

function wijzig(id, stap) {
  const nieuw = (lijst[id] || 0) + stap;
  if (nieuw <= 0) delete lijst[id];
  else lijst[id] = nieuw;
  bewaarLijst();
  toonLijst();
}

function regels() {
  return Object.entries(lijst)
    .map(([id, aantal]) => ({ product: producten.find((p) => p.id === id), aantal }))
    .filter((r) => r.product);
}

function totaalBedrag() {
  return regels().reduce((som, r) => som + (r.product.prijs || 0) * r.aantal, 0);
}

function toonLijst() {
  const inhoud = $("#mandInhoud");
  const mijn = regels();
  const stuks = mijn.reduce((som, r) => som + r.aantal, 0);

  $("#mandTeller").textContent = stuks;
  $("#mandTeller").hidden = stuks === 0;
  $("#totaal").textContent = euro.format(totaalBedrag());
  $("#bestelKnop").disabled = stuks === 0;
  $("#mailKnop").disabled = stuks === 0;
  $("#leegKnop").hidden = stuks === 0;

  if (!mijn.length) {
    inhoud.innerHTML = `<p class="mand-leeg">Je lijst is nog leeg.<br>Klik bij een product op <strong>Toevoegen</strong>.</p>`;
    return;
  }

  inhoud.innerHTML = "";
  mijn.forEach(({ product, aantal }) => {
    const regel = document.createElement("div");
    regel.className = "regel";
    regel.innerHTML = `
      <span class="regel-emoji">${product.emoji || "🍬"}</span>
      <span class="regel-naam"><strong></strong><span></span></span>
      <span class="aantal">
        <button type="button" aria-label="Eén minder">−</button>
        <output>${aantal}</output>
        <button type="button" aria-label="Eén meer">+</button>
      </span>`;

    regel.querySelector("strong").textContent = product.naam;
    regel.querySelector(".regel-naam span").textContent =
      typeof product.prijs === "number"
        ? `${euro.format(product.prijs)} per stuk`
        : "prijs op aanvraag";

    const [minder, meer] = regel.querySelectorAll(".aantal button");
    minder.addEventListener("click", () => wijzig(product.id, -1));
    meer.addEventListener("click", () => wijzig(product.id, +1));

    inhoud.append(regel);
  });
}

function bestelTekst() {
  const regelsTekst = regels()
    .map(({ product, aantal }) => `• ${aantal}x ${product.naam}`)
    .join("\n");

  return [
    `Hallo ${winkel.naam || ""}, ik wil graag bestellen:`,
    "",
    regelsTekst,
    "",
    `Richtprijs: ${euro.format(totaalBedrag())}`,
    "Naam: ",
    "Afhalen op: ",
  ].join("\n");
}


/* ==================================================================
   Het zijpaneel openen en sluiten
   ================================================================== */

function zetPaneel(open) {
  $("#mand").classList.toggle("open", open);
  $("#mand").setAttribute("aria-hidden", String(!open));
  $("#scherm").hidden = !open;
  document.body.style.overflow = open ? "hidden" : "";
  if (open) $("#sluitKnop").focus();
}

let meldTimer;
function meld(tekst) {
  const el = $("#melding");
  el.textContent = tekst;
  el.classList.add("zichtbaar");
  clearTimeout(meldTimer);
  meldTimer = setTimeout(() => el.classList.remove("zichtbaar"), 2200);
}


/* ==================================================================
   Alles aan elkaar knopen
   ================================================================== */

$("#mandKnop").addEventListener("click", () => zetPaneel(true));
$("#sluitKnop").addEventListener("click", () => zetPaneel(false));
$("#scherm").addEventListener("click", () => zetPaneel(false));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") zetPaneel(false);
});

$("#zoekVeld").addEventListener("input", (e) => {
  zoekterm = e.target.value;
  toonProducten();
});

$("#geenResultaat").addEventListener("click", (e) => {
  if (!e.target.matches("[data-reset]")) return;
  zoekterm = "";
  categorieFilter = "Alles";
  $("#zoekVeld").value = "";
  vulCategorieen();
  toonProducten();
});

$("#leegKnop").addEventListener("click", () => {
  lijst = {};
  bewaarLijst();
  toonLijst();
  meld("Lijst leeggemaakt");
});

$("#bestelKnop").addEventListener("click", async () => {
  const tekst = bestelTekst();

  if (heeftWhatsapp()) {
    window.open(`https://wa.me/${winkel.whatsapp}?text=${encodeURIComponent(tekst)}`, "_blank", "noopener");
    return;
  }

  // Nog geen echt nummer ingevuld: de klant kan de bestelling kopiëren.
  try {
    await navigator.clipboard.writeText(tekst);
    meld("Bestelling gekopieerd");
  } catch {
    window.prompt("Kopieer je bestelling:", tekst);
  }
});

$("#mailKnop").addEventListener("click", () => {
  const onderwerp = `Bestelling via de website`;
  const adres = winkel.email || "";
  window.location.href =
    `mailto:${adres}?subject=${encodeURIComponent(onderwerp)}&body=${encodeURIComponent(bestelTekst())}`;
});

vulWinkel();
vulUren();
vulContact();
vulLoper();
vulCategorieen();
toonProducten();
toonLijst();
