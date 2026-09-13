import { NextResponse } from "next/server";

import { methodNotAllowed } from "@/lib/api";
import { databaseStatus } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * GET /api/health
 *
 * Zegt of de app kan doen wat hij belooft. Geen sleutel nodig: als dit niet
 * werkt, werkt inloggen ook niet, en dan moet je juist kunnen kijken.
 *
 * Er staat met opzet niets gevoeligs in — geen DATABASE_URL, geen sleutels,
 * alleen of het werkt en wat je eraan doet.
 */
export async function GET() {
  const database = await databaseStatus();

  return NextResponse.json(
    {
      ok: database.ok,
      mode: process.env.PAYLITY_MODE ?? "test",
      provider: process.env.PAYMENT_PROVIDER ?? "simulated",
      database,
      tijd: new Date().toISOString(),
    },
    { status: database.ok ? 200 : 503 },
  );
}

export const POST = methodNotAllowed(["GET"]);
export const PUT = methodNotAllowed(["GET"]);
export const PATCH = methodNotAllowed(["GET"]);
export const DELETE = methodNotAllowed(["GET"]);
