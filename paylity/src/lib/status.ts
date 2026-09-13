/**
 * Controle of de app werkelijk kan doen wat hij belooft.
 *
 * Bijna alles wat misgaat bij een verse installatie zit in dezelfde drie
 * dingen: .env niet ingevuld, database niet bereikbaar, migratie niet
 * gedraaid. De app wist dat wel, maar zei het pas op het moment dat je op
 * "Account aanmaken" drukte — en dan nog in de vorm van een lege 500.
 *
 * Hiermee kan de app het zeggen vóórdat je iets invult.
 */

import "server-only";

import { databaseUrl, db } from "@/lib/db";

export type Status = {
  ok: boolean;
  /** Wat er aan de hand is, in gewone taal. */
  melding: string;
  /** Wat je eraan doet. */
  oplossing?: string;
  /** Technische details, voor in het logboek of op /api/health. */
  detail?: string;
};

export async function databaseStatus(): Promise<Status> {
  if (!databaseUrl) {
    return {
      ok: false,
      melding: "De app weet niet waar de database staat.",
      oplossing:
        "Lokaal: kopieer .env.example naar .env en vul DATABASE_URL in. Online: zet DATABASE_URL bij je host, of laat Netlify een database leveren (zie README).",
      detail: "geen DATABASE_URL, NETLIFY_DB_URL of NETLIFY_DATABASE_URL gevonden",
    };
  }

  try {
    // Eén echte query op een echte tabel: dit controleert in één keer of de
    // verbinding werkt én of de migratie gedraaid heeft.
    await db.user.count();
    return { ok: true, melding: "De database werkt." };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    const naam = err && typeof err === "object" && "name" in err ? String(err.name) : "";
    const tekst = err instanceof Error ? err.message : String(err);

    if (["P2021", "P2022"].includes(code) || tekst.includes("does not exist in the current database")) {
      return {
        ok: false,
        melding: "De database is bereikbaar, maar de tabellen bestaan nog niet.",
        oplossing: "Voer `npm run db:deploy` uit en laad deze pagina opnieuw.",
        detail: `${naam} ${code}`.trim(),
      };
    }

    return {
      ok: false,
      melding: "De database is niet bereikbaar.",
      oplossing:
        "Controleer of de database draait en of DATABASE_URL in .env klopt. Bij een gehoste app: staat DATABASE_URL daar ook ingesteld?",
      detail: `${naam} ${code}`.trim() || tekst.split("\n")[0],
    };
  }
}
