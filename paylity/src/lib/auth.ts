/**
 * Authenticatie voor het dashboard.
 *
 * Opzet:
 * - Wachtwoorden worden gehasht met bcrypt. Het wachtwoord zelf komt nooit
 *   in de database of in een logregel terecht.
 * - Een sessie is een willekeurige sleutel van 32 bytes in een httpOnly-cookie.
 *   In de database staat alleen de SHA-256 van die sleutel: lekt de database,
 *   dan kan niemand er een geldige sessie mee overnemen.
 * - De cookie is httpOnly (niet leesbaar voor scripts), sameSite lax (beperkt
 *   misbruik vanaf andere sites) en secure zodra de app via https draait.
 */

import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

const COOKIE_NAME = "paylity_session";
const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Vergelijking die niet sneller stopt bij een verschil, tegen timing-aanvallen. */
export function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Maakt een sessie aan en zet de cookie. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await db.session.create({
    data: { tokenHash: hashToken(token), userId, expiresAt },
  });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  businessId: string;
  businessName: string;
};

/**
 * Geeft de ingelogde gebruiker terug, of null.
 *
 * Een verlopen sessie telt niet mee, ook al staat de cookie er nog.
 */
export async function currentUser(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { businesses: { take: 1 } } } },
  });

  if (!session || session.expiresAt < new Date()) return null;

  const business = session.user.businesses[0];
  if (!business) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    businessId: business.id,
    businessName: business.name,
  };
}

/** Verwijdert de sessie uit de database en wist de cookie. */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;

  if (token) {
    await db.session
      .deleteMany({ where: { tokenHash: hashToken(token) } })
      .catch(() => {
        /* al weg, prima */
      });
  }
  jar.delete(COOKIE_NAME);
}
