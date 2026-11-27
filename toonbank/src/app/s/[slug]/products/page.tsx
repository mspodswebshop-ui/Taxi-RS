import type { Metadata } from "next";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";
import { listProducts } from "@/lib/catalog";
import { getStore } from "@/lib/storefront";

export const metadata: Metadata = { title: "Alle producten" };

export default async function AllProducts({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; sort?: string }>;
}) {
  const { slug } = await params;
  const { q = "", sort } = await searchParams;
  const store = await getStore(slug);
  const term = q.trim().slice(0, 100);

  const products = await listProducts(
    {
      storeId: store.id,
      ...(term
        ? { OR: [{ title: { contains: term, mode: "insensitive" } }, { description: { contains: term, mode: "insensitive" } }, { vendor: { contains: term, mode: "insensitive" } }] }
        : {}),
    },
    sort,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{term ? `Zoeken: “${term}”` : "Alle producten"}</h1>
          <p className="mt-1 text-sm text-ink-500">{products.length} {products.length === 1 ? "product" : "producten"}</p>
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>
      <ProductGrid products={products} slug={slug} currency={store.currency} />
    </div>
  );
}
