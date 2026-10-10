/**
 * Extra beheerder aanmaken of een wachtwoord vervangen.
 *
 * Gebruik: npm run admin:create -- jij@weblity.be "Je Naam"
 * Het wachtwoord wordt gevraagd via ADMIN_PASSWORD, of willekeurig gemaakt.
 */

import { randomBytes } from "node:crypto";

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = (process.argv[2] || process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const name = process.argv[3] || "Weblity";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error('Gebruik: npm run admin:create -- jij@weblity.be "Je Naam"');
    process.exit(1);
  }
  const password = process.env.ADMIN_PASSWORD || randomBytes(12).toString("base64url");
  if (password.length < 10) {
    console.error("Kies een wachtwoord van minstens 10 tekens.");
    process.exit(1);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.admin.upsert({ where: { email }, update: { passwordHash, name }, create: { email, name, passwordHash } });
  // Bestaande sessies van deze beheerder vervallen bij een nieuw wachtwoord.
  await db.session.deleteMany({ where: { kind: "admin", admin: { email } } });
  console.log(`Beheerder ${email} klaar.${process.env.ADMIN_PASSWORD ? "" : `  Wachtwoord: ${password}  (noteer het nu)`}`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
