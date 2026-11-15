// Weblity-boekingen: de API voor de website en het beheerscherm.
//
// Twee soorten bezoekers:
//   - de website (weblity.onrender.com) vraagt de vrije uren op en stuurt
//     boekingen in. Dat mag zonder inloggen, maar alleen vanaf dat adres.
//   - jij, in het beheerscherm op dit adres. Daarvoor moet je inloggen.
//
// Instellingen staan in omgevingsvariabelen, zie README.md.

import crypto from 'node:crypto';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import pg from 'pg';

const {
  DATABASE_URL,
  ADMIN_PASSWORD = '',
  SESSION_SECRET = '',
  NTFY_TOPIC = '',
  PUBLIC_ORIGINS = 'https://weblity.onrender.com',
  RENDER_EXTERNAL_URL = '',
  NODE_ENV = 'development',
  PORT = 4200,
} = process.env;

const PRODUCTIE = NODE_ENV === 'production';

// ---------- Wanneer kan er geboekt worden? ----------
// Pas deze drie regels aan als je andere uren wilt.
const OPEN_DAGEN = [1, 2, 3, 4, 5, 6];            // 0 = zondag, 1 = maandag ... 6 = zaterdag
const UREN = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'];
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
    if (!OPEN_DAGEN.includes(weekdag(datum))) continue;
    // Vandaag kan je alleen nog uren boeken die minstens een uur verder liggen.
    const uren = i === 0 ? UREN.filter(u => u > plusUur(tijd)) : UREN;
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

// ---------- Melding naar je gsm (ntfy) ----------
// Eén poging over IPv4 of IPv6. Geeft de statuscode terug, of gooit een fout.
function ntfyVerzoek(methode, pad, body, family) {
  return new Promise((klaar, mis) => {
    const req = https.request({
      host: 'ntfy.sh', path: pad, method: methode, family, timeout: 8000,
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {},
    }, res => { res.resume(); res.on('end', () => klaar(res.statusCode)); });
    req.on('timeout', () => req.destroy(new Error('geen antwoord binnen 8 seconden')));
    req.on('error', mis);
    req.end(body);
  });
}

// Sommige hosts kunnen ntfy maar langs één van beide netwerken bereiken;
// daarom proberen we eerst IPv4 en daarna IPv6.
async function ntfy(methode, pad, body) {
  let laatste;
  for (const family of [4, 6]) {
    try { return await ntfyVerzoek(methode, pad, body, family); }
    catch (err) { laatste = err; console.error(`ntfy via IPv${family} mislukt: ${err.code || ''} ${err.message}`); }
  }
  throw laatste;
}

async function stuurMelding(titel, bericht) {
  if (!NTFY_TOPIC) return false;
  try {
    const status = await ntfy('POST', '/', JSON.stringify({
      topic: NTFY_TOPIC, title: titel, message: bericht, priority: 4, tags: ['calendar'],
      ...(RENDER_EXTERNAL_URL ? { click: RENDER_EXTERNAL_URL } : {}),
    }));
    if (status >= 300) console.error('Melding geweigerd door ntfy, status', status);
    return status < 300;
  } catch {
    return false;
  }
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
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
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
    stuurMelding('Nieuwe boeking', `${naam} · ${dienst}\n${datumTekst(datum)} om ${tijd}`);
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
    `SELECT id, aangemaakt, dienst, datum, tijd, naam, telefoon, email, bericht, status
       FROM boekingen ORDER BY datum, tijd LIMIT 1000`);
  res.set('Cache-Control', 'no-store').json({ vandaag: nu().datum, meldingen: Boolean(NTFY_TOPIC), kanaal: NTFY_TOPIC, boekingen: rows });
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

app.post('/api/beheer/testmelding', async (req, res) => {
  if (!NTFY_TOPIC) return res.status(400).json({ fout: 'Er is geen meldingskanaal ingesteld (NTFY_TOPIC).' });
  const ok = await stuurMelding('Testmelding van Weblity', 'Als je dit ziet, werken de meldingen.');
  res.status(ok ? 200 : 502).json(ok ? { ok: true } : { fout: 'De melding kon niet verstuurd worden.' });
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

// Bij het opstarten even nagaan of ntfy bereikbaar is, zodat een probleem
// meteen in het logboek staat en niet pas bij de eerste boeking.
if (NTFY_TOPIC) {
  ntfy('GET', '/v1/health').then(
    status => console.log('ntfy bereikbaar, status', status),
    () => console.error('ntfy is niet bereikbaar vanaf deze server; meldingen zullen mislukken.'));
}
