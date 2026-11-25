// Anonieme teller voor Examen studie 1Af.
// Bewaart per toestel alleen een willekeurige id (uuid) en de dag. Geen namen, geen IP-adressen.
const http = require("http");
const { Pool } = require("pg");

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false }, max: 3 });
const ORIGINS = (process.env.ALLOWED_ORIGINS || "https://examen-studie-1af.onrender.com").split(",").map(s => s.trim());
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DAG = "(now() AT TIME ZONE 'Europe/Brussels')::date";

// Klaslijst: alleen wie de klascode kent, kan meedoen en de lijst zien.
const KLASCODE = String(process.env.KLASCODE || "").trim().toLowerCase();
const BUDDY_IDS = ["kuiken", "vos", "panda", "kikker", "uil", "octopus", "tijger", "dino", "eenhoorn"];
const ACC_IDS = ["", "pet", "bril", "strik", "hoed", "afstudeer", "kerst", "kroon"];
const VERBODEN = ["hoer", "kanker", "tering", "tyfus", "neuk", "fuck", "shit", "bitch", "slet", "nazi", "hitler", "porno", "merde", "kkr"];
const clampInt = (v, a, b) => Math.max(a, Math.min(b, Math.round(Number(v) || 0)));
function schoneNaam(v) {
  const n = String(v || "").normalize("NFC").replace(/[^\p{L}\p{N} ._-]/gu, "").replace(/\s+/g, " ").trim();
  if (n.length < 2 || n.length > 20) return null;
  const plat = n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
  if (VERBODEN.some(w => plat.includes(w))) return null;
  return n;
}
async function klaslijst(id) {
  const q = await pool.query(`SELECT toestel, naam, buddy, acc, xp, streak, to_char(laatst,'YYYY-MM-DD') AS laatst,
      CASE WHEN quiz_dag = ${DAG} THEN quizzen_vandaag ELSE 0 END AS quizzen_vandaag,
      (laatst = ${DAG}) AS vandaag, ((laatst = ${DAG} - 1) OR (laatst = ${DAG})) AS reeks_loopt
    FROM spelers ORDER BY xp DESC, naam LIMIT 200`);
  return { spelers: q.rows.map(r => ({ naam: r.naam, buddy: r.buddy, acc: r.acc, xp: r.xp, streak: r.reeks_loopt ? r.streak : 0, vandaag: !!r.vandaag, quizzenVandaag: r.quizzen_vandaag, jij: !!id && r.toestel === id })) };
}

const hits = new Map(); // eenvoudige rem tegen spam: max 30 verzoeken per minuut per adres
function tooMany(ip) {
  const now = Date.now(), h = hits.get(ip) || { t: now, n: 0 };
  if (now - h.t > 60000) { h.t = now; h.n = 0; }
  h.n++; hits.set(ip, h);
  if (hits.size > 5000) hits.clear();
  return h.n > 30;
}

async function stats() {
  const q = await pool.query(`SELECT
      (SELECT count(DISTINCT toestel) FROM bezoeken) AS totaal,
      (SELECT count(*) FROM bezoeken WHERE dag = ${DAG}) AS vandaag,
      (SELECT coalesce(sum(opens),0) FROM bezoeken) AS keer`);
  const d = await pool.query(`SELECT to_char(dag,'YYYY-MM-DD') AS dag, count(*)::int AS toestellen, sum(opens)::int AS keer
      FROM bezoeken WHERE dag > ${DAG} - 14 GROUP BY dag ORDER BY dag`);
  const r = q.rows[0];
  return { totaal: Number(r.totaal), vandaag: Number(r.vandaag), keer: Number(r.keer), dagen: d.rows };
}

function send(res, code, body, origin, type) {
  const h = { "content-type": type || "application/json; charset=utf-8", "cache-control": "no-store" };
  if (origin && (ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))) { h["access-control-allow-origin"] = origin; h["vary"] = "origin"; }
  res.writeHead(code, h); res.end(typeof body === "string" ? body : JSON.stringify(body));
}

function pagina(s) {
  const rij = s.dagen.map(d => `<tr><td>${d.dag}</td><td>${d.toestellen}</td><td>${d.keer}</td></tr>`).join("");
  return `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Teller Examen studie 1Af</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px 16px;color:#1b2a4a;background:#f7f8fb}h1{margin:0 0 16px}.n{font-size:3rem;font-weight:800;color:#2348c8;line-height:1}.g{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:24px}.c{background:#fff;border:1px solid #d5dbe8;border-radius:12px;padding:14px}table{width:100%;border-collapse:collapse;background:#fff}td,th{padding:8px;border-bottom:1px solid #e3e8f2;text-align:left}</style></head>
<body><h1>Examen studie 1Af</h1><div class="g"><div class="c"><div class="n">${s.totaal}</div>toestellen in totaal</div><div class="c"><div class="n">${s.vandaag}</div>toestellen vandaag</div><div class="c"><div class="n">${s.keer}</div>keer geopend</div></div>
<table><thead><tr><th>Dag</th><th>Toestellen</th><th>Keer geopend</th></tr></thead><tbody>${rij}</tbody></table>
<p style="color:#5d6a85;font-size:.9rem">Anoniem: per toestel wordt alleen een willekeurige code en de dag bewaard.</p></body></html>`;
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;
  const ip = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "").split(",")[0].trim();
  try {
    if (req.method === "OPTIONS") {
      const h = { "access-control-allow-methods": "GET,POST", "access-control-allow-headers": "content-type", "access-control-max-age": "86400" };
      if (origin && (ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin))) h["access-control-allow-origin"] = origin;
      res.writeHead(204, h); return res.end();
    }
    if (req.method === "POST" && req.url === "/hit") {
      if (tooMany(ip)) return send(res, 429, { fout: "te veel verzoeken" }, origin);
      let body = ""; for await (const c of req) { body += c; if (body.length > 1000) break; }
      let id; try { id = JSON.parse(body).id; } catch (e) {}
      if (!UUID.test(String(id || ""))) return send(res, 400, { fout: "ongeldige id" }, origin);
      await pool.query(`INSERT INTO bezoeken (toestel, dag) VALUES ($1, ${DAG}) ON CONFLICT (toestel, dag) DO UPDATE SET opens = bezoeken.opens + 1`, [id]);
      return send(res, 200, await stats(), origin);
    }
    if (req.method === "POST" && (req.url === "/klas" || req.url === "/speler" || req.url === "/verlaat")) {
      if (tooMany(ip)) return send(res, 429, { fout: "Te veel verzoeken. Wacht even." }, origin);
      let body = ""; for await (const c of req) { body += c; if (body.length > 2000) break; }
      let b = {}; try { b = JSON.parse(body) || {}; } catch (e) {}
      if (!KLASCODE || String(b.code || "").trim().toLowerCase() !== KLASCODE) return send(res, 403, { fout: "Die klascode klopt niet." }, origin);
      const id = UUID.test(String(b.id || "")) ? b.id : null;
      if (req.url === "/speler") {
        if (!id) return send(res, 400, { fout: "ongeldige id" }, origin);
        const naam = schoneNaam(b.naam);
        if (!naam) return send(res, 400, { fout: "Kies een bijnaam van 2 tot 20 tekens, zonder rare tekens of scheldwoorden." }, origin);
        const buddy = BUDDY_IDS.includes(b.buddy) ? b.buddy : "kuiken", acc = ACC_IDS.includes(b.acc) ? b.acc : "";
        const xp = clampInt(b.xp, 0, 1e7), streak = clampInt(b.streak, 0, 1000), quiz = clampInt(b.quizzenVandaag, 0, 50);
        const laatst = /^\d{4}-\d{2}-\d{2}$/.test(String(b.laatst || "")) ? b.laatst : null;
        await pool.query(`INSERT INTO spelers (toestel, naam, buddy, acc, xp, streak, laatst, quizzen_vandaag, quiz_dag, bijgewerkt)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,${DAG},now())
            ON CONFLICT (toestel) DO UPDATE SET naam=$2, buddy=$3, acc=$4, xp=$5, streak=$6, laatst=$7, quizzen_vandaag=$8, quiz_dag=${DAG}, bijgewerkt=now()`,
          [id, naam, buddy, acc, xp, streak, laatst, quiz]);
      }
      if (req.url === "/verlaat") { if (id) await pool.query("DELETE FROM spelers WHERE toestel = $1", [id]); return send(res, 200, { ok: true }, origin); }
      return send(res, 200, await klaslijst(id), origin);
    }
    if (req.method === "GET" && req.url === "/stats") return send(res, 200, await stats(), origin);
    if (req.method === "GET" && req.url === "/healthz") return send(res, 200, { ok: true }, origin);
    if (req.method === "GET" && (req.url === "/" || req.url === "/index.html")) return send(res, 200, pagina(await stats()), origin, "text/html; charset=utf-8");
    send(res, 404, { fout: "niet gevonden" }, origin);
  } catch (e) {
    console.error(e); send(res, 500, { fout: "serverfout" }, origin);
  }
});
server.listen(process.env.PORT || 10000, () => console.log("Teller draait"));
