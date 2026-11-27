/**
 * Prijsberekening van een winkelwagen. Pure functies, zonder database, zodat
 * ze makkelijk te testen zijn. De server rekent ALTIJD zelf opnieuw; wat de
 * browser stuurt aan prijzen telt nooit.
 */

export type PricedLine = { priceCents: number; quantity: number };

export type DiscountRule = {
  code: string;
  type: string; // "percent" | "fixed"
  value: number;
  minSubtotalCents: number;
  usageLimit: number | null;
  usedCount: number;
  active: boolean;
  expiresAt: Date | null;
};

export type ShippingRule = {
  shippingCents: number;
  freeShippingCents: number | null;
};

export type Totals = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
};

export function subtotal(lines: PricedLine[]): number {
  return lines.reduce((sum, l) => sum + l.priceCents * l.quantity, 0);
}

/** Geeft een reden terug waarom de code niet geldt, of null als hij geldt. */
export function discountProblem(
  rule: DiscountRule,
  subtotalCents: number,
  now = new Date(),
): string | null {
  if (!rule.active) return "Deze kortingscode is niet meer geldig.";
  if (rule.expiresAt && rule.expiresAt < now) return "Deze kortingscode is verlopen.";
  if (rule.usageLimit != null && rule.usedCount >= rule.usageLimit)
    return "Deze kortingscode is al te vaak gebruikt.";
  if (subtotalCents < rule.minSubtotalCents)
    return "Je bestelling is te klein voor deze kortingscode.";
  return null;
}

export function discountAmount(rule: DiscountRule, subtotalCents: number): number {
  const raw =
    rule.type === "percent"
      ? Math.round((subtotalCents * Math.min(100, Math.max(0, rule.value))) / 100)
      : rule.value;
  return Math.max(0, Math.min(raw, subtotalCents));
}

export function shippingFor(rule: ShippingRule, afterDiscountCents: number, lineCount: number): number {
  if (lineCount === 0) return 0;
  if (rule.freeShippingCents != null && afterDiscountCents >= rule.freeShippingCents) return 0;
  return rule.shippingCents;
}

export function computeTotals(
  lines: PricedLine[],
  shipping: ShippingRule,
  discount: DiscountRule | null,
): Totals {
  const sub = subtotal(lines);
  const disc = discount && !discountProblem(discount, sub) ? discountAmount(discount, sub) : 0;
  const ship = shippingFor(shipping, sub - disc, lines.length);
  return {
    subtotalCents: sub,
    discountCents: disc,
    shippingCents: ship,
    totalCents: sub - disc + ship,
  };
}

/** BTW die in een bedrag inclusief BTW zit. */
export function includedTax(totalCents: number, taxPercent: number): number {
  if (taxPercent <= 0) return 0;
  return Math.round(totalCents - totalCents / (1 + taxPercent / 100));
}

/** Platformkosten voor deze verkoop, in centen. */
export function platformFee(totalCents: number, percent: number): number {
  if (!(percent > 0)) return 0;
  return Math.round((totalCents * percent) / 100);
}
