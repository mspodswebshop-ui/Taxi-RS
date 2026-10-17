/**
 * Website met CMS voor Prestige Taxi Antwerpen, als gewone Node-server.
 *
 * Voor Render, een VPS of je eigen computer. Op Netlify draait dezelfde code
 * als Netlify Function (zie netlify/functions/site.mjs). Alle logica staat in
 * core.js.
 */

import "dotenv/config";
import http from "node:http";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { createApp } from "./core.js";
import { openStore } from "./store.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 5000);
// De website staat in de map site/ naast deze server, of (in de repo Taxi-RS) in ../prestige-taxi.
const SITE_DIR = process.env.SITE_DIR
  ? path.resolve(here, process.env.SITE_DIR)
  : [path.join(here, "site"), path.resolve(here, "../prestige-taxi")].find((d) => existsSync(path.join(d, "index.html"))) ||
    path.join(here, "site");
const MAX_BODY = 7 * 1024 * 1024;

const store = await openStore({
  databaseUrl: process.env.DATABASE_URL,
  dataDir: path.join(here, "data"),
});

const handle = createApp({
  store,
  // core.js vraagt alleen de vaste pagina's en assets/*.css|js op.
  readOriginal: (p) => fs.readFile(path.join(SITE_DIR, p)).catch(() => null),
  adminHtml: () => fs.readFile(path.join(here, "admin.html"), "utf8"),
  adminPassword: process.env.ADMIN_PASSWORD,
  sessionSecret: process.env.SESSION_SECRET,
});

/** Het IP-adres van de bezoeker, ook achter de proxy van Render en dergelijke. */
function clientIp(req) {
  // De proxy zet het echte adres achteraan; wat ervoor staat kan de bezoeker zelf verzinnen.
  const forwarded = String(req.headers["x-forwarded-for"] || "").split(",").map((s) => s.trim()).filter(Boolean);
  return forwarded.at(-1) || req.socket.remoteAddress || "onbekend";
}

const server = http.createServer(async (req, res) => {
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of req) {
      size += chunk.length;
      if (size > MAX_BODY) {
        res.writeHead(413, { "Content-Type": "text/plain; charset=utf-8" }).end("Te groot");
        req.destroy();
        return;
      }
      chunks.push(chunk);
    }

    const proto = String(req.headers["x-forwarded-proto"] || "http").split(",")[0];
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers)) {
      if (Array.isArray(v)) v.forEach((x) => headers.append(k, x));
      else if (v !== undefined) headers.set(k, v);
    }
    const hasBody = req.method !== "GET" && req.method !== "HEAD";
    const request = new Request(`${proto}://${req.headers.host || "localhost"}${req.url}`, {
      method: req.method,
      headers,
      body: hasBody ? Buffer.concat(chunks) : undefined,
    });

    const response = await handle(request, { ip: clientIp(req) });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (req.method === "HEAD") return res.end();
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (err) {
    console.error(err);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Er ging iets mis.");
  }
});

server.listen(PORT, () => {
  console.log(`Prestige Taxi draait op http://localhost:${PORT}`);
  console.log(`Beheer: http://localhost:${PORT}/admin`);
  console.log(`Opslag: ${store.kind === "postgres" ? "Postgres-database" : "map data/"}`);
  if (!process.env.ADMIN_PASSWORD) console.log("Wachtwoord: het ingebouwde wachtwoord (zet ADMIN_PASSWORD om een ander te gebruiken).");
});
