/**
 * Inloggen voor beheerders (jij) en klanten (met hun code).
 *
 * - Beheerders loggen in met e-mail en wachtwoord (bcrypt).
 * - Klanten loggen in met hun klantcode. Hun sessie hoort bij precies één
 *   site, en alles wat ze opslaan gaat naar die site. Welke site dat is,
 *   komt altijd uit de sessie, nooit uit wat de browser meestuurt.
 * - Een sessie is een willekeurige sleutel in een httpOnly-cookie. In de
 *   database staat alleen de SHA-256 ervan.
 * - Beheerder en klant hebben elk een eigen cookie, zodat jij als beheerder
 *   ook even als klant kunt kijken zonder uit te loggen.
 */

import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";

import { db } from "@/lib/db";

const ADMIN_COOKIE = "weblity_admin";
const CLIENT_COOKIE = "weblity_client";
const ADMIN_DAYS = 14;
const CLIENT_DAYS = 30;
const BCRYPT_ROUNDS = 12;

type Kind = "admin" | "client";
const cookieName = (kind: Kind) => (kind === "admin" ? ADMIN_COOKIE : CLIENT_COOKIE);

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

async function createSession(kind: Kind, ids: { adminId?: string; siteId?: string }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const days = kind === "admin" ? ADMIN_DAYS : CLIENT_DAYS;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await db.session.create({ data: { tokenHash: hashToken(token), kind, ...ids, expiresAt } });

  const jar = await cookies();
  jar.set(cookieName(kind), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export const createAdminSession = (adminId: string) => createSession("admin", { adminId });
export const createClientSession = (siteId: string) => createSession("client", { siteId });

async function findSession(kind: Kind) {
  const jar = await cookies();
  const token = jar.get(cookieName(kind))?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { admin: true, site: true },
  });
  if (!session || session.kind !== kind || session.expiresAt < new Date()) return null;
  return session;
}

export type AdminUser = { id: string; email: string; name: string };

export async function currentAdmin(): Promise<AdminUser | null> {
  const s = await findSession("admin");
  if (!s?.admin) return null;
  return { id: s.admin.id, email: s.admin.email, name: s.admin.name };
}

/** De site waarvoor de klant is ingelogd, of null. Een offline site telt niet. */
export async function currentClientSite() {
  const s = await findSession("client");
  if (!s?.site || s.site.status === "offline") return null;
  return s.site;
}

export async function destroySession(kind: Kind): Promise<void> {
  const jar = await cookies();
  const token = jar.get(cookieName(kind))?.value;
  if (token) {
    await db.session.deleteMany({ where: { tokenHash: hashToken(token) } }).catch(() => {});
  }
  jar.delete(cookieName(kind));
}

/** Logt alle klanten van een site uit, bv. nadat de code vernieuwd is. */
export async function revokeClientSessions(siteId: string): Promise<void> {
  await db.session.deleteMany({ where: { siteId, kind: "client" } });
}
