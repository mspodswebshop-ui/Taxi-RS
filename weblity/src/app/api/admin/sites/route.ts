import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { currentAdmin } from "@/lib/auth";
import { generateCode } from "@/lib/codes";
import { firstIssue } from "@/lib/content";
import { db } from "@/lib/db";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { slugify, slugSchema } from "@/lib/sites";
import { getTemplate, TEMPLATES } from "@/templates";

const createSchema = z.object({
  name: z.string().trim().min(2, "Geef de zaak een naam").max(80),
  slug: z.string().trim().max(60).optional(),
  template: z.enum(TEMPLATES.map(t => t.id) as [string, ...string[]]),
  ownerName: z.string().trim().max(80).optional(),
  ownerEmail: z.string().trim().max(120).optional(),
  ownerPhone: z.string().trim().max(40).optional(),
});

/** Nieuwe klantsite aanmaken. De klantcode komt één keer terug. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  const admin = await currentAdmin();
  if (!admin) return jsonError(401, "Log opnieuw in.");

  const parsed = createSchema.safeParse(await readJson(req, 8192).catch(() => null));
  if (!parsed.success) return jsonError(400, firstIssue(parsed.error));
  const input = parsed.data;

  const slug = slugSchema.safeParse(input.slug || slugify(input.name));
  if (!slug.success) return jsonError(400, `Adres: ${firstIssue(slug.error)}`);
  if (await db.site.findUnique({ where: { slug: slug.data } })) {
    return jsonError(409, `Het adres "${slug.data}" is al in gebruik. Kies een ander.`);
  }

  const { code, hash, hint } = generateCode();
  const site = await db.site.create({
    data: {
      slug: slug.data,
      name: input.name,
      template: input.template,
      ownerName: input.ownerName || null,
      ownerEmail: input.ownerEmail || null,
      ownerPhone: input.ownerPhone || null,
      codeHash: hash,
      codeHint: hint,
      content: getTemplate(input.template).defaults(input.name),
    },
  });
  await db.change.create({ data: { siteId: site.id, by: "admin", action: `Site aangemaakt door ${admin.name}` } });

  return NextResponse.json({ site: { id: site.id, slug: site.slug }, code });
}
