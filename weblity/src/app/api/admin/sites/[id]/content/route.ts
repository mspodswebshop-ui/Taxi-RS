import { NextResponse, type NextRequest } from "next/server";

import { currentAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { ConflictError, ContentError, saveContent, siteContent } from "@/lib/sites";

type Ctx = { params: Promise<{ id: string }> };

/** Dezelfde inhoud als de klant ziet, maar dan voor de beheerder. */
export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!(await currentAdmin())) return jsonError(401, "Log opnieuw in.");
  const site = await db.site.findUnique({ where: { id: (await params).id } });
  if (!site) return jsonError(404, "Site niet gevonden.");
  return NextResponse.json({ content: siteContent(site), version: site.contentVersion });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  if (!(await currentAdmin())) return jsonError(401, "Log opnieuw in.");
  const { id } = await params;
  if (!(await db.site.findUnique({ where: { id }, select: { id: true } }))) return jsonError(404, "Site niet gevonden.");

  let body: { content?: unknown; baseVersion?: unknown };
  try {
    body = (await readJson(req)) as { content?: unknown; baseVersion?: unknown };
  } catch (e) {
    return jsonError(400, (e as Error).message);
  }

  try {
    const saved = await saveContent(id, body?.content, "admin", body?.baseVersion);
    return NextResponse.json({ ok: true, version: saved.contentVersion });
  } catch (e) {
    if (e instanceof ContentError) return jsonError(400, e.message);
    if (e instanceof ConflictError) return jsonError(409, e.message);
    throw e;
  }
}
