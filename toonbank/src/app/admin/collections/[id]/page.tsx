import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";

import { deleteCollection, saveCollection } from "../actions";

export default async function CollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { store } = await requireMerchant();
  const { id } = await params;
  const collection = await db.collection.findFirst({
    where: { id, storeId: store.id },
    include: { products: { orderBy: { title: "asc" }, select: { id: true, title: true, status: true } } },
  });
  if (!collection) notFound();

  return (
    <div>
      <PageHeader
        title={collection.title}
        back={{ href: "/admin/collections", label: "Collecties" }}
        action={
          <form action={deleteCollection.bind(null, collection.id)}>
            <ConfirmButton message="Collectie verwijderen? De producten zelf blijven bestaan.">Verwijderen</ConfirmButton>
          </form>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Gegevens" />
          <ActionForm action={saveCollection.bind(null, collection.id)} className="space-y-4 p-5">
            <Field label="Naam">
              <Input name="title" defaultValue={collection.title} required />
            </Field>
            <Field label="Beschrijving">
              <Textarea name="description" defaultValue={collection.description} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" defaultChecked={collection.featured} /> Tonen op de voorpagina
            </label>
            <SubmitButton>Opslaan</SubmitButton>
          </ActionForm>
        </Card>
        <Card>
          <CardHeader title={`Producten (${collection.products.length})`} description="Producten voeg je toe vanuit het product zelf." />
          <ul className="divide-y divide-ink-100">
            {collection.products.map((p) => (
              <li key={p.id} className="px-5 py-2.5 text-sm">
                <Link href={`/admin/products/${p.id}`} className="hover:underline">
                  {p.title}
                </Link>
                {p.status !== "active" && <span className="text-ink-500"> (concept)</span>}
              </li>
            ))}
            {collection.products.length === 0 && <li className="px-5 py-4 text-sm text-ink-500">Nog leeg.</li>}
          </ul>
        </Card>
      </div>
    </div>
  );
}
