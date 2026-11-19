/**
 * Leest een certificaat of sleutel uit een omgevingsvariabele.
 *
 * Drie vormen zijn toegestaan, zodat het zowel lokaal als bij een hoster
 * handig is:
 *   - de inhoud zelf (begint met "-----BEGIN" of "{")
 *   - een pad naar een bestand
 *   - de inhoud in base64 (handig bij hosters die geen meerdere regels
 *     in een variabele toelaten)
 */

import fs from "node:fs";

export function leesGeheim(naam) {
  const waarde = (process.env[naam] || "").trim();
  if (!waarde) return null;
  if (waarde.startsWith("-----BEGIN")) {
    // Sommige hosters bewaren regeleinden als letterlijke \n.
    return waarde.replace(/\\n/g, "\n");
  }
  if (waarde.startsWith("{")) return waarde;
  if (fs.existsSync(waarde)) return fs.readFileSync(waarde, "utf8");
  const gedecodeerd = Buffer.from(waarde, "base64").toString("utf8");
  if (gedecodeerd.startsWith("-----BEGIN") || gedecodeerd.trim().startsWith("{")) {
    return gedecodeerd;
  }
  throw new Error(
    `${naam} is geen certificaat, geen bestaand bestand en geen geldige base64.`,
  );
}
