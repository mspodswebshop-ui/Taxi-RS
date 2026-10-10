import { NextResponse, type NextRequest } from "next/server";

import { createClientSession } from "@/lib/auth";
import { hashCode, normalizeCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { clientIp, loginLimiter } from "@/lib/rate-limit";

/** Klant logt in met zijn code. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");

  const limit = loginLimiter.check(`code:${clientIp(req.headers)}`);
  if (!limit.allowed) {
    return jsonError(429, `Te veel pogingen. Probeer het over ${Math.ceil(limit.retryAfterSeconds / 60)} minuten opnieuw.`);
  }

  const body = (await readJson(req, 2048).catch(() => null)) as { code?: unknown } | null;
  const code = typeof body?.code === "string" ? normalizeCode(body.code) : null;
  // Eén en dezelfde melding voor "verkeerde vorm" en "bestaat niet": zo
  // verklapt het antwoord niets over welke codes er zijn.
  const wrong = "Deze code klopt niet. Controleer hem en probeer opnieuw.";
  if (!code) return jsonError(401, wrong);

  const site = await db.site.findUnique({ where: { codeHash: hashCode(code) } });
  if (!site) return jsonError(401, wrong);
  if (site.status === "offline") return jsonError(403, "Deze website staat offline. Neem contact op met Weblity.");

  await createClientSession(site.id);
  await db.site.update({ where: { id: site.id }, data: { codeLastUsedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
