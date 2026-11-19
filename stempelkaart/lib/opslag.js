/**
 * Opslag van de stempelkaarten.
 *
 * Alles staat in het geheugen en wordt na elke wijziging in zijn geheel
 * weggeschreven. Twee plekken zijn mogelijk:
 *
 *   - DATABASE_URL ingesteld: in een Postgres-database (bijv. gratis bij
 *     Neon). Nodig op hosters zonder vaste schijf, zoals het gratis plan van
 *     Render: daar wordt een bestand bij elke herstart gewist.
 *   - Anders: in DATA_DIR/kaarten.json, eerst naar een tijdelijk bestand en
 *     dan in één keer hernoemd, zodat een crash het oude bestand heel laat.
 *
 * Voor een taxibedrijf met honderden of een paar duizend klanten is dat ruim
 * genoeg.
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/** Bestand op schijf. */
function bestandsOpslag(map) {
  fs.mkdirSync(map, { recursive: true });
  const bestand = path.join(map, "kaarten.json");
  let inhoud = null;
  try {
    inhoud = JSON.parse(fs.readFileSync(bestand, "utf8"));
  } catch (err) {
    if (err.code !== "ENOENT") {
      // Een kapot bestand nooit stilletjes overschrijven: dan ben je alle
      // stempels kwijt. Liever niet starten.
      throw new Error(`Kan ${bestand} niet lezen: ${err.message}`);
    }
  }
  return {
    waar: bestand,
    inhoud,
    schrijf(db) {
      const tijdelijk = `${bestand}.${process.pid}.tmp`;
      fs.writeFileSync(tijdelijk, JSON.stringify(db, null, 2));
      fs.renameSync(tijdelijk, bestand);
    },
  };
}

/** Postgres: één rij met het hele document. */
async function databaseOpslag(url) {
  const { default: pg } = await import("pg");
  const pool = new pg.Pool({ connectionString: url, max: 2 });
  pool.on("error", (err) => console.error("Database:", err.message));
  await pool.query(
    "CREATE TABLE IF NOT EXISTS stempelkaart (id int PRIMARY KEY, inhoud jsonb NOT NULL, gewijzigd timestamptz NOT NULL DEFAULT now())",
  );
  const r = await pool.query("SELECT inhoud FROM stempelkaart WHERE id = 1");

  // Schrijven gebeurt na elkaar, zodat een oudere stand nooit een nieuwere
  // overschrijft. Alleen de laatste wachtende stand wordt echt verstuurd.
  let bezig = Promise.resolve();
  let wachtend = null;
  return {
    waar: "de database (DATABASE_URL)",
    inhoud: r.rows[0]?.inhoud || null,
    schrijf(db) {
      const eerste = wachtend === null;
      wachtend = JSON.stringify(db);
      if (!eerste) return;
      bezig = bezig.then(async () => {
        const tekst = wachtend;
        wachtend = null;
        try {
          await pool.query(
            "INSERT INTO stempelkaart (id, inhoud) VALUES (1, $1) ON CONFLICT (id) DO UPDATE SET inhoud = $1, gewijzigd = now()",
            [tekst],
          );
        } catch (err) {
          console.error("LET OP: opslaan in de database mislukt:", err.message);
        }
      });
    },
  };
}

export async function maakOpslag({ map, databaseUrl }) {
  const plek = databaseUrl ? await databaseOpslag(databaseUrl) : bestandsOpslag(map);
  const db = { kaarten: {}, apparaten: {}, ...(plek.inhoud || {}) };
  const bewaar = () => plek.schrijf(db);

  return {
    waar: plek.waar,

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
