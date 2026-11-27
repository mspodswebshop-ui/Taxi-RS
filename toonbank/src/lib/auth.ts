/**
 * Inloggen voor winkeliers.
 *
 * - Wachtwoorden worden gehasht met bcrypt.
 * - Een sessie is een willekeurige sleutel in een httpOnly-cookie; in de
 *   database staat alleen de SHA-256 ervan.
 */

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import type { Store } from "@prisma/client";

import { db } from "@/lib/db";

const COOKIE_NAME = "toonbank_session";
const SESSION_DAYS = 30;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { tokenHash: hashToken(token), userId, expiresAt } });

  const jar = await cookies();
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } });
  }
  jar.delete(COOKIE_NAME);
}

export type Merchant = {
  user: { id: string; name: string; email: string };
  store: Store;
};

/** De ingelogde winkelier met zijn winkel, of null. */
export async function currentMerchant(): Promise<Merchant | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: { include: { stores: { orderBy: { createdAt: "asc" }, take: 1 } } } },
  });
  if (!session || session.expiresAt < new Date()) return null;

  const store = session.user.stores[0];
  if (!store) return null;

  const { id, name, email } = session.user;
  return { user: { id, name, email }, store };
}

/** Voor beheerpagina's en -acties: stuurt naar het inlogscherm als het moet. */
export async function requireMerchant(): Promise<Merchant> {
  const merchant = await currentMerchant();
  if (!merchant) redirect("/login");
  return merchant;
}
