// Bakkerij Elif — openingsuren, menu op mobiel en het bestelformulier.

// Openingsuren per dag (0 = zondag). Pas ze hier aan als ze veranderen;
// de tabel en het "Nu open"-label volgen vanzelf. null = gesloten.
const UREN = {
  1: ["08:00", "20:00"],
  2: ["08:00", "20:00"],
  3: ["08:00", "20:00"],
  4: ["08:00", "20:00"],
  5: ["08:00", "20:00"],
  6: ["08:00", "20:00"],
  0: ["08:00", "20:00"],
};

const DAGEN = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
const WEEK = [1, 2, 3, 4, 5, 6, 0]; // weergave van maandag tot zondag
const WHATSAPP = "32498341919";

const minuten = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

// Uren in België, ook als de bezoeker in een andere tijdzone zit.
function nuInBoom() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Brussels",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t).value;
  const dag = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { dag, min: Number(get("hour")) * 60 + Number(get("minute")) };
}

function toonUren() {
  const { dag, min } = nuInBoom();

  const KORT = ["zo", "ma", "di", "wo", "do", "vr", "za"];
  document.querySelector("[data-hours]").innerHTML = WEEK.map((d) => {
    const u = UREN[d];
    const klassen = [d === dag && "is-today", !u && "is-closed"].filter(Boolean).join(" ");
    const tijd = u ? `${u[0]} – ${u[1]}` : "gesloten";
    return `<li class="${klassen}"><b title="${DAGEN[d]}">${KORT[d]}</b><span>${tijd}</span></li>`;
  }).join("");

  const status = document.querySelector("[data-status]");
  const tekst = document.querySelector("[data-status-text]");
  const vandaag = UREN[dag];

  if (vandaag && min >= minuten(vandaag[0]) && min < minuten(vandaag[1])) {
    const rest = minuten(vandaag[1]) - min;
    status.className = "status is-open";
    tekst.textContent = rest <= 60
      ? `Nu open · sluit binnenkort om ${vandaag[1]}`
      : `Nu open · tot ${vandaag[1]}`;
    return;
  }

  status.className = "status is-closed";
  if (vandaag && min < minuten(vandaag[0])) {
    tekst.textContent = `Nu gesloten · vandaag open om ${vandaag[0]}`;
    return;
  }
  for (let i = 1; i <= 7; i++) {
    const d = (dag + i) % 7;
    if (UREN[d]) {
      const wanneer = i === 1 ? "morgen" : DAGEN[d];
      tekst.textContent = `Nu gesloten · open ${wanneer} om ${UREN[d][0]}`;
      return;
    }
  }
  tekst.textContent = "Nu gesloten";
}

function menuOpMobiel() {
  const knop = document.querySelector(".navtoggle");
  const nav = document.getElementById("nav");
  const zet = (open) => {
    nav.classList.toggle("is-open", open);
    knop.setAttribute("aria-expanded", String(open));
    knop.setAttribute("aria-label", open ? "Menu sluiten" : "Menu openen");
  };
  knop.addEventListener("click", () => zet(!nav.classList.contains("is-open")));
  nav.addEventListener("click", (e) => { if (e.target.closest("a")) zet(false); });
}

function bestelformulier() {
  const form = document.getElementById("orderForm");
  const fout = document.getElementById("formError");
  const datum = form.datum;

  // Vroegst mogelijke datum: vandaag.
  const vandaag = new Date();
  vandaag.setMinutes(vandaag.getMinutes() - vandaag.getTimezoneOffset());
  datum.min = vandaag.toISOString().slice(0, 10);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const leeg = [form.naam, datum].filter((veld) => !veld.value.trim());
    [form.naam, datum].forEach((veld) => veld.removeAttribute("aria-invalid"));

    if (leeg.length) {
      leeg.forEach((veld) => veld.setAttribute("aria-invalid", "true"));
      fout.textContent = "Vul je naam en de datum in, dan kunnen we je bestelling klaarzetten.";
      fout.hidden = false;
      leeg[0].focus();
      return;
    }
    fout.hidden = true;

    const leesbareDatum = new Date(datum.value + "T12:00").toLocaleDateString("nl-BE", {
      weekday: "long", day: "numeric", month: "long",
    });

    const regels = [
      "Hallo Bakkerij Elif, ik wil graag iets bestellen:",
      "",
      `• Bestelling: ${form.soort.value}`,
      form.personen.value ? `• Aantal personen: ${form.personen.value}` : null,
      `• Voor: ${leesbareDatum}`,
      `• ${form.querySelector('[name="ophalen"]:checked').value}`,
      form.wensen.value.trim() ? `• Wensen: ${form.wensen.value.trim()}` : null,
      "",
      `Groetjes, ${form.naam.value.trim()}`,
    ].filter((r) => r !== null);

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(regels.join("\n"))}`;
    window.open(url, "_blank", "noopener");
  });
}

document.querySelector("[data-year]").textContent = new Date().getFullYear();
toonUren();
setInterval(toonUren, 60 * 1000);
menuOpMobiel();
bestelformulier();
