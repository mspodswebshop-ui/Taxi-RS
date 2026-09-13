/**
 * Paylity — de API als één Netlify Function.
 *
 * Deze versie is er voor de sleepmethode van Netlify: één map met een
 * index.html en een kant-en-klaar gebouwde function. Netlify hoeft dan niets
 * te bouwen, en dat is precies wat het sleepvak wél aankan.
 *
 * Wat hier anders is dan in de volledige Paylity:
 *
 * - Eén function handelt alle paden onder /api af, in plaats van een aparte
 *   route per pad. Minder bestanden om te bundelen.
 * - De sessie is een ondertekende cookie in plaats van een rij in de database.
 *   Zo hoeft deze versie niets te schrijven om je ingelogd te houden.
 * - Alleen lezen: inloggen en je dashboard bekijken. Betaallinks aanmaken en
 *   afrekenen zitten in de volledige versie.
 *
 * Het wachtwoord wordt gecontroleerd tegen dezelfde bcrypt-hash als de
 * volledige Paylity gebruikt. Er worden nergens kaartgegevens gevraagd of
 * opgeslagen — die velden bestaan niet in het schema.
 */

const { createHmac, timingSafeEqual, randomBytes } = require("node:crypto");
const { Client } = require("pg");
const bcrypt = require("bcryptjs");

const COOKIE = "paylity_session";
const SESSIE_UREN = 24 * 30;

/* ---------------------------------------------------------------- */
/* Database                                                          */
/* ---------------------------------------------------------------- */

function verbindingsreeks() {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    null
  );
}

async function vraag(sql, waarden = []) {
  const reeks = verbindingsreeks();
  if (!reeks) {
    const fout = new Error("geen verbindingsreeks");
    fout.code = "GEEN_URL";
    throw fout;
  }

  // Gehoste databases (Neon, Supabase) vereisen TLS; een database op je eigen
  // machine spreekt meestal geen TLS. Op localhost dus zonder, elders mét. Het
  // certificaat wordt niet gecontroleerd omdat gehoste providers vaak een
  // eigen keten gebruiken; de verbinding zelf is wél versleuteld.
  const lokaal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(reeks);

  const client = new Client({
    connectionString: reeks,
    ssl: lokaal ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
    query_timeout: 15000,
  });

  await client.connect();
  try {
    const resultaat = await client.query(sql, waarden);
    return resultaat.rows;
  } finally {
    await client.end().catch(() => {});
  }
}

/* ---------------------------------------------------------------- */
/* Sessie: een ondertekende cookie                                   */
/* ---------------------------------------------------------------- */

function geheim() {
  return (
    process.env.SESSION_SECRET ||
    process.env.WEBHOOK_SIGNING_SECRET ||
    // Laatste redmiddel: afgeleid van de databasereeks, zodat er altijd íets
    // is om mee te ondertekenen. Zet liever zelf SESSION_SECRET.
    "paylity-" + (verbindingsreeks() || "leeg").slice(-24)
  );
}

function onderteken(inhoud) {
  return createHmac("sha256", geheim()).update(inhoud).digest("base64url");
}

function maakToken(userId, businessId) {
  const vervalt = Date.now() + SESSIE_UREN * 3600 * 1000;
  const inhoud = Buffer.from(
    JSON.stringify({ u: userId, b: businessId, v: vervalt }),
  ).toString("base64url");
  return `${inhoud}.${onderteken(inhoud)}`;
}

function leesToken(token) {
  if (!token || !token.includes(".")) return null;
  const [inhoud, handtekening] = token.split(".");

  const verwacht = Buffer.from(onderteken(inhoud));
  const gekregen = Buffer.from(handtekening);
  if (verwacht.length !== gekregen.length) return null;
  if (!timingSafeEqual(verwacht, gekregen)) return null;

  try {
    const gegevens = JSON.parse(Buffer.from(inhoud, "base64url").toString());
    if (!gegevens.v || gegevens.v < Date.now()) return null;
    return gegevens;
  } catch {
    return null;
  }
}

function leesCookie(headers, naam) {
  const rij = headers.cookie || headers.Cookie || "";
  for (const stuk of rij.split(";")) {
    const [k, ...rest] = stuk.trim().split("=");
    if (k === naam) return rest.join("=");
  }
  return null;
}

/* ---------------------------------------------------------------- */
/* Antwoorden                                                        */
/* ---------------------------------------------------------------- */

const json = (status, body, extraHeaders = {}) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json", ...extraHeaders },
  body: JSON.stringify(body),
});

const fout = (status, code, melding) =>
  json(status, { error: { code, message: melding } });

/** Zet een databasefout om in iets wat een mens kan lezen. */
function databaseMelding(err) {
  if (err && err.code === "GEEN_URL") {
    return "DATABASE_URL is niet ingesteld bij deze site. Zet hem bij Site configuration → Environment variables en rol opnieuw uit.";
  }
  const tekst = String((err && err.message) || err);
  if (/relation .* does not exist/i.test(tekst)) {
    return "De database is bereikbaar, maar de tabellen bestaan er nog niet.";
  }
  if (/ENOTFOUND|ECONNREFUSED|ETIMEDOUT|timeout/i.test(tekst)) {
    return "De database is niet bereikbaar. Klopt DATABASE_URL, en staat er geen localhost in?";
  }
  if (/password authentication failed|no pg_hba/i.test(tekst)) {
    return "De database weigert de inloggegevens uit DATABASE_URL.";
  }
  return "De database gaf een fout: " + tekst.split("\n")[0];
}

/* ---------------------------------------------------------------- */
/* Routes                                                            */
/* ---------------------------------------------------------------- */

async function health() {
  if (!verbindingsreeks()) {
    return json(503, {
      ok: false,
      database: {
        ok: false,
        melding: "De app weet niet waar de database staat.",
        oplossing:
          "Zet DATABASE_URL bij Site configuration → Environment variables en rol de site opnieuw uit.",
      },
    });
  }

  try {
    const rijen = await vraag("select count(*)::int as n from users");
    return json(200, {
      ok: true,
      database: { ok: true, melding: "De database werkt.", gebruikers: rijen[0].n },
    });
  } catch (err) {
    return json(503, {
      ok: false,
      database: { ok: false, melding: databaseMelding(err) },
    });
  }
}

async function inloggen(body, https) {
  const email = String(body.email || "").trim().toLowerCase();
  const wachtwoord = String(body.password || "");

  if (!email || !wachtwoord) {
    return fout(422, "validation_failed", "Vul een e-mailadres en wachtwoord in.");
  }

  let rijen;
  try {
    rijen = await vraag(
      `select u.id, u.name, u.password_hash, b.id as business_id, b.name as business_name
         from users u
         left join businesses b on b.owner_id = u.id
        where u.email = $1
        limit 1`,
      [email],
    );
  } catch (err) {
    return fout(503, "database_unavailable", databaseMelding(err));
  }

  const gebruiker = rijen[0];

  // Ook bij een onbekend adres een hash vergelijken, zodat het antwoord even
  // lang duurt en de reactietijd niet verraadt welke adressen bestaan.
  const hash =
    (gebruiker && gebruiker.password_hash) ||
    "$2b$12$ongeldigeplaceholderhashvoorwachttijd00000000000000000";
  const klopt = await bcrypt.compare(wachtwoord, hash);

  if (!gebruiker || !klopt) {
    return fout(401, "invalid_credentials", "E-mailadres of wachtwoord klopt niet.");
  }
  if (!gebruiker.business_id) {
    return fout(409, "no_business", "Bij dit account hoort nog geen bedrijf.");
  }

  const token = maakToken(gebruiker.id, gebruiker.business_id);
  const cookie =
    `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSIE_UREN * 3600}` +
    (https ? "; Secure" : "");

  return json(
    200,
    { ok: true, naam: gebruiker.name, bedrijf: gebruiker.business_name },
    { "Set-Cookie": cookie },
  );
}

function uitloggen(https) {
  return json(
    200,
    { ok: true },
    {
      "Set-Cookie":
        `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0` +
        (https ? "; Secure" : ""),
    },
  );
}

async function overzicht(sessie) {
  const b = sessie.b;

  const [cijfers] = await vraag(
    `select
       coalesce(sum(amount - refunded_amount) filter (where status in ('paid','refunded')), 0)::int as omzet,
       count(*) filter (where status = 'paid')::int      as geslaagd,
       count(*) filter (where status = 'failed')::int    as mislukt,
       count(*) filter (where status = 'pending')::int   as openstaand,
       coalesce(sum(refunded_amount), 0)::int            as terugbetaald,
       count(*) filter (where status = 'refunded')::int  as retouren
     from payments where business_id = $1`,
    [b],
  );

  const perDag = await vraag(
    `select d::date::text as dag,
            coalesce((
              select sum(p.amount - p.refunded_amount)
                from payments p
               where p.business_id = $1
                 and p.status in ('paid','refunded')
                 and p.created_at::date = d::date
            ), 0)::int as cent
       from generate_series(current_date - 29, current_date, '1 day') d
      order by d`,
    [b],
  );

  const recent = await vraag(
    `select p.id, p.amount, p.status, p.method, p.description, p.created_at,
            c.name as klant
       from payments p
       left join customers c on c.id = p.customer_id
      where p.business_id = $1
      order by p.created_at desc
      limit 8`,
    [b],
  );

  const [aantallen] = await vraag(
    `select
       (select count(*) from customers     where business_id = $1)::int as klanten,
       (select count(*) from payment_links where business_id = $1)::int as links,
       (select count(*) from invoices      where business_id = $1)::int as facturen`,
    [b],
  );

  const [bedrijf] = await vraag(
    `select name, email from businesses where id = $1`,
    [b],
  );

  return json(200, { cijfers, perDag, recent, aantallen, bedrijf });
}

async function lijst(sessie, wat) {
  const b = sessie.b;

  if (wat === "betalingen") {
    const rijen = await vraag(
      `select p.id, p.amount, p.refunded_amount, p.status, p.method, p.description,
              p.created_at, c.name as klant, c.email as klant_email
         from payments p
         left join customers c on c.id = p.customer_id
        where p.business_id = $1
        order by p.created_at desc
        limit 100`,
      [b],
    );
    return json(200, { data: rijen });
  }

  if (wat === "klanten") {
    const rijen = await vraag(
      `select c.id, c.name, c.email, c.created_at,
              count(p.id)::int as betalingen,
              coalesce(sum(p.amount - p.refunded_amount) filter (where p.status in ('paid','refunded')), 0)::int as besteed
         from customers c
         left join payments p on p.customer_id = c.id
        where c.business_id = $1
        group by c.id
        order by besteed desc`,
      [b],
    );
    return json(200, { data: rijen });
  }

  if (wat === "betaallinks") {
    const rijen = await vraag(
      `select l.id, l.slug, l.title, l.amount, l.active, l.created_at,
              count(p.id)::int as betalingen
         from payment_links l
         left join payments p on p.payment_link_id = l.id
        where l.business_id = $1
        group by l.id
        order by l.created_at desc`,
      [b],
    );
    return json(200, { data: rijen });
  }

  if (wat === "facturen") {
    const rijen = await vraag(
      `select i.id, i.number, i.amount, i.status, i.due_at, i.description,
              c.name as klant
         from invoices i
         left join customers c on c.id = i.customer_id
        where i.business_id = $1
        order by i.number desc`,
      [b],
    );
    return json(200, { data: rijen });
  }

  return fout(404, "not_found", "Dit onderdeel bestaat niet.");
}

/* ---------------------------------------------------------------- */
/* De function zelf                                                  */
/* ---------------------------------------------------------------- */

exports.handler = async function (event) {
  const headers = event.headers || {};
  const https =
    (headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";

  // Netlify levert het pad aan als /.netlify/functions/api/... of, met de
  // omleiding uit netlify.toml, als /api/...
  const pad = (event.path || "")
    .replace(/^\/\.netlify\/functions\/api/, "")
    .replace(/^\/api/, "")
    .replace(/\/+$/, "") || "/";

  const methode = (event.httpMethod || "GET").toUpperCase();

  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(
        event.isBase64Encoded
          ? Buffer.from(event.body, "base64").toString()
          : event.body,
      );
    } catch {
      return fout(400, "invalid_json", "De inhoud van het verzoek is geen geldige JSON.");
    }
  }

  try {
    if (pad === "/health") return await health();
    if (pad === "/login" && methode === "POST") return await inloggen(body, https);
    if (pad === "/logout" && methode === "POST") return uitloggen(https);

    // Alles hieronder vereist een geldige sessie.
    const sessie = leesToken(leesCookie(headers, COOKIE));
    if (!sessie) return fout(401, "unauthorized", "Je bent niet ingelogd.");

    if (pad === "/overzicht") return await overzicht(sessie);
    if (pad.startsWith("/lijst/")) return await lijst(sessie, pad.slice(7));

    return fout(404, "not_found", "Dit API-pad bestaat niet.");
  } catch (err) {
    console.error("Fout in de API:", err);
    return fout(503, "database_unavailable", databaseMelding(err));
  }
};
