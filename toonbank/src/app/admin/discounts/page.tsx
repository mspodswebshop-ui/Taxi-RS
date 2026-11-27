import { ActionForm, ConfirmButton, SubmitButton } from "@/components/forms";
import { Badge, Card, CardHeader, EmptyState, Field, Input, Select, Table, buttonStyles, td, th } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

import { createDiscount, deleteDiscount, toggleDiscount } from "./actions";

export default async function DiscountsPage() {
  const { store } = await requireMerchant();
  const codes = await db.discountCode.findMany({ where: { storeId: store.id }, orderBy: { createdAt: "desc" } });
  const now = new Date();
  const dateFmt = new Intl.DateTimeFormat("nl-BE", { dateStyle: "medium" });

  return (
    <div>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight">Kortingscodes</h1>
      <p className="mb-6 text-ink-500">Klanten vullen de code in bij het afrekenen.</p>
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          {codes.length === 0 ? (
            <EmptyState title="Nog geen kortingscodes" text="Een code zoals WELKOM10 in je nieuwsbrief of op Instagram brengt vaak meteen bestellingen op." />
          ) : (
            <Table>
              <thead>
                <tr>
                  <th className={th}>Code</th>
                  <th className={th}>Korting</th>
                  <th className={th}>Gebruikt</th>
                  <th className={th}>Status</th>
                  <th className={th}></th>
                </tr>
              </thead>
              <tbody>
                {codes.map((c) => {
                  const expired = c.expiresAt && c.expiresAt < now;
                  const used = c.usageLimit != null && c.usedCount >= c.usageLimit;
                  return (
                    <tr key={c.id}>
                      <td className={`${td} font-mono font-medium`}>{c.code}</td>
                      <td className={td}>
                        {c.type === "percent" ? `${c.value}%` : formatMoney(c.value, store.currency)}
                        {c.minSubtotalCents > 0 && (
                          <span className="block text-xs text-ink-500">vanaf {formatMoney(c.minSubtotalCents, store.currency)}</span>
                        )}
                      </td>
                      <td className={`${td} tabular`}>
                        {c.usedCount}
                        {c.usageLimit != null && ` / ${c.usageLimit}`}
                      </td>
                      <td className={td}>
                        {!c.active ? (
                          <Badge>Uit</Badge>
                        ) : expired ? (
                          <Badge tone="red">Verlopen</Badge>
                        ) : used ? (
                          <Badge tone="amber">Op</Badge>
                        ) : (
                          <Badge tone="green">Actief</Badge>
                        )}
                        {c.expiresAt && !expired && <span className="block text-xs text-ink-500">t/m {dateFmt.format(c.expiresAt)}</span>}
                      </td>
                      <td className={`${td} text-right whitespace-nowrap`}>
                        <form action={toggleDiscount.bind(null, c.id)} className="inline">
                          <button className={buttonStyles.ghost}>{c.active ? "Uitzetten" : "Aanzetten"}</button>
                        </form>
                        <form action={deleteDiscount.bind(null, c.id)} className="inline">
                          <ConfirmButton variant="ghost" message={`Code ${c.code} verwijderen?`}>
                            Verwijderen
                          </ConfirmButton>
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Nieuwe code" />
          <ActionForm action={createDiscount} resetOnSuccess className="space-y-4 p-5">
            <Field label="Code">
              <Input name="code" placeholder="WELKOM10" required className="font-mono uppercase" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Soort">
                <Select name="type" defaultValue="percent">
                  <option value="percent">Procent</option>
                  <option value="fixed">Vast bedrag</option>
                </Select>
              </Field>
              <Field label="Korting">
                <Input name="value" inputMode="decimal" placeholder="10" required />
              </Field>
            </div>
            <Field label="Minimum bestelbedrag" hint="Optioneel">
              <Input name="minSubtotal" inputMode="decimal" placeholder="0,00" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Max. aantal keer" hint="Leeg = onbeperkt">
                <Input name="usageLimit" inputMode="numeric" />
              </Field>
              <Field label="Geldig t/m" hint="Optioneel">
                <Input name="expiresAt" type="date" />
              </Field>
            </div>
            <SubmitButton>Code aanmaken</SubmitButton>
          </ActionForm>
        </Card>
      </div>
    </div>
  );
}
