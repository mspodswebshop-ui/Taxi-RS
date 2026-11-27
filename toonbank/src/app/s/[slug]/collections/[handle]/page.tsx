import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ProductGrid } from "@/components/product-card";
import { SortSelect } from "@/components/sort-select";
import { listProducts } from "@/lib/catalog";
import { db } from "@/lib/db";
import { getStore } from "@/lib/storefront";

type Props = { params: Promise<{ slug: string; handle: string }>; searchParams: Promise<{ sort?: string }> };

async function load(slug: string, handle: string) {
  const store = await getStore(slug);
  const collection = await db.collection.findUnique({ where: { storeId_handle: { storeId: store.id, handle } } });
  if (!collection) notFound();
  return { store, collection };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, handle } = await params;
  const { collection } = await load(slug, handle);
  return { title: collection.title, description: collection.description.slice(0, 160) || undefined };
}

export default async function CollectionPage({ params, searchParams }: Props) {
  const { slug, handle } = await params;
  const { sort } = await searchParams;
  const { store, collection } = await load(slug, handle);
  const products = await listProducts({ storeId: store.id, collections: { some: { id: collection.id } } }, sort);

  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight">{collection.title}</h1>
          {collection.description && <p className="mt-2 max-w-2xl text-ink-600">{collection.description}</p>}
        </div>
        <Suspense>
          <SortSelect />
        </Suspense>
      </div>
      <ProductGrid products={products} slug={slug} currency={store.currency} />
    </div>
  );
}
