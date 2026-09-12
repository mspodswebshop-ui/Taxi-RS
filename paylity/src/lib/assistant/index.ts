/**
 * De AI-assistent van het dashboard.
 *
 * Opzet in twee lagen, met opzet gescheiden:
 *
 *   1. TOOLS  - functies die de cijfers uit de database halen. Ze werken
 *               altijd binnen één bedrijf en lezen alleen; ze kunnen niets
 *               wijzigen, verwijderen of betalen.
 *   2. BRAIN  - de laag die een vraag omzet in een aanroep van die tools.
 *               Nu zit daar een eenvoudige trefwoordherkenning in, zodat de
 *               assistent werkt zonder externe dienst en zonder kosten.
 *
 * Wil je later een echte AI-API koppelen, dan schrijf je een tweede `Brain`
 * die de vraag plus de lijst tools naar het model stuurt en het model laat
 * kiezen. De tools hoeven daarvoor niet te veranderen: dat is precies de reden
 * dat ze hier apart staan.
 *
 * Wat de assistent NOOIT te zien krijgt: kaartgegevens of wachtwoorden. Die
 * staan niet in de database, dus ze kunnen ook niet in een antwoord belanden.
 */

import "server-only";

import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export type AssistantAnswer = {
  answer: string;
  /** Welke functie het antwoord opleverde, zodat het navolgbaar blijft. */
  usedTool: string;
  data?: unknown;
};

type Tool = {
  name: string;
  description: string;
  /** Woorden die op deze vraag wijzen. */
  keywords: string[];
  run: (businessId: string) => Promise<AssistantAnswer>;
};

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth(): Date {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/* ---------------------------------------------------------------- */
/* De tools                                                          */
/* ---------------------------------------------------------------- */

export const tools: Tool[] = [
  {
    name: "omzet_vandaag",
    description: "Hoeveel er vandaag is ontvangen.",
    keywords: ["vandaag", "ontvangen vandaag", "dagomzet"],
    async run(businessId) {
      const result = await db.payment.aggregate({
        where: {
          businessId,
          status: { in: ["paid", "refunded"] },
          createdAt: { gte: startOfToday() },
        },
        _sum: { amount: true, refundedAmount: true },
        _count: true,
      });

      const netto = (result._sum.amount ?? 0) - (result._sum.refundedAmount ?? 0);
      return {
        usedTool: "omzet_vandaag",
        answer:
          result._count === 0
            ? "Vandaag zijn er nog geen betalingen binnengekomen."
            : `Vandaag is er ${formatMoney(netto)} ontvangen, verdeeld over ${result._count} ${
                result._count === 1 ? "betaling" : "betalingen"
              }.`,
        data: { nettoCent: netto, aantal: result._count },
      };
    },
  },
  {
    name: "omzet_deze_maand",
    description: "De omzet van de lopende maand.",
    keywords: ["deze maand", "maand", "maandomzet"],
    async run(businessId) {
      const result = await db.payment.aggregate({
        where: {
          businessId,
          status: { in: ["paid", "refunded"] },
          createdAt: { gte: startOfMonth() },
        },
        _sum: { amount: true, refundedAmount: true },
        _count: true,
      });

      const netto = (result._sum.amount ?? 0) - (result._sum.refundedAmount ?? 0);
      return {
        usedTool: "omzet_deze_maand",
        answer:
          result._count === 0
            ? "Deze maand zijn er nog geen betalingen binnengekomen."
            : `Deze maand is er ${formatMoney(netto)} ontvangen, uit ${result._count} ${
                result._count === 1 ? "betaling" : "betalingen"
              }.`,
        data: { nettoCent: netto, aantal: result._count },
      };
    },
  },
  {
    name: "laatste_betalingen",
    description: "De meest recente betalingen.",
    keywords: ["laatste", "recente", "toon betalingen", "overzicht betalingen"],
    async run(businessId) {
      const payments = await db.payment.findMany({
        where: { businessId },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { customer: true },
      });

      if (payments.length === 0) {
        return {
          usedTool: "laatste_betalingen",
          answer: "Er zijn nog geen betalingen.",
          data: [],
        };
      }

      const regels = payments.map((p) => {
        const wie = p.customer?.name ?? p.customer?.email ?? "onbekende klant";
        const tijd = p.createdAt.toLocaleString("nl-BE", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });
        return `- ${formatMoney(p.amount, p.currency)} van ${wie} (${p.status}, ${tijd})`;
      });

      return {
        usedTool: "laatste_betalingen",
        answer: `Dit zijn je laatste ${payments.length} betalingen:\n${regels.join("\n")}`,
        data: payments.map((p) => ({ id: p.id, amount: p.amount, status: p.status })),
      };
    },
  },
  {
    name: "mislukte_betalingen",
    description: "Hoeveel betalingen er zijn mislukt.",
    keywords: ["mislukt", "gefaald", "failed", "niet gelukt"],
    async run(businessId) {
      const [aantal, totaal] = await Promise.all([
        db.payment.count({ where: { businessId, status: "failed" } }),
        db.payment.count({ where: { businessId } }),
      ]);

      const percentage = totaal > 0 ? Math.round((aantal / totaal) * 100) : 0;
      return {
        usedTool: "mislukte_betalingen",
        answer:
          aantal === 0
            ? "Er zijn geen mislukte betalingen."
            : `Er ${aantal === 1 ? "is 1 betaling" : `zijn ${aantal} betalingen`} mislukt, op ${totaal} in totaal (${percentage}%).`,
        data: { mislukt: aantal, totaal, percentage },
      };
    },
  },
  {
    name: "terugbetalingen",
    description: "Hoeveel er is terugbetaald.",
    keywords: ["terugbetaald", "terugbetaling", "refund"],
    async run(businessId) {
      const result = await db.payment.aggregate({
        where: { businessId, refundedAmount: { gt: 0 } },
        _sum: { refundedAmount: true },
        _count: true,
      });

      const bedrag = result._sum.refundedAmount ?? 0;
      return {
        usedTool: "terugbetalingen",
        answer:
          result._count === 0
            ? "Er is nog niets terugbetaald."
            : `Er is ${formatMoney(bedrag)} terugbetaald, over ${result._count} ${
                result._count === 1 ? "betaling" : "betalingen"
              }.`,
        data: { bedragCent: bedrag, aantal: result._count },
      };
    },
  },
];

/* ---------------------------------------------------------------- */
/* De denklaag                                                       */
/* ---------------------------------------------------------------- */

export interface Brain {
  readonly name: string;
  answer(vraag: string, businessId: string): Promise<AssistantAnswer>;
}

/**
 * Eenvoudige herkenning op trefwoorden.
 *
 * Geen AI-dienst, geen kosten, geen gegevens die je huis verlaten. Genoeg om
 * de vragen uit de specificatie te beantwoorden en om de rest van het systeem
 * op te bouwen.
 */
export class KeywordBrain implements Brain {
  readonly name = "trefwoorden (lokaal)";

  async answer(vraag: string, businessId: string): Promise<AssistantAnswer> {
    const tekst = vraag.toLowerCase();

    // De tool met de meeste treffers wint; bij gelijkspel de eerste.
    let beste: { tool: Tool; score: number } | null = null;
    for (const tool of tools) {
      const score = tool.keywords.filter((w) => tekst.includes(w)).length;
      if (score > 0 && (!beste || score > beste.score)) beste = { tool, score };
    }

    if (!beste) {
      const lijst = tools.map((t) => `- ${t.description}`).join("\n");
      return {
        usedTool: "geen",
        answer: `Die vraag begrijp ik nog niet. Dit kan ik wel beantwoorden:\n${lijst}`,
      };
    }

    return beste.tool.run(businessId);
  }
}

/**
 * Welke denklaag actief is.
 *
 * Koppel je later een AI-API, dan maak je hier een tweede implementatie van
 * `Brain` die de vraag samen met `tools` naar het model stuurt en het model
 * laat kiezen welke tool nodig is. Alleen deze functie hoeft dan te wijzigen.
 */
export function getBrain(): Brain {
  return new KeywordBrain();
}
