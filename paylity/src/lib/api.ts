/**
 * Gedeelde bouwstenen voor de REST API.
 *
 * Elke route gebruikt `handle`, zodat authenticatie, rate limiting, validatie
 * en foutafhandeling overal hetzelfde werken. Vergeten is dan niet mogelijk:
 * de route krijgt zijn context pas nadat de controles zijn geslaagd.
 */

import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

import { ApiError, authenticateRequest, type ApiContext } from "@/lib/api-auth";
import { apiLimiter } from "@/lib/rate-limit";

export function jsonError(status: number, code: string, message: string, extra?: unknown) {
  return NextResponse.json(
    { error: { code, message, ...(extra ? { details: extra } : {}) } },
    { status },
  );
}

type Handler<T> = (args: {
  req: NextRequest;
  ctx: ApiContext;
  body: T;
  params: Record<string, string>;
}) => Promise<NextResponse>;

type Options<T> = {
  /** Zod-schema voor de body. Weglaten betekent: geen body verwacht. */
  schema?: ZodType<T>;
};

/**
 * Verpakt een routehandler met alle controles eromheen.
 *
 * Volgorde is met opzet: eerst wie je bent (sleutel), dan hoe vaak je mag
 * (rate limit), dan wat je stuurt (validatie). Zo kost een ongeldige sleutel
 * geen validatiewerk, en telt een geweigerde sleutel niet mee als verbruik.
 */
export function handle<T = undefined>(handler: Handler<T>, options: Options<T> = {}) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> },
  ): Promise<NextResponse> => {
    try {
      const ctx = await authenticateRequest(req);

      const limit = apiLimiter.check(ctx.apiKeyId);
      if (!limit.allowed) {
        return NextResponse.json(
          {
            error: {
              code: "rate_limited",
              message: `Te veel verzoeken. Probeer het over ${limit.retryAfterSeconds} seconden opnieuw.`,
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(limit.retryAfterSeconds),
              "X-RateLimit-Remaining": "0",
            },
          },
        );
      }

      let body = undefined as T;
      if (options.schema) {
        const raw = await req.json().catch(() => {
          throw new ApiError(400, "invalid_json", "De body is geen geldige JSON.");
        });
        body = options.schema.parse(raw);
      }

      const params = await context.params;
      const response = await handler({ req, ctx, body, params: params ?? {} });
      response.headers.set("X-RateLimit-Remaining", String(limit.remaining));
      return response;
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

export function toErrorResponse(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return jsonError(err.status, err.code, err.message);
  }

  if (err instanceof ZodError) {
    return jsonError(
      422,
      "validation_failed",
      "De meegestuurde gegevens kloppen niet.",
      err.issues.map((issue) => ({
        veld: issue.path.join(".") || "(body)",
        melding: issue.message,
      })),
    );
  }

  console.error("Onverwachte fout in de API:", err);
  return jsonError(500, "internal_error", "Er ging iets mis aan onze kant.");
}

/** Bouwt een lijstantwoord met dezelfde vorm voor alle bronnen. */
export function listResponse<T>(data: T[], total: number, limit: number, offset: number) {
  return NextResponse.json({
    object: "list",
    data,
    pagination: { total, limit, offset, hasMore: offset + data.length < total },
  });
}
