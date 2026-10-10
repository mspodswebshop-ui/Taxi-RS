import { NextResponse, type NextRequest } from "next/server";

import { destroySession } from "@/lib/auth";
import { jsonError, sameOrigin } from "@/lib/http";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return jsonError(403, "Verzoek geweigerd.");
  const kind = req.nextUrl.searchParams.get("kind") === "admin" ? "admin" : "client";
  await destroySession(kind);
  return NextResponse.json({ ok: true });
}
