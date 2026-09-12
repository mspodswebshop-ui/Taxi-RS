import { NextResponse, type NextRequest } from "next/server";

import { jsonError } from "@/lib/api";
import { createSession, hashPassword } from "@/lib/auth";
import { generateApiKey } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { checkoutLimiter, clientIp } from "@/lib/rate-limit";
import { signupSchema } from "@/lib/validation";

export async function POST(req: NextRequest) {
  const limit = checkoutLimiter.check(`signup:${clientIp(req.headers)}`);
  if (!limit.allowed) {
    return jsonError(429, "rate_limited", "Te veel pogingen. Wacht even.");
  }

  let input;
  try {
    input = signupSchema.parse(await req.json());
  } catch (err) {
    const issues =
      err && typeof err === "object" && "issues" in err
        ? (err as { issues: { message: string }[] }).issues
        : [];
    return jsonError(
      422,
      "validation_failed",
      issues[0]?.message ?? "De ingevulde gegevens kloppen niet.",
    );
  }

  const bestaat = await db.user.findUnique({ where: { email: input.email } });
  if (bestaat) {
    return jsonError(409, "already_exists", "Er bestaat al een account met dit e-mailadres.");
  }

  // Gebruiker, bedrijf en een eerste testsleutel in één keer aanmaken.
  const { key, hash, prefix } = generateApiKey();

  const user = await db.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash: await hashPassword(input.password),
      businesses: {
        create: {
          name: input.businessName,
          email: input.email,
          apiKeys: {
            create: { name: "Standaard testsleutel", keyHash: hash, keyPrefix: prefix },
          },
        },
      },
    },
  });

  await createSession(user.id);

  // De volledige sleutel is hierna niet meer op te vragen; alleen de hash
  // staat in de database.
  return NextResponse.json({ ok: true, apiKey: key }, { status: 201 });
}
