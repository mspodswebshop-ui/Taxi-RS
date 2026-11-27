"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/components/forms";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { uniqueSlug } from "@/lib/slug";

const schema = z.object({
  title: z.string().trim().min(1, "Geef de collectie een naam.").max(100),
  description: z.string().max(5000).default(""),
});

export async function saveCollection(collectionId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const { store } = await requireMerchant();
  const parsed = schema.safeParse({ title: form.get("title"), description: form.get("description") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const featured = form.get("featured") === "on";

  if (collectionId) {
    const existing = await db.collection.findFirst({ where: { id: collectionId, storeId: store.id } });
    if (!existing) return { error: "Deze collectie bestaat niet meer." };
    await db.collection.update({ where: { id: existing.id }, data: { ...parsed.data, featured } });
    revalidatePath(`/s/${store.slug}`, "layout");
    return { ok: "Opgeslagen." };
  }

  const handle = await uniqueSlug(parsed.data.title, async (h) =>
    Boolean(await db.collection.findFirst({ where: { storeId: store.id, handle: h }, select: { id: true } })),
  );
  await db.collection.create({ data: { ...parsed.data, featured, handle, storeId: store.id } });
  revalidatePath("/admin/collections");
  revalidatePath(`/s/${store.slug}`, "layout");
  return { ok: `Collectie "${parsed.data.title}" aangemaakt.` };
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const { store } = await requireMerchant();
  await db.collection.deleteMany({ where: { id: collectionId, storeId: store.id } });
  revalidatePath(`/s/${store.slug}`, "layout");
  redirect("/admin/collections");
}
