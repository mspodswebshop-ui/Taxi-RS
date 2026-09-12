/**
 * Pure gegevens en logica: welke modellen er zijn en hoe een verzoek aan de
 * Claude API eruitziet. Dit bestand gebruikt geen SDK en geen omgevings-
 * variabelen, zodat het ook rechtstreeks in de browser kan draaien.
 *
 * Zowel lib/chat-core.js (de server) als het losse HTML-bestand halen hun
 * modellijst hiervandaan, zodat die niet uit elkaar kunnen lopen.
 */

// Welke modellen de gebruiker in de UI mag kiezen. Het eerste item is de standaard.
// `price` is in dollar per miljoen tokens, om in de app een schatting van de
// kosten per antwoord te tonen. Controleer de actuele tarieven op
// https://www.anthropic.com/pricing voordat je hier iets op baseert.
export const MODELS = [
  {
    id: "claude-fable-5-1",
    label: "Fable 5.1",
    tagline: "Het krachtigste model",
    note: "Voor de moeilijkste vragen. Denkt het diepst, maar is ook het duurst.",
    price: { input: 10, output: 50, cacheRead: 0.25 },
  },
  {
    id: "claude-opus-5",
    label: "Opus 5",
    tagline: "Sterk en veelzijdig",
    note: "Uitstekend voor code en lastige vragen, tegen de helft van de prijs.",
    price: { input: 5, output: 25, cacheRead: 0.5 },
  },
  {
    id: "claude-sonnet-5",
    label: "Sonnet 5",
    tagline: "Snel en scherp geprijsd",
    note: "Prima voor dagelijks werk en langere gesprekken.",
    price: { input: 2, output: 10, cacheRead: 0.2 },
  },
  {
    id: "claude-haiku-4-5",
    label: "Haiku 4.5",
    tagline: "Het snelst",
    note: "Voor korte vragen waarbij snelheid belangrijker is dan diepgang.",
    price: { input: 1, output: 5, cacheRead: 0.1 },
  },
];

export const MODEL_IDS = new Set(MODELS.map((m) => m.id));
export const DEFAULT_MODEL = MODELS[0].id;

export const EFFORT_LEVELS = new Set(["low", "medium", "high", "xhigh", "max"]);
export const DEFAULT_EFFORT = "max";

// Haiku 4.5 kent `effort` en adaptive thinking niet; daar sturen we niets mee.
const LEGACY_THINKING_MODELS = new Set(["claude-haiku-4-5"]);

// Modellen waarvan de veiligheidsclassificaties een verzoek kunnen weigeren.
// Voor die modellen zetten we server-side fallbacks aan: weigert het model,
// dan beantwoordt de API het verzoek alsnog met een ander model, in dezelfde
// aanroep. Zonder dit stopt een geweigerd verzoek gewoon.
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

export const DEFAULT_SYSTEM_PROMPT =
  "Je bent een behulpzame, eerlijke assistent. Antwoord in dezelfde taal als de " +
  "gebruiker. Wees concreet en beknopt: geen onnodige inleidingen of herhalingen. " +
  "Gebruik markdown waar dat de leesbaarheid helpt, en geef code in codeblokken " +
  "met de juiste taal erbij. Als je iets niet zeker weet, zeg dat dan.";

// Limieten zodat een verzoek niet de hele context (of je budget) opslokt.
const MAX_MESSAGES = 100;
const MAX_CHARS_PER_MESSAGE = 100_000;
const MAX_TOTAL_CHARS = 600_000;
const MAX_SYSTEM_CHARS = 20_000;
const MAX_TOKENS = 64_000;

/** Bouwt de parameters voor de stream-aanroep op voor het gekozen model. */
export function buildRequest({ messages, system, model, effort }) {
  const params = {
    model,
    max_tokens: MAX_TOKENS,
    // Het systeemprompt staat vooraan en verandert zelden: cachen scheelt kosten.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  };

  if (!LEGACY_THINKING_MODELS.has(model)) {
    // Adaptive thinking: het model bepaalt zelf hoe diep het nadenkt.
    // Op Fable 5.1 staat thinking sowieso altijd aan; "summarized" zorgt
    // ervoor dat we een leesbare samenvatting terugkrijgen in plaats van
    // lege thinking-blokken.
    params.thinking = { type: "adaptive", display: "summarized" };
    params.output_config = { effort };
  }

  if (FALLBACK_MODELS.has(model)) {
    params.betas = [FALLBACK_BETA];
    // "default" laat Anthropic het vervangende model kiezen op basis van de
    // reden van weigering. Dat is beter dan zelf een model vastpinnen.
    params.fallbacks = "default";
  }

  return params;
}
