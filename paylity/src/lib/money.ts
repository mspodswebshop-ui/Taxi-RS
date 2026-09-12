/**
 * Bedragen worden overal in centen als geheel getal bijgehouden.
 *
 * Rekenen met kommagetallen levert in JavaScript afrondingsfouten op
 * (0.1 + 0.2 is niet 0.3), en dat wil je niet in een bedrag dat iemand
 * moet betalen.
 */

export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-BE", {
    style: "currency",
    currency,
  }).format(cents / 100);
}

/** "12,50" of "12.50" naar 1250 centen. Geeft null bij onzin. */
export function parseMoney(input: string): number | null {
  const clean = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}
