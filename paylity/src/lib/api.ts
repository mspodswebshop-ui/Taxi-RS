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

/**
 * Verpakt een route die géén API-sleutel gebruikt: inloggen, registreren, de
 * checkout, het dashboard.
 *
 * Die routes gingen langs `handle` heen en hadden dus geen vangnet. Ging er
 * iets onverwachts mis — de database eruit, een migratie niet gedraaid — dan
 * stuurde Next een LEEG antwoord met status 500. De browser probeert daar JSON
 * van te maken, dat lukt niet, en de bezoeker krijgt een onbegrijpelijke
 * melding van zijn browser te zien in plaats van wat er aan de hand is.
 */
export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      return toErrorResponse(err);
    }
  };
}

/**
 * Herkent problemen met de database en zet ze om in gewone taal.
 *
 * Zonder dit krijgt de bezoeker een kaal "Er ging iets mis" terug — of erger,
 * een lege 500 waar de browser op stukloopt. De meeste oorzaken zijn banaal
 * (database staat uit, migratie niet gedraaid, .env niet ingevuld) en dan hoor
 * je dat gewoon te zeggen.
 *
 * Er wordt op naam en foutcode gekeken in plaats van op een geïmporteerde
 * klasse: die verhuist tussen Prisma-versies, deze namen niet.
 */
function databaseProbleem(err: unknown): string | null {
  if (!err || typeof err !== "object") return null;

  const naam = "name" in err ? String(err.name) : "";
  const code = "code" in err ? String(err.code) : "";
  const tekst = "message" in err ? String(err.message) : "";

  if (tekst.includes("Environment variable not found: DATABASE_URL")) {
    return "DATABASE_URL is niet ingesteld. Kopieer .env.example naar .env en vul de databaseverbinding in.";
  }
  if (naam === "PrismaClientInitializationError" || ["P1000", "P1001", "P1002", "P1017"].includes(code)) {
    return "De database is niet bereikbaar. Controleer DATABASE_URL en of de database draait.";
  }
  if (["P2021", "P2022"].includes(code) || tekst.includes("does not exist in the current database")) {
    return "De tabellen bestaan nog niet in de database. Voer eerst `npm run db:deploy` uit.";
  }
  return null;
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

  const database = databaseProbleem(err);
  if (database) {
    console.error("Databaseprobleem:", err);
    return jsonError(503, "database_unavailable", database);
  }

  console.error("Onverwachte fout in de API:", err);
  return jsonError(500, "internal_error", "Er ging iets mis aan onze kant.");
}

/**
 * Antwoord voor een methode die dit pad niet ondersteunt.
 *
 * Zonder dit stuurt Next een leeg antwoord met status 405. Een client die JSON
 * verwacht ziet dan alleen een code en niet wat er wel mag. De Allow-header
 * hoort volgens de HTTP-specificatie bij een 405, dus die zit erbij.
 */
export function methodNotAllowed(toegestaan: string[]) {
  return async () =>
    NextResponse.json(
      {
        error: {
          code: "method_not_allowed",
          message: `Deze methode werkt niet op dit pad. Toegestaan: ${toegestaan.join(", ")}.`,
        },
      },
      { status: 405, headers: { Allow: toegestaan.join(", ") } },
    );
}

/** Bouwt een lijstantwoord met dezelfde vorm voor alle bronnen. */
export function listResponse<T>(data: T[], total: number, limit: number, offset: number) {
  return NextResponse.json({
    object: "list",
    data,
    pagination: { total, limit, offset, hasMore: offset + data.length < total },
  });
}
