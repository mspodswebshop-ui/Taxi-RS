import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import Anthropic from "@anthropic-ai/sdk";

const here = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT || 3000);

// Welke modellen de gebruiker in de UI mag kiezen. Het eerste item is de standaard.
const MODELS = [
  { id: "claude-opus-5", label: "Opus 5 — slimste" },
  { id: "claude-sonnet-5", label: "Sonnet 5 — sneller en goedkoper" },
  { id: "claude-haiku-4-5", label: "Haiku 4.5 — snelst" },
];
const MODEL_IDS = new Set(MODELS.map((m) => m.id));
const DEFAULT_MODEL = MODELS[0].id;

const EFFORT_LEVELS = new Set(["low", "medium", "high", "xhigh", "max"]);

// Haiku 4.5 kent `effort` niet en gebruikt nog het oude thinking-formaat.
const LEGACY_THINKING_MODELS = new Set(["claude-haiku-4-5"]);

const DEFAULT_SYSTEM_PROMPT =
  "Je bent een behulpzame, eerlijke assistent. Antwoord in dezelfde taal als de " +
  "gebruiker. Wees concreet en beknopt: geen onnodige inleidingen of herhalingen. " +
  "Gebruik markdown waar dat de leesbaarheid helpt, en geef code in codeblokken " +
  "met de juiste taal erbij. Als je iets niet zeker weet, zeg dat dan.";

// Limieten zodat één verzoek niet de hele context (of je budget) opslokt.
const MAX_MESSAGES = 100;
const MAX_CHARS_PER_MESSAGE = 100_000;
const MAX_TOTAL_CHARS = 400_000;
const MAX_SYSTEM_CHARS = 20_000;
const MAX_TOKENS = 64_000;

const client = new Anthropic();

const hasCredentials = () =>
  Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

const app = express();
app.use(express.json({ limit: "2mb" }));
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
      "Dit gesprek is te groot om in één keer te versturen. Begin een nieuw gesprek.",
    );
  }
  if (messages.at(-1).role !== "user") {
    throw new Error("Het laatste bericht moet van de gebruiker komen.");
  }

  const model = MODEL_IDS.has(body.model) ? body.model : DEFAULT_MODEL;
  const effort = EFFORT_LEVELS.has(body.effort) ? body.effort : "high";

  let system = DEFAULT_SYSTEM_PROMPT;
  if (typeof body.system === "string" && body.system.trim() !== "") {
    system = body.system.trim().slice(0, MAX_SYSTEM_CHARS);
  }

  return { messages, system, model, effort };
}

/** Bouwt de parameters voor messages.stream() op voor het gekozen model. */
function buildRequest({ messages, system, model, effort }) {
  const params = {
    model,
    max_tokens: MAX_TOKENS,
    // Het systeemprompt staat vooraan en verandert zelden: cachen scheelt kosten.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages,
  };

  if (LEGACY_THINKING_MODELS.has(model)) {
    // Haiku 4.5 ondersteunt `effort` niet; thinking laten we daar uit.
    return params;
  }

  params.thinking = { type: "adaptive", display: "summarized" };
  params.output_config = { effort };
  return params;
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
      message: "Dit model is niet beschikbaar voor jouw organisatie.",
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

  const stream = client.messages.stream(buildRequest(parsed));

  // Sluit de browser het tabblad of klikt de gebruiker op stop, dan stoppen we
  // ook het API-verzoek — anders blijven er tokens doorlopen die niemand leest.
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

    // Veiligheidsclassificaties kunnen een verzoek weigeren: HTTP 200 met
    // stop_reason "refusal" en een lege/onbruikbare content-lijst.
    if (final.stop_reason === "refusal") {
      send({
        type: "error",
        message:
          "Het model heeft dit verzoek geweigerd" +
          (final.stop_details?.category ? ` (${final.stop_details.category})` : "") +
          ". Probeer je vraag anders te formuleren.",
      });
    } else {
      send({
        type: "done",
        stopReason: final.stop_reason,
        usage: {
          input: final.usage.input_tokens,
          output: final.usage.output_tokens,
          cacheRead: final.usage.cache_read_input_tokens ?? 0,
          cacheWrite: final.usage.cache_creation_input_tokens ?? 0,
        },
      });
    }
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

app.listen(PORT, () => {
  console.log(`AI-app draait op http://localhost:${PORT}`);
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.warn(
      "Let op: geen ANTHROPIC_API_KEY gevonden. Kopieer .env.example naar .env en vul je sleutel in.",
    );
  }
});
