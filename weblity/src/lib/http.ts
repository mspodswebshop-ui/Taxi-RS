import "server-only";

import { NextResponse } from "next/server";

export function jsonError(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

/** Leest de body als JSON, met een bovengrens zodat niemand de server volstopt. */
export async function readJson(req: Request, maxBytes = 512 * 1024): Promise<unknown> {
  const text = await req.text();
  if (text.length > maxBytes) throw new Error("Te veel gegevens in één keer.");
  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Ongeldige gegevens.");
  }
}

/**
 * Weigert verzoeken die van een andere website komen.
 *
 * De cookies zijn al sameSite=lax, maar dit is een tweede slot op de deur
 * voor alles wat iets verandert.
 */
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // niet-browserverzoek of oude browser
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
