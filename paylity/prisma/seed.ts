/**
 * Testgegevens voor Paylity.
 *
 * Maakt één demobedrijf met klanten, betaallinks en betalingen verspreid over
 * de laatste 30 dagen, zodat het dashboard en de grafiek iets laten zien.
 *
 * Alles hierin is verzonnen. Er staat geen kaartnummer, CVC, pincode of IBAN
 * in — die velden bestaan niet eens in het schema.
 *
 * Uitvoeren: npm run db:seed
 */

import { createHash, randomBytes } from "node:crypto";

import { PrismaClient, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const DEMO_EMAIL = "demo@paylity.test";
const DEMO_WACHTWOORD = "paylity-demo-2026";

const klanten = [
  { name: "Anke Verstraeten", email: "anke@voorbeeld.be" },
  { name: "Bram De Coster", email: "bram@voorbeeld.be" },
  { name: "Chaima El Amrani", email: "chaima@voorbeeld.be" },
  { name: "Dries Peeters", email: "dries@voorbeeld.be" },
  { name: "Eva Janssens", email: "eva@voorbeeld.be" },
];

const producten = [
  { titel: "Sneakers maat 42", bedrag: 8900 },
  { titel: "Winterjas", bedrag: 14950 },
  { titel: "Sokken, 3-pak", bedrag: 1850 },
  { titel: "Rugzak", bedrag: 5500 },
  { titel: "Muts", bedrag: 2400 },
];

/** Eenvoudige generator met vaste startwaarde, zodat de data reproduceerbaar is. */
function maakToeval(zaad: number) {
  let stand = zaad;
  return () => {
    stand = (stand * 1103515245 + 12345) % 2147483648;
    return stand / 2147483648;
  };
}

async function main() {
  const toeval = maakToeval(20260912);

  console.log("Testgegevens aanmaken…");

  // Schoon beginnen: alleen het demobedrijf, niets van anderen.
  const bestaand = await db.user.findUnique({ where: { email: DEMO_EMAIL } });
  if (bestaand) {
    await db.user.delete({ where: { id: bestaand.id } });
    console.log("  vorige demogegevens verwijderd");
  }

  const apiKey = `sk_test_${randomBytes(24).toString("base64url")}`;

  const user = await db.user.create({
    data: {
      email: DEMO_EMAIL,
      name: "Demo Gebruiker",
      passwordHash: await bcrypt.hash(DEMO_WACHTWOORD, 12),
      businesses: {
        create: {
          name: "Demo Webshop",
          email: DEMO_EMAIL,
          apiKeys: {
            create: {
              name: "Seed-testsleutel",
              keyHash: createHash("sha256").update(apiKey).digest("hex"),
              keyPrefix: apiKey.slice(0, 16),
            },
          },
        },
      },
    },
    include: { businesses: true },
  });

  const business = user.businesses[0];

  const gemaakteKlanten = await Promise.all(
    klanten.map((k) =>
      db.customer.create({ data: { ...k, businessId: business.id } }),
    ),
  );

  const links = await Promise.all(
    producten.map((p) =>
      db.paymentLink.create({
        data: {
          businessId: business.id,
          slug: `pl_${randomBytes(8).toString("hex")}`,
          title: p.titel,
          description: `Bestelling via de webshop`,
          amount: p.bedrag,
          active: true,
        },
      }),
    ),
  );

  // Betalingen verspreid over 30 dagen.
  const statussen: PaymentStatus[] = ["paid", "paid", "paid", "paid", "failed", "pending"];
  const methodes: PaymentMethod[] = ["bancontact", "bancontact", "bancontact", "card"];
  let aantal = 0;

  for (let dagGeleden = 29; dagGeleden >= 0; dagGeleden--) {
    // Niet elke dag verkoop, en in het weekend wat minder.
    const datum = new Date();
    datum.setDate(datum.getDate() - dagGeleden);
    const weekend = datum.getDay() === 0 || datum.getDay() === 6;
    const perDag = Math.floor(toeval() * (weekend ? 2 : 4));

    for (let i = 0; i < perDag; i++) {
      const link = links[Math.floor(toeval() * links.length)];
      const klant = gemaakteKlanten[Math.floor(toeval() * gemaakteKlanten.length)];
      const status = statussen[Math.floor(toeval() * statussen.length)];
      const methode = methodes[Math.floor(toeval() * methodes.length)];

      const moment = new Date(datum);
      moment.setHours(9 + Math.floor(toeval() * 11), Math.floor(toeval() * 60), 0, 0);

      const order = await db.order.create({
        data: {
          businessId: business.id,
          customerId: klant.id,
          reference: `ord_${randomBytes(8).toString("hex")}`,
          description: link.title,
          amount: link.amount,
          createdAt: moment,
        },
      });

      const payment = await db.payment.create({
        data: {
          businessId: business.id,
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

      // Af en toe een terugbetaling op een geslaagde betaling.
      if (status === "paid" && toeval() < 0.08) {
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
      }

      aantal++;
    }
  }

  // Een paar facturen.
  for (let i = 0; i < 3; i++) {
    const klant = gemaakteKlanten[i];
    const vervalt = new Date();
    vervalt.setDate(vervalt.getDate() + 14 * (i + 1));

    await db.invoice.create({
      data: {
        businessId: business.id,
        customerId: klant.id,
        number: `${new Date().getFullYear()}-${String(i + 1).padStart(4, "0")}`,
        amount: 5000 + i * 2500,
        description: "Maandelijkse levering",
        status: i === 0 ? "paid" : "open",
        dueAt: vervalt,
      },
    });
  }

  console.log(`
Klaar.

  Inloggen:     ${DEMO_EMAIL}
  Wachtwoord:   ${DEMO_WACHTWOORD}
  API-sleutel:  ${apiKey}

  ${gemaakteKlanten.length} klanten, ${links.length} betaallinks, ${aantal} betalingen, 3 facturen.

Bewaar de API-sleutel: hij staat alleen gehasht in de database en is hierna
niet meer op te vragen.
`);
}

main()
  .catch((err) => {
    console.error("Testgegevens aanmaken is mislukt:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
