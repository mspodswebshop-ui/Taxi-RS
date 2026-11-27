import { notFound } from "next/navigation";

import { ConfirmButton } from "@/components/forms";
import { ProductForm } from "@/components/product-form";
import { Notice, PageHeader } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images";
import { centsToInput } from "@/lib/money";

import { deleteProduct, makeCoverImage, saveProduct } from "../actions";

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ opgeslagen?: string }>;
}) {
  const { store } = await requireMerchant();
  const { id } = await params;
  const { opgeslagen } = await searchParams;

  const [product, collections] = await Promise.all([
    db.product.findFirst({
      where: { id, storeId: store.id },
      include: {
        variants: { orderBy: { position: "asc" } },
        images: { orderBy: { position: "asc" } },
        collections: { select: { id: true } },
      },
    }),
    db.collection.findMany({ where: { storeId: store.id }, orderBy: { title: "asc" }, select: { id: true, title: true } }),
  ]);
  if (!product) notFound();

  return (
    <div>
      <PageHeader
        title={product.title}
        back={{ href: "/admin/products", label: "Producten" }}
        action={
          <div className="flex gap-2">
            {product.status === "active" && (
              <a href={`/s/${store.slug}/products/${product.handle}`} target="_blank" className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-medium hover:bg-ink-50">
                Bekijk in winkel ↗
              </a>
            )}
            <form action={deleteProduct.bind(null, product.id)}>
              <ConfirmButton message={`"${product.title}" definitief verwijderen?`}>Verwijderen</ConfirmButton>
            </form>
          </div>
        }
      />
      {opgeslagen && (
        <div className="mb-6">
          <Notice tone="green">Opgeslagen.</Notice>
        </div>
      )}
      <ProductForm
        // Na opslaan opnieuw opbouwen met de verse gegevens uit de database.
        key={product.updatedAt.toISOString()}
        action={saveProduct.bind(null, product.id)}
        coverAction={makeCoverImage.bind(null, product.id)}
        collections={collections}
        values={{
          title: product.title,
          description: product.description,
          status: product.status,
          vendor: product.vendor,
          optionName: product.optionName,
          handle: product.handle,
          variants: product.variants.map((v) => ({
            id: v.id,
            title: v.title,
            price: centsToInput(v.priceCents),
            compareAt: centsToInput(v.compareAtCents),
            sku: v.sku,
            inventory: v.inventory == null ? "" : String(v.inventory),
          })),
          images: product.images.map((i) => ({ imageId: i.imageId, url: imageUrl(i.imageId)! })),
          collectionIds: product.collections.map((c) => c.id),
        }}
      />
    </div>
  );
}
