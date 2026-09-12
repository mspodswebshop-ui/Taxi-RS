/**
 * Beveiliging van de REST API.
 *
 * - Elke aanroep heeft een geheime sleutel nodig in de Authorization-kop:
 *   `Authorization: Bearer sk_test_...`
 * - Van die sleutel staat alleen de SHA-256 in de database. De sleutel is
 *   eenmalig zichtbaar bij het aanmaken en daarna nergens meer op te vragen.
 * - Elke sleutel hoort bij één bedrijf. Een aanroep kan daardoor nooit bij
 *   gegevens van een ander bedrijf komen: elke query wordt op businessId
 *   gefilterd.
 * - Geheime sleutels horen alleen op een server thuis, nooit in code die in
 *   de browser draait.
 */

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";

import { db } from "@/lib/db";

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

/** Maakt een nieuwe testsleutel. De volledige sleutel komt maar één keer terug. */
export function generateApiKey(): { key: string; hash: string; prefix: string } {
  const key = `sk_test_${randomBytes(24).toString("base64url")}`;
  return {
    key,
    hash: hashApiKey(key),
    prefix: key.slice(0, 16),
  };
}

export type ApiContext = {
  businessId: string;
  apiKeyId: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Controleert de sleutel uit de Authorization-kop.
 *
 * Gooit een ApiError bij een ontbrekende, onbekende of ingetrokken sleutel.
 */
export async function authenticateRequest(req: NextRequest): Promise<ApiContext> {
  const header = req.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    throw new ApiError(
      401,
      "missing_api_key",
      "Geef je API-sleutel mee als 'Authorization: Bearer sk_test_...'.",
    );
  }

  const apiKey = await db.apiKey.findUnique({
    where: { keyHash: hashApiKey(match[1].trim()) },
  });

  if (!apiKey || apiKey.revokedAt) {
    throw new ApiError(401, "invalid_api_key", "Deze API-sleutel is ongeldig of ingetrokken.");
  }

  // Bijhouden wanneer een sleutel voor het laatst gebruikt is, zodat een
  // vergeten sleutel opvalt. Mislukt dit, dan is dat geen reden om het
  // verzoek te weigeren.
  db.apiKey
    .update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })
    .catch(() => {
      /* niet kritisch */
    });

  return { businessId: apiKey.businessId, apiKeyId: apiKey.id };
}
