import { PrismaClient } from "@prisma/client";

/**
 * De databaseverbinding.
 *
 * De verbindingsreeks kan uit drie plekken komen, in deze volgorde:
 *
 *   1. DATABASE_URL      — wat je zelf in .env zet. Dit wint altijd.
 *   2. NETLIFY_DB_URL    — zet Netlify zelf klaar zodra @netlify/database in
 *                          package.json staat. Je hoeft dan geen database te
 *                          regelen en geen verbindingsreeks over te typen.
 *   3. NETLIFY_DATABASE_URL — de naam die de oudere Netlify-databasekoppeling
 *                          gebruikt. Staat erbij zodat beide werken.
 *
 * Vindt hij niets, dan start de app gewoon op en zegt /api/health wat eraan
 * ontbreekt. Dat is bruikbaarder dan een server die weigert te starten.
 */
function verbindingsreeks(): string | undefined {
  return (
    process.env.DATABASE_URL ||
    process.env.NETLIFY_DB_URL ||
    process.env.NETLIFY_DATABASE_URL ||
    undefined
  );
}

export const databaseUrl = verbindingsreeks();

// Tijdens het ontwikkelen herlaadt Next.js modules bij elke wijziging. Zonder
// deze hergebruik-truc zou elke herlaadbeurt een nieuwe databaseverbinding
// openen tot de database er genoeg heeft.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Meegeven in plaats van Prisma zelf DATABASE_URL laten lezen: anders
    // ziet hij NETLIFY_DB_URL niet.
    ...(databaseUrl ? { datasourceUrl: databaseUrl } : {}),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
