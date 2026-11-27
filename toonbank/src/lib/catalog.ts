import "server-only";

import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";
import { productCardSelect } from "@/lib/storefront";

/**
 * Producten voor een overzichtspagina. Sorteren op prijs gebeurt na het
 * ophalen, omdat de prijs bij de varianten hoort en niet bij het product.
 */
export async function listProducts(where: Prisma.ProductWhereInput, sort: string | undefined) {
  const products = await db.product.findMany({
    where: { ...where, status: "active" },
    orderBy: sort === "name" ? { title: "asc" } : { createdAt: "desc" },
    take: 500,
    select: productCardSelect,
  });
  const minPrice = (p: (typeof products)[number]) => Math.min(...p.variants.map((v) => v.priceCents));
  if (sort === "price-asc") products.sort((a, b) => minPrice(a) - minPrice(b));
  if (sort === "price-desc") products.sort((a, b) => minPrice(b) - minPrice(a));
  return products;
}
