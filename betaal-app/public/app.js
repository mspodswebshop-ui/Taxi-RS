"use strict";

/* =======================================================================
   Betaalterminal - bediening
   Het bedrag wordt in centen bijgehouden, nooit in kommagetallen: met
   0.1 + 0.2 rekenen levert in JavaScript afrondingsfouten op, en dat wil
   je niet in een bedrag dat iemand moet betalen.
   ======================================================================= */

const el = (id) => document.getElementById(id);

const ui = {
  screenAmount: el("screenAmount"),
  screenPay: el("screenPay"),
  screenDone: el("screenDone"),
  screenDay: el("screenDay"),
  amount: el("amount"),
  tipRow: el("tipRow"),
  tipAmount: el("tipAmount"),
  chargeBtn: el("chargeBtn"),
  modeNote: el("modeNote"),
  payAmount: el("payAmount"),
  qrImage: el("qrImage"),
  status: el("status"),
  statusText: el("statusText"),
  openLink: el("openLink"),
  doneAmount: el("doneAmount"),
  doneSub: el("doneSub"),
  dayTotal: el("dayTotal"),
  dayCount: el("dayCount"),
  rides: el("rides"),
  toast: el("toast"),
};

let config = { heeftSleutel: false, testmodus: false, minCent: 100, maxCent: 100_000 };
let ingetikt = ""; // ruwe cijfers, bijvoorbeeld "1250" voor € 12,50
let fooiProcent = 0;
let pollTimer = null;
let huidigeSessie = null;

/* ---------------------- Rekenen met centen ---------------------- */

const ritCent = () => Number(ingetikt || "0");
const fooiCent = () => Math.round((ritCent() * fooiProcent) / 100);
const totaalCent = () => ritCent() + fooiCent();

const euro = (cent) => `€ ${(cent / 100).toFixed(2).replace(".", ",")}`;

/* ---------------------- Weergave ---------------------- */

function toonScherm(naam) {
  for (const [sleutel, node] of Object.entries({
    amount: ui.screenAmount,
    pay: ui.screenPay,
    done: ui.screenDone,
    day: ui.screenDay,
  })) {
    node.hidden = sleutel !== naam;
  }
}

function tekenBedrag() {
  ui.amount.textContent = euro(totaalCent());

  const heeftFooi = fooiProcent > 0 && ritCent() > 0;
  ui.tipRow.hidden = !heeftFooi;
  if (heeftFooi) ui.tipAmount.textContent = euro(fooiCent());

  ui.chargeBtn.disabled = totaalCent() < config.minCent;
  ui.chargeBtn.textContent =
    totaalCent() > 0 ? `Aanrekenen — ${euro(totaalCent())}` : "Aanrekenen";
}

let toastTimer = null;
function toast(tekst) {
  ui.toast.textContent = tekst;
  ui.toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    ui.toast.hidden = true;
  }, 3200);
}

/* ---------------------- Toetsenbord ---------------------- */

function tik(toets) {
  if (toets === "clear") {
    ingetikt = "";
  } else if (toets === "back") {
    ingetikt = ingetikt.slice(0, -1);
  } else {
    // Meer dan 7 cijfers heeft geen zin en overschrijdt het maximum toch.
    if (ingetikt.length >= 7) return;
    if (ingetikt === "" && toets === "0") return;
    ingetikt += toets;
  }

  if (ritCent() > config.maxCent) {
    ingetikt = ingetikt.slice(0, -1);
    toast(`Hoger dan ${euro(config.maxCent)} kan niet.`);
  }

  tekenBedrag();
  if (navigator.vibrate) navigator.vibrate(8);
}

el("keypad").addEventListener("click", (e) => {
  const knop = e.target.closest("button[data-key]");
  if (knop) tik(knop.dataset.key);
});

// Ook met een echt toetsenbord te bedienen, handig bij het testen.
document.addEventListener("keydown", (e) => {
  if (!ui.screenAmount.hidden) {
    if (/^[0-9]$/.test(e.key)) tik(e.key);
    else if (e.key === "Backspace") tik("back");
    else if (e.key === "Escape") tik("clear");
    else if (e.key === "Enter" && !ui.chargeBtn.disabled) startBetaling();
  }
});

for (const chip of document.querySelectorAll(".chip")) {
  chip.addEventListener("click", () => {
    fooiProcent = Number(chip.dataset.tip);
    for (const c of document.querySelectorAll(".chip")) {
      c.classList.toggle("selected", c === chip && fooiProcent > 0);
    }
    tekenBedrag();
  });
}

/* ---------------------- Betaling starten ---------------------- */

async function startBetaling() {
  const bedrag = totaalCent();
  if (bedrag < config.minCent) return;

  ui.chargeBtn.disabled = true;
  ui.chargeBtn.textContent = "Bezig…";

  try {
    const res = await fetch("/api/betaling", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bedragCent: bedrag,
        omschrijving: fooiCent() > 0 ? "Taxirit (incl. fooi)" : "Taxirit",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Fout ${res.status}`);

    huidigeSessie = data;
    ui.qrImage.src = data.qr;
    ui.openLink.href = data.url;
    ui.payAmount.textContent = euro(bedrag);
    ui.status.classList.remove("error");
    ui.statusText.textContent = "Wachten op betaling…";
    toonScherm("pay");
    volgBetaling(data.id);
  } catch (err) {
    toast(err.message);
  } finally {
    ui.chargeBtn.disabled = false;
    tekenBedrag();
  }
}

ui.chargeBtn.addEventListener("click", startBetaling);

/**
 * Vraagt elke twee seconden aan de server of er betaald is.
 *
 * "Betaald" komt altijd van Stripe. De terminal verzint dat nooit zelf, ook
 * niet als de klant zegt dat het gelukt is.
 */
function volgBetaling(id) {
  stopVolgen();
  let mislukt = 0;

  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`/api/betaling/${encodeURIComponent(id)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Kon de stand niet ophalen.");

      mislukt = 0;

      if (data.betaald) {
        stopVolgen();
        toonBetaald(data.bedragCent);
      } else if (data.verlopen) {
        stopVolgen();
        ui.status.classList.add("error");
        ui.statusText.textContent = "De betaallink is verlopen. Probeer opnieuw.";
      }
    } catch (err) {
      // Een haperend netwerk in de auto is normaal; pas na een paar
      // mislukte pogingen op rij melden we iets.
      if (++mislukt >= 5) {
        ui.status.classList.add("error");
        ui.statusText.textContent = "Geen verbinding. De betaling loopt gewoon door.";
      }
    }
  }, 2000);
}

function stopVolgen() {
  clearInterval(pollTimer);
  pollTimer = null;
}

function toonBetaald(bedragCent) {
  ui.doneAmount.textContent = euro(bedragCent);
  ui.doneSub.textContent = new Date().toLocaleTimeString("nl-BE", {
    hour: "2-digit",
    minute: "2-digit",
  });
  toonScherm("done");
  if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
}

el("cancelBtn").addEventListener("click", () => {
  stopVolgen();
  huidigeSessie = null;
  toonScherm("amount");
  toast("Geannuleerd. Er is niets afgeschreven.");
});

el("newRideBtn").addEventListener("click", () => {
  ingetikt = "";
  fooiProcent = 0;
  for (const c of document.querySelectorAll(".chip")) c.classList.remove("selected");
  tekenBedrag();
  toonScherm("amount");
});

/* ---------------------- Dagoverzicht ---------------------- */

el("openDayBtn").addEventListener("click", async () => {
  toonScherm("day");
  ui.rides.innerHTML = "";
  ui.dayTotal.textContent = "…";

  try {
    const res = await fetch("/api/ritten");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Kon de ritten niet ophalen.");

    ui.dayTotal.textContent = euro(data.totaalCent);
    ui.dayCount.textContent = `${data.aantal} ${data.aantal === 1 ? "rit" : "ritten"}`;

    if (data.ritten.length === 0) {
      const leeg = document.createElement("li");
      leeg.className = "empty";
      leeg.textContent = "Nog geen betalingen vandaag.";
      ui.rides.append(leeg);
      return;
    }

    for (const rit of data.ritten) {
      const item = document.createElement("li");
      item.className = "ride";

      const links = document.createElement("div");
      const wat = document.createElement("div");
      wat.className = "ride-what";
      wat.textContent = rit.omschrijving || "Taxirit";
      const wanneer = document.createElement("div");
      wanneer.className = "ride-when";
      wanneer.textContent = new Date(rit.betaaldOp).toLocaleTimeString("nl-BE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      links.append(wat, wanneer);

      const bedrag = document.createElement("span");
      bedrag.className = "ride-amount";
      bedrag.textContent = euro(rit.bedragCent);

      item.append(links, bedrag);
      ui.rides.append(item);
    }
  } catch (err) {
    ui.dayTotal.textContent = "—";
    toast(err.message);
  }
});

el("closeDayBtn").addEventListener("click", () => toonScherm("amount"));

/* ---------------------- Opstarten ---------------------- */

async function init() {
  try {
    const res = await fetch("/api/config");
    if (res.ok) config = { ...config, ...(await res.json()) };
  } catch {
    toast("Geen verbinding met de terminal-server.");
  }

  if (!config.heeftSleutel) {
    ui.modeNote.textContent = "Geen Stripe-sleutel ingesteld — zie het bestand .env";
    ui.modeNote.classList.add("test");
  } else if (config.testmodus) {
    ui.modeNote.textContent = "TESTMODUS — er wordt geen echt geld overgemaakt";
    ui.modeNote.classList.add("test");
  } else {
    ui.modeNote.textContent = "Betalingen zijn echt";
  }

  tekenBedrag();
}

init();
