import { ProductForm } from "@/components/product-form";
import { PageHeader } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";

import { saveProduct } from "../actions";

export default async function NewProductPage() {
  const { store } = await requireMerchant();
  const collections = await db.collection.findMany({
    where: { storeId: store.id },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });

  return (
    <div>
      <PageHeader title="Nieuw product" back={{ href: "/admin/products", label: "Producten" }} />
      <ProductForm
        action={saveProduct.bind(null, null)}
        collections={collections}
        values={{
          title: "",
          description: "",
          status: "active",
          vendor: "",
          optionName: "",
          handle: "",
          variants: [],
          images: [],
          collectionIds: [],
        }}
      />
    </div>
  );
}
