/**
 * Testgegevens: een beheerder en de conceptsite van Idriss Bakkerij.
 *
 * Gebruik: npm run db:seed
 *
 * De beheerder komt uit ADMIN_EMAIL en ADMIN_PASSWORD in .env. Zonder
 * wachtwoord wordt er een willekeurig gemaakt en één keer getoond, net als
 * de klantcode van de bakkerij. Draai je de seed opnieuw, dan blijft wat er
 * al is staan.
 */

import { createHash, randomBytes, randomInt } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

import { contentSchema, type SiteContent } from "../src/lib/content";

const db = new PrismaClient();

// Zelfde opbouw als src/lib/codes.ts (dat bestand is "server-only" en kan
// hier niet geïmporteerd worden).
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function newCode() {
  const groups = Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join(""));
  const code = `WBL-${groups.join("-")}`;
  return { code, hash: createHash("sha256").update(code).digest("hex"), hint: groups[2] };
}

const IDRISS: SiteContent = {
  business: {
    name: "Idriss Bakkerij",
    tagline: "Elke dag vers brood, Marokkaanse specialiteiten en gebak op bestelling.",
    street: "Blauwstraat 16",
    city: "2850 Boom",
    phone: "",
    whatsapp: "",
    email: "",
    googleUrl: "https://maps.app.goo.gl/K7JoyZK6dnaqebdm9",
    googleRating: 4.5,
    googleCount: 59,
  },
  hero: {
    title: "Elke ochtend",
    highlight: "vers",
    titleEnd: "uit de oven in Boom",
    intro: "Ambachtelijk brood, Marokkaanse specialiteiten en zoet gebak. Met liefde gebakken, zoals thuis. Kom langs of bestel vooraf en haal het warm af.",
  },
  highlights: ["Dagelijks vers gebakken", "Marokkaanse & Belgische klassiekers", "Taarten en feestbestellingen"],
  about: {
    title: "Belgische traditie, Marokkaanse roots",
    body:
      "Bij Idriss Bakkerij begint de dag vroeg. Terwijl Boom nog slaapt, kneden we het deeg en gaan de eerste broden de oven in.\n\n" +
      "We combineren de Belgische bakkerstraditie met recepten uit de Marokkaanse keuken: van een krokant wit brood tot warme msemen en zelfgemaakte koekjes voor bij de thee.\n\n" +
      "Iets speciaals nodig voor een feest, een verjaardag of het Suikerfeest? We bakken graag op bestelling.",
    quote: "Goed brood heeft tijd nodig. Daarom staan wij er elke ochtend vroeg voor op.",
  },
  hours: [
    { closed: false, open: "07:00", close: "13:00" },
    { closed: false, open: "06:30", close: "19:00" },
    { closed: false, open: "06:30", close: "19:00" },
    { closed: false, open: "06:30", close: "19:00" },
    { closed: false, open: "06:30", close: "19:00" },
    { closed: false, open: "06:30", close: "19:00" },
    { closed: false, open: "06:30", close: "19:00" },
  ],
  hoursNote: "",
  categories: ["Brood", "Marokkaans", "Zoet", "Op bestelling"],
  products: [
    { id: "wit", name: "Wit brood", description: "Krokante korst, luchtige kruim. De dagelijkse klassieker.", priceCents: 260, category: "Brood", art: "loaf", featured: true, visible: true },
    { id: "bruin", name: "Volkorenbrood", description: "Stevig en voedzaam, met volkorenmeel.", priceCents: 290, category: "Brood", art: "loaf", featured: false, visible: true },
    { id: "stokbrood", name: "Stokbrood", description: "Lang gerezen, knapperig vers.", priceCents: 150, category: "Brood", art: "baguette", featured: false, visible: true },
    { id: "khobz", name: "Khobz", description: "Rond Marokkaans brood, perfect bij tajine en soep.", priceCents: 150, category: "Marokkaans", art: "round", featured: true, visible: true },
    { id: "msemen", name: "Msemen", description: "Gelaagde pannenkoek, lekker met honing of kaas. Per stuk.", priceCents: 100, category: "Marokkaans", art: "square", featured: true, visible: true },
    { id: "harcha", name: "Harcha", description: "Griesmeelbroodje, zacht vanbinnen en krokant vanbuiten.", priceCents: 100, category: "Marokkaans", art: "round", featured: false, visible: true },
    { id: "batbout", name: "Batbout (6 st.)", description: "Klein pannenbrood, ideaal om te vullen.", priceCents: 300, category: "Marokkaans", art: "round", featured: false, visible: true },
    { id: "croissant", name: "Croissant", description: "Boterig en gelaagd, elke ochtend vers.", priceCents: 130, category: "Zoet", art: "croissant", featured: false, visible: true },
    { id: "koekjes", name: "Theekoekjes (250 g)", description: "Ghriba, fekkas en meer, voor bij de muntthee.", priceCents: 650, category: "Zoet", art: "cookie", featured: true, visible: true },
    { id: "chebakia", name: "Chebakia (250 g)", description: "Met honing en sesam, populair in de ramadan.", priceCents: 700, category: "Zoet", art: "cookie", featured: false, visible: true },
    { id: "taart", name: "Feesttaart (8 pers.)", description: "Naar keuze, met tekst of foto. 48 u op voorhand.", priceCents: 3200, category: "Op bestelling", art: "cake", featured: false, visible: true },
    { id: "plateau", name: "Koekjesschaal feest", description: "Voor bruiloft, Suikerfeest of geboorte.", priceCents: 4500, category: "Op bestelling", art: "cookie", featured: false, visible: true },
  ],
  // Leeg: echte reviews voegt de klant zelf toe, met toestemming van wie ze schreef.
  reviews: [],
  showReviews: true,
  ordering: {
    enabled: true,
    note: "Voor grote bestellingen of taarten: minstens 48 uur op voorhand.",
    greeting: "Salaam, ik wil graag bestellen:",
  },
  theme: { primary: "#b5492b", accent: "#e9a23b", secondary: "#2c4a9a" },
};

async function main() {
  const email = (process.env.ADMIN_EMAIL || "admin@weblity.local").toLowerCase();
  let password = process.env.ADMIN_PASSWORD || "";
  const existingAdmin = await db.admin.findUnique({ where: { email } });
  if (existingAdmin) {
    console.log(`Beheerder ${email} bestaat al.`);
  } else {
    const generated = !password;
    if (generated) password = randomBytes(12).toString("base64url");
    await db.admin.create({ data: { email, name: "Weblity", passwordHash: await bcrypt.hash(password, 12) } });
    console.log(`Beheerder aangemaakt: ${email}${generated ? `  wachtwoord: ${password}  (noteer het nu)` : ""}`);
  }

  const content = contentSchema.parse(IDRISS);
  const existing = await db.site.findUnique({ where: { slug: "idriss-bakkerij" } });
  if (existing) {
    console.log("Site idriss-bakkerij bestaat al; niets veranderd.");
  } else {
    const { code, hash, hint } = newCode();
    const site = await db.site.create({
      data: {
        slug: "idriss-bakkerij",
        name: content.business.name,
        template: "bakkerij",
        status: "concept",
        codeHash: hash,
        codeHint: hint,
        content,
        notes: "Klant wil live in december. Nog nodig: telefoon, WhatsApp, echte uren en prijzen, foto's, reviews met toestemming.",
      },
    });
    await db.change.create({ data: { siteId: site.id, by: "admin", action: "Site aangemaakt (seed)" } });
    console.log(`Site aangemaakt: /s/idriss-bakkerij  klantcode: ${code}  (noteer hem nu)`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
