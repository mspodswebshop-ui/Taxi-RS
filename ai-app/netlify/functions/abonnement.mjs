// Netlify-functie voor de abonnementen: /api/abonnement/... en de terugkeer
// van de betaalpagina van Stripe. Lokaal doet server.js hetzelfde; de logica
// komt uit lib/abonnement-routes.js.
import { tokenUitCookies } from "../../lib/abonnement.js";
import { behandelAbonnement } from "../../lib/abonnement-routes.js";

export default async (req) => {
  const url = new URL(req.url);

  let body = null;
  if (req.method === "POST") {
    try {
      body = await req.json();
    } catch {
      body = null;
    }
  }

  const antwoord = await behandelAbonnement({
    methode: req.method,
    pad: url.pathname,
    token: tokenUitCookies(req.headers.get("cookie")),
    body,
    query: Object.fromEntries(url.searchParams),
    // Netlify zet het adres van de site in URL. BASE_URL gaat voor, voor als
    // je een eigen domein gebruikt.
    basisUrl: process.env.BASE_URL || process.env.URL || url.origin,
  });

  const headers = new Headers();
  if (antwoord.cookie) headers.append("Set-Cookie", antwoord.cookie);

  if (antwoord.redirect) {
    headers.set("Location", antwoord.redirect);
    return new Response(null, { status: 302, headers });
  }

  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(antwoord.json), { status: antwoord.status, headers });
};

export const config = {
  path: ["/api/abonnement", "/api/abonnement/*", "/abonnement/terug"],
};
