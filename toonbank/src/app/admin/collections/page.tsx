import Link from "next/link";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, EmptyState, Field, Input, Table, td, th } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";

import { saveCollection } from "./actions";

export default async function CollectionsPage() {
  const { store } = await requireMerchant();
  const collections = await db.collection.findMany({
    where: { storeId: store.id },
    orderBy: { title: "asc" },
    include: { _count: { select: { products: true } } },
  });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Collecties</h1>
      <p className="mb-6 text-ink-500">Groepeer producten, bijvoorbeeld &quot;Nieuw&quot;, &quot;Zomer&quot; of &quot;Cadeaus&quot;. Ze verschijnen als menu in je winkel.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          {collections.length === 0 ? (
            <EmptyState title="Nog geen collecties" text="Maak je eerste collectie hiernaast. Daarna vink je bij een product aan in welke collectie het hoort." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Collectie</th>
                  <th className={th}>Producten</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {collections.map((c) => (
                  <tr key={c.id} className="hover:bg-ink-50">
                    <td className={td}>
                      <Link href={`/admin/collections/${c.id}`} className="font-medium hover:underline">
                        {c.title}
                      </Link>
                    </td>
                    <td className={`${td} tabular`}>{c._count.products}</td>
                    <td className={`${td} text-right`}>{c.featured && <Badge tone="green">Op voorpagina</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>
        <Card>
          <CardHeader title="Nieuwe collectie" />
          <ActionForm action={saveCollection.bind(null, null)} resetOnSuccess className="space-y-4 p-5">
            <Field label="Naam">
              <Input name="title" required />
            </Field>
            <Field label="Beschrijving">
              <Input name="description" />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="featured" /> Tonen op de voorpagina
            </label>
            <SubmitButton>Aanmaken</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
