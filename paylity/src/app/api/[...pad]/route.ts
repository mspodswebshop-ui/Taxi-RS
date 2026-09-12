import { NextResponse } from "next/server";

/**
 * Vangnet voor onbekende API-paden.
 *
 * Zonder dit stuurt Next zijn eigen HTML-foutpagina terug. Een client die
 * JSON verwacht krijgt dan een pagina vol markup en kan de fout niet lezen.
 * Next kiest altijd eerst een specifiekere route, dus dit raakt alleen paden
 * die echt niet bestaan.
 */
function onbekend() {
  return NextResponse.json(
    {
      error: {
        code: "not_found",
        message: "Dit API-pad bestaat niet. Zie /docs voor alle endpoints.",
      },
    },
    { status: 404 },
  );
}

export const GET = onbekend;
export const POST = onbekend;
export const PUT = onbekend;
export const PATCH = onbekend;
export const DELETE = onbekend;
