import { NextResponse, type NextRequest } from "next/server";

import { jsonError } from "@/lib/api";
import { createSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { checkoutLimiter, clientIp } from "@/lib/rate-limit";
import { loginSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const limit = checkoutLimiter.check(`login:${clientIp(req.headers)}`);
  if (!limit.allowed) {
    return jsonError(429, "rate_limited", "Te veel inlogpogingen. Wacht even.");
  }

  let input;
  try {
    input = loginSchema.parse(await req.json());
  } catch {
    return jsonError(422, "validation_failed", "Vul een e-mailadres en wachtwoord in.");
  }

  const user = await db.user.findUnique({ where: { email: input.email } });

  // Bij een onbekend e-mailadres tóch een wachtwoordcontrole doen, zodat het
  // antwoord even lang duurt. Anders kan iemand aan de reactietijd zien welke
  // adressen bestaan.
  const hash = user?.passwordHash ?? "$2a$12$ongeldigeplaceholderhashvoorwachttijd000000000000000000";
  const klopt = await verifyPassword(input.password, hash);

  if (!user || !klopt) {
    return jsonError(401, "invalid_credentials", "E-mailadres of wachtwoord klopt niet.");
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
