/**
 * De HTTP-kant van de abonnementen, los van Express of Netlify.
 *
 * server.js en de Netlify-functies vertalen een verzoek naar een eenvoudig
 * object, roepen deze functies aan en sturen het antwoord terug. Zo staat de
 * logica op één plek en kunnen beide versies niet uit elkaar lopen.
 */

import { MODELS } from "./models.js";
import {
  PLANNEN,
  goedkoopstePlanVoorModel,
  planStaatDenkkrachtToe,
  planStaatModelToe,
  planVan,
  publiekePlannen,
} from "./plannen.js";
import {
  beheerLink,
  boekVerbruik,
  cookieVoor,
  cookieWissen,
  heeftStripe,
  klantUitToken,
  publiekeStand,
  standVanAbonnement,
  startAfrekenen,
  verwerkTerugkeer,
  vergeetCache,
} from "./abonnement.js";

const datum = (iso) =>
  iso ? new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long" }) : null;

/**
 * Handelt /api/abonnement/... en /abonnement/terug af.
 *
 * Krijgt { methode, pad, token, body, query, basisUrl } en geeft
 * { status, json } of { status, redirect } terug, met eventueel `cookie`
 * (een Set-Cookie-waarde).
 */
export async function behandelAbonnement({ methode, pad, token, body, query, basisUrl }) {
  const route = `${methode} ${pad.replace(/\/+$/, "")}`;

  try {
    switch (route) {
      case "GET /api/abonnement": {
        if (!heeftStripe()) {
          return { status: 200, json: { vereist: false, actief: true, plannen: publiekePlannen() } };
        }
        const stand = await standVanAbonnement(token);
        return {
          status: 200,
          json: { vereist: true, ...publiekeStand(stand), plannen: publiekePlannen() },
        };
      }

      case "POST /api/abonnement/start": {
        const uitkomst = await startAfrekenen(String(body?.plan || ""), basisUrl, token);
        return { status: 200, json: uitkomst };
      }

      // Hier komt de klant terug van de betaalpagina van Stripe.
      case "GET /abonnement/terug": {
        try {
          const nieuw = await verwerkTerugkeer(String(query?.sessie || ""));
          return { status: 302, redirect: "/?welkom=1", cookie: cookieVoor(nieuw, basisUrl) };
        } catch (err) {
          console.error("Terugkeer mislukt:", err);
          return { status: 302, redirect: "/?fout=" + encodeURIComponent(err.message) };
        }
      }

      // Inloggen op een tweede apparaat met de toegangscode.
      case "POST /api/abonnement/code": {
        const code = String(body?.code || "").trim();
        if (!klantUitToken(code)) {
          return { status: 404, json: { error: "Deze toegangscode kennen we niet." } };
        }
        vergeetCache(code);
        return { status: 200, json: { ok: true }, cookie: cookieVoor(code, basisUrl) };
      }

      // De eigen toegangscode opvragen, om op een ander apparaat te gebruiken.
      case "GET /api/abonnement/code": {
        const stand = await standVanAbonnement(token);
        if (!stand.actief) return { status: 403, json: { error: "Geen lopend abonnement." } };
        return { status: 200, json: { code: token } };
      }

      // Opzeggen, facturen en betaalgegevens: dat regelt Stripe zelf.
      case "POST /api/abonnement/beheer": {
        if (!klantUitToken(token)) {
          return { status: 403, json: { error: "Je bent niet ingelogd met een abonnement." } };
        }
        return { status: 200, json: { url: await beheerLink(token, basisUrl) } };
      }

      case "POST /api/abonnement/afmelden": {
        vergeetCache(token);
        return { status: 200, json: { ok: true }, cookie: cookieWissen() };
      }

      default:
        return { status: 404, json: { error: "Onbekend API-pad." } };
    }
  } catch (err) {
    console.error(`Abonnement (${route}) mislukt:`, err);
    return { status: 502, json: { error: err.message || "Er ging iets mis bij Stripe." } };
  }
}

/**
 * Bepaalt of dit chatverzoek door mag.
 *
 * Geeft { ok: true, stand } terug, of { ok: false, status, json } met een
 * melding die de browser kan tonen. De denkkracht wordt zo nodig verlaagd
 * tot wat het abonnement toestaat.
 */
export async function poortVoorChat(token, parsed) {
  if (!heeftStripe()) return { ok: true, stand: null };

  const stand = await standVanAbonnement(token);
  if (!stand.actief) {
    return {
      ok: false,
      status: 402,
      json: { error: "Kies een abonnement om te kunnen chatten.", abonnementNodig: true },
    };
  }

  const plan = planVan(stand.plan);
  if (!plan) {
    return {
      ok: false,
      status: 402,
      json: {
        error: "Je abonnement hoort niet bij een van onze plannen. Kies opnieuw een abonnement.",
        abonnementNodig: true,
      },
    };
  }

  if (!planStaatModelToe(plan, parsed.model)) {
    const label = MODELS.find((m) => m.id === parsed.model)?.label ?? parsed.model;
    const nodig = goedkoopstePlanVoorModel(parsed.model);
    return {
      ok: false,
      status: 403,
      json: {
        error: `${label} zit niet in je ${plan.naam}-abonnement.` +
          (nodig ? ` Upgrade naar ${nodig.naam} om het te gebruiken.` : ""),
        upgradeNaar: nodig?.id ?? null,
      },
    };
  }

  if (!planStaatDenkkrachtToe(plan, parsed.effort)) {
    parsed.effort = plan.maxDenkkracht;
  }

  if (stand.verbruikt >= plan.budget) {
    const volgende = PLANNEN[PLANNEN.indexOf(plan) + 1] ?? null;
    const opnieuw = datum(stand.eindigtOp);
    return {
      ok: false,
      status: 429,
      json: {
        error:
          "Je hebt je gebruikslimiet voor deze periode bereikt" +
          (opnieuw ? `. Op ${opnieuw} wordt die weer aangevuld.` : ".") +
          (volgende ? ` Of upgrade naar ${volgende.naam} voor meer gebruik.` : ""),
        limietBereikt: true,
        upgradeNaar: volgende?.id ?? null,
      },
    };
  }

  return { ok: true, stand };
}

/**
 * Geeft de gebeurtenissen van de chat door en boekt daarbij het verbruik.
 *
 * Bij `done` komt het werkelijke tokengebruik binnen; dat wordt geboekt en
 * het bijgewerkte gebruik gaat mee naar de browser. Wordt een antwoord
 * afgebroken (stopknop, tabblad dicht), dan is er geen eindtelling. Dan
 * boeken we een schatting op basis van wat er al gestreamd is, zodat
 * stoppen vlak voor het einde geen gratis antwoord oplevert.
 */
export async function* metVerbruik(events, stand, parsed) {
  if (!stand) {
    yield* events;
    return;
  }

  let geboekt = false;
  let gestreamd = 0;

  try {
    for await (const event of events) {
      if (event.type === "text" || event.type === "thinking") {
        gestreamd += event.text.length;
      }
      if (event.type === "done") {
        geboekt = true;
        const gebruik = await boekVerbruik(stand, event.usage, event.model ?? parsed.model);
        yield { ...event, gebruik };
        continue;
      }
      yield event;
    }
  } finally {
    if (!geboekt && gestreamd > 0) {
      // Grove schatting: ongeveer vier tekens per token.
      const invoer = JSON.stringify(parsed.messages).length + parsed.system.length;
      await boekVerbruik(
        stand,
        { input: Math.ceil(invoer / 4), output: Math.ceil(gestreamd / 3.5) },
        parsed.model,
      );
    }
  }
}
