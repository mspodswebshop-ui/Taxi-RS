import { NextResponse, type NextRequest } from "next/server";

import { currentAdmin, revokeClientSessions } from "@/lib/auth";
import { generateCode } from "@/lib/codes";
import { db } from "@/lib/db";
import { jsonError, sameOrigin } from "@/lib/http";

/**
 * Nieuwe klantcode maken, bv. als de klant hem kwijt is of als een
 * ex-medewerker hem nog kent. De oude code werkt meteen niet meer, en wie
 * met de oude code ingelogd was, wordt uitgelogd.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  const admin = await currentAdmin();
  if (!admin) return jsonError(401, "Log opnieuw in.");
  const { id } = await params;

  const site = await db.site.findUnique({ where: { id } });
  if (!site) return jsonError(404, "Site niet gevonden.");

  const { code, hash, hint } = generateCode();
  await db.site.update({
    where: { id },
    data: { codeHash: hash, codeHint: hint, codeCreatedAt: new Date(), codeLastUsedAt: null },
  });
  await revokeClientSessions(id);
  await db.change.create({ data: { siteId: id, by: "admin", action: "Nieuwe klantcode gemaakt" } });

  return NextResponse.json({ code });
}
