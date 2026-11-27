import Link from "next/link";

import { Badge, ButtonLink, Card, EmptyState, Input, Table, td, th } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { imageUrl } from "@/lib/images";
import { formatMoney } from "@/lib/money";

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { store } = await requireMerchant();
  const { q = "" } = await searchParams;

  const products = await db.product.findMany({
    where: {
      storeId: store.id,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { variants: { some: { sku: { contains: q, mode: "insensitive" } } } }] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: {
      variants: { select: { priceCents: true, inventory: true } },
      images: { orderBy: { position: "asc" }, take: 1, select: { imageId: true } },
    },
    take: 200,
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Producten</h1>
        <ButtonLink href="/admin/products/new">Product toevoegen</ButtonLink>
      </div>
      <Card>
        <form className="border-b border-ink-100 p-3">
          <Input name="q" defaultValue={q} placeholder="Zoek op naam of artikelnummer" className="max-w-sm" />
        </form>
        {products.length === 0 ? (
          <EmptyState
            title={q ? "Niets gevonden" : "Nog geen producten"}
            text={q ? "Probeer een andere zoekterm." : "Voeg je eerste product toe. Het staat meteen in je winkel."}
            action={!q && <ButtonLink href="/admin/products/new">Product toevoegen</ButtonLink>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <th className={th}>Product</th>
                <th className={th}>Status</th>
                <th className={th}>Voorraad</th>
                <th className={`${th} text-right`}>Prijs</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const prices = p.variants.map((v) => v.priceCents);
                const min = Math.min(...prices);
                const max = Math.max(...prices);
                const tracked = p.variants.filter((v) => v.inventory != null);
                const stock = tracked.reduce((s, v) => s + (v.inventory ?? 0), 0);
                const thumb = imageUrl(p.images[0]?.imageId);
                return (
                  <tr key={p.id} className="hover:bg-ink-50">
                    <td className={td}>
                      <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                        {thumb ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumb} alt="" className="h-10 w-10 rounded-md border border-ink-200 object-cover" />
                        ) : (
                          <span className="h-10 w-10 rounded-md border border-dashed border-ink-300 bg-ink-50" />
                        )}
                        <span className="font-medium hover:underline">{p.title}</span>
                      </Link>
                    </td>
                    <td className={td}>
                      <Badge tone={p.status === "active" ? "green" : "gray"}>{p.status === "active" ? "Actief" : "Concept"}</Badge>
                    </td>
                    <td className={`${td} tabular`}>
                      {tracked.length === 0 ? (
                        <span className="text-ink-500">Onbeperkt</span>
                      ) : (
                        <span className={stock === 0 ? "font-medium text-red-700" : stock < 5 ? "text-amber-700" : ""}>
                          {stock} op voorraad
                          {p.variants.length > 1 && <span className="text-ink-500"> · {p.variants.length} varianten</span>}
                        </span>
                      )}
                    </td>
                    <td className={`${td} tabular text-right`}>
                      {min === max ? formatMoney(min, store.currency) : `${formatMoney(min, store.currency)} – ${formatMoney(max, store.currency)}`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
