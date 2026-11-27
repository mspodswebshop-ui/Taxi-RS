import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, CardHeader, Field, Input, Textarea } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { imageUrl } from "@/lib/images";
import { centsToInput } from "@/lib/money";

import { saveSettings } from "./actions";

const fileClass =
  "block w-full text-sm text-ink-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-ink-200";

export default async function SettingsPage() {
  const { store } = await requireMerchant();
  const logo = imageUrl(store.logoImageId);
  const hero = imageUrl(store.heroImageId);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Instellingen</h1>
      <ActionForm action={saveSettings} className="max-w-3xl space-y-6">
        <Card>
          <CardHeader title="Winkel" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Naam">
              <Input name="name" defaultValue={store.name} required />
            </Field>
            <Field label="Winkeladres" hint="Letters, cijfers en streepjes.">
              <div className="flex items-center rounded-lg border border-ink-200 bg-ink-50 pl-3 text-sm text-ink-500">
                /s/
                <Input name="slug" defaultValue={store.slug} className="rounded-l-none border-0 border-l" />
              </div>
            </Field>
            <Field label="Slogan" hint="Onder je naam in de winkel." className="sm:col-span-2">
              <Input name="tagline" defaultValue={store.tagline} placeholder="Handgemaakt in Antwerpen" />
            </Field>
            <Field label="Over de winkel" hint="Staat onderaan elke pagina." className="sm:col-span-2">
              <Textarea name="description" defaultValue={store.description} rows={3} />
            </Field>
            <Field label="Contact-e-mail" hint="Klanten zien dit adres.">
              <Input name="email" type="email" defaultValue={store.email} required />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input type="checkbox" name="published" defaultChecked={store.published} /> Winkel is open voor bezoekers
            </label>
          </div>
        </Card>

        <Card>
          <CardHeader title="Uiterlijk" />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Accentkleur" hint="Voor knoppen en de bovenbalk.">
              <input type="color" name="accentColor" defaultValue={store.accentColor} className="h-10 w-20 cursor-pointer rounded-lg border border-ink-200 bg-white p-1" />
            </Field>
            <Field label="Logo">
              {logo && (
                <div className="mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="h-10 rounded border border-ink-200 bg-white object-contain p-1" />
                  <label className="text-xs text-ink-600"><input type="checkbox" name="remove_logo" /> weghalen</label>
                </div>
              )}
              <input type="file" name="logo" accept="image/*" className={fileClass} />
            </Field>
            <Field label="Titel op de voorpagina" className="sm:col-span-2">
              <Input name="heroTitle" defaultValue={store.heroTitle} />
            </Field>
            <Field label="Tekst op de voorpagina" className="sm:col-span-2">
              <Textarea name="heroText" defaultValue={store.heroText} rows={2} />
            </Field>
            <Field label="Hoofdfoto op de voorpagina" hint="Liggend, minstens 1600 pixels breed." className="sm:col-span-2">
              {hero && (
                <div className="mb-2 flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={hero} alt="" className="h-20 rounded border border-ink-200 object-cover" />
                  <label className="text-xs text-ink-600"><input type="checkbox" name="remove_hero" /> weghalen</label>
                </div>
              )}
              <input type="file" name="hero" accept="image/*" className={fileClass} />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Verzending en btw" />
          <div className="grid gap-4 p-5 sm:grid-cols-3">
            <Field label="Verzendkosten (€)">
              <Input name="shipping" inputMode="decimal" defaultValue={centsToInput(store.shippingCents)} />
            </Field>
            <Field label="Gratis verzending vanaf (€)" hint="Leeg = nooit gratis.">
              <Input name="freeShipping" inputMode="decimal" defaultValue={centsToInput(store.freeShippingCents)} />
            </Field>
            <Field label="Btw in je prijzen (%)" hint="Voor op de bestelling.">
              <Input name="taxPercent" inputMode="numeric" defaultValue={store.taxPercent} />
            </Field>
          </div>
        </Card>

        <SubmitButton>Instellingen opslaan</SubmitButton>
      </ActionForm>
    </div>
  );
}
