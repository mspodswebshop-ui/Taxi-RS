/**
 * De winkelwagen staat in een cookie, één per winkel. Er staan alleen
 * variant-ID's en aantallen in; prijzen en voorraad haalt de server elke
 * keer opnieuw uit de database. Knoeien met de cookie levert dus niets op.
 */

import "server-only";

import { cookies } from "next/headers";

import { db } from "@/lib/db";

export type CartEntry = { v: string; q: number };

const MAX_LINES = 50;
const MAX_QTY = 99;

function cookieName(storeId: string) {
  return `cart_${storeId}`;
}

export async function readCart(storeId: string): Promise<CartEntry[]> {
  const jar = await cookies();
  const raw = jar.get(cookieName(storeId))?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (e): e is CartEntry =>
          e && typeof e.v === "string" && Number.isInteger(e.q) && e.q > 0,
      )
      .slice(0, MAX_LINES)
      .map((e) => ({ v: e.v, q: Math.min(e.q, MAX_QTY) }));
  } catch {
    return [];
  }
}

export async function writeCart(storeId: string, entries: CartEntry[]): Promise<void> {
  const jar = await cookies();
  const clean = entries.filter((e) => e.q > 0).slice(0, MAX_LINES);
  if (clean.length === 0) {
    jar.delete(cookieName(storeId));
    return;
  }
  jar.set(cookieName(storeId), Buffer.from(JSON.stringify(clean)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearCart(storeId: string): Promise<void> {
  await writeCart(storeId, []);
}

export function setQuantity(entries: CartEntry[], variantId: string, qty: number): CartEntry[] {
  const q = Math.max(0, Math.min(MAX_QTY, Math.floor(qty)));
  if (!entries.some((e) => e.v === variantId)) {
    return q > 0 ? [...entries, { v: variantId, q }] : entries;
  }
  // Bestaande regel: op dezelfde plek laten staan, of weghalen bij 0.
  return entries.flatMap((e) => (e.v !== variantId ? [e] : q > 0 ? [{ v: variantId, q }] : []));
}

export function addQuantity(entries: CartEntry[], variantId: string, qty: number): CartEntry[] {
  const current = entries.find((e) => e.v === variantId)?.q ?? 0;
  return setQuantity(entries, variantId, current + qty);
}

export type CartLine = {
  variantId: string;
  productId: string;
  productTitle: string;
  productHandle: string;
  variantTitle: string;
  priceCents: number;
  compareAtCents: number | null;
  quantity: number;
  // null = onbeperkt
  available: number | null;
  imageId: string | null;
};

/**
 * Zet de cookie om in echte regels met actuele prijzen. Varianten die niet
 * meer bestaan, van een andere winkel zijn of van een concept-product, vallen
 * weg. Aantallen boven de voorraad worden afgetopt.
 */
export async function resolveCart(storeId: string, entries: CartEntry[]): Promise<CartLine[]> {
  if (entries.length === 0) return [];
  const variants = await db.variant.findMany({
    where: {
      id: { in: entries.map((e) => e.v) },
      product: { storeId, status: "active" },
    },
    include: {
      product: {
        select: {
          id: true,
          title: true,
          handle: true,
          images: { orderBy: { position: "asc" }, take: 1, select: { imageId: true } },
        },
      },
    },
  });
  const byId = new Map(variants.map((v) => [v.id, v]));

  const lines: CartLine[] = [];
  for (const e of entries) {
    const v = byId.get(e.v);
    if (!v) continue;
    const available = v.inventory == null ? null : Math.max(0, v.inventory);
    const quantity = available == null ? e.q : Math.min(e.q, available);
    if (quantity <= 0) continue;
    lines.push({
      variantId: v.id,
      productId: v.product.id,
      productTitle: v.product.title,
      productHandle: v.product.handle,
      variantTitle: v.title,
      priceCents: v.priceCents,
      compareAtCents: v.compareAtCents,
      quantity,
      available,
      imageId: v.product.images[0]?.imageId ?? null,
    });
  }
  return lines;
}
