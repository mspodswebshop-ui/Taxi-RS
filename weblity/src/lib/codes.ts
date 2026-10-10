/**
 * Klantcodes.
 *
 * Een klantcode ziet eruit als WBL-7K3F-9QX2-M4TP: twaalf tekens uit een
 * alfabet zonder verwarrende tekens (geen 0/O, 1/I/L). Dat zijn 32^12, ruim
 * 10^18 mogelijkheden: raden is onbegonnen werk, zeker met de rate limit op
 * het inloggen erbij.
 *
 * In de database staat alleen de SHA-256 van de code. Omdat de code zelf al
 * willekeurig en lang is, is een trage hash (zoals bcrypt) niet nodig, en kan
 * de site rechtstreeks op de hash worden opgezocht.
 */

import "server-only";

import { createHash, randomInt } from "node:crypto";

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // zonder 0, 1, I, L, O
const GROUPS = 3;
const GROUP_SIZE = 4;
const PREFIX = "WBL";

export function generateCode(): { code: string; hash: string; hint: string } {
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g++) {
    let part = "";
    for (let i = 0; i < GROUP_SIZE; i++) part += ALPHABET[randomInt(ALPHABET.length)];
    groups.push(part);
  }
  const code = `${PREFIX}-${groups.join("-")}`;
  return { code, hash: hashCode(code), hint: groups[GROUPS - 1] };
}

/**
 * Maakt van wat de klant intypt een vaste vorm, zodat kleine letters,
 * spaties of ontbrekende streepjes niet uitmaken.
 */
export function normalizeCode(input: string): string | null {
  let raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (raw.startsWith(PREFIX)) raw = raw.slice(PREFIX.length);
  if (raw.length !== GROUPS * GROUP_SIZE) return null;
  if ([...raw].some(c => !ALPHABET.includes(c))) return null;
  const groups = raw.match(new RegExp(`.{${GROUP_SIZE}}`, "g"))!;
  return `${PREFIX}-${groups.join("-")}`;
}

export function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
