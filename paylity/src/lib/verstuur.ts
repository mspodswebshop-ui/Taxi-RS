/**
 * Verzoeken versturen vanuit de browser, zonder erop stuk te lopen.
 *
 * `await res.json()` lijkt onschuldig, maar gooit een fout zodra het antwoord
 * geen JSON is: een lege 500, een foutpagina van een proxy, een 404. De melding
 * die de bezoeker dan ziet komt van zijn browser en niet van ons — Safari zegt
 * bijvoorbeeld "de tekenreeks kwam niet overeen met het verwachte patroon".
 * Daar kan niemand iets mee.
 *
 * Daarom wordt het antwoord hier eerst als tekst gelezen en pas daarna
 * voorzichtig ontleed. Lukt dat niet, dan maken we zelf een melding die zegt
 * wat er waarschijnlijk aan de hand is.
 */

export type Antwoord<T> =
  | { ok: true; data: T }
  | { ok: false; melding: string; status: number };

/** Vertaalt een statuscode zonder bruikbare body naar iets begrijpelijks. */
function uitleg(status: number): string {
  if (status === 0) {
    return "Geen verbinding met de server. Draait de app nog?";
  }
  if (status === 503) {
    return "De database is niet bereikbaar. Controleer DATABASE_URL en of de database draait.";
  }
  if (status >= 500) {
    return `De server gaf fout ${status} zonder uitleg. Meestal is de database niet bereikbaar of zijn de tabellen nog niet aangemaakt (npm run db:deploy).`;
  }
  if (status === 404) {
    return "De server kent dit adres niet (404). Draait Paylity wel op dit adres, en is het een volledige Next.js-server?";
  }
  if (status === 405) {
    return "De server weigert deze methode (405). Dit adres serveert waarschijnlijk alleen bestanden en geen API.";
  }
  if (status === 401 || status === 403) {
    return "Je hebt hier geen toegang toe. Log opnieuw in.";
  }
  return `Het verzoek is niet gelukt (${status}).`;
}

export async function verstuurJson<T>(
  url: string,
  opties: { method?: string; body?: unknown } = {},
): Promise<Antwoord<T>> {
  let res: Response;

  try {
    res = await fetch(url, {
      method: opties.method ?? "POST",
      headers: opties.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: opties.body === undefined ? undefined : JSON.stringify(opties.body),
    });
  } catch {
    // Netwerkfout: server weg, geen internet, geblokkeerd door de browser.
    return { ok: false, melding: uitleg(0), status: 0 };
  }

  const tekst = await res.text().catch(() => "");

  let data: unknown = null;
  if (tekst.trim()) {
    try {
      data = JSON.parse(tekst);
    } catch {
      data = null;
    }
  }

  if (res.ok) {
    if (data === null) {
      return {
        ok: false,
        melding:
          "De server antwoordde wel, maar niet met gegevens die wij kunnen lezen. Draait er een volledige Next.js-server op dit adres?",
        status: res.status,
      };
    }
    return { ok: true, data: data as T };
  }

  const melding =
    data && typeof data === "object" && "error" in data
      ? (data.error as { message?: string })?.message
      : undefined;

  return { ok: false, melding: melding ?? uitleg(res.status), status: res.status };
}
