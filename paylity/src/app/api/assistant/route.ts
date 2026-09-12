import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api";
import { getBrain } from "@/lib/assistant";
import { currentUser } from "@/lib/auth";
import { checkoutLimiter } from "@/lib/rate-limit";

/** POST /api/assistant - een vraag aan de assistent stellen. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError(401, "unauthorized", "Je bent niet ingelogd.");

  const limit = checkoutLimiter.check(`assistant:${user.businessId}`);
  if (!limit.allowed) {
    return jsonError(429, "rate_limited", "Te veel vragen achter elkaar. Wacht even.");
  }

  const body = await req.json().catch(() => ({}));
  const vraag = String(body?.question ?? "").trim();

  if (!vraag) return jsonError(400, "missing_question", "Stel een vraag.");
  if (vraag.length > 500) return jsonError(400, "too_long", "Die vraag is te lang.");

  // De assistent krijgt alleen het eigen bedrijf mee, dus hij kan nooit bij
  // cijfers van een ander bedrijf komen.
  const antwoord = await getBrain().answer(vraag, user.businessId);
  return NextResponse.json(antwoord);
}
