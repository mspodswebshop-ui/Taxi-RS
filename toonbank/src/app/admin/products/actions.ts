"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/components/forms";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { filesFrom, saveImage } from "@/lib/images";
import { parseMoney } from "@/lib/money";
import { slugify, uniqueSlug } from "@/lib/slug";

const productSchema = z.object({
  title: z.string().trim().min(1, "Geef het product een naam.").max(200),
  description: z.string().max(20_000).default(""),
  status: z.enum(["active", "draft"]),
  vendor: z.string().trim().max(100).default(""),
  optionName: z.string().trim().max(50).default(""),
  handle: z.string().trim().max(80).default(""),
});

type VariantInput = {
  id: string | null;
  title: string;
  priceCents: number;
  compareAtCents: number | null;
  sku: string;
  inventory: number | null;
};

function readVariants(form: FormData, hasOptions: boolean): VariantInput[] | string {
  const ids = form.getAll("variant_id").map(String);
  const titles = form.getAll("variant_title").map(String);
  const prices = form.getAll("variant_price").map(String);
  const compares = form.getAll("variant_compare").map(String);
  const skus = form.getAll("variant_sku").map(String);
  const stocks = form.getAll("variant_inventory").map(String);

  const rows: VariantInput[] = [];
  const count = hasOptions ? prices.length : Math.min(1, prices.length);
  for (let i = 0; i < count; i++) {
    const title = hasOptions ? (titles[i] ?? "").trim() : "Standaard";
    const priceRaw = (prices[i] ?? "").trim();
    // Een helemaal lege extra rij negeren.
    if (hasOptions && !title && !priceRaw) continue;
    if (!title) return `Variant ${i + 1} heeft geen naam.`;
    const price = parseMoney(priceRaw);
    if (price == null) return `Vul een geldige prijs in${hasOptions ? ` voor "${title}"` : ""}, bijvoorbeeld 24,95.`;
    const compareRaw = (compares[i] ?? "").trim();
    const compare = compareRaw ? parseMoney(compareRaw) : null;
    if (compareRaw && compare == null) return `De "van"-prijs${hasOptions ? ` van "${title}"` : ""} is geen geldig bedrag.`;
    const stockRaw = (stocks[i] ?? "").trim();
    const inventory = stockRaw === "" ? null : Number(stockRaw);
    if (inventory != null && (!Number.isInteger(inventory) || inventory < 0 || inventory > 1_000_000))
      return `De voorraad${hasOptions ? ` van "${title}"` : ""} moet een heel getal van 0 of meer zijn, of leeg voor onbeperkt.`;
    rows.push({
      id: ids[i] || null,
      title: title.slice(0, 100),
      priceCents: price,
      compareAtCents: compare && compare > price ? compare : null,
      sku: (skus[i] ?? "").trim().slice(0, 64),
      inventory,
    });
  }
  if (rows.length === 0) return "Een product heeft minstens één prijs nodig.";
  if (rows.length > 100) return "Maximaal 100 varianten per product.";
  return rows;
}

export async function saveProduct(
  productId: string | null,
  _: FormState,
  form: FormData,
): Promise<FormState> {
  const { store } = await requireMerchant();

  const parsed = productSchema.safeParse({
    title: form.get("title"),
    description: form.get("description") ?? "",
    status: form.get("status"),
    vendor: form.get("vendor") ?? "",
    optionName: form.get("optionName") ?? "",
    handle: form.get("handle") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const data = parsed.data;

  const variants = readVariants(form, data.optionName !== "");
  if (typeof variants === "string") return { error: variants };

  // Bestaat het product en is het van deze winkel?
  const existing = productId
    ? await db.product.findFirst({
        where: { id: productId, storeId: store.id },
        include: { variants: { select: { id: true } }, images: true },
      })
    : null;
  if (productId && !existing) return { error: "Dit product bestaat niet meer." };

  const handle = await uniqueSlug(slugify(data.handle) || data.title, async (h) =>
    Boolean(
      await db.product.findFirst({
        where: { storeId: store.id, handle: h, NOT: existing ? { id: existing.id } : undefined },
        select: { id: true },
      }),
    ),
  );

  // Foto's: eerst uploaden, zodat een fout bestand niets half laat staan.
  const uploads = filesFrom(form, "images");
  if (uploads.length > 10) return { error: "Maximaal 10 foto's tegelijk uploaden." };
  const newImageIds: string[] = [];
  for (const file of uploads) {
    const res = await saveImage(store.id, file);
    if ("error" in res) {
      if (newImageIds.length) await db.image.deleteMany({ where: { id: { in: newImageIds } } });
      return { error: res.error };
    }
    newImageIds.push(res.id);
  }

  const removeImages = new Set(form.getAll("remove_image").map(String));
  const collectionIds = form.getAll("collection").map(String);
  const validCollections = await db.collection.findMany({
    where: { storeId: store.id, id: { in: collectionIds } },
    select: { id: true },
  });

  const ownVariantIds = new Set(existing?.variants.map((v) => v.id) ?? []);
  const keptVariantIds = variants.map((v) => v.id).filter((id): id is string => !!id && ownVariantIds.has(id));

  const id = await db.$transaction(async (tx) => {
    const product = existing
      ? await tx.product.update({
          where: { id: existing.id },
          data: {
            title: data.title,
            description: data.description,
            status: data.status,
            vendor: data.vendor,
            optionName: data.optionName,
            handle,
            collections: { set: validCollections },
          },
        })
      : await tx.product.create({
          data: {
            storeId: store.id,
            title: data.title,
            description: data.description,
            status: data.status,
            vendor: data.vendor,
            optionName: data.optionName,
            handle,
            collections: { connect: validCollections },
          },
        });

    // Varianten: weggehaalde verwijderen, bestaande bijwerken, nieuwe toevoegen.
    await tx.variant.deleteMany({ where: { productId: product.id, id: { notIn: keptVariantIds } } });
    for (const [position, v] of variants.entries()) {
      const values = {
        title: v.title,
        priceCents: v.priceCents,
        compareAtCents: v.compareAtCents,
        sku: v.sku,
        inventory: v.inventory,
        position,
      };
      if (v.id && ownVariantIds.has(v.id)) {
        await tx.variant.update({ where: { id: v.id }, data: values });
      } else {
        await tx.variant.create({ data: { ...values, productId: product.id } });
      }
    }

    // Foto's
    const toRemove = (existing?.images ?? []).filter((pi) => removeImages.has(pi.imageId));
    if (toRemove.length) {
      await tx.image.deleteMany({ where: { storeId: store.id, id: { in: toRemove.map((pi) => pi.imageId) } } });
    }
    const keptCount = (existing?.images.length ?? 0) - toRemove.length;
    for (const [i, imageId] of newImageIds.entries()) {
      await tx.productImage.create({ data: { productId: product.id, imageId, position: keptCount + i } });
    }

    return product.id;
  });

  revalidatePath(`/s/${store.slug}`, "layout");
  revalidatePath("/admin/products");
  redirect(`/admin/products/${id}?opgeslagen=1`);
}

export async function deleteProduct(productId: string): Promise<void> {
  const { store } = await requireMerchant();
  const product = await db.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: { images: { select: { imageId: true } } },
  });
  if (product) {
    await db.$transaction([
      db.product.delete({ where: { id: product.id } }),
      db.image.deleteMany({ where: { storeId: store.id, id: { in: product.images.map((i) => i.imageId) } } }),
    ]);
  }
  revalidatePath(`/s/${store.slug}`, "layout");
  redirect("/admin/products");
}

/** Foto naar voren schuiven: wordt dan de hoofdfoto. */
export async function makeCoverImage(productId: string, imageId: string): Promise<void> {
  const { store } = await requireMerchant();
  const product = await db.product.findFirst({
    where: { id: productId, storeId: store.id },
    include: { images: { orderBy: { position: "asc" } } },
  });
  if (!product) return;
  const ordered = [
    ...product.images.filter((i) => i.imageId === imageId),
    ...product.images.filter((i) => i.imageId !== imageId),
  ];
  await db.$transaction(ordered.map((pi, position) => db.productImage.update({ where: { id: pi.id }, data: { position } })));
  revalidatePath(`/admin/products/${productId}`);
  revalidatePath(`/s/${store.slug}`, "layout");
}
