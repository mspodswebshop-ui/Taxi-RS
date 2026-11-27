import { currentMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { ORDER_STATUS_LABEL } from "@/lib/orders";

function cell(value: string | number): string {
  let s = String(value);
  // Tegen formule-injectie in Excel: een cel die met = + - @ begint, wordt tekst.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

const euro = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");

export async function GET() {
  const merchant = await currentMerchant();
  if (!merchant) return new Response("Niet ingelogd", { status: 401 });

  const orders = await db.order.findMany({
    where: { storeId: merchant.store.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  const header = ["Nummer", "Datum", "Status", "Verzonden", "Naam", "E-mail", "Telefoon", "Adres", "Postcode", "Plaats", "Land", "Artikelen", "Subtotaal", "Korting", "Verzendkosten", "Totaal", "Kortingscode", "Track & trace"];
  const rows = orders.map((o) => [
    o.number,
    o.createdAt.toISOString().slice(0, 16).replace("T", " "),
    ORDER_STATUS_LABEL[o.status] ?? o.status,
    o.fulfillment === "fulfilled" ? "ja" : "nee",
    o.name, o.email, o.phone, o.address, o.postalCode, o.city, o.country,
    o.items.map((i) => `${i.quantity}x ${i.productTitle}${i.variantTitle !== "Standaard" ? ` (${i.variantTitle})` : ""}`).join("; "),
    euro(o.subtotalCents), euro(o.discountCents), euro(o.shippingCents), euro(o.totalCents),
    o.discountCode ?? "", o.trackingCode,
  ]);

  // Puntkomma en BOM: zo opent Excel in België en Nederland het bestand meteen goed.
  const csv = "﻿" + [header, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bestellingen-${merchant.store.slug}.csv"`,
    },
  });
}
