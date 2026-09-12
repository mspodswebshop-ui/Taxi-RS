// Moet de eerste import blijven: controleert de Node-versie voordat er
// iets anders geladen wordt.
import "./check-node.js";
import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);

// Welke modellen de gebruiker in de UI mag kiezen. Het eerste item is de standaard.
// `price` is in dollar per miljoen tokens, om in de app een schatting van de
// kosten per antwoord te tonen. Controleer de actuele tarieven op
// https://www.anthropic.com/pricing voordat je hier iets op baseert.
const MODELS = [
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
const MODEL_IDS = new Set(MODELS.map((m) => m.id));
const DEFAULT_MODEL = MODELS[0].id;

const EFFORT_LEVELS = new Set(["low", "medium", "high", "xhigh", "max"]);
const DEFAULT_EFFORT = "max";

// Haiku 4.5 kent `effort` en adaptive thinking niet; daar sturen we niets mee.
const LEGACY_THINKING_MODELS = new Set(["claude-haiku-4-5"]);

// Modellen waarvan de veiligheidsclassificaties een verzoek kunnen weigeren.
// Voor die modellen zetten we server-side fallbacks aan: weigert het model,
// dan beantwoordt de API het verzoek alsnog met een ander model, in dezelfde
// aanroep. Zonder dit stopt een geweigerd verzoek gewoon.
const FALLBACK_MODELS = new Set(["claude-fable-5-1", "claude-opus-5"]);
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

const DEFAULT_SYSTEM_PROMPT =
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

const client = new Anthropic();

const hasCredentials = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const app = express();
app.use(express.json({ limit: "8mb" }));
app.use(express.static(path.join(here, "public")));

/** Simpele rate limit per IP: max N verzoeken per tijdvenster. */
const RATE_LIMIT = { windowMs: 60_000, max: 20 };
const hits = new Map();

function rateLimit(req, res, next) {
  const key = req.ip ?? "onbekend";
  const now = Date.now();
  const entry = hits.get(key);

  if (!entry || now > entry.resetAt) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT.windowMs });
    return next();
  }
  if (entry.count >= RATE_LIMIT.max) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    res.set("Retry-After", String(retryAfter));
    return res.status(429).json({
      error: `Te veel verzoeken. Probeer het over ${retryAfter} seconden opnieuw.`,
    });
  }
  entry.count += 1;
  next();
}

// Verlopen entries opruimen zodat de Map niet eindeloos groeit.
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now > entry.resetAt) hits.delete(key);
  }
}, RATE_LIMIT.windowMs).unref();

/**
 * Controleert de request-body en geeft {messages, system, model, effort} terug,
 * of gooit een Error met een uitlegbare melding voor de gebruiker.
 *
 * Een assistent-bericht mag ook de ruwe content-blokken van een eerder antwoord
 * bevatten (een array). Die sturen we onveranderd terug naar de API: daar zitten
 * de thinking-blokken in, en die mogen niet aangepast of weggelaten worden.
 */
function parseChatRequest(body) {
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    throw new Error("Er zijn geen berichten meegestuurd.");
  }
  if (body.messages.length > MAX_MESSAGES) {
    throw new Error(
      `Dit gesprek is te lang (max ${MAX_MESSAGES} berichten). Begin een nieuw gesprek.`,
    );
  }

  let totalChars = 0;
  const messages = body.messages.map((msg, i) => {
    if (msg?.role !== "user" && msg?.role !== "assistant") {
      throw new Error(`Bericht ${i + 1} heeft een ongeldige rol.`);
    }

    // Ruwe content-blokken van een eerder antwoord: ongewijzigd doorgeven.
    if (msg.role === "assistant" && Array.isArray(msg.content)) {
      if (msg.content.length === 0) {
        throw new Error(`Bericht ${i + 1} heeft geen inhoud.`);
      }
      totalChars += JSON.stringify(msg.content).length;
      return { role: msg.role, content: msg.content };
    }

    if (typeof msg.content !== "string" || msg.content.trim() === "") {
      throw new Error(`Bericht ${i + 1} heeft geen tekst.`);
    }
    if (msg.content.length > MAX_CHARS_PER_MESSAGE) {
      throw new Error(
        `Bericht ${i + 1} is te lang (max ${MAX_CHARS_PER_MESSAGE} tekens).`,
      );
    }
    totalChars += msg.content.length;
    return { role: msg.role, content: msg.content };
  });

  if (totalChars > MAX_TOTAL_CHARS) {
    throw new Error(
      "Dit gesprek is te groot om in een keer te versturen. Begin een nieuw gesprek.",
    );
  }
  if (messages.at(-1).role !== "user") {
    throw new Error("Het laatste bericht moet van de gebruiker komen.");
  }

  const model = MODEL_IDS.has(body.model) ? body.model : DEFAULT_MODEL;
  const effort = EFFORT_LEVELS.has(body.effort) ? body.effort : DEFAULT_EFFORT;

  let system = DEFAULT_SYSTEM_PROMPT;
  if (typeof body.system === "string" && body.system.trim() !== "") {
    system = body.system.trim().slice(0, MAX_SYSTEM_CHARS);
  }

  return { messages, system, model, effort };
}

/** Bouwt de parameters voor de stream-aanroep op voor het gekozen model. */
function buildRequest({ messages, system, model, effort }) {
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

/**
 * Maakt de content-blokken geschikt om weer naar de API te sturen.
 *
 * De SDK hangt aan tekstblokken een eigen veld `parsed` (voor structured
 * outputs) dat niet in het API-formaat thuishoort. Thinking-blokken en hun
 * signature laten we juist volledig intact: die moeten onveranderd terug.
 */
function toWireBlocks(content) {
  return content.map((block) => {
    if (block.type === "text" && "parsed" in block) {
      const { parsed, ...rest } = block;
      return rest;
    }
    return block;
  });
}

/** Zet een SDK-fout om in een begrijpelijke melding + HTTP-status. */
function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return {
      status: 401,
      message:
        "De API-sleutel is ongeldig of ontbreekt. Zet ANTHROPIC_API_KEY in je .env-bestand.",
    };
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return { status: 403, message: "Deze sleutel mag dit model niet gebruiken." };
  }
  if (err instanceof Anthropic.NotFoundError) {
    return {
      status: 404,
      message:
        "Dit model is niet beschikbaar voor jouw account. Kies een ander model bij Instellingen.",
    };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return {
      status: 429,
      message: "Te veel verzoeken naar de API. Wacht even en probeer het opnieuw.",
    };
  }
  if (err instanceof Anthropic.BadRequestError) {
    return { status: 400, message: `Ongeldig verzoek: ${err.message}` };
  }
  if (err instanceof Anthropic.InternalServerError) {
    return {
      status: 503,
      message: "De API heeft het even te druk. Probeer het over een momentje opnieuw.",
    };
  }
  // APIConnectionError erft van APIError, dus die eerst controleren.
  if (err instanceof Anthropic.APIConnectionError) {
    return { status: 502, message: "Geen verbinding met de API. Check je internet." };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, message: `API-fout: ${err.message}` };
  }
  return { status: 500, message: err?.message || "Onbekende serverfout." };
}

app.get("/api/config", (_req, res) => {
  res.json({
    models: MODELS,
    defaultModel: DEFAULT_MODEL,
    defaultEffort: DEFAULT_EFFORT,
    defaultSystemPrompt: DEFAULT_SYSTEM_PROMPT,
    hasCredentials: hasCredentials(),
  });
});

app.post("/api/chat", rateLimit, async (req, res) => {
  if (!hasCredentials()) {
    return res.status(401).json({
      error:
        "Er is geen API-sleutel ingesteld op de server. Kopieer .env.example naar .env, " +
        "vul ANTHROPIC_API_KEY in en start de server opnieuw.",
    });
  }

  let parsed;
  try {
    parsed = parseChatRequest(req.body);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);

  const stream = client.beta.messages.stream(buildRequest(parsed));

  // Sluit de browser het tabblad of klikt de gebruiker op stop, dan stoppen we
  // ook het API-verzoek - anders blijven er tokens doorlopen die niemand leest.
  let clientGone = false;
  res.on("close", () => {
    clientGone = true;
    stream.abort();
  });

  try {
    for await (const event of stream) {
      if (clientGone) break;

      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          send({ type: "text", text: event.delta.text });
        } else if (event.delta.type === "thinking_delta") {
          send({ type: "thinking", text: event.delta.thinking });
        }
      } else if (event.type === "content_block_start") {
        if (event.content_block.type === "thinking") {
          send({ type: "thinking_start" });
        } else if (event.content_block.type === "text") {
          send({ type: "text_start" });
        }
      }
    }

    if (clientGone) return;

    const final = await stream.finalMessage();

    // Altijd eerst stop_reason controleren: bij een weigering is `content`
    // leeg of onvolledig. (stop_details is informatief en mag null zijn.)
    if (final.stop_reason === "refusal") {
      const category = final.stop_details?.category;
      send({
        type: "error",
        message:
          "Dit verzoek is geweigerd door de veiligheidscontrole" +
          (category ? ` (categorie: ${category})` : "") +
          ". Probeer je vraag anders te formuleren.",
      });
      return;
    }

    // Is er onderweg naar een ander model overgeschakeld? Dan melden we dat,
    // zodat duidelijk is welk model het antwoord uiteindelijk gaf.
    const switched = final.content.some((block) => block.type === "fallback");

    send({
      type: "done",
      stopReason: final.stop_reason,
      model: final.model,
      switchedModel: switched ? final.model : null,
      // De ruwe content-blokken gaan mee terug naar de browser. Bij een
      // volgende vraag sturen we ze onveranderd weer mee: thinking-blokken
      // mogen niet worden aangepast of weggelaten.
      content: toWireBlocks(final.content),
      usage: {
        input: final.usage.input_tokens,
        output: final.usage.output_tokens,
        cacheRead: final.usage.cache_read_input_tokens ?? 0,
        cacheWrite: final.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    if (!clientGone) {
      const { message } = describeError(err);
      console.error("Fout tijdens streamen:", err);
      send({ type: "error", message });
    }
  } finally {
    if (!clientGone) res.end();
  }
});

// Onbekend API-pad: een nette JSON-fout in plaats van een HTML-pagina.
app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Onbekend API-pad." });
});

// Elk ander onbekend pad toont gewoon de app. Zo krijg je geen kale
// "Page not found" meer als je bijvoorbeeld /index.html of /chat intikt.
app.use((_req, res) => {
  res.sendFile(path.join(here, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`AI-app draait op http://localhost:${PORT}`);
  console.log(`Standaardmodel: ${DEFAULT_MODEL} (denkkracht: ${DEFAULT_EFFORT})`);
  if (!hasCredentials()) {
    console.warn(
      "Let op: geen ANTHROPIC_API_KEY gevonden. Kopieer .env.example naar .env en vul je sleutel in.",
    );
  }
});
