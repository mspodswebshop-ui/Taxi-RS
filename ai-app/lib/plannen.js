/**
 * De drie abonnementen: wat ze kosten en wat je ervoor krijgt.
 *
 * Pure gegevens, zonder SDK of omgevingsvariabelen, zodat zowel de server als
 * de browser dezelfde lijst gebruiken.
 *
 * `budget` is het maximale bedrag aan API-kosten (in dollar) dat een abonnee
 * per betaalperiode mag verbruiken. Dat beschermt je marge: één abonnee die
 * de hele maand Fable 5.1 op `max` gebruikt, kan anders meer kosten dan hij
 * betaalt. Het budget gaat nooit naar de browser; de bezoeker ziet alleen
 * welk percentage hij heeft gebruikt.
 *
 * De bedragen zijn inclusief btw. Wil je een prijs wijzigen, verhoog dan ook
 * het versienummer in PRIJS_VERSIE: Stripe-prijzen zijn niet aan te passen,
 * dus de server maakt dan een nieuwe prijs aan. Lopende abonnementen houden
 * hun oude prijs tot je ze zelf omzet.
 */

export const PRIJS_VERSIE = "v1";

export const DENKKRACHT_VOLGORDE = ["low", "medium", "high", "xhigh", "max"];

export const PLANNEN = [
  {
    id: "standaard",
    naam: "Standaard",
    bedrag: 800, // in centen
    tagline: "Voor dagelijkse vragen",
    modellen: ["claude-sonnet-5", "claude-haiku-4-5"],
    maxDenkkracht: "high",
    budget: 3,
    kenmerken: [
      "Chatten met Sonnet 5 en Haiku 4.5",
      "Denkkracht tot Hoog",
      "Onbeperkt aantal gesprekken",
      "Maandelijks opzegbaar",
    ],
  },
  {
    id: "medium",
    naam: "Medium",
    bedrag: 1500,
    tagline: "Meer gebruik, sterkere modellen",
    modellen: ["claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"],
    maxDenkkracht: "xhigh",
    budget: 6,
    kenmerken: [
      "Alles van Standaard",
      "Ook Opus 5, sterk in code en analyse",
      "Denkkracht tot Extra",
      "Ongeveer 2x zoveel gebruik als Standaard",
    ],
  },
  {
    id: "pro",
    naam: "Pro",
    bedrag: 2200,
    tagline: "Het krachtigste model, het meeste gebruik",
    modellen: ["claude-fable-5-1", "claude-opus-5", "claude-sonnet-5", "claude-haiku-4-5"],
    maxDenkkracht: "max",
    budget: 9,
    aanbevolen: true,
    kenmerken: [
      "Alles van Medium",
      "Ook Fable 5.1, ons krachtigste model",
      "Denkkracht tot Max",
      "Ongeveer 3x zoveel gebruik als Standaard",
    ],
  },
];

export const PLAN_IDS = new Set(PLANNEN.map((p) => p.id));

export const planVan = (id) => PLANNEN.find((p) => p.id === id) ?? null;

/** Wat de browser over de abonnementen mag weten: alles behalve het budget. */
export function publiekePlannen() {
  return PLANNEN.map(({ budget, ...rest }) => rest);
}

/** Mag dit abonnement dit model gebruiken? */
export function planStaatModelToe(plan, modelId) {
  return Boolean(plan?.modellen.includes(modelId));
}

/** Mag dit abonnement deze denkkracht gebruiken? */
export function planStaatDenkkrachtToe(plan, effort) {
  if (!plan) return false;
  return (
    DENKKRACHT_VOLGORDE.indexOf(effort) <= DENKKRACHT_VOLGORDE.indexOf(plan.maxDenkkracht)
  );
}

/** Het goedkoopste abonnement waarmee dit model wel kan. */
export function goedkoopstePlanVoorModel(modelId) {
  return PLANNEN.find((p) => p.modellen.includes(modelId)) ?? null;
}

/** Het goedkoopste abonnement waarmee deze denkkracht wel kan. */
export function goedkoopstePlanVoorDenkkracht(effort) {
  return PLANNEN.find((p) => planStaatDenkkrachtToe(p, effort)) ?? null;
}
