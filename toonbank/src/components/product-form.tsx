"use client";

import { useState } from "react";

import { ActionForm, SubmitButton, type FormAction } from "@/components/forms";
import { Card, CardHeader, Field, Input, Select, Textarea, cx } from "@/components/ui";

export type VariantRow = {
  id: string;
  title: string;
  price: string;
  compareAt: string;
  sku: string;
  inventory: string;
};

export type ProductFormValues = {
  title: string;
  description: string;
  status: string;
  vendor: string;
  optionName: string;
  handle: string;
  variants: VariantRow[];
  images: { imageId: string; url: string }[];
  collectionIds: string[];
};

const emptyVariant = (): VariantRow => ({ id: "", title: "", price: "", compareAt: "", sku: "", inventory: "" });

export function ProductForm({
  action,
  values,
  collections,
  currencySymbol = "€",
  coverAction,
}: {
  action: FormAction;
  values: ProductFormValues;
  collections: { id: string; title: string }[];
  currencySymbol?: string;
  coverAction?: (imageId: string) => Promise<void>;
}) {
  const [hasOptions, setHasOptions] = useState(values.optionName !== "");
  const [optionName, setOptionName] = useState(values.optionName || "Maat");
  const [rows, setRows] = useState<VariantRow[]>(
    values.variants.length ? values.variants : [emptyVariant()],
  );
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const [previews, setPreviews] = useState<string[]>([]);

  const update = (i: number, key: keyof VariantRow, value: string) =>
    setRows((r) => r.map((row, j) => (j === i ? { ...row, [key]: value } : row)));

  const visibleRows = hasOptions ? rows : rows.slice(0, 1);

  return (
    <ActionForm action={action} className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Card className="space-y-4 p-5">
          <Field label="Naam">
            <Input name="title" defaultValue={values.title} required placeholder="Bijv. Linnen hemd" />
          </Field>
          <Field label="Beschrijving" hint="Witregels worden alinea's in je winkel.">
            <Textarea name="description" defaultValue={values.description} rows={7} />
          </Field>
        </Card>

        <Card>
          <CardHeader title="Foto's" description="De eerste foto is de hoofdfoto. JPG, PNG of WebP, maximaal 4 MB." />
          <div className="p-5">
            {(values.images.length > 0 || previews.length > 0) && (
              <div className="mb-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {values.images.map((img, i) => {
                  const isRemoved = removed.has(img.imageId);
                  return (
                    <div key={img.imageId} className="group relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.url}
                        alt=""
                        className={cx(
                          "aspect-square w-full rounded-lg border border-ink-200 object-cover",
                          isRemoved && "opacity-30",
                        )}
                      />
                      {i === 0 && !isRemoved && (
                        <span className="absolute top-1 left-1 rounded bg-ink-900/80 px-1.5 text-[10px] text-white">Hoofdfoto</span>
                      )}
                      {isRemoved && <input type="hidden" name="remove_image" value={img.imageId} />}
                      <div className="mt-1 flex gap-2 text-xs">
                        <button
                          type="button"
                          className="text-red-700 hover:underline"
                          onClick={() =>
                            setRemoved((s) => {
                              const n = new Set(s);
                              if (n.has(img.imageId)) n.delete(img.imageId);
                              else n.add(img.imageId);
                              return n;
                            })
                          }
                        >
                          {isRemoved ? "Terugzetten" : "Weghalen"}
                        </button>
                        {i > 0 && !isRemoved && coverAction && (
                          <button
                            type="button"
                            className="text-ink-600 hover:underline"
                            onClick={() => coverAction(img.imageId)}
                          >
                            Hoofdfoto
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {previews.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" className="aspect-square w-full rounded-lg border border-dashed border-brand-500 object-cover" />
                ))}
              </div>
            )}
            <input
              type="file"
              name="images"
              accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
              multiple
              className="block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-ink-200"
              onChange={(e) => {
                previews.forEach((p) => URL.revokeObjectURL(p));
                setPreviews(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)));
              }}
            />
          </div>
        </Card>

        <Card>
          <CardHeader title="Prijs en voorraad" />
          <div className="space-y-4 p-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={hasOptions}
                onChange={(e) => {
                  setHasOptions(e.target.checked);
                  if (e.target.checked && rows.length === 1 && rows[0].title === "Standaard") {
                    update(0, "title", "");
                  }
                }}
              />
              Dit product heeft varianten, zoals maten of kleuren
            </label>
            <input type="hidden" name="optionName" value={hasOptions ? optionName : ""} />

            {hasOptions && (
              <Field label="Naam van de keuze" className="max-w-xs">
                <Input value={optionName} onChange={(e) => setOptionName(e.target.value)} placeholder="Maat, Kleur, ..." />
              </Field>
            )}

            <div className="space-y-3">
              {visibleRows.map((row, i) => (
                <div key={i} className="rounded-lg border border-ink-200 p-3">
                  <input type="hidden" name="variant_id" value={row.id} />
                  <div className={cx("grid gap-3", hasOptions ? "sm:grid-cols-5" : "sm:grid-cols-4")}>
                    {hasOptions ? (
                      <Field label={optionName || "Variant"}>
                        <Input name="variant_title" value={row.title} onChange={(e) => update(i, "title", e.target.value)} placeholder="Bijv. M" />
                      </Field>
                    ) : (
                      <input type="hidden" name="variant_title" value="Standaard" />
                    )}
                    <Field label={`Prijs (${currencySymbol})`}>
                      <Input name="variant_price" inputMode="decimal" value={row.price} onChange={(e) => update(i, "price", e.target.value)} placeholder="24,95" required={!hasOptions || i === 0} />
                    </Field>
                    <Field label="Van-prijs" hint="Optioneel, doorgestreept">
                      <Input name="variant_compare" inputMode="decimal" value={row.compareAt} onChange={(e) => update(i, "compareAt", e.target.value)} />
                    </Field>
                    <Field label="Voorraad" hint="Leeg = onbeperkt">
                      <Input name="variant_inventory" inputMode="numeric" value={row.inventory} onChange={(e) => update(i, "inventory", e.target.value)} />
                    </Field>
                    <Field label="Artikelnummer">
                      <Input name="variant_sku" value={row.sku} onChange={(e) => update(i, "sku", e.target.value)} />
                    </Field>
                  </div>
                  {hasOptions && rows.length > 1 && (
                    <button type="button" className="mt-2 text-xs text-red-700 hover:underline" onClick={() => setRows((r) => r.filter((_, j) => j !== i))}>
                      Variant weghalen
                    </button>
                  )}
                </div>
              ))}
            </div>
            {hasOptions && (
              <button
                type="button"
                className="text-sm font-medium text-brand-700 hover:underline"
                onClick={() => setRows((r) => [...r, { ...emptyVariant(), price: r[r.length - 1]?.price ?? "" }])}
              >
                + Variant toevoegen
              </button>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="space-y-4 p-5">
          <Field label="Status">
            <Select name="status" defaultValue={values.status}>
              <option value="active">Actief: staat in de winkel</option>
              <option value="draft">Concept: verborgen</option>
            </Select>
          </Field>
          <SubmitButton className="w-full" pendingText="Opslaan…">
            Opslaan
          </SubmitButton>
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 text-sm font-medium text-ink-700">Collecties</h3>
          {collections.length === 0 ? (
            <p className="text-sm text-ink-500">Nog geen collecties. Maak er een bij Collecties.</p>
          ) : (
            <div className="space-y-2">
              {collections.map((c) => (
                <label key={c.id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="collection" value={c.id} defaultChecked={values.collectionIds.includes(c.id)} />
                  {c.title}
                </label>
              ))}
            </div>
          )}
        </Card>

        <Card className="space-y-4 p-5">
          <Field label="Merk of maker">
            <Input name="vendor" defaultValue={values.vendor} />
          </Field>
          <Field label="Adres in de winkel" hint="Leeg laten = gemaakt uit de naam.">
            <Input name="handle" defaultValue={values.handle} placeholder="linnen-hemd" />
          </Field>
        </Card>
      </div>
    </ActionForm>
  );
}
