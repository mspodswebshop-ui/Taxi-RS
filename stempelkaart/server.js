/**
 * Digitale stempelkaart voor Taxi R.S.
 *
 * De klant maakt een kaart aan en zet hem in Apple Wallet of Google Wallet.
 * Op de kaart staat een QR-code. De chauffeur scant die met de gewone camera
 * van zijn telefoon, is ingelogd met zijn pincode, en tikt op "+1 stempel".
 * De kaart in de Wallet van de klant werkt zichzelf bij.
 *
 * Na genoeg stempels krijgt de klant een beloning (standaard: een gratis rit)
 * die de chauffeur bij de volgende rit inwisselt.
 */

import "dotenv/config";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import express from "express";
import QRCode from "qrcode";
import { maakOpslag } from "./lib/opslag.js";
import { maakApple } from "./lib/apple.js";
import { maakGoogle } from "./lib/google.js";
import { rondLogo, stempelStrook } from "./lib/afbeeldingen.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 4100);

/* ---------------------- Instellingen ---------------------- */

const instellingen = {
  baseUrl: (process.env.BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, ""),
  bedrijf: process.env.BEDRIJF || "Taxi R.S.",
  telefoon: process.env.BEDRIJF_TELEFOON || "",
  nodig: Math.min(20, Math.max(2, Number(process.env.STEMPELS_NODIG) || 10)),
  beloning: process.env.BELONING || "Gratis rit",
  voorwaarden: process.env.VOORWAARDEN || "",
};

const PIN = (process.env.CHAUFFEUR_PIN || "").trim();
// Zonder vast geheim blijft inloggen werken, maar moet de chauffeur na elke
// herstart opnieuw zijn pincode intikken.
const SESSIE_GEHEIM = process.env.SESSIE_GEHEIM || crypto.randomBytes(32).toString("hex");
const SESSIE_DAGEN = 30;

// Binnen deze tijd vraagt de app of een tweede stempel echt de bedoeling is.
const DUBBEL_MS = 2 * 60 * 1000;

const opslag = maakOpslag(process.env.DATA_DIR || path.join(here, "data"));
const apple = maakApple(instellingen);
const google = maakGoogle(instellingen);

/* ---------------------- Hulpfuncties ---------------------- */

/** Wat de klant (en iedereen met de link) van een kaart mag zien. */
function publiek(kaart, chauffeur = false) {
  return {
    id: kaart.id,
    code: kaart.code,
    naam: kaart.naam,
    stempels: kaart.stempels,
    nodig: instellingen.nodig,
    tegoed: kaart.tegoed,
    beloning: instellingen.beloning,
    ...(chauffeur
      ? {
          telefoon: kaart.telefoon,
          ingewisseld: kaart.ingewisseld,
          laatsteStempel: kaart.laatsteStempel,
          aangemaakt: kaart.aangemaakt,
          geschiedenis: kaart.geschiedenis.slice(-20).reverse(),
        }
      : {}),
  };
}

function logboek(kaart, soort) {
  kaart.geschiedenis.push({ soort, op: new Date().toISOString() });
  if (kaart.geschiedenis.length > 200) kaart.geschiedenis.shift();
}

/**
 * Zet de nieuwe stand door naar Apple en Google. Dit gebeurt op de
 * achtergrond: de chauffeur hoeft niet te wachten, en een storing bij Apple
 * of Google mag een stempel niet tegenhouden.
 */
function meldWallets(kaart) {
  if (apple.ingesteld) {
    apple
      .duw(opslag.pushTokensVoor(kaart.id))
      .then((verlopen) => opslag.vergeetPushTokens(verlopen))
      .catch((err) => console.error("Apple bijwerken mislukt:", err.message));
  }
  if (google.ingesteld) {
    google.werkBij(kaart).catch((err) => console.error("Google bijwerken mislukt:", err.message));
  }
}

const cookies = (req) =>
  Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((c) => c.trim().split("="))
      .filter(([k, v]) => k && v)
      .map(([k, v]) => [k, decodeURIComponent(v)]),
  );

const handtekening = (tekst) =>
  crypto.createHmac("sha256", SESSIE_GEHEIM).update(tekst).digest("base64url");

function gelijk(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function isChauffeur(req) {
  if (!PIN) return false;
  const [tot, sig] = (cookies(req).chauffeur || "").split(".");
  return Boolean(tot && sig && Number(tot) > Date.now() && gelijk(sig, handtekening(`chauffeur.${tot}`)));
}

function alleenChauffeur(req, res, next) {
  if (isChauffeur(req)) return next();
  res.status(401).json({ error: "Log eerst in als chauffeur." });
}

/** Simpele teller per IP-adres, tegen raden en volspammen. */
function begrenzer(max, vensterMs) {
  const tellers = new Map();
  return {
    teVeel(sleutel) {
      const nu = Date.now();
      const t = tellers.get(sleutel);
      if (!t || t.tot < nu) {
        tellers.set(sleutel, { aantal: 1, tot: nu + vensterMs });
        return false;
      }
      t.aantal++;
      return t.aantal > max;
    },
    reset(sleutel) {
      tellers.delete(sleutel);
    },
  };
}

const inlogPogingen = begrenzer(5, 15 * 60 * 1000);
const nieuweKaarten = begrenzer(10, 60 * 60 * 1000);

/* ---------------------- App ---------------------- */

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");

/* ---------- Apple Wallet-webservice ----------
   Deze adressen roept de iPhone zelf aan. De vorm ligt vast bij Apple:
   https://developer.apple.com/documentation/walletpasses/adding-a-web-service-to-update-passes
   --------------------------------------------- */

const appleRouter = express.Router();
appleRouter.use(express.json({ limit: "50kb" }));

/** Controleert "Authorization: ApplePass <token>" tegen de kaart. */
function appleKaart(req) {
  if (req.params.passType !== apple.passTypeId) return null;
  const kaart = opslag.kaart(req.params.serie);
  const kop = req.headers.authorization || "";
  if (!kaart || !kop.startsWith("ApplePass ")) return null;
  return gelijk(kop.slice(10), kaart.appleToken) ? kaart : null;
}

appleRouter.post("/v1/devices/:apparaat/registrations/:passType/:serie", (req, res) => {
  if (!appleKaart(req)) return res.sendStatus(401);
  const pushToken = req.body?.pushToken;
  if (typeof pushToken !== "string" || !/^[0-9a-fA-F]{32,200}$/.test(pushToken)) {
    return res.sendStatus(400);
  }
  const nieuw = opslag.registreerApparaat(req.params.apparaat, pushToken, req.params.serie);
  res.sendStatus(nieuw ? 201 : 200);
});

appleRouter.delete("/v1/devices/:apparaat/registrations/:passType/:serie", (req, res) => {
  if (!appleKaart(req)) return res.sendStatus(401);
  opslag.afmeldenApparaat(req.params.apparaat, req.params.serie);
  res.sendStatus(200);
});

appleRouter.get("/v1/devices/:apparaat/registrations/:passType", (req, res) => {
  if (req.params.passType !== apple.passTypeId) return res.sendStatus(404);
  const sinds = Number(req.query.passesUpdatedSince) || 0;
  const kaarten = opslag
    .seriesVanApparaat(req.params.apparaat)
    .map((s) => opslag.kaart(s))
    .filter((k) => k && Date.parse(k.gewijzigd) > sinds);
  if (kaarten.length === 0) return res.sendStatus(204);
  res.json({
    serialNumbers: kaarten.map((k) => k.id),
    lastUpdated: String(Math.max(...kaarten.map((k) => Date.parse(k.gewijzigd)))),
  });
});

appleRouter.get("/v1/passes/:passType/:serie", async (req, res) => {
  const kaart = appleKaart(req);
  if (!kaart) return res.sendStatus(401);
  const gewijzigd = new Date(kaart.gewijzigd);
  gewijzigd.setMilliseconds(0);
  const sinds = Date.parse(req.headers["if-modified-since"] || "");
  if (sinds && gewijzigd.getTime() <= sinds) return res.sendStatus(304);
  try {
    const pas = await apple.maakPas(kaart);
    res.set("Content-Type", "application/vnd.apple.pkpass");
    res.set("Last-Modified", gewijzigd.toUTCString());
    res.send(pas);
  } catch (err) {
    console.error("Apple-pas maken mislukt:", err.message);
    res.sendStatus(500);
  }
});

appleRouter.post("/v1/log", (req, res) => {
  for (const regel of req.body?.logs || []) console.warn("Melding van iPhone:", String(regel).slice(0, 500));
  res.sendStatus(200);
});

app.use("/apple", appleRouter);

/* ---------- Gewone app ---------- */

app.use(express.json({ limit: "20kb" }));
app.use(express.static(path.join(here, "public"), { index: false }));

const logoPng = rondLogo(660);
app.get("/logo.png", (_req, res) => {
  res.set("Cache-Control", "public, max-age=86400").type("png").send(logoPng);
});

app.get("/api/config", (req, res) => {
  res.json({
    bedrijf: instellingen.bedrijf,
    telefoon: instellingen.telefoon,
    nodig: instellingen.nodig,
    beloning: instellingen.beloning,
    apple: apple.ingesteld,
    google: google.ingesteld,
    chauffeurAan: Boolean(PIN),
    chauffeur: isChauffeur(req),
  });
});

/** Klant maakt een nieuwe kaart aan. */
app.post("/api/kaarten", (req, res) => {
  const naam = String(req.body?.naam || "").trim().replace(/\s+/g, " ");
  const telefoon = String(req.body?.telefoon || "").trim();

  if (naam.length < 2 || naam.length > 40) {
    return res.status(400).json({ error: "Vul je naam in (2 tot 40 tekens)." });
  }
  if (telefoon && !/^\+?[0-9 ()./-]{6,20}$/.test(telefoon)) {
    return res.status(400).json({ error: "Dat telefoonnummer klopt niet." });
  }
  // Een chauffeur die kaarten aanmaakt voor klanten loopt niet tegen de grens aan.
  if (!isChauffeur(req) && nieuweKaarten.teVeel(req.ip)) {
    return res.status(429).json({ error: "Te veel nieuwe kaarten. Probeer het later opnieuw." });
  }

  const kaart = opslag.nieuweKaart({ naam, telefoon });
  res.status(201).json(publiek(kaart));
});

app.get("/api/kaarten/:id", (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.status(404).json({ error: "Deze kaart bestaat niet." });
  res.json(publiek(kaart, isChauffeur(req)));
});

app.get("/api/kaarten/:id/strook.png", (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.sendStatus(404);
  // Breed genoeg voor Google Wallet (hero-afbeelding: 1032 breed).
  const png = stempelStrook({ stempels: kaart.stempels, nodig: instellingen.nodig, breedte: 1032, hoogte: 336 });
  res.set("Cache-Control", "public, max-age=300").type("png").send(png);
});

/** De QR-code van de kaart, voor klanten die hem op de webpagina tonen. */
app.get("/api/kaarten/:id/qr.svg", async (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.sendStatus(404);
  const svg = await QRCode.toString(`${instellingen.baseUrl}/k/${kaart.id}`, { type: "svg", margin: 1 });
  res.set("Cache-Control", "public, max-age=86400").type("svg").send(svg);
});

/** QR naar de aanmeldpagina, om in de taxi te tonen of op te hangen. */
app.get("/api/aanmelden-qr.svg", async (_req, res) => {
  const svg = await QRCode.toString(`${instellingen.baseUrl}/`, { type: "svg", margin: 1 });
  res.type("svg").send(svg);
});

app.get("/api/kaarten/:id/apple.pkpass", async (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.status(404).send("Deze kaart bestaat niet.");
  if (!apple.ingesteld) return res.status(503).send("Apple Wallet is nog niet ingesteld.");
  try {
    const pas = await apple.maakPas(kaart);
    res.set("Content-Type", "application/vnd.apple.pkpass");
    res.set("Content-Disposition", `attachment; filename="stempelkaart.pkpass"`);
    res.set("Last-Modified", new Date(kaart.gewijzigd).toUTCString());
    res.send(pas);
  } catch (err) {
    console.error("Apple-pas maken mislukt:", err);
    res.status(500).send("De Apple-kaart kon niet gemaakt worden.");
  }
});

app.get("/api/kaarten/:id/google", async (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.status(404).send("Deze kaart bestaat niet.");
  if (!google.ingesteld) return res.status(503).send("Google Wallet is nog niet ingesteld.");
  try {
    res.redirect(303, await google.opslaanLink(kaart));
  } catch (err) {
    console.error("Google-link maken mislukt:", err.message);
    res.status(502).send("Google Wallet is even niet bereikbaar. Probeer het zo opnieuw.");
  }
});

/* ---------- Chauffeur ---------- */

app.post("/api/chauffeur/login", (req, res) => {
  if (!PIN) return res.status(503).json({ error: "Er is geen CHAUFFEUR_PIN ingesteld." });
  if (inlogPogingen.teVeel(req.ip)) {
    return res.status(429).json({ error: "Te veel pogingen. Wacht een kwartier." });
  }
  if (!gelijk(String(req.body?.pin || ""), PIN)) {
    return res.status(401).json({ error: "Verkeerde pincode." });
  }
  inlogPogingen.reset(req.ip);
  const tot = Date.now() + SESSIE_DAGEN * 24 * 3600 * 1000;
  res.cookie("chauffeur", `${tot}.${handtekening(`chauffeur.${tot}`)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: req.secure,
    maxAge: SESSIE_DAGEN * 24 * 3600 * 1000,
    path: "/",
  });
  res.json({ ok: true });
});

app.post("/api/chauffeur/logout", (_req, res) => {
  res.clearCookie("chauffeur", { path: "/" });
  res.json({ ok: true });
});

app.get("/api/chauffeur/kaarten", alleenChauffeur, (req, res) => {
  const zoek = String(req.query.zoek || "").trim().toLowerCase();
  let kaarten = opslag.alleKaarten();
  if (zoek) {
    kaarten = kaarten.filter(
      (k) =>
        k.naam.toLowerCase().includes(zoek) ||
        k.code.toLowerCase() === zoek ||
        (k.telefoon || "").replace(/\D/g, "").includes(zoek.replace(/\D/g, "") || "#"),
    );
  }
  res.json({
    totaal: opslag.alleKaarten().length,
    kaarten: kaarten.slice(0, 50).map((k) => publiek(k)),
  });
});

app.post("/api/kaarten/:id/stempel", alleenChauffeur, (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.status(404).json({ error: "Deze kaart bestaat niet." });

  const recent = kaart.laatsteStempel && Date.now() - Date.parse(kaart.laatsteStempel) < DUBBEL_MS;
  if (recent && !req.body?.toch) {
    return res.status(409).json({
      error: "Deze kaart kreeg net al een stempel. Toch nog een?",
      dubbel: true,
    });
  }

  let beloningErbij = false;
  opslag.wijzig(kaart.id, (k) => {
    k.stempels += 1;
    k.laatsteStempel = new Date().toISOString();
    logboek(k, "stempel");
    if (k.stempels >= instellingen.nodig) {
      k.stempels = 0;
      k.tegoed += 1;
      beloningErbij = true;
      logboek(k, "beloning verdiend");
    }
  });
  meldWallets(kaart);
  res.json({ ...publiek(kaart, true), beloningErbij });
});

/** Maakt de laatste stempel ongedaan, voor als er per ongeluk getikt is. */
app.post("/api/kaarten/:id/correctie", alleenChauffeur, (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.status(404).json({ error: "Deze kaart bestaat niet." });
  if (kaart.stempels === 0 && kaart.tegoed === 0) {
    return res.status(400).json({ error: "Er is geen stempel om weg te halen." });
  }
  opslag.wijzig(kaart.id, (k) => {
    if (k.stempels > 0) k.stempels -= 1;
    else {
      k.tegoed -= 1;
      k.stempels = instellingen.nodig - 1;
    }
    k.laatsteStempel = null;
    logboek(k, "stempel weggehaald");
  });
  meldWallets(kaart);
  res.json(publiek(kaart, true));
});

app.post("/api/kaarten/:id/inwisselen", alleenChauffeur, (req, res) => {
  const kaart = opslag.kaart(req.params.id);
  if (!kaart) return res.status(404).json({ error: "Deze kaart bestaat niet." });
  if (kaart.tegoed < 1) {
    return res.status(400).json({ error: "Deze klant heeft nog geen beloning verdiend." });
  }
  opslag.wijzig(kaart.id, (k) => {
    k.tegoed -= 1;
    k.ingewisseld += 1;
    logboek(k, "beloning ingewisseld");
  });
  meldWallets(kaart);
  res.json(publiek(kaart, true));
});

/* ---------- Pagina's ---------- */

app.use("/api", (_req, res) => res.status(404).json({ error: "Onbekend API-pad." }));
app.get("/k/:id", (_req, res) => res.sendFile(path.join(here, "public", "kaart.html")));
app.get("/chauffeur", (_req, res) => res.sendFile(path.join(here, "public", "chauffeur.html")));
app.get("/", (_req, res) => res.sendFile(path.join(here, "public", "index.html")));
app.use((_req, res) => res.status(404).sendFile(path.join(here, "public", "index.html")));

app.listen(PORT, () => {
  console.log(`Stempelkaart draait op http://localhost:${PORT}`);
  console.log(`Kaarten worden bewaard in ${opslag.bestand}`);
  console.log(`Apple Wallet: ${apple.ingesteld ? "aan" : `uit${apple.fout ? ` (${apple.fout})` : " (geen certificaten)"}`}`);
  if (apple.ingesteld && !apple.webServiceURL) {
    console.log("  Let op: BASE_URL is geen https, dus Apple-kaarten werken zichzelf niet bij.");
  }
  console.log(`Google Wallet: ${google.ingesteld ? "aan" : `uit${google.fout ? ` (${google.fout})` : " (geen serviceaccount)"}`}`);
  if (!PIN) console.warn("Let op: geen CHAUFFEUR_PIN ingesteld. Stempels zetten kan dan niet.");
  if (!process.env.SESSIE_GEHEIM) {
    console.warn("Tip: zet SESSIE_GEHEIM, anders moet de chauffeur na elke herstart opnieuw inloggen.");
  }
});
