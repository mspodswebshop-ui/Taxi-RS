/**
 * Opslag voor het CMS.
 *
 * Alles wat je in het beheer wijzigt (de pagina's, het script met het
 * telefoonnummer en de geüploade foto's) wordt hier bewaard als "bestand":
 * een pad met inhoud en een type.
 *
 * Waar het bewaard wordt:
 * - met DATABASE_URL in Postgres (bv. Neon);
 * - anders op Netlify in Netlify Blobs (ingebouwd, niets in te stellen);
 * - anders in de map data/ naast de server.
 */

import fs from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export const typeFor = (p) => TYPES[path.extname(p).toLowerCase()] || "application/octet-stream";

/** Alleen eenvoudige paden zoals "index.html" of "media/abc.jpg". */
function checkPath(p) {
  if (typeof p !== "string" || !/^[a-z0-9_-]+(\/[a-z0-9_-]+)*\.[a-z0-9]+$/i.test(p)) {
    throw new Error(`Ongeldig pad: ${p}`);
  }
  return p;
}

export async function openStore({ databaseUrl, blobs, dataDir }) {
  if (databaseUrl) return openPostgres(databaseUrl);
  if (blobs) return openBlobs(blobs);
  return openFolder(dataDir);
}

/** Netlify Blobs: `blobs` is een store uit getStore() van @netlify/blobs. */
function openBlobs(blobs) {
  // "strong": na publiceren meteen de nieuwe versie lezen, niet een oude kopie.
  const strong = { consistency: "strong" };
  const store = {
    kind: "netlify-blobs",
    async get(p) {
      const r = await blobs.getWithMetadata(checkPath(p), { type: "arrayBuffer", ...strong });
      if (!r) return null;
      return { body: Buffer.from(r.data), type: r.metadata?.type || typeFor(p) };
    },
    async put(p, body, type = typeFor(p)) {
      await blobs.set(checkPath(p), body, { metadata: { type } });
    },
    async remove(p) {
      await blobs.delete(checkPath(p));
    },
    async list(prefix = "") {
      const { blobs: items } = await blobs.list({ prefix, ...strong });
      return items.map((b) => b.key).sort();
    },
    async putMany(files) {
      // Het versiebestand komt als laatste: pas dan "bestaat" de nieuwe publicatie.
      for (const f of files) await store.put(f.path, f.body, f.type || typeFor(f.path));
    },
  };
  return store;
}

async function openPostgres(url) {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
  // sslmode en channel_binding uit het adres halen (zoals Neon ze meegeeft):
  // de versleuteling stellen we hieronder zelf in.
  const clean = new URL(url);
  clean.searchParams.delete("sslmode");
  clean.searchParams.delete("channel_binding");
  const pool = new pg.Pool({
    connectionString: clean.toString(),
    // Neon en de meeste gehoste databases eisen een versleutelde verbinding,
    // met een geldig certificaat.
    ssl: local ? false : true,
    max: 5,
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS cms_files (
      path       text PRIMARY KEY,
      body       bytea NOT NULL,
      type       text NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )`);

  return {
    kind: "postgres",
    async get(p) {
      const { rows } = await pool.query("SELECT body, type FROM cms_files WHERE path = $1", [checkPath(p)]);
      return rows[0] ? { body: rows[0].body, type: rows[0].type } : null;
    },
    async put(p, body, type = typeFor(p)) {
      await pool.query(
        `INSERT INTO cms_files (path, body, type, updated_at) VALUES ($1, $2, $3, now())
         ON CONFLICT (path) DO UPDATE SET body = EXCLUDED.body, type = EXCLUDED.type, updated_at = now()`,
        [checkPath(p), body, type],
      );
    },
    async remove(p) {
      await pool.query("DELETE FROM cms_files WHERE path = $1", [checkPath(p)]);
    },
    async list(prefix = "") {
      const { rows } = await pool.query("SELECT path FROM cms_files WHERE path LIKE $1 ORDER BY path", [
        prefix.replace(/[%_]/g, "\\$&") + "%",
      ]);
      return rows.map((r) => r.path);
    },
    /** Meerdere bestanden in één keer, zodat een publicatie nooit half gebeurt. */
    async putMany(files) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const f of files) {
          await client.query(
            `INSERT INTO cms_files (path, body, type, updated_at) VALUES ($1, $2, $3, now())
             ON CONFLICT (path) DO UPDATE SET body = EXCLUDED.body, type = EXCLUDED.type, updated_at = now()`,
            [checkPath(f.path), f.body, f.type || typeFor(f.path)],
          );
        }
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        throw err;
      } finally {
        client.release();
      }
    },
  };
}

async function openFolder(dir) {
  await fs.mkdir(dir, { recursive: true });
  const full = (p) => path.join(dir, checkPath(p));

  const store = {
    kind: "map",
    async get(p) {
      try {
        return { body: await fs.readFile(full(p)), type: typeFor(p) };
      } catch {
        return null;
      }
    },
    async put(p, body) {
      const f = full(p);
      await fs.mkdir(path.dirname(f), { recursive: true });
      // Eerst naar een tijdelijk bestand, dan hernoemen: nooit een half bestand.
      await fs.writeFile(f + ".tmp", body);
      await fs.rename(f + ".tmp", f);
    },
    async remove(p) {
      await fs.rm(full(p), { force: true });
    },
    async list(prefix = "") {
      const out = [];
      async function walk(sub) {
        let entries = [];
        try {
          entries = await fs.readdir(path.join(dir, sub), { withFileTypes: true });
        } catch {
          return;
        }
        for (const e of entries) {
          const rel = sub ? `${sub}/${e.name}` : e.name;
          if (e.isDirectory()) await walk(rel);
          else if (!rel.endsWith(".tmp") && rel.startsWith(prefix)) out.push(rel);
        }
      }
      await walk("");
      return out.sort();
    },
    async putMany(files) {
      for (const f of files) await store.put(f.path, f.body);
    },
  };
  return store;
}
