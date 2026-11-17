// Weblity-boekingen: de API voor de website en het beheerscherm.
//
// Twee soorten bezoekers:
//   - de website (weblity.onrender.com) vraagt de vrije uren op en stuurt
//     boekingen in. Dat mag zonder inloggen, maar alleen vanaf dat adres.
//   - jij, in het beheerscherm op dit adres. Daarvoor moet je inloggen.
//
// Instellingen staan in omgevingsvariabelen, zie README.md.

import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import pg from 'pg';
import * as webpush from 'web-push';

const {
  DATABASE_URL,
  ADMIN_PASSWORD = '',
  SESSION_SECRET = '',
  VAPID_PUBLIC_KEY = '',
  VAPID_PRIVATE_KEY = '',
  PUBLIC_ORIGINS = 'https://weblity.onrender.com',
  RENDER_EXTERNAL_URL = '',
  NODE_ENV = 'development',
  PORT = 4200,
} = process.env;

const PRODUCTIE = NODE_ENV === 'production';

// ---------- Wanneer kan er geboekt worden? ----------
// Pas dit blok aan als je andere uren wilt.
// Per weekdag de blokken waarin je gesprekken aanneemt: [van, tot]. Elk gesprek
// duurt een uur, dus "16 tot 18" geeft de uren 16:00 en 17:00. 24 = middernacht.
const OPENINGSUREN = {
  1: [[16, 18], [20, 22]],   // maandag
  2: [[16, 22]],             // dinsdag
  3: [[13, 18], [20, 22]],   // woensdag
  4: [[16, 22]],             // donderdag
  5: [[16, 18], [20, 24]],   // vrijdag
  6: [[7, 24]],              // zaterdag
  0: [[7, 22]],              // zondag
};

/** De beginuren van een weekdag, bv. ['16:00', '17:00', '20:00', '21:00']. */
function urenVan(dag) {
  const uren = [];
  for (const [van, tot] of OPENINGSUREN[dag] || []) {
    for (let u = van; u < tot; u++) uren.push(String(u).padStart(2, '0') + ':00');
  }
  return uren;
}
const DAGEN_VOORUIT = 14;                         // zoveel open dagen toont de website

const DIENSTEN = ['Website', 'Webshop', 'Webapp', 'AI-toepassing', 'Iets anders'];
const STATUSSEN = ['nieuw', 'bevestigd', 'afgerond', 'geannuleerd'];

if (!DATABASE_URL) {
  console.error('\nDATABASE_URL ontbreekt. Zet de verbindingsregel van je Postgres-database in de omgevingsvariabelen.\n');
  process.exit(1);
}
if (PRODUCTIE && (!ADMIN_PASSWORD || !SESSION_SECRET)) {
  console.error('\nADMIN_PASSWORD en SESSION_SECRET zijn verplicht.\n');
  process.exit(1);
}
const sessieSleutel = SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// ---------- Database ----------
pg.types.setTypeParser(1082, v => v); // DATE als tekst "2026-11-20", niet als tijdstip
const db = new pg.Pool({ connectionString: DATABASE_URL, max: 4, idleTimeoutMillis: 30_000 });
db.on('error', err => console.error('Databasefout:', err.message));

async function maakTabellen() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS boekingen (
      id          BIGSERIAL PRIMARY KEY,
      aangemaakt  TIMESTAMPTZ NOT NULL DEFAULT now(),
      dienst      TEXT NOT NULL,
      datum       DATE NOT NULL,
      tijd        TEXT NOT NULL,
      naam        TEXT NOT NULL,
      telefoon    TEXT NOT NULL,
      email       TEXT NOT NULL DEFAULT '',
      bericht     TEXT NOT NULL DEFAULT '',
      status      TEXT NOT NULL DEFAULT 'nieuw'
    )`);
  // Eén boeking per uur. Een geannuleerde boeking geeft het uur weer vrij.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS boekingen_uur
      ON boekingen (datum, tijd) WHERE status <> 'geannuleerd'`);
  // De toestellen die een melding willen krijgen bij een nieuwe boeking.
  await db.query(`
    CREATE TABLE IF NOT EXISTS push_abonnementen (
      endpoint    TEXT PRIMARY KEY,
      sleutels    JSONB NOT NULL,
      aangemaakt  TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
  // Bezoeken van de website. Er wordt geen IP-adres en geen cookie bewaard: alleen
  // een code die per dag verandert, zodat één bezoeker per dag één keer telt.
  await db.query(`
    CREATE TABLE IF NOT EXISTS bezoeken (
      id         BIGSERIAL PRIMARY KEY,
      tijd       TIMESTAMPTZ NOT NULL DEFAULT now(),
      dag        DATE NOT NULL,
      pad        TEXT NOT NULL,
      bron       TEXT NOT NULL DEFAULT '',
      apparaat   TEXT NOT NULL DEFAULT '',
      bezoeker   TEXT NOT NULL
    )`);
  await db.query('CREATE INDEX IF NOT EXISTS bezoeken_dag ON bezoeken (dag)');
  // Wat je verdiend hebt, in centen. Optioneel gekoppeld aan een boeking.
  await db.query(`
    CREATE TABLE IF NOT EXISTS inkomsten (
      id            BIGSERIAL PRIMARY KEY,
      aangemaakt    TIMESTAMPTZ NOT NULL DEFAULT now(),
      datum         DATE NOT NULL,
      omschrijving  TEXT NOT NULL,
      bedrag_cent   INTEGER NOT NULL CHECK (bedrag_cent > 0),
      boeking_id    BIGINT REFERENCES boekingen (id) ON DELETE SET NULL
    )`);
  await db.query('CREATE INDEX IF NOT EXISTS inkomsten_datum ON inkomsten (datum)');
}

// ---------- Datum en tijd (altijd Belgische tijd) ----------
const klok = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', hour12: false,
});
function nu() {
  const [datum, tijd] = klok.format(new Date()).split(' ');
  return { datum, tijd };
}
function plusDagen(datum, n) {
  const d = new Date(datum + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const weekdag = datum => new Date(datum + 'T12:00:00Z').getUTCDay();

/** De eerstvolgende open dagen, met per dag welke uren nog in de toekomst liggen. */
function openDagen() {
  const { datum: vandaag, tijd } = nu();
  const dagen = [];
  for (let i = 0; dagen.length < DAGEN_VOORUIT && i < 60; i++) {
    const datum = plusDagen(vandaag, i);
    const alle = urenVan(weekdag(datum));
    // Vandaag kan je alleen nog uren boeken die minstens een uur verder liggen.
    const uren = i === 0 ? alle.filter(u => u > plusUur(tijd)) : alle;
    if (uren.length) dagen.push({ datum, uren });
  }
  return dagen;
}
function plusUur(tijd) {
  const [u, m] = tijd.split(':').map(Number);
  return `${String(Math.min(u + 1, 23)).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------- Kleine hulpjes ----------
const tekst = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000B-\u001F]/g, '').trim().slice(0, max) : '');

/** Eenvoudige rem: hoogstens `max` pogingen per `venster` ms per sleutel. */
function rem(max, venster) {
  const teller = new Map();
  setInterval(() => {
    const t = Date.now();
    for (const [k, v] of teller) if (v.tot < t) teller.delete(k);
  }, 60_000).unref();
  return sleutel => {
    const t = Date.now();
    const v = teller.get(sleutel);
    if (!v || v.tot < t) { teller.set(sleutel, { n: 1, tot: t + venster }); return true; }
    return ++v.n <= max;
  };
}
const boekRem = rem(6, 60 * 60_000);    // 6 boekingen per uur per adres
const loginRem = rem(8, 15 * 60_000);   // 8 inlogpogingen per kwartier per adres

function gelijk(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

// ---------- Inloggen ----------
const SESSIE_DAGEN = 30;
const teken = waarde => crypto.createHmac('sha256', sessieSleutel).update(waarde).digest('hex');
function maakSessie() {
  const tot = String(Date.now() + SESSIE_DAGEN * 86_400_000);
  return `${tot}.${teken(tot)}`;
}
function sessieGeldig(req) {
  const koekje = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('weblity_sessie='));
  if (!koekje) return false;
  const [tot, handtekening] = koekje.slice('weblity_sessie='.length).split('.');
  if (!tot || !handtekening || !/^\d+$/.test(tot)) return false;
  return gelijk(handtekening, teken(tot)) && Number(tot) > Date.now();
}
const koekje = (waarde, maxAge) =>
  `weblity_sessie=${waarde}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${PRODUCTIE ? '; Secure' : ''}`;

function alleenBeheerder(req, res, next) {
  if (!sessieGeldig(req)) return res.status(401).json({ fout: 'Niet ingelogd.' });
  // Wijzigingen moeten van het beheerscherm zelf komen, niet van een andere site.
  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    if (origin && new URL(origin).host !== req.headers.host) return res.status(403).json({ fout: 'Niet toegestaan.' });
  }
  next();
}

// ---------- Melding naar je toestellen (web push) ----------
// De melding gaat rechtstreeks naar de pushdienst van Apple, Google of Mozilla,
// die ze op je toestel aflevert. Er zit geen andere dienst tussen.
const PUSH_AAN = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);
if (PUSH_AAN) webpush.setVapidDetails(PUBLIC_ORIGINS.split(',')[0].trim(), VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

// Alleen de echte pushdiensten zijn toegestaan als bestemming.
const PUSH_HOSTS = /(^|\.)(push\.apple\.com|googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)$/;
function geldigAbonnement(a) {
  try {
    const u = new URL(a?.endpoint);
    return u.protocol === 'https:' && PUSH_HOSTS.test(u.hostname)
      && typeof a.keys?.p256dh === 'string' && typeof a.keys?.auth === 'string'
      && a.endpoint.length < 1000 && a.keys.p256dh.length < 200 && a.keys.auth.length < 100;
  } catch { return false; }
}

/** Stuurt de melding naar elk aangemeld toestel. Geeft terug hoeveel er aankwamen. */
async function stuurMelding(titel, bericht) {
  if (!PUSH_AAN) return 0;
  const { rows } = await db.query('SELECT endpoint, sleutels FROM push_abonnementen');
  const inhoud = JSON.stringify({ titel, bericht });
  const uitslag = await Promise.all(rows.map(async r => {
    try {
      await webpush.sendNotification({ endpoint: r.endpoint, keys: r.sleutels }, inhoud, { TTL: 86_400, urgency: 'high', timeout: 10_000 });
      return true;
    } catch (err) {
      // 404 of 410: dit toestel heeft de meldingen uitgezet of de app verwijderd.
      if (err.statusCode === 404 || err.statusCode === 410) {
        await db.query('DELETE FROM push_abonnementen WHERE endpoint = $1', [r.endpoint]).catch(() => {});
      } else {
        console.error('Melding mislukt:', err.statusCode || err.code || '', err.body || err.message);
      }
      return false;
    }
  }));
  return uitslag.filter(Boolean).length;
}

const datumTekst = datum => new Intl.DateTimeFormat('nl-BE', {
  weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC',
}).format(new Date(datum + 'T12:00:00Z'));

// ---------- De server ----------
const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(express.json({ limit: '20kb' }));

app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'same-origin',
    'X-Robots-Tag': 'noindex, nofollow',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; worker-src 'self'; manifest-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
  });
  next();
});

// De website mag de openbare stukken aanroepen, andere sites niet.
const toegestaan = PUBLIC_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
function openbaar(req, res, next) {
  const origin = req.headers.origin;
  const lokaal = !PRODUCTIE && origin && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (origin && (toegestaan.includes(origin) || lokaal)) {
    res.set({ 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' });
  }
  if (req.method === 'OPTIONS') {
    res.set({ 'Access-Control-Allow-Methods': 'GET, POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' });
    return res.sendStatus(204);
  }
  next();
}

// ---------- Bezoekers tellen ----------
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime|curl|wget|python|axios|node-fetch/i;
const telRem = rem(300, 60 * 60_000);   // ruim genoeg voor een echte bezoeker, te weinig om de cijfers op te blazen

/** Een code die dezelfde bezoeker op dezelfde dag herkent, maar niet terug te rekenen is naar een IP-adres. */
function bezoekerCode(dag, ip, ua) {
  const dagSleutel = crypto.createHmac('sha256', sessieSleutel).update('bezoek:' + dag).digest();
  return crypto.createHmac('sha256', dagSleutel).update(ip + '|' + ua).digest('hex').slice(0, 16);
}

/** Maakt van een verwijzende pagina of ?ref= een leesbare bron. */
function bronVan(ref, verwijzer) {
  const r = tekst(ref, 40).toLowerCase().replace(/[^a-z0-9 _-]/g, '');
  const NAMEN = { instagram: 'Instagram', ig: 'Instagram', tiktok: 'TikTok', whatsapp: 'WhatsApp', wa: 'WhatsApp',
    facebook: 'Facebook', fb: 'Facebook', google: 'Google', linkedin: 'LinkedIn', youtube: 'YouTube', snapchat: 'Snapchat' };
  if (r) return NAMEN[r] || r.charAt(0).toUpperCase() + r.slice(1);
  let host = '';
  try { host = new URL(verwijzer).hostname.replace(/^www\./, ''); } catch { return ''; }
  if (toegestaan.some(o => { try { return new URL(o).hostname === host; } catch { return false; } })) return 'intern';
  const bekend = [
    [/(^|\.)google\./, 'Google'], [/(^|\.)bing\.com$/, 'Bing'], [/duckduckgo/, 'DuckDuckGo'],
    [/instagram\.com$/, 'Instagram'], [/(facebook\.com|fb\.com|fb\.me)$/, 'Facebook'],
    [/(tiktok\.com)$/, 'TikTok'], [/(whatsapp\.com|wa\.me)$/, 'WhatsApp'],
    [/(linkedin\.com|lnkd\.in)$/, 'LinkedIn'], [/(t\.co|x\.com|twitter\.com)$/, 'X'],
    [/snapchat\.com$/, 'Snapchat'], [/youtube\.com$/, 'YouTube'],
  ];
  for (const [re, naam] of bekend) if (re.test(host)) return naam;
  return host.slice(0, 60);
}

// De website stuurt dit als platte tekst (sendBeacon), zodat de browser geen extra controlevraag stuurt.
app.post('/api/bezoek', express.text({ type: '*/*', limit: '2kb' }), (req, res) => {
  res.status(204).end();
  const origin = req.headers.origin || '';
  const lokaal = !PRODUCTIE && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
  if (!toegestaan.includes(origin) && !lokaal) return;
  const ua = String(req.headers['user-agent'] || '');
  if (!ua || ROBOT.test(ua) || !telRem(req.ip)) return;
  let b = {};
  try { b = JSON.parse(typeof req.body === 'string' ? req.body : '{}'); } catch { return; }
  const pad = '/' + tekst(b.pad, 120).replace(/^\/+/, '').replace(/\.html$/, '').replace(/^index$/, '');
  if (!/^\/[a-z0-9/_-]*$/i.test(pad)) return;
  const bron = bronVan(b.ref, tekst(b.verwijzer, 300));
  const apparaat = /Mobi|Android|iPhone|iPod/i.test(ua) ? 'gsm' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'computer';
  const dag = nu().datum;
  db.query('INSERT INTO bezoeken (dag, pad, bron, apparaat, bezoeker) VALUES ($1, $2, $3, $4, $5)',
    [dag, pad, bron === 'intern' ? '' : bron, apparaat, bezoekerCode(dag, req.ip, ua)])
    .catch(err => console.error('Bezoek niet bewaard:', err.message));
});

// Wekt de server alvast als de bezoeker de boekpagina opent.
app.use('/api/ping', openbaar, (req, res) => res.json({ ok: true }));

// De eerstvolgende dagen met per uur of het nog vrij is.
app.use('/api/agenda', openbaar);
app.get('/api/agenda', async (req, res) => {
  const dagen = openDagen();
  if (!dagen.length) return res.json({ diensten: DIENSTEN, dagen: [] });
  const { rows } = await db.query(
    `SELECT datum, tijd FROM boekingen WHERE status <> 'geannuleerd' AND datum BETWEEN $1 AND $2`,
    [dagen[0].datum, dagen.at(-1).datum]);
  const bezet = new Set(rows.map(r => `${r.datum} ${r.tijd}`));
  res.set('Cache-Control', 'no-store').json({
    diensten: DIENSTEN,
    dagen: dagen.map(d => ({ datum: d.datum, uren: d.uren.map(tijd => ({ tijd, vrij: !bezet.has(`${d.datum} ${tijd}`) })) })),
  });
});

// Een nieuwe boeking vanaf de website.
app.use('/api/boekingen', openbaar);
app.post('/api/boekingen', async (req, res) => {
  const b = req.body || {};
  // Onzichtbaar veld: mensen laten het leeg, spamrobots vullen het in.
  if (tekst(b.website, 200)) return res.json({ ok: true });
  if (!boekRem(req.ip)) return res.status(429).json({ fout: 'Te veel aanvragen. Probeer het later opnieuw of boek via WhatsApp.' });

  const dienst = tekst(b.dienst, 40), datum = tekst(b.datum, 10), tijd = tekst(b.tijd, 5);
  const naam = tekst(b.naam, 80), telefoon = tekst(b.telefoon, 30), email = tekst(b.email, 120), bericht = tekst(b.bericht, 1500);

  if (!DIENSTEN.includes(dienst)) return res.status(400).json({ fout: 'Kies waarvoor je een gesprek wilt.' });
  const dag = openDagen().find(d => d.datum === datum);
  if (!dag || !dag.uren.includes(tijd)) return res.status(400).json({ fout: 'Dat moment kan niet meer geboekt worden. Kies een ander uur.' });
  if (naam.length < 2) return res.status(400).json({ fout: 'Vul je naam in.' });
  if ((telefoon.match(/\d/g) || []).length < 8 || !/^[+\d][\d\s./()-]+$/.test(telefoon)) return res.status(400).json({ fout: 'Vul een geldig telefoonnummer in.' });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ fout: 'Dat e-mailadres klopt niet.' });

  try {
    const { rows } = await db.query(
      `INSERT INTO boekingen (dienst, datum, tijd, naam, telefoon, email, bericht)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [dienst, datum, tijd, naam, telefoon, email, bericht]);
    // De melding bevat bewust geen telefoonnummer of e-mailadres.
    stuurMelding('Nieuwe boeking', `${naam} · ${dienst}\n${datumTekst(datum)} om ${tijd}`).catch(err => console.error('Melding mislukt:', err.message));
    res.status(201).json({ ok: true, id: rows[0].id, datum, tijd });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ fout: 'Dat uur is net door iemand anders geboekt. Kies een ander uur.' });
    throw err;
  }
});

// ---------- Beheer ----------
app.get('/api/sessie', (req, res) => res.json({ ingelogd: sessieGeldig(req) }));

app.post('/api/login', (req, res) => {
  if (!loginRem(req.ip)) return res.status(429).json({ fout: 'Te veel pogingen. Wacht een kwartier.' });
  if (!ADMIN_PASSWORD) return res.status(503).json({ fout: 'Er is nog geen wachtwoord ingesteld (ADMIN_PASSWORD).' });
  if (!gelijk(tekst(req.body?.wachtwoord, 200), ADMIN_PASSWORD)) return res.status(401).json({ fout: 'Verkeerd wachtwoord.' });
  res.set('Set-Cookie', koekje(maakSessie(), SESSIE_DAGEN * 86_400)).json({ ok: true });
});

app.post('/api/logout', (req, res) => res.set('Set-Cookie', koekje('', 0)).json({ ok: true }));

app.use('/api/beheer', alleenBeheerder);

app.get('/api/beheer/boekingen', async (req, res) => {
  const { rows } = await db.query(
    `SELECT b.id, b.aangemaakt, b.dienst, b.datum, b.tijd, b.naam, b.telefoon, b.email, b.bericht, b.status,
            COALESCE((SELECT sum(i.bedrag_cent) FROM inkomsten i WHERE i.boeking_id = b.id), 0)::int AS ontvangen_cent
       FROM boekingen b ORDER BY b.datum, b.tijd LIMIT 1000`);
  res.set('Cache-Control', 'no-store').json({ vandaag: nu().datum, boekingen: rows });
});

app.patch('/api/beheer/boekingen/:id', async (req, res) => {
  const status = tekst(req.body?.status, 20);
  if (!/^\d+$/.test(req.params.id) || !STATUSSEN.includes(status)) return res.status(400).json({ fout: 'Ongeldige wijziging.' });
  try {
    const { rowCount } = await db.query('UPDATE boekingen SET status = $1 WHERE id = $2', [status, req.params.id]);
    if (!rowCount) return res.status(404).json({ fout: 'Boeking niet gevonden.' });
    res.json({ ok: true });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ fout: 'Dat uur is intussen door iemand anders geboekt.' });
    throw err;
  }
});

app.delete('/api/beheer/boekingen/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ fout: 'Ongeldige boeking.' });
  await db.query('DELETE FROM boekingen WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// ---------- Bezoekers ----------
app.get('/api/beheer/bezoekers', async (req, res) => {
  const dagen = [7, 30, 90].includes(Number(req.query.dagen)) ? Number(req.query.dagen) : 30;
  const tot = nu().datum, van = plusDagen(tot, -(dagen - 1));
  const [perDag, paginas, bronnen, apparaten, boekingen, totaal] = await Promise.all([
    db.query(`SELECT dag, count(DISTINCT bezoeker)::int AS bezoekers, count(*)::int AS weergaven
                FROM bezoeken WHERE dag BETWEEN $1 AND $2 GROUP BY dag`, [van, tot]),
    db.query(`SELECT pad, count(DISTINCT dag || bezoeker)::int AS bezoekers FROM bezoeken
               WHERE dag BETWEEN $1 AND $2 GROUP BY pad ORDER BY 2 DESC LIMIT 8`, [van, tot]),
    db.query(`SELECT bron, count(DISTINCT dag || bezoeker)::int AS bezoekers FROM bezoeken
               WHERE dag BETWEEN $1 AND $2 AND bron <> '' GROUP BY bron ORDER BY 2 DESC LIMIT 8`, [van, tot]),
    db.query(`SELECT apparaat, count(DISTINCT dag || bezoeker)::int AS bezoekers FROM bezoeken
               WHERE dag BETWEEN $1 AND $2 GROUP BY apparaat ORDER BY 2 DESC`, [van, tot]),
    db.query(`SELECT count(*)::int AS n FROM boekingen WHERE aangemaakt >= ($1::date)::timestamp AT TIME ZONE 'Europe/Brussels'`, [van]),
    db.query(`SELECT count(DISTINCT dag || bezoeker)::int AS bezoekers FROM bezoeken`),
  ]);
  const map = new Map(perDag.rows.map(r => [r.dag, r]));
  const reeks = [];
  for (let i = 0; i < dagen; i++) {
    const dag = plusDagen(van, i), r = map.get(dag);
    reeks.push({ dag, bezoekers: r?.bezoekers || 0, weergaven: r?.weergaven || 0 });
  }
  res.set('Cache-Control', 'no-store').json({
    vandaag: tot, dagen: reeks, paginas: paginas.rows, bronnen: bronnen.rows,
    apparaten: apparaten.rows, boekingen: boekingen.rows[0].n, ooit: totaal.rows[0].bezoekers,
  });
});

// ---------- Inkomsten ----------
app.get('/api/beheer/inkomsten', async (req, res) => {
  const { rows } = await db.query(
    `SELECT i.id, i.datum, i.omschrijving, i.bedrag_cent, i.boeking_id, b.naam AS boeking_naam
       FROM inkomsten i LEFT JOIN boekingen b ON b.id = i.boeking_id
      ORDER BY i.datum DESC, i.id DESC LIMIT 2000`);
  res.set('Cache-Control', 'no-store').json({ vandaag: nu().datum, inkomsten: rows });
});

app.post('/api/beheer/inkomsten', async (req, res) => {
  const b = req.body || {};
  const omschrijving = tekst(b.omschrijving, 120), datum = tekst(b.datum, 10);
  const cent = Number(b.bedrag_cent);
  if (omschrijving.length < 2) return res.status(400).json({ fout: 'Vul een omschrijving in.' });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || datum > plusDagen(nu().datum, 1)) return res.status(400).json({ fout: 'Kies een geldige datum.' });
  if (!Number.isInteger(cent) || cent < 1 || cent > 100_000_000) return res.status(400).json({ fout: 'Vul een geldig bedrag in.' });
  const boekingId = /^\d+$/.test(String(b.boeking_id ?? '')) ? String(b.boeking_id) : null;
  try {
    const { rows } = await db.query(
      'INSERT INTO inkomsten (datum, omschrijving, bedrag_cent, boeking_id) VALUES ($1, $2, $3, $4) RETURNING id',
      [datum, omschrijving, cent, boekingId]);
    res.status(201).json({ ok: true, id: rows[0].id });
  } catch (err) {
    if (err.code === '23503') return res.status(400).json({ fout: 'Die boeking bestaat niet meer.' });
    throw err;
  }
});

app.delete('/api/beheer/inkomsten/:id', async (req, res) => {
  if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ fout: 'Ongeldige inkomst.' });
  await db.query('DELETE FROM inkomsten WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

// Meldingen: de sleutel waarmee een toestel zich aanmeldt, en hoeveel toestellen er aangemeld zijn.
app.get('/api/beheer/push', async (req, res) => {
  const { rows } = await db.query('SELECT count(*)::int AS n FROM push_abonnementen');
  res.set('Cache-Control', 'no-store').json({ sleutel: VAPID_PUBLIC_KEY, toestellen: rows[0].n });
});

app.post('/api/beheer/push', async (req, res) => {
  if (!PUSH_AAN) return res.status(503).json({ fout: 'Meldingen zijn op de server nog niet ingesteld.' });
  const a = req.body?.abonnement;
  if (!geldigAbonnement(a)) return res.status(400).json({ fout: 'Dit toestel kon niet aangemeld worden.' });
  await db.query(
    `INSERT INTO push_abonnementen (endpoint, sleutels) VALUES ($1, $2)
     ON CONFLICT (endpoint) DO UPDATE SET sleutels = EXCLUDED.sleutels`,
    [a.endpoint, { p256dh: a.keys.p256dh, auth: a.keys.auth }]);
  res.json({ ok: true });
});

app.delete('/api/beheer/push', async (req, res) => {
  await db.query('DELETE FROM push_abonnementen WHERE endpoint = $1', [tekst(req.body?.endpoint, 1000)]);
  res.json({ ok: true });
});

app.post('/api/beheer/testmelding', async (req, res) => {
  const n = await stuurMelding('Testmelding van Weblity', 'Als je dit ziet, werken de meldingen.');
  if (!n) return res.status(502).json({ fout: 'De testmelding kwam op geen enkel toestel aan. Zet de meldingen op dit toestel uit en weer aan.' });
  res.json({ ok: true, toestellen: n });
});

const hier = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(hier, 'public'), { extensions: ['html'] }));

app.use('/api', (req, res) => res.status(404).json({ fout: 'Niet gevonden.' }));

// Vangt alles op wat hierboven misgaat, zodat de bezoeker een nette melding krijgt.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') return res.status(400).json({ fout: 'Ongeldige aanvraag.' });
  console.error(err);
  res.status(500).json({ fout: 'Er ging iets mis. Probeer het opnieuw.' });
});

await maakTabellen();
app.listen(PORT, () => console.log(`Weblity-beheer draait op poort ${PORT}`));
