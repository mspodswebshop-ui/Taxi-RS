"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { FormState } from "@/components/forms";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseMoney } from "@/lib/money";

const schema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "Een code heeft 3 tot 30 letters of cijfers, zonder spaties."),
  type: z.enum(["percent", "fixed"]),
  value: z.string().trim().min(1, "Vul de korting in."),
  minSubtotal: z.string().trim().default(""),
  usageLimit: z.string().trim().default(""),
  expiresAt: z.string().trim().default(""),
});

export async function createDiscount(_: FormState, form: FormData): Promise<FormState> {
  const { store } = await requireMerchant();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;

  let value: number;
  if (d.type === "percent") {
    value = Number(d.value.replace(",", "."));
    if (!Number.isInteger(value) || value < 1 || value > 100) return { error: "Een percentage is een heel getal van 1 tot 100." };
  } else {
    const cents = parseMoney(d.value);
    if (!cents) return { error: "Vul een geldig kortingsbedrag in, bijvoorbeeld 5,00." };
    value = cents;
  }

  const minSubtotalCents = d.minSubtotal ? parseMoney(d.minSubtotal) : 0;
  if (minSubtotalCents == null) return { error: "Het minimumbedrag is geen geldig bedrag." };

  const usageLimit = d.usageLimit ? Number(d.usageLimit) : null;
  if (usageLimit != null && (!Number.isInteger(usageLimit) || usageLimit < 1)) return { error: "Het maximaal aantal keer moet 1 of meer zijn." };

  // Een einddatum geldt tot en met die dag.
  const expiresAt = d.expiresAt ? new Date(`${d.expiresAt}T23:59:59`) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) return { error: "Die einddatum klopt niet." };

  if (await db.discountCode.findUnique({ where: { storeId_code: { storeId: store.id, code: d.code } } })) {
    return { error: `De code ${d.code} bestaat al.` };
  }

  await db.discountCode.create({
    data: { storeId: store.id, code: d.code, type: d.type, value, minSubtotalCents, usageLimit, expiresAt },
  });
  revalidatePath("/admin/discounts");
  return { ok: `Kortingscode ${d.code} aangemaakt.` };
}

export async function toggleDiscount(id: string): Promise<void> {
  const { store } = await requireMerchant();
  const code = await db.discountCode.findFirst({ where: { id, storeId: store.id } });
  if (code) await db.discountCode.update({ where: { id }, data: { active: !code.active } });
  revalidatePath("/admin/discounts");
}

export async function deleteDiscount(id: string): Promise<void> {
  const { store } = await requireMerchant();
  await db.discountCode.deleteMany({ where: { id, storeId: store.id } });
  revalidatePath("/admin/discounts");
}
