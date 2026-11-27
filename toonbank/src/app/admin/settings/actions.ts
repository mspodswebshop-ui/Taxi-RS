"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/components/forms";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { filesFrom, saveImage } from "@/lib/images";
import { parseMoney } from "@/lib/money";
import { RESERVED_SLUGS, slugify } from "@/lib/slug";

const schema = z.object({
  name: z.string().trim().min(2, "Je winkel heeft een naam nodig.").max(80),
  slug: z.string().trim().max(60),
  tagline: z.string().trim().max(120).default(""),
  description: z.string().max(5000).default(""),
  email: z.email("Vul een geldig contactadres in.").trim(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Kies een geldige kleur."),
  heroTitle: z.string().trim().max(120).default(""),
  heroText: z.string().trim().max(400).default(""),
  shipping: z.string().trim(),
  freeShipping: z.string().trim().default(""),
  taxPercent: z.coerce.number().int().min(0).max(30),
});

export async function saveSettings(_: FormState, form: FormData): Promise<FormState> {
  const { store } = await requireMerchant();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  const slug = slugify(d.slug) || store.slug;
  if (slug !== store.slug) {
    if (RESERVED_SLUGS.has(slug) || slug.length < 3) return { error: "Dat winkeladres is niet beschikbaar. Kies er een van minstens 3 tekens." };
    const taken = await db.store.findUnique({ where: { slug }, select: { id: true } });
    if (taken) return { error: `Het adres /s/${slug} is al in gebruik.` };
  }

  const shippingCents = parseMoney(d.shipping || "0");
  if (shippingCents == null) return { error: "De verzendkosten zijn geen geldig bedrag." };
  const freeShippingCents = d.freeShipping ? parseMoney(d.freeShipping) : null;
  if (d.freeShipping && freeShippingCents == null) return { error: "Het bedrag voor gratis verzending is niet geldig." };

  const images: { logoImageId?: string | null; heroImageId?: string | null } = {};
  for (const field of ["logo", "hero"] as const) {
    const key = field === "logo" ? "logoImageId" : "heroImageId";
    const [file] = filesFrom(form, field);
    if (file) {
      const res = await saveImage(store.id, file);
      if ("error" in res) return { error: res.error };
      images[key] = res.id;
    } else if (form.get(`remove_${field}`) === "on") {
      images[key] = null;
    }
  }
  const oldImages = [
    images.logoImageId !== undefined ? store.logoImageId : null,
    images.heroImageId !== undefined ? store.heroImageId : null,
  ].filter((x): x is string => !!x);

  await db.store.update({
    where: { id: store.id },
    data: {
      name: d.name,
      slug,
      tagline: d.tagline,
      description: d.description,
      email: d.email,
      accentColor: d.accentColor.toLowerCase(),
      heroTitle: d.heroTitle,
      heroText: d.heroText,
      shippingCents,
      freeShippingCents,
      taxPercent: d.taxPercent,
      published: form.get("published") === "on",
      ...images,
    },
  });
  if (oldImages.length) await db.image.deleteMany({ where: { storeId: store.id, id: { in: oldImages } } });

  revalidatePath("/admin", "layout");
  revalidatePath(`/s/${store.slug}`, "layout");
  revalidatePath(`/s/${slug}`, "layout");
  return { ok: slug !== store.slug ? `Opgeslagen. Je winkel staat nu op /s/${slug}.` : "Opgeslagen." };
}
