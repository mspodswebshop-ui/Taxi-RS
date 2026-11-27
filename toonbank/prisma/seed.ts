/**
 * Voorbeeldgegevens: een demo-winkel met producten, collecties, een
 * kortingscode en een paar bestellingen.
 *
 *   npm run db:seed
 *
 * Inloggen daarna met demo@toonbank.test / demo12345
 * De winkel staat op /s/demo
 *
 * De productfoto's worden hier zelf getekend (een eenvoudige PNG-encoder),
 * zodat de seed niets van internet hoeft te halen.
 */

import { deflateSync } from "node:zlib";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/* ---------------------------- PNG tekenen ---------------------------- */

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

type RGB = [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const mix = (a: RGB, b: RGB, t: number): RGB => a.map((v, i) => v + (b[i] - v) * t) as RGB;

type Shape = "jar" | "mug" | "cloth" | "book" | "bag" | "bottle";

/** Een "productfoto": zachte achtergrond, schaduw en een eenvoudige vorm. */
function drawProduct(w: number, h: number, bg: string, color: string, shape: Shape, accent = "#ffffff"): Buffer {
  const top = mix(hex(bg), [255, 255, 255], 0.35);
  const bottom = hex(bg);
  const fg = hex(color);
  const ac = hex(accent);
  const cx = w / 2;
  const raw = Buffer.alloc((w * 3 + 1) * h);

  // Afmetingen van de vorm, relatief aan het beeld.
  const dims: Record<Shape, { bw: number; bh: number; r: number }> = {
    jar: { bw: 0.42, bh: 0.42, r: 0.06 },
    mug: { bw: 0.4, bh: 0.36, r: 0.05 },
    cloth: { bw: 0.56, bh: 0.5, r: 0.01 },
    book: { bw: 0.46, bh: 0.58, r: 0.015 },
    bag: { bw: 0.52, bh: 0.48, r: 0.02 },
    bottle: { bw: 0.24, bh: 0.5, r: 0.05 },
  };
  const d = dims[shape];
  const bw = d.bw * w, bh = d.bh * h, rr = d.r * w;
  const x0 = cx - bw / 2, x1 = cx + bw / 2;
  const y1 = h * 0.74, y0 = y1 - bh;

  const inRounded = (x: number, y: number, ax: number, ay: number, bx: number, by: number, r: number) => {
    if (x < ax || x > bx || y < ay || y > by) return false;
    const qx = Math.max(ax + r - x, 0, x - (bx - r));
    const qy = Math.max(ay + r - y, 0, y - (by - r));
    return qx * qx + qy * qy <= r * r;
  };

  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      let c = mix(top, bottom, y / h);
      // Vloer met schaduw
      const sy = (y - y1) / (h * 0.035), sx = (x - cx) / (bw * 0.62);
      const shadow = Math.exp(-(sx * sx + sy * sy) * 1.6);
      c = mix(c, [0, 0, 0], 0.22 * shadow);

      let hit: RGB | null = null;
      if (inRounded(x, y, x0, y0, x1, y1, rr)) {
        // Licht van links: een zachte verloop over de vorm.
        const t = (x - x0) / bw;
        hit = mix(mix(fg, [255, 255, 255], 0.18), mix(fg, [0, 0, 0], 0.22), t);
        if (shape === "jar" && y > y0 + bh * 0.35 && y < y0 + bh * 0.65 && x > x0 + bw * 0.15 && x < x1 - bw * 0.15) hit = mix(ac, hit, 0.15);
        if (shape === "book" && x < x0 + bw * 0.06) hit = mix(hit, [0, 0, 0], 0.25);
        if (shape === "book" && y > y0 + bh * 0.3 && y < y0 + bh * 0.36 && x > x0 + bw * 0.2 && x < x1 - bw * 0.2) hit = ac;
        if (shape === "cloth" && Math.floor((x - x0) / (bw / 12)) % 3 === 0) hit = mix(hit, ac, 0.35);
        if (shape === "bag" && y > y0 + bh * 0.4 && y < y0 + bh * 0.6 && x > x0 + bw * 0.3 && x < x1 - bw * 0.3) hit = mix(ac, hit, 0.1);
      }
      // Deksel / dop / hengsels
      if (shape === "jar" && inRounded(x, y, x0 + bw * 0.04, y0 - h * 0.05, x1 - bw * 0.04, y0 + 2, rr * 0.6)) hit = mix(hex("#3b3b3b"), [255, 255, 255], 0.1 + 0.2 * (1 - (x - x0) / bw));
      if (shape === "bottle" && inRounded(x, y, cx - bw * 0.22, y0 - h * 0.09, cx + bw * 0.22, y0 + 2, 3)) hit = hex("#2b2b2b");
      if (shape === "mug") {
        const hx = x1 + bw * 0.12, hy = y0 + bh * 0.45;
        const dist = Math.hypot((x - hx) / (bw * 0.2), (y - hy) / (bh * 0.28));
        if (dist > 0.62 && dist < 1 && x > x1 - 2) hit = mix(fg, [0, 0, 0], 0.2);
      }
      if (shape === "bag") {
        const dist = Math.hypot((x - cx) / (bw * 0.28), (y - y0) / (bh * 0.42));
        if (dist > 0.86 && dist < 1 && y < y0) hit = mix(fg, [0, 0, 0], 0.15);
      }
      if (hit) c = hit;
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = c[0];
      raw[o + 1] = c[1];
      raw[o + 2] = c[2];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bitdiepte
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------ Gegevens ----------------------------- */

type SeedProduct = {
  title: string;
  description: string;
  collections: string[];
  optionName?: string;
  variants: { title?: string; price: number; compareAt?: number; inventory?: number | null; sku: string }[];
  images: [string, string, Shape, string?][];
};

const products: SeedProduct[] = [
  {
    title: "Sojakaars Vijgenblad",
    description:
      "Handgegoten kaars van 100% sojawas met een katoenen lont. Warme geur van vijgenblad en een vleugje cederhout.\n\nBrandtijd ongeveer 40 uur. Het glas kun je daarna gewoon hergebruiken.",
    collections: ["Nieuw", "Cadeaus"],
    optionName: "Formaat",
    variants: [
      { title: "Klein (180 g)", price: 1895, inventory: 24, sku: "KRS-VIJG-S" },
      { title: "Groot (320 g)", price: 2895, inventory: 12, sku: "KRS-VIJG-L" },
    ],
    images: [["#e8dfd0", "#f6f1e7", "jar", "#c9b48f"], ["#d8cbb5", "#efe6d6", "jar", "#a88f68"]],
  },
  {
    title: "Keramieken mok Zeegroen",
    description: "Gedraaid en geglazuurd in ons atelier. Elke mok is net een beetje anders.\n\nInhoud 300 ml. Vaatwasserbestendig.",
    collections: ["Keuken", "Nieuw"],
    variants: [{ price: 2400, compareAt: 2900, inventory: 3, sku: "MOK-ZEE" }],
    images: [["#dfe7e2", "#7fa79a", "mug"], ["#e9eeea", "#6b9486", "mug"]],
  },
  {
    title: "Linnen theedoek",
    description: "Stevig Belgisch linnen dat bij elke wasbeurt zachter wordt. 50 × 70 cm.",
    collections: ["Keuken"],
    optionName: "Kleur",
    variants: [
      { title: "Naturel", price: 1650, inventory: 30, sku: "THD-NAT" },
      { title: "Terracotta", price: 1650, inventory: 0, sku: "THD-TER" },
      { title: "Olijf", price: 1650, inventory: 18, sku: "THD-OLY" },
    ],
    images: [["#eee8de", "#cbbfa8", "cloth", "#a3957b"], ["#efe2d8", "#c67b5c", "cloth", "#e7b8a2"]],
  },
  {
    title: "Notitieboek A5, gerecycleerd papier",
    description: "120 blanco pagina's van gerecycleerd papier, met een linnen rug. Ligt plat open.",
    collections: ["Cadeaus"],
    variants: [{ price: 1495, inventory: null, sku: "NTB-A5" }],
    images: [["#e4e4ea", "#2f3d5c", "book", "#d9c48f"]],
  },
  {
    title: "Canvas draagtas",
    description: "Dik canvas met lange hengsels, makkelijk over de schouder. Past een laptop van 14 inch.",
    collections: ["Nieuw"],
    variants: [{ price: 2200, inventory: 40, sku: "TAS-CNV" }],
    images: [["#ebe6dc", "#d9cdb4", "bag", "#5a4a32"]],
  },
  {
    title: "Kamerparfum Oranjebloesem",
    description: "Rietjesverspreider van 100 ml, goed voor zo'n drie maanden geur in huis.",
    collections: ["Cadeaus"],
    variants: [{ price: 3200, inventory: 9, sku: "PRF-ORB" }],
    images: [["#f3e7dc", "#e8a76b", "bottle"]],
  },
];

async function main() {
  const email = "demo@toonbank.test";
  // Opnieuw beginnen: oude demo weg (cascade ruimt de winkel mee op).
  await db.user.deleteMany({ where: { email } });

  const user = await db.user.create({
    data: { email, name: "Noor Demo", passwordHash: await bcrypt.hash("demo12345", 12) },
  });

  const heroPng = drawProduct(1600, 900, "#d9cdb8", "#efe6d6", "jar", "#b59c74");
  const store = await db.store.create({
    data: {
      ownerId: user.id,
      slug: "demo",
      name: "Atelier Noor",
      tagline: "Handgemaakt in Antwerpen",
      description: "Kaarsen, keramiek en linnen, met de hand gemaakt in ons atelier in Antwerpen.",
      email: "hallo@ateliernoor.test",
      accentColor: "#3f5b4c",
      heroTitle: "Kleine dingen, met zorg gemaakt",
      heroText: "Kaarsen, keramiek en linnen uit ons atelier. Gratis verzending vanaf €50.",
      shippingCents: 495,
      freeShippingCents: 5000,
    },
  });
  const hero = await db.image.create({ data: { storeId: store.id, contentType: "image/png", data: new Uint8Array(heroPng), size: heroPng.length } });
  await db.store.update({ where: { id: store.id }, data: { heroImageId: hero.id } });

  const collectionIds: Record<string, string> = {};
  for (const [i, title] of ["Nieuw", "Keuken", "Cadeaus"].entries()) {
    const c = await db.collection.create({
      data: { storeId: store.id, title, handle: title.toLowerCase(), featured: i !== 1, description: "" },
    });
    collectionIds[title] = c.id;
  }

  const variantIds: string[] = [];
  for (const p of products) {
    const created = await db.product.create({
      data: {
        storeId: store.id,
        title: p.title,
        handle: p.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        description: p.description,
        optionName: p.optionName ?? "",
        vendor: "Atelier Noor",
        collections: { connect: p.collections.map((c) => ({ id: collectionIds[c] })) },
        variants: {
          create: p.variants.map((v, position) => ({
            title: v.title ?? "Standaard",
            priceCents: v.price,
            compareAtCents: v.compareAt ?? null,
            inventory: v.inventory === undefined ? null : v.inventory,
            sku: v.sku,
            position,
          })),
        },
      },
      include: { variants: true },
    });
    variantIds.push(...created.variants.map((v) => v.id));
    for (const [position, [bg, color, shape, accent]] of p.images.entries()) {
      const png = drawProduct(800, 1000, bg, color, shape, accent);
      const img = await db.image.create({ data: { storeId: store.id, contentType: "image/png", data: new Uint8Array(png), size: png.length } });
      await db.productImage.create({ data: { productId: created.id, imageId: img.id, position } });
    }
  }

  await db.discountCode.create({
    data: { storeId: store.id, code: "WELKOM10", type: "percent", value: 10 },
  });

  // Een paar bestellingen, verspreid over de laatste weken, voor het overzicht.
  const variants = await db.variant.findMany({ where: { id: { in: variantIds } }, include: { product: true } });
  const people = [
    ["Lotte Peeters", "lotte@voorbeeld.test", "Mechelen", "2800"],
    ["Jonas Claes", "jonas@voorbeeld.test", "Gent", "9000"],
    ["Sara El Amrani", "sara@voorbeeld.test", "Antwerpen", "2018"],
    ["Wout Maes", "wout@voorbeeld.test", "Leuven", "3000"],
    ["Emma de Vries", "emma@voorbeeld.test", "Breda", "4811"],
  ];
  let number = 1001;
  for (let i = 0; i < 14; i++) {
    const [name, mail, city, postal] = people[i % people.length];
    const picks = [variants[(i * 3) % variants.length], variants[(i * 5 + 1) % variants.length]].slice(0, 1 + (i % 2));
    const items = picks.map((v, k) => ({ v, q: 1 + ((i + k) % 2) }));
    const sub = items.reduce((s, it) => s + it.v.priceCents * it.q, 0);
    const ship = sub >= 5000 ? 0 : 495;
    const daysAgo = Math.floor((i * 29) / 14);
    const when = new Date(Date.now() - daysAgo * 86_400_000 - i * 3_600_000);
    const customer = await db.customer.upsert({
      where: { storeId_email: { storeId: store.id, email: mail } },
      create: { storeId: store.id, email: mail, name },
      update: {},
    });
    const status = i === 0 ? "pending" : "paid";
    await db.order.create({
      data: {
        storeId: store.id,
        number: number++,
        customerId: customer.id,
        email: mail,
        name,
        address: "Voorbeeldstraat 1",
        postalCode: postal,
        city,
        country: city === "Breda" ? "NL" : "BE",
        subtotalCents: sub,
        shippingCents: ship,
        totalCents: sub + ship,
        paymentProvider: "test",
        status,
        paidAt: status === "paid" ? when : null,
        stockApplied: status === "paid",
        fulfillment: i > 3 ? "fulfilled" : "unfulfilled",
        createdAt: when,
        items: {
          create: items.map((it) => ({
            variantId: it.v.id,
            productTitle: it.v.product.title,
            variantTitle: it.v.title,
            priceCents: it.v.priceCents,
            quantity: it.q,
          })),
        },
      },
    });
  }
  await db.store.update({ where: { id: store.id }, data: { nextOrderNumber: number } });

  console.log("\nDemo-winkel klaar.");
  console.log("  Winkel:    /s/demo");
  console.log("  Inloggen:  demo@toonbank.test / demo12345\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
