/**
 * Opslag van de stempelkaarten in één JSON-bestand.
 *
 * Alles staat in het geheugen en wordt na elke wijziging in zijn geheel
 * weggeschreven, eerst naar een tijdelijk bestand en dan in één keer
 * hernoemd. Valt de server middenin uit, dan blijft het oude bestand heel.
 *
 * Voor een taxibedrijf met honderden of een paar duizend klanten is dat ruim
 * genoeg. Zet DATA_DIR op een schijf die een herstart overleeft (zie README).
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function maakOpslag(map) {
  fs.mkdirSync(map, { recursive: true });
  const bestand = path.join(map, "kaarten.json");

  let db = { kaarten: {}, apparaten: {} };
  try {
    db = { ...db, ...JSON.parse(fs.readFileSync(bestand, "utf8")) };
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Een kapot bestand nooit stilletjes overschrijven: dan ben je alle
      // stempels kwijt. Liever niet starten.
      throw new Error(`Kan ${bestand} niet lezen: ${err.message}`);
    }
  }

  function bewaar() {
    const tijdelijk = `${bestand}.${process.pid}.tmp`;
    fs.writeFileSync(tijdelijk, JSON.stringify(db, null, 2));
    fs.renameSync(tijdelijk, bestand);
  }

  return {
    bestand,

    nieuweKaart({ naam, telefoon }) {
      const id = crypto.randomBytes(12).toString("base64url");
      const nu = new Date().toISOString();
      const kaart = {
        id,
        // Korte code om voor te lezen als scannen niet lukt.
        code: id.slice(0, 6).toUpperCase(),
        naam,
        telefoon: telefoon || null,
        stempels: 0,
        tegoed: 0, // aantal verdiende, nog niet gebruikte beloningen
        ingewisseld: 0,
        // Geheim waarmee een iPhone zich bij deze server meldt.
        appleToken: crypto.randomBytes(24).toString("base64url"),
        aangemaakt: nu,
        gewijzigd: nu,
        laatsteStempel: null,
        geschiedenis: [],
      };
      db.kaarten[id] = kaart;
      bewaar();
      return kaart;
    },

    kaart(id) {
      return Object.hasOwn(db.kaarten, id) ? db.kaarten[id] : null;
    },

    kaartOpCode(code) {
      const c = String(code).trim().toUpperCase();
      return Object.values(db.kaarten).find((k) => k.code === c) || null;
    },

    alleKaarten() {
      return Object.values(db.kaarten).sort((a, b) => b.gewijzigd.localeCompare(a.gewijzigd));
    },

    /** Past een kaart aan via een functie, en bewaart meteen. */
    wijzig(id, fn) {
      const kaart = this.kaart(id);
      if (!kaart) return null;
      fn(kaart);
      kaart.gewijzigd = new Date().toISOString();
      bewaar();
      return kaart;
    },

    /* ---------- Apple: welke iPhones hebben welke kaart ---------- */

    registreerApparaat(apparaatId, pushToken, serie) {
      const bestaand = db.apparaten[apparaatId];
      const apparaat = bestaand || { pushToken, series: [] };
      apparaat.pushToken = pushToken;
      const nieuw = !apparaat.series.includes(serie);
      if (nieuw) apparaat.series.push(serie);
      db.apparaten[apparaatId] = apparaat;
      bewaar();
      return nieuw;
    },

    afmeldenApparaat(apparaatId, serie) {
      const apparaat = db.apparaten[apparaatId];
      if (!apparaat) return;
      apparaat.series = apparaat.series.filter((s) => s !== serie);
      if (apparaat.series.length === 0) delete db.apparaten[apparaatId];
      bewaar();
    },

    seriesVanApparaat(apparaatId) {
      return db.apparaten[apparaatId]?.series || [];
    },

    /** Apple meldde dat dit toestel de pas niet meer heeft. */
    vergeetPushTokens(tokens) {
      if (tokens.length === 0) return;
      for (const [id, a] of Object.entries(db.apparaten)) {
        if (tokens.includes(a.pushToken)) delete db.apparaten[id];
      }
      bewaar();
    },

    pushTokensVoor(serie) {
      return Object.values(db.apparaten)
        .filter((a) => a.series.includes(serie))
        .map((a) => a.pushToken);
    },
  };
}
