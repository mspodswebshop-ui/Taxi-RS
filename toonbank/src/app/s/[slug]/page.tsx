import Link from "next/link";

import { ProductGrid } from "@/components/product-card";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images";
import { getStore, productCardSelect } from "@/lib/storefront";

export default async function StoreHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStore(slug);

  const [featured, latest] = await Promise.all([
    db.collection.findMany({
      where: { storeId: store.id, featured: true },
      orderBy: { title: "asc" },
      take: 3,
      include: {
        products: {
          where: { status: "active" },
          take: 4,
          orderBy: { createdAt: "desc" },
          select: productCardSelect,
        },
      },
    }),
    db.product.findMany({
      where: { storeId: store.id, status: "active" },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: productCardSelect,
    }),
  ]);
  const hero = imageUrl(store.heroImageId);

  return (
    <>
      <section className="relative overflow-hidden">
        {hero ? (
          <div className="relative h-[62vh] min-h-[380px]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={hero} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="relative mx-auto flex h-full max-w-6xl flex-col justify-end px-4 pb-14 text-white sm:px-6">
              <h1 className="max-w-2xl font-serif text-4xl font-semibold tracking-tight sm:text-6xl">{store.heroTitle || store.name}</h1>
              {store.heroText && <p className="mt-4 max-w-xl text-lg text-white/90">{store.heroText}</p>}
              <Link href={`/s/${slug}/products`} className="mt-7 inline-block w-fit rounded-full bg-white px-6 py-3 text-sm font-medium text-ink-950 hover:bg-ink-100">
                Bekijk de collectie
              </Link>
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:px-6 sm:py-28">
            <h1 className="mx-auto max-w-3xl font-serif text-4xl font-semibold tracking-tight sm:text-6xl">{store.heroTitle || store.name}</h1>
            {(store.heroText || store.tagline) && <p className="mx-auto mt-5 max-w-xl text-lg text-ink-600">{store.heroText || store.tagline}</p>}
            <Link href={`/s/${slug}/products`} className="bg-accent text-on-accent mt-8 inline-block rounded-full px-6 py-3 text-sm font-medium hover:opacity-90">
              Bekijk de collectie
            </Link>
          </div>
        )}
      </section>

      {featured
        .filter((c) => c.products.length > 0)
        .map((c) => (
          <section key={c.id} className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="font-serif text-2xl font-semibold tracking-tight">{c.title}</h2>
              <Link href={`/s/${slug}/collections/${c.handle}`} className="text-sm font-medium hover:underline">
                Alles bekijken →
              </Link>
            </div>
            <ProductGrid products={c.products} slug={slug} currency={store.currency} />
          </section>
        ))}

      <section className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Nieuw binnen</h2>
          <Link href={`/s/${slug}/products`} className="text-sm font-medium hover:underline">
            Alle producten →
          </Link>
        </div>
        <ProductGrid products={latest} slug={slug} currency={store.currency} />
      </section>
    </>
  );
}
