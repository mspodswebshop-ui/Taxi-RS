import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { currentAdmin, revokeClientSessions } from "@/lib/auth";
import { firstIssue } from "@/lib/content";
import { db } from "@/lib/db";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { domainSchema, SITE_STATUSES, slugSchema } from "@/lib/sites";

type Ctx = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  status: z.enum(SITE_STATUSES).optional(),
  slug: slugSchema.optional(),
  domain: domainSchema.optional(),
  ownerName: z.string().trim().max(80).optional(),
  ownerEmail: z.string().trim().max(120).optional(),
  ownerPhone: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(2000).optional(),
});

const STATUS_LABEL = { concept: "concept", live: "live", offline: "offline" } as const;

/** Instellingen van een site wijzigen (status, adres, domein, klantgegevens). */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  const admin = await currentAdmin();
  if (!admin) return jsonError(401, "Log opnieuw in.");
  const { id } = await params;

  const parsed = patchSchema.safeParse(await readJson(req, 8192).catch(() => null));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));
  const input = parsed.data;

  const site = await db.site.findUnique({ where: { id } });
  if (!site) return jsonError(404, "Site niet gevonden.");

  if (input.slug && input.slug !== site.slug && (await db.site.findUnique({ where: { slug: input.slug } }))) {
    return jsonError(409, `Het adres "${input.slug}" is al in gebruik.`);
  }
  const domain = input.domain === undefined ? undefined : input.domain || null;
  if (domain && domain !== site.domain && (await db.site.findUnique({ where: { domain } }))) {
    return jsonError(409, `Het domein "${domain}" hoort al bij een andere site.`);
  }

  const updated = await db.site.update({
    where: { id },
    data: {
      status: input.status,
      slug: input.slug,
      domain,
      ownerName: input.ownerName,
      ownerEmail: input.ownerEmail,
      ownerPhone: input.ownerPhone,
      notes: input.notes,
    },
  });

  if (input.status && input.status !== site.status) {
    await db.change.create({ data: { siteId: id, by: "admin", action: `Status gewijzigd naar ${STATUS_LABEL[input.status]}` } });
    // Een offline site kan niet meer beheerd worden: ingelogde klanten eruit.
    if (input.status === "offline") await revokeClientSessions(id);
  }

  return NextResponse.json({ ok: true, site: { id: updated.id, slug: updated.slug, status: updated.status, domain: updated.domain } });
}

/** Site definitief verwijderen. */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  const admin = await currentAdmin();
  if (!admin) return jsonError(401, "Log opnieuw in.");
  const { id } = await params;

  await db.site.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
