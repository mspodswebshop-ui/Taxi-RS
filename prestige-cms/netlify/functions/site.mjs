/**
 * Website met CMS voor Prestige Taxi Antwerpen, als Netlify Function.
 *
 * Deze ene functie beantwoordt alle adressen van de site: de pagina's, het
 * beheer op /admin, de foto's en de API. Alle logica staat in core.js.
 *
 * Opslag: Netlify Blobs (ingebouwd, niets in te stellen), of Postgres als
 * DATABASE_URL ingesteld is.
 */

import { getStore } from "@netlify/blobs";
import { createApp } from "../../core.js";
import { openStore } from "../../store.js";
// Gemaakt door scripts/bundel-site.mjs tijdens de build op Netlify.
import { files, adminHtml } from "../../generated/site-bundel.mjs";

let appPromise = null;

function app() {
  if (!appPromise) {
    appPromise = openStore({
      databaseUrl: process.env.DATABASE_URL,
      blobs: process.env.DATABASE_URL ? null : getStore({ name: "prestige-cms", consistency: "strong" }),
    })
      .then((store) =>
        createApp({
          store,
          readOriginal: async (p) => (files[p] ? Buffer.from(files[p], "base64") : null),
          adminHtml: async () => adminHtml,
          adminPassword: process.env.ADMIN_PASSWORD,
          sessionSecret: process.env.SESSION_SECRET,
        }),
      )
      .catch((err) => {
        appPromise = null;
        throw err;
      });
  }
  return appPromise;
}

export default async (req, context) => {
  const handle = await app();
  return handle(req, { ip: context?.ip || "onbekend" });
};

export const config = {
  path: ["/", "/*"],
};
