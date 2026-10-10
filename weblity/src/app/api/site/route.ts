import { NextResponse, type NextRequest } from "next/server";

import { currentClientSite } from "@/lib/auth";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { clientIp, saveLimiter } from "@/lib/rate-limit";
import { ConflictError, ContentError, saveContent, siteContent } from "@/lib/sites";

/**
 * De inhoud van de site van de ingelogde klant.
 *
 * Er zit bewust geen site-id in het adres of de body: de site komt uit de
 * sessie. Een klant kan zo onmogelijk bij de site van een ander.
 */
export async function GET() {
  const site = await currentClientSite();
  if (!site) return jsonError(401, "Je bent niet (meer) ingelogd.");
  return NextResponse.json({ content: siteContent(site), version: site.contentVersion });
}

export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  const site = await currentClientSite();
  if (!site) return jsonError(401, "Je bent niet (meer) ingelogd. Log opnieuw in met je code.");

  if (!saveLimiter.check(`${site.id}:${clientIp(req.headers)}`).allowed) {
    return jsonError(429, "Even rustig aan: probeer het over een minuut opnieuw.");
  }

  let body: { content?: unknown; baseVersion?: unknown };
  try {
    body = (await readJson(req)) as { content?: unknown; baseVersion?: unknown };
  } catch (e) {
    return jsonError(400, (e as Error).message);
  }

  try {
    const saved = await saveContent(site.id, body?.content, "client", body?.baseVersion);
    return NextResponse.json({ ok: true, version: saved.contentVersion });
  } catch (e) {
    if (e instanceof ContentError) return jsonError(400, e.message);
    if (e instanceof ConflictError) return jsonError(409, e.message);
    throw e;
  }
}
