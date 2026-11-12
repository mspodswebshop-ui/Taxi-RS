/**
 * Kopie van alle gegevens in een Postgres-database (bijvoorbeeld Neon).
 *
 * Gratis hosting zoals Render gooit de schijf leeg bij elke herstart. Met
 * DATABASE_URL ingesteld bewaart Zetlive daarom alles ook in de database: de
 * accounts en sites als één JSON-document, en elk websitebestand als een rij.
 * De schijf is dan alleen nog een snelle tussenopslag die na een herstart
 * vanzelf weer gevuld wordt.
 *
 * Zonder DATABASE_URL doet dit bestand niets en staat alles gewoon op schijf.
 */

import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
export const enabled = Boolean(url);

const pool = enabled ? new pg.Pool({ connectionString: url, max: 4 }) : null;
// Een verbroken verbinding in rust mag de server niet laten crashen.
pool?.on("error", (err) => console.error("Database:", err.message));

export async function init() {
  await pool.query("create table if not exists zetlive_state (id int primary key, data jsonb not null)");
  await pool.query("create table if not exists zetlive_files (key text primary key, data bytea not null)");
}

export async function loadState() {
  const { rows } = await pool.query("select data from zetlive_state where id = 1");
  return rows[0]?.data || null;
}

export async function saveState(state) {
  await pool.query(
    "insert into zetlive_state (id, data) values (1, $1) on conflict (id) do update set data = excluded.data",
    [JSON.stringify(state)],
  );
}

/** Eén bestand bewaren. De sleutel is het pad binnen de sitesmap. */
export async function put(key, data) {
  await pool.query(
    "insert into zetlive_files (key, data) values ($1, $2) on conflict (key) do update set data = excluded.data",
    [key, data],
  );
}

export async function removePrefix(prefix) {
  await pool.query("delete from zetlive_files where starts_with(key, $1)", [prefix]);
}

function localFiles(dir, sub = "") {
  let entries = [];
  try {
    entries = fs.readdirSync(path.join(dir, sub), { withFileTypes: true });
  } catch {
    return []; // de map bestaat (nog) niet
  }
  return entries.flatMap((e) => {
    const rel = sub ? `${sub}/${e.name}` : e.name;
    return e.isDirectory() ? localFiles(dir, rel) : [rel];
  });
}

/**
 * Maakt de database gelijk aan een map op schijf: nieuwe bestanden erbij,
 * verdwenen bestanden eruit. Bestaande sleutels blijven ongemoeid; een
 * bestand dat van inhoud verandert gaat via put().
 */
export async function syncDir(root, prefix) {
  const local = new Set(localFiles(path.join(root, prefix)).map((rel) => `${prefix}/${rel}`));
  const { rows } = await pool.query("select key from zetlive_files where starts_with(key, $1)", [`${prefix}/`]);
  const stored = new Set(rows.map((r) => r.key));
  for (const key of local) {
    if (!stored.has(key)) await put(key, fs.readFileSync(path.join(root, key)));
  }
  const gone = [...stored].filter((key) => !local.has(key));
  if (gone.length) await pool.query("delete from zetlive_files where key = any($1)", [gone]);
}

/** Zet alle bestanden onder een voorvoegsel terug op schijf. */
export async function restore(root, prefix) {
  const { rows } = await pool.query("select key from zetlive_files where starts_with(key, $1)", [prefix]);
  for (const { key } of rows) {
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) continue;
    // Eén bestand per keer ophalen houdt het geheugengebruik laag.
    const file = await pool.query("select data from zetlive_files where key = $1", [key]);
    if (!file.rows[0]) continue;
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, file.rows[0].data);
  }
}
