/**
 * Bedragen worden overal in centen als geheel getal bijgehouden.
 * Rekenen met kommagetallen geeft afrondingsfouten (0.1 + 0.2 is geen 0.3).
 */

export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency }).format(
    cents / 100,
  );
}

/** "12,50" of "12.50" naar 1250 centen. Geeft null bij onzin. */
export function parseMoney(input: string): number | null {
  const clean = input.trim().replace(/\s/g, "").replace("€", "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}

/** 1250 naar "12,50", voor in een invulveld. */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
