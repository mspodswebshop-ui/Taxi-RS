import { NextResponse, type NextRequest } from "next/server";

import { createAdminSession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError, readJson, sameOrigin } from "@/lib/http";
import { clientIp, loginLimiter } from "@/lib/rate-limit";

// Hash om mee te vergelijken als het e-mailadres niet bestaat, zodat de
// responstijd niet verraadt welke adressen een account hebben.
let dummyHash: Promise<string> | undefined;

/** Beheerder logt in met e-mail en wachtwoord. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");

  const limit = loginLimiter.check(`admin:${clientIp(req.headers)}`);
  if (!limit.allowed) {
    return jsonError(429, `Te veel pogingen. Probeer het over ${Math.ceil(limit.retryAfterSeconds / 60)} minuten opnieuw.`);
  }

  const body = (await readJson(req, 4096).catch(() => null)) as { email?: unknown; password?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  const admin = email ? await db.admin.findUnique({ where: { email } }) : null;
  dummyHash ??= hashPassword("weblity-dummy");
  const ok = await verifyPassword(password, admin?.passwordHash ?? (await dummyHash));
  if (!admin || !ok) return jsonError(401, "E-mail of wachtwoord klopt niet.");

  await createAdminSession(admin.id);
  return NextResponse.json({ ok: true });
}
