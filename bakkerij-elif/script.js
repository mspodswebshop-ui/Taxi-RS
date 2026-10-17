// Bakkerij Elif — openingsuren, menu op mobiel, het bestelformulier en de
// Google-reviews. Elk onderdeel draait enkel op de pagina's waar het staat.

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

// Google-reviews. Zonder sleutel toont de site een knop naar de reviews op
// Google in plaats van de reviews zelf. Zie README.md om een sleutel te maken.
const GOOGLE = {
  apiKey: "",   // je Google Maps Platform-sleutel
  placeId: "",  // mag leeg blijven: dan zoekt de site de zaak op via de zoekterm
  zoekterm: "Bakkerij Elif, Hoogstraat 37, 2850 Boom",
};
const GOOGLE_MAPS_LINK = "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent(GOOGLE.zoekterm);

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
  const week = document.querySelector("[data-hours]");
  if (week) week.innerHTML = WEEK.map((d) => {
    const u = UREN[d];
    const klassen = [d === dag && "is-today", !u && "is-closed"].filter(Boolean).join(" ");
    const tijd = u ? `${u[0]} – ${u[1]}` : "gesloten";
    return `<li class="${klassen}"><b title="${DAGEN[d]}">${KORT[d]}</b><span>${tijd}</span></li>`;
  }).join("");

  const vandaag = UREN[dag];
  let open = false;
  let tekst = "Nu gesloten";

  if (vandaag && min >= minuten(vandaag[0]) && min < minuten(vandaag[1])) {
    open = true;
    tekst = minuten(vandaag[1]) - min <= 60
      ? `Nu open · sluit binnenkort om ${vandaag[1]}`
      : `Nu open · tot ${vandaag[1]}`;
  } else if (vandaag && min < minuten(vandaag[0])) {
    tekst = `Nu gesloten · vandaag open om ${vandaag[0]}`;
  } else {
    for (let i = 1; i <= 7; i++) {
      const d = (dag + i) % 7;
      if (UREN[d]) {
        tekst = `Nu gesloten · open ${i === 1 ? "morgen" : DAGEN[d]} om ${UREN[d][0]}`;
        break;
      }
    }
  }

  // Het label kan meerdere keren op een pagina staan (bv. bovenaan en in de voet).
  document.querySelectorAll("[data-status]").forEach((status) => {
    status.classList.toggle("is-open", open);
    status.classList.toggle("is-closed", !open);
    status.querySelector("[data-status-text]").textContent = tekst;
  });
}

function menuOpMobiel() {
  const knop = document.querySelector(".navtoggle");
  const nav = document.getElementById("nav");
  if (!knop || !nav) return;
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
  if (!form) return;
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

// ---------- Google-reviews ----------

// Klein hulpje om veilig HTML-elementen te maken: tekst van Google komt
// altijd via textContent op de pagina, nooit als HTML.
function el(tag, attrs = {}, ...kinderen) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") e.className = v;
    else e.setAttribute(k, v);
  }
  e.append(...kinderen.filter((k) => k !== null && k !== undefined));
  return e;
}

function sterren(score) {
  const vol = Math.round(score);
  return el("span", { class: "stars", role: "img", "aria-label": `${score} op 5 sterren` },
    "★".repeat(vol), el("span", { class: "stars__off" }, "★".repeat(5 - vol)));
}

function laadGoogleMaps() {
  if (window.google?.maps?.importLibrary) return Promise.resolve();
  return new Promise((klaar, mislukt) => {
    window.__elifMapsKlaar = klaar;
    const s = document.createElement("script");
    s.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GOOGLE.apiKey) +
      "&v=weekly&loading=async&language=nl&callback=__elifMapsKlaar";
    s.async = true;
    s.onerror = mislukt;
    document.head.append(s);
  });
}

async function haalReviewsOp() {
  await laadGoogleMaps();
  const { Place } = await google.maps.importLibrary("places");
  let id = GOOGLE.placeId;
  if (!id) {
    const { places } = await Place.searchByText({
      textQuery: GOOGLE.zoekterm, fields: ["id"], maxResultCount: 1, language: "nl",
    });
    if (!places.length) throw new Error("Zaak niet gevonden op Google");
    id = places[0].id;
  }
  const plek = new Place({ id, requestedLanguage: "nl" });
  await plek.fetchFields({ fields: ["rating", "userRatingCount", "reviews", "googleMapsURI"] });
  return { id, plek };
}

function reviewKaart(r) {
  const auteur = r.authorAttribution || {};
  const naam = auteur.displayName || "Google-gebruiker";
  const foto = auteur.photoURI
    ? el("img", { class: "review__photo", src: auteur.photoURI, alt: "", width: "44", height: "44", loading: "lazy", referrerpolicy: "no-referrer" })
    : el("span", { class: "review__photo review__photo--letter", "aria-hidden": "true" }, naam.charAt(0).toUpperCase());
  const naamEl = auteur.uri
    ? el("a", { href: auteur.uri, target: "_blank", rel: "noopener" }, naam)
    : el("span", {}, naam);

  return el("article", { class: "review" },
    el("header", { class: "review__head" },
      foto,
      el("div", {}, el("p", { class: "review__name" }, naamEl),
        el("p", { class: "review__meta" }, sterren(r.rating || 0), " ", r.relativePublishTimeDescription || ""))),
    r.text ? el("p", { class: "review__text" }, r.text) : null);
}

function toonReviews(vak, { id, plek }, aantal) {
  const mapsLink = plek.googleMapsURI || GOOGLE_MAPS_LINK;
  const schrijfLink = "https://search.google.com/local/writereview?placeid=" + encodeURIComponent(id);
  const lijst = (plek.reviews || []).slice(0, aantal);

  vak.replaceChildren(
    el("div", { class: "reviews__summary" },
      el("p", { class: "reviews__score" }, (plek.rating ?? 0).toLocaleString("nl-BE", { minimumFractionDigits: 1 })),
      el("div", {},
        sterren(plek.rating || 0),
        el("p", { class: "reviews__count" }, `${plek.userRatingCount ?? 0} reviews op Google`)),
      el("div", { class: "reviews__links" },
        el("a", { class: "btn btn--red btn--small", href: schrijfLink, target: "_blank", rel: "noopener" }, "Schrijf een review"),
        el("a", { class: "btn btn--outline btn--small", href: mapsLink, target: "_blank", rel: "noopener" }, "Alle reviews op Google"))),
    lijst.length
      ? el("div", { class: "reviews__grid" }, ...lijst.map(reviewKaart))
      : null,
    el("p", { class: "reviews__credit" }, "Reviews van Google"));
}

function toonReviewsZonderGoogle(vak) {
  vak.replaceChildren(
    el("div", { class: "reviews__summary reviews__summary--plain" },
      el("div", {},
        el("p", { class: "reviews__title" }, "Onze reviews staan op Google"),
        el("p", { class: "reviews__count" }, "Lees wat klanten zeggen, of laat zelf weten hoe het smaakte.")),
      el("div", { class: "reviews__links" },
        el("a", { class: "btn btn--red btn--small", href: GOOGLE_MAPS_LINK, target: "_blank", rel: "noopener" }, "Bekijk de reviews op Google"))));
}

async function googleReviews() {
  const vakken = [...document.querySelectorAll("[data-reviews]")];
  if (!vakken.length) return;
  if (!GOOGLE.apiKey) {
    vakken.forEach(toonReviewsZonderGoogle);
    return;
  }
  vakken.forEach((v) => v.replaceChildren(el("p", { class: "reviews__loading" }, "Reviews laden…")));
  try {
    const data = await haalReviewsOp();
    vakken.forEach((v) => toonReviews(v, data, Number(v.dataset.reviews) || 5));
  } catch (fout) {
    console.warn("Google-reviews konden niet geladen worden:", fout);
    vakken.forEach(toonReviewsZonderGoogle);
  }
}

document.querySelector("[data-year]").textContent = new Date().getFullYear();
toonUren();
setInterval(toonUren, 60 * 1000);
menuOpMobiel();
bestelformulier();
googleReviews();
