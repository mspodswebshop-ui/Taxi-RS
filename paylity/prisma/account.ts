/**
 * Een account aanmaken of herstellen vanaf de opdrachtregel.
 *
 * Bedoeld voor als het registratieformulier je niet verder helpt: je weet je
 * wachtwoord niet meer, de browser gooide de sessiecookie weg, of je wilt
 * gewoon zeker weten dat het account er staat vóór je de app opstart.
 *
 * Gebruik:
 *
 *   npm run account -- --email jij@voorbeeld.be --wachtwoord "minstens10tekens"
 *   npm run account -- --email jij@voorbeeld.be --wachtwoord "..." --demo
 *
 * Opties:
 *   --email        verplicht
 *   --wachtwoord   verplicht, minstens 10 tekens
 *   --naam         je eigen naam       (standaard: het deel voor de @)
 *   --bedrijf      je bedrijfsnaam     (standaard: hetzelfde)
 *   --demo         vul het dashboard met 90 dagen testgegevens
 *   --leegmaken    bestaande testgegevens van dit bedrijf eerst wissen
 *
 * In plaats van --wachtwoord kun je ook PAYLITY_WACHTWOORD in je omgeving
 * zetten, dan staat het niet in je shell-geschiedenis.
 *
 * Bestaat het account al, dan wordt het wachtwoord bijgewerkt en blijft de
 * rest staan. Het wachtwoord wordt gehasht met bcrypt en nergens getoond of
 * gelogd. Er worden nooit kaartnummers, CVC's, pincodes of IBAN's aangemaakt:
 * die velden bestaan niet in het schema.
 */

// Eerst .env inlezen: dit script draait via tsx en leest anders geen
// DATABASE_URL.
import "dotenv/config";

import { createHash, randomBytes } from "node:crypto";

import { PrismaClient, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

/* ---------------------------------------------------------------- */
/* Opdrachtregel                                                     */
/* ---------------------------------------------------------------- */

function leesArgumenten(argv: string[]) {
  const uit: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const naam = arg.slice(2);
    const volgende = argv[i + 1];
    if (volgende && !volgende.startsWith("--")) {
      uit[naam] = volgende;
      i++;
    } else {
      uit[naam] = true;
    }
  }
  return uit;
}

function stop(bericht: string): never {
  console.error(`\n${bericht}\n`);
  console.error(
    'Voorbeeld: npm run account -- --email jij@voorbeeld.be --wachtwoord "mijnwachtwoord" --demo\n',
  );
  process.exit(1);
}

/* ---------------------------------------------------------------- */
/* Testgegevens                                                      */
/* ---------------------------------------------------------------- */

const klantenlijst = [
  { name: "Anke Verstraeten", email: "anke@voorbeeld.be" },
  { name: "Bram De Coster", email: "bram@voorbeeld.be" },
  { name: "Chaima El Amrani", email: "chaima@voorbeeld.be" },
  { name: "Dries Peeters", email: "dries@voorbeeld.be" },
  { name: "Eva Janssens", email: "eva@voorbeeld.be" },
  { name: "Fatima Bouzid", email: "fatima@voorbeeld.be" },
  { name: "Gert Vandenberghe", email: "gert@voorbeeld.be" },
  { name: "Hanne Claes", email: "hanne@voorbeeld.be" },
  { name: "Ibrahim Yilmaz", email: "ibrahim@voorbeeld.be" },
  { name: "Julie Maes", email: "julie@voorbeeld.be" },
  { name: "Karim Ben Salah", email: "karim@voorbeeld.be" },
  { name: "Lotte Willems", email: "lotte@voorbeeld.be" },
];

const productenlijst = [
  { titel: "Sneakers maat 42", bedrag: 8900 },
  { titel: "Winterjas", bedrag: 14950 },
  { titel: "Sokken, 3-pak", bedrag: 1850 },
  { titel: "Rugzak", bedrag: 5500 },
  { titel: "Muts", bedrag: 2400 },
  { titel: "Regenjas", bedrag: 7995 },
  { titel: "Sjaal, wol", bedrag: 3450 },
  { titel: "Handschoenen", bedrag: 2995 },
  { titel: "Sportbroek", bedrag: 4500 },
  { titel: "T-shirt, 2-pak", bedrag: 2900 },
];

/** Generator met vaste startwaarde, zodat dezelfde opdracht dezelfde data geeft. */
function maakToeval(zaad: number) {
  let stand = zaad;
  return () => {
    stand = (stand * 1103515245 + 12345) % 2147483648;
    return stand / 2147483648;
  };
}

const kies = <T,>(lijst: T[], toeval: () => number): T =>
  lijst[Math.floor(toeval() * lijst.length)];

async function vulMetTestgegevens(businessId: string) {
  const toeval = maakToeval(20260913);

  const klanten = [];
  for (const k of klantenlijst) {
    klanten.push(
      await db.customer.upsert({
        where: { businessId_email: { businessId, email: k.email } },
        update: { name: k.name },
        create: { ...k, businessId },
      }),
    );
  }

  const links = [];
  for (const p of productenlijst) {
    links.push(
      await db.paymentLink.create({
        data: {
          businessId,
          slug: `pl_${randomBytes(8).toString("hex")}`,
          title: p.titel,
          description: "Bestelling via de webshop",
          amount: p.bedrag,
          active: true,
        },
      }),
    );
  }

  // Betalingen over 90 dagen. Vier op de zes slagen, en het loopt geleidelijk
  // op naar vandaag: zo laat de grafiek een echte lijn zien in plaats van ruis.
  const statussen: PaymentStatus[] = ["paid", "paid", "paid", "paid", "failed", "pending"];
  const methodes: PaymentMethod[] = ["bancontact", "bancontact", "bancontact", "card"];
  let aantal = 0;
  let terugbetaald = 0;

  for (let dagGeleden = 89; dagGeleden >= 0; dagGeleden--) {
    const datum = new Date();
    datum.setDate(datum.getDate() - dagGeleden);
    datum.setHours(0, 0, 0, 0);

    const weekend = datum.getDay() === 0 || datum.getDay() === 6;
    const groei = 1 + (90 - dagGeleden) / 90; // langzaam drukker
    const perDag = Math.floor(toeval() * (weekend ? 2 : 4) * groei);

    for (let i = 0; i < perDag; i++) {
      const link = kies(links, toeval);
      const klant = kies(klanten, toeval);
      const status = kies(statussen, toeval);
      const methode = kies(methodes, toeval);

      const moment = new Date(datum);
      moment.setHours(9 + Math.floor(toeval() * 11), Math.floor(toeval() * 60), 0, 0);

      const order = await db.order.create({
        data: {
          businessId,
          customerId: klant.id,
          reference: `ord_${randomBytes(8).toString("hex")}`,
          description: link.title,
          amount: link.amount,
          createdAt: moment,
        },
      });

      const payment = await db.payment.create({
        data: {
          businessId,
          orderId: order.id,
          customerId: klant.id,
          paymentLinkId: link.id,
          amount: link.amount,
          method: methode,
          status,
          description: link.title,
          provider: "simulated",
          providerPaymentId: `sim_${randomBytes(12).toString("hex")}`,
          failureReason: status === "failed" ? "Gesimuleerde weigering (testmodus)" : null,
          paidAt: status === "paid" ? moment : null,
          createdAt: moment,
        },
      });

      if (status === "paid" && toeval() < 0.07) {
        await db.refund.create({
          data: {
            paymentId: payment.id,
            amount: payment.amount,
            reason: "Klant heeft geretourneerd",
            createdAt: moment,
          },
        });
        await db.payment.update({
          where: { id: payment.id },
          data: { refundedAmount: payment.amount, status: "refunded" },
        });
        terugbetaald++;
      }

      aantal++;
    }
  }

  // Facturen: één betaald, enkele open, één vervallen.
  const jaar = new Date().getFullYear();
  const bestaandeFacturen = await db.invoice.count({ where: { businessId } });
  const facturen: { status: "paid" | "open"; dagen: number }[] = [
    { status: "paid", dagen: -20 },
    { status: "open", dagen: -3 }, // al vervallen
    { status: "open", dagen: 14 },
    { status: "open", dagen: 30 },
    { status: "open", dagen: 45 },
  ];

  for (const [i, f] of facturen.entries()) {
    const vervalt = new Date();
    vervalt.setDate(vervalt.getDate() + f.dagen);

    await db.invoice.create({
      data: {
        businessId,
        customerId: klanten[i % klanten.length].id,
        number: `${jaar}-${String(bestaandeFacturen + i + 1).padStart(4, "0")}`,
        amount: 4500 + i * 3250,
        description: "Maandelijkse levering",
        status: f.status,
        dueAt: vervalt,
      },
    });
  }

  return {
    klanten: klanten.length,
    links: links.length,
    betalingen: aantal,
    terugbetalingen: terugbetaald,
    facturen: facturen.length,
  };
}

async function maakLeeg(businessId: string) {
  // Volgorde telt: eerst wat naar betalingen verwijst.
  await db.refund.deleteMany({ where: { payment: { businessId } } });
  await db.payment.deleteMany({ where: { businessId } });
  await db.order.deleteMany({ where: { businessId } });
  await db.paymentLink.deleteMany({ where: { businessId } });
  await db.invoice.deleteMany({ where: { businessId } });
  await db.webhookEvent.deleteMany({ where: { businessId } });
}

/* ---------------------------------------------------------------- */

async function main() {
  const args = leesArgumenten(process.argv.slice(2));

  const email = String(args.email ?? "").trim().toLowerCase();
  const wachtwoord = String(args.wachtwoord ?? process.env.PAYLITY_WACHTWOORD ?? "");

  if (!email) stop("Geef een e-mailadres op met --email.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) stop(`"${email}" is geen geldig e-mailadres.`);
  if (!wachtwoord) stop("Geef een wachtwoord op met --wachtwoord (of via PAYLITY_WACHTWOORD).");
  if (wachtwoord.length < 10) {
    stop(`Het wachtwoord moet minstens 10 tekens hebben; dit heeft er ${wachtwoord.length}.`);
  }

  const standaardNaam = email.split("@")[0];
  const naam = String(args.naam ?? standaardNaam);
  const bedrijf = String(args.bedrijf ?? naam);

  const passwordHash = await bcrypt.hash(wachtwoord, 12);

  let user = await db.user.findUnique({
    where: { email },
    include: { businesses: true },
  });

  let nieuw = false;

  if (user) {
    console.log(`Account ${email} bestaat al — wachtwoord bijgewerkt.`);
    user = await db.user.update({
      where: { id: user.id },
      data: { passwordHash },
      include: { businesses: true },
    });
    // Oude sessies ongeldig maken: wie nog ingelogd was met het oude
    // wachtwoord moet opnieuw inloggen.
    await db.session.deleteMany({ where: { userId: user.id } });
  } else {
    nieuw = true;
    user = await db.user.create({
      data: { email, name: naam, passwordHash },
      include: { businesses: true },
    });
    console.log(`Account ${email} aangemaakt.`);
  }

  let business = user.businesses[0];
  if (!business) {
    business = await db.business.create({
      data: { name: bedrijf, email, ownerId: user.id },
    });
    console.log(`Bedrijf "${business.name}" aangemaakt.`);
  } else if (args.bedrijf && business.name !== bedrijf) {
    business = await db.business.update({
      where: { id: business.id },
      data: { name: bedrijf },
    });
    console.log(`Bedrijfsnaam gewijzigd in "${business.name}".`);
  }

  if (args.leegmaken) {
    await maakLeeg(business.id);
    console.log("Bestaande testgegevens van dit bedrijf gewist.");
  }

  const apiKey = `sk_test_${randomBytes(24).toString("base64url")}`;
  await db.apiKey.create({
    data: {
      businessId: business.id,
      name: nieuw ? "Eerste testsleutel" : `Sleutel van ${new Date().toLocaleDateString("nl-BE")}`,
      keyHash: createHash("sha256").update(apiKey).digest("hex"),
      keyPrefix: apiKey.slice(0, 16),
    },
  });

  let gevuld: Awaited<ReturnType<typeof vulMetTestgegevens>> | null = null;
  if (args.demo) {
    console.log("Testgegevens aanmaken over 90 dagen…");
    gevuld = await vulMetTestgegevens(business.id);
  }

  const adres = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  console.log(`
Klaar.

  Inloggen op:  ${adres}/login
  E-mailadres:  ${email}
  Wachtwoord:   het wachtwoord dat je zelf hebt opgegeven
  Bedrijf:      ${business.name}
  API-sleutel:  ${apiKey}
${
  gevuld
    ? `
  ${gevuld.klanten} klanten, ${gevuld.links} betaallinks, ${gevuld.betalingen} betalingen,
  ${gevuld.terugbetalingen} terugbetalingen en ${gevuld.facturen} facturen.
`
    : ""
}
Bewaar de API-sleutel: hij staat alleen gehasht in de database en is hierna
niet meer op te vragen. Je wachtwoord staat er gehasht in met bcrypt en wordt
hier met opzet niet herhaald.
`);
}

main()
  .catch((err) => {
    console.error("Het account aanmaken is mislukt:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
