import "server-only";

import { cache } from "react";
import { notFound } from "next/navigation";

import { currentMerchant } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Haalt de winkel op voor de storefront. Een gesloten winkel is alleen
 * zichtbaar voor de eigenaar zelf (om te kunnen kijken voor de opening).
 * `cache` zorgt dat layout en pagina samen maar één query doen.
 */
export const getStore = cache(async (slug: string) => {
  const store = await db.store.findUnique({ where: { slug } });
  if (!store) notFound();
  if (!store.published) {
    const merchant = await currentMerchant();
    if (merchant?.store.id !== store.id) notFound();
  }
  return store;
});

export const getNavCollections = cache(async (storeId: string) =>
  db.collection.findMany({
    where: { storeId, products: { some: { status: "active" } } },
    orderBy: { title: "asc" },
    select: { id: true, title: true, handle: true },
  }),
);

export const productCardSelect = {
  id: true,
  title: true,
  handle: true,
  variants: { select: { priceCents: true, compareAtCents: true, inventory: true }, orderBy: { position: "asc" as const } },
  images: { orderBy: { position: "asc" as const }, take: 2, select: { imageId: true } },
};

/** Wit of zwart op de accentkleur, wat het best leesbaar is. */
export function onAccent(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.4 ? "#111111" : "#ffffff";
}
