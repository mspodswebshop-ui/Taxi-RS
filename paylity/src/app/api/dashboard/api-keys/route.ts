import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { generateApiKey } from "@/lib/api-auth";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

/** POST /api/dashboard/api-keys - een nieuwe testsleutel aanmaken. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError(401, "unauthorized", "Je bent niet ingelogd.");

  const body = await req.json().catch(() => ({}));
  const naam = String(body?.name ?? "").trim().slice(0, 60) || "Testsleutel";

  const { key, hash, prefix } = generateApiKey();
  await db.apiKey.create({
    data: { businessId: user.businessId, name: naam, keyHash: hash, keyPrefix: prefix },
  });

  // De volledige sleutel komt hier één keer terug en is daarna weg.
  return NextResponse.json({ key, prefix }, { status: 201 });
}

/** DELETE /api/dashboard/api-keys?id=... - een sleutel intrekken. */
export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError(401, "unauthorized", "Je bent niet ingelogd.");

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return jsonError(400, "missing_id", "Geef aan welke sleutel ingetrokken wordt.");

  const sleutel = await db.apiKey.findFirst({
    where: { id, businessId: user.businessId },
    select: { id: true },
  });
  if (!sleutel) return jsonError(404, "not_found", "Deze sleutel bestaat niet.");

  await db.apiKey.update({ where: { id }, data: { revokedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
