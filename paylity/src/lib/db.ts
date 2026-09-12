import { PrismaClient } from "@prisma/client";

// Tijdens het ontwikkelen herlaadt Next.js modules bij elke wijziging. Zonder
// deze hergebruik-truc zou elke herlaadbeurt een nieuwe databaseverbinding
// openen tot de database er genoeg heeft.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
