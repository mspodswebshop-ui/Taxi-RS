/**
 * Sites opzoeken en inhoud opslaan.
 *
 * Opslaan gaat altijd langs `saveContent`, zodat de controle op de inhoud
 * en het logboek nooit vergeten kunnen worden.
 */

import "server-only";

import type { Site } from "@prisma/client";
import { z } from "zod";

import { contentSchema, firstIssue, parseContent, type SiteContent } from "@/lib/content";
import { db } from "@/lib/db";
import { getTemplate } from "@/templates";

export const SITE_STATUSES = ["concept", "live", "offline"] as const;
export type SiteStatus = (typeof SITE_STATUSES)[number];

export function siteContent(site: Site): SiteContent {
  return parseContent(site.content, getTemplate(site.template).defaults(site.name));
}

export async function findSiteBySlug(slug: string) {
  return db.site.findUnique({ where: { slug } });
}

export async function findSiteByDomain(host: string) {
  const domain = host.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  return db.site.findUnique({ where: { domain } });
}

export class ContentError extends Error {}
export class ConflictError extends Error {}

/**
 * Controleert en bewaart nieuwe inhoud. Gooit een ContentError bij onzin.
 *
 * `base` is het versienummer waarop de editor verder bouwde. Heeft
 * iemand anders (bv. de klant terwijl jij ook bezig was) intussen opgeslagen,
 * dan weigeren we, in plaats van diens werk ongemerkt te overschrijven.
 */
export async function saveContent(siteId: string, raw: unknown, by: "client" | "admin", base?: unknown) {
  const parsed = contentSchema.safeParse(raw);
  if (!parsed.success) throw new ContentError(firstIssue(parsed.error));
  if (typeof base !== "number" || !Number.isInteger(base)) throw new ContentError("Herlaad de pagina en probeer opnieuw.");

  const content = normalize(parsed.data);
  // In één stap: alleen bijwerken als de versie nog dezelfde is.
  const { count } = await db.site.updateMany({
    where: { id: siteId, contentVersion: base },
    data: {
      content,
      contentVersion: { increment: 1 },
      // De naam in het overzicht volgt de naam die de klant op zijn site zet.
      name: content.business.name,
    },
  });
  if (count === 0) {
    throw new ConflictError("Iemand anders heeft deze website intussen aangepast. Herlaad de pagina (je wijzigingen gaan dan verloren) of kopieer ze eerst.");
  }
  await db.change.create({ data: { siteId, by, action: "Inhoud opgeslagen" } });
  return db.site.findUniqueOrThrow({ where: { id: siteId } });
}

/** Kleine opruimacties, zodat de site er altijd netjes uitziet. */
function normalize(c: SiteContent): SiteContent {
  const categories = [...new Set(c.categories.map(x => x.trim()).filter(Boolean))];
  // Producten in een verwijderde categorie verdwijnen niet stilletjes: hun
  // categorie wordt weer toegevoegd.
  for (const p of c.products) {
    if (p.category && !categories.includes(p.category)) categories.push(p.category);
  }
  return { ...c, categories };
}

/** Een slug: kleine letters, cijfers en streepjes. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Alleen kleine letters, cijfers en streepjes, bv. bakkerij-idriss")
  .min(3, "Minstens 3 tekens")
  .max(60);

export const domainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .transform(v => v.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, ""))
  .refine(v => v === "" || /^([a-z0-9-]+\.)+[a-z]{2,}$/.test(v), "Ongeldige domeinnaam, bv. bakkerij.be");

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
