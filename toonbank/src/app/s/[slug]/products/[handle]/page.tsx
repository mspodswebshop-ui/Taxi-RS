import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { Gallery } from "@/components/gallery";
import { ProductGrid } from "@/components/product-card";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images";
import { baseUrl } from "@/lib/stripe";
import { getStore, productCardSelect } from "@/lib/storefront";

import { addToCart } from "../../actions";

type Props = { params: Promise<{ slug: string; handle: string }> };

async function load(slug: string, handle: string) {
  const store = await getStore(slug);
  const product = await db.product.findFirst({
    where: { storeId: store.id, handle, status: "active" },
    include: {
      variants: { orderBy: { position: "asc" } },
      images: { orderBy: { position: "asc" } },
      collections: { select: { id: true, title: true, handle: true } },
    },
  });
  if (!product || product.variants.length === 0) notFound();
  return { store, product };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, handle } = await params;
  const { product } = await load(slug, handle);
  const img = imageUrl(product.images[0]?.imageId);
  return {
    title: product.title,
    description: product.description.slice(0, 160) || undefined,
    openGraph: { title: product.title, images: img ? [`${baseUrl()}${img}`] : undefined },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug, handle } = await params;
  const { store, product } = await load(slug, handle);

  const related = product.collections.length
    ? await db.product.findMany({
        where: { storeId: store.id, status: "active", id: { not: product.id }, collections: { some: { id: { in: product.collections.map((c) => c.id) } } } },
        take: 4,
        select: productCardSelect,
      })
    : [];

  const images = product.images.map((i) => imageUrl(i.imageId)!);
  const prices = product.variants.map((v) => v.priceCents);

  // Gestructureerde gegevens: zo kan Google prijs en voorraad tonen in de zoekresultaten.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description.slice(0, 500),
    image: images.map((i) => `${baseUrl()}${i}`),
    brand: product.vendor ? { "@type": "Brand", name: product.vendor } : undefined,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: store.currency,
      lowPrice: (Math.min(...prices) / 100).toFixed(2),
      highPrice: (Math.max(...prices) / 100).toFixed(2),
      availability: product.variants.some((v) => v.inventory == null || v.inventory > 0)
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <nav className="mb-6 text-sm text-ink-500">
        <Link href={`/s/${slug}`} className="hover:text-ink-900">Home</Link>
        {product.collections[0] && (
          <>
            {" / "}
            <Link href={`/s/${slug}/collections/${product.collections[0].handle}`} className="hover:text-ink-900">
              {product.collections[0].title}
            </Link>
          </>
        )}
      </nav>
      <div className="grid gap-10 md:grid-cols-2 lg:gap-16">
        <Gallery images={images} alt={product.title} />
        <div className="md:sticky md:top-24 md:self-start">
          {product.vendor && <p className="mb-1 text-sm tracking-wide text-ink-500 uppercase">{product.vendor}</p>}
          <h1 className="mb-4 font-serif text-3xl font-semibold tracking-tight sm:text-4xl">{product.title}</h1>
          <AddToCart
            action={addToCart.bind(null, slug)}
            optionName={product.optionName}
            currency={store.currency}
            variants={product.variants.map((v) => ({
              id: v.id,
              title: v.title,
              priceCents: v.priceCents,
              compareAtCents: v.compareAtCents,
              inventory: v.inventory,
            }))}
          />
          {product.description && (
            <div className="mt-10 space-y-4 border-t border-ink-100 pt-8 leading-relaxed text-ink-700">
              {product.description.split(/\n{2,}/).map((para, i) => (
                <p key={i} className="whitespace-pre-line">{para}</p>
              ))}
            </div>
          )}
          <ul className="mt-8 space-y-2 border-t border-ink-100 pt-6 text-sm text-ink-600">
            <li>✓ Veilig betalen met Bancontact of kaart</li>
            <li>
              ✓ {store.freeShippingCents != null ? `Gratis verzending vanaf ${new Intl.NumberFormat("nl-BE", { style: "currency", currency: store.currency }).format(store.freeShippingCents / 100)}` : "Snel verzonden"}
            </li>
            <li>✓ Vragen? Mail naar <a href={`mailto:${store.email}`} className="underline">{store.email}</a></li>
          </ul>
        </div>
      </div>
      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-6 font-serif text-2xl font-semibold tracking-tight">Misschien ook iets voor jou</h2>
          <ProductGrid products={related} slug={slug} currency={store.currency} />
        </section>
      )}
    </div>
  );
}
