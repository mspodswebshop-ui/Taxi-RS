import Link from "next/link";

import { imageUrl } from "@/lib/images";
import { formatMoney } from "@/lib/money";

export type ProductCardData = {
  id: string;
  title: string;
  handle: string;
  variants: { priceCents: number; compareAtCents: number | null; inventory: number | null }[];
  images: { imageId: string }[];
};

export function ProductCard({ product, slug, currency }: { product: ProductCardData; slug: string; currency: string }) {
  const prices = product.variants.map((v) => v.priceCents);
  const min = Math.min(...prices);
  const varies = new Set(prices).size > 1;
  const first = product.variants.find((v) => v.priceCents === min);
  const onSale = !varies && first?.compareAtCents && first.compareAtCents > min;
  const soldOut = product.variants.every((v) => v.inventory != null && v.inventory <= 0);
  const [img, img2] = product.images.map((i) => imageUrl(i.imageId));

  return (
    <Link href={`/s/${slug}/products/${product.handle}`} className="group block">
      <div className="relative aspect-[4/5] overflow-hidden rounded-xl bg-ink-100">
        {img ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img} alt={product.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
            {img2 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={img2} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
            )}
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink-400">Geen foto</div>
        )}
        {soldOut && <span className="absolute top-2 left-2 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-medium">Uitverkocht</span>}
        {!soldOut && onSale && <span className="bg-accent text-on-accent absolute top-2 left-2 rounded-full px-2.5 py-0.5 text-xs font-medium">Actie</span>}
      </div>
      <h3 className="mt-3 text-sm font-medium text-ink-900 group-hover:underline">{product.title}</h3>
      <p className="tabular mt-0.5 text-sm text-ink-700">
        {varies && "vanaf "}
        {formatMoney(min, currency)}
        {onSale && <span className="ml-2 text-ink-400 line-through">{formatMoney(first!.compareAtCents!, currency)}</span>}
      </p>
    </Link>
  );
}

export function ProductGrid({ products, slug, currency }: { products: ProductCardData[]; slug: string; currency: string }) {
  if (products.length === 0) {
    return <p className="py-16 text-center text-ink-500">Hier staan nog geen producten.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} slug={slug} currency={currency} />
      ))}
    </div>
  );
}
