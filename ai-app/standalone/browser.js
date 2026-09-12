/* =======================================================================
   Browserversie van de netwerklaag.
   Dit bestand wordt door build-standalone.mjs in het losse HTML-bestand
   gezet, in plaats van het stuk dat met de server praat.

   Hier praat de pagina rechtstreeks met de Claude API. De sleutel komt van
   de bezoeker zelf en blijft in zijn eigen browser staan; hij staat dus niet
   in het HTML-bestand en wordt nergens anders heen gestuurd.
   ======================================================================= */

const KEY_STORAGE = "mijn-ai.sleutel.v1";

function getApiKey() {
  try {
    return localStorage.getItem(KEY_STORAGE) ?? "";
  } catch {
    return "";
  }
}

function setApiKey(value) {
  try {
    if (value) localStorage.setItem(KEY_STORAGE, value);
    else localStorage.removeItem(KEY_STORAGE);
  } catch {
    toast("Je browser staat opslaan niet toe.");
  }
}

/**
 * Maakt de content-blokken geschikt om weer naar de API te sturen.
 *
 * De SDK hangt aan tekstblokken een eigen veld `parsed` dat niet in het
 * API-formaat thuishoort. Thinking-blokken en hun signature laten we juist
 * volledig intact: die moeten onveranderd terug.
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

/** Zet een SDK-fout om in een begrijpelijke melding. */
function describeError(err) {
  if (err instanceof Anthropic.AuthenticationError) {
    return "De API-sleutel klopt niet. Controleer hem bij Instellingen.";
  }
  if (err instanceof Anthropic.PermissionDeniedError) {
    return "Deze sleutel mag dit model niet gebruiken. Kies een ander model bovenin.";
  }
  if (err instanceof Anthropic.NotFoundError) {
    return "Dit model is niet beschikbaar voor jouw account. Kies een ander model bovenin.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Te veel verzoeken. Wacht even en probeer het opnieuw.";
  }
  if (err instanceof Anthropic.BadRequestError) {
    return `Ongeldig verzoek: ${err.message}`;
  }
  if (err instanceof Anthropic.InternalServerError) {
    return "De API heeft het even te druk. Probeer het over een momentje opnieuw.";
  }
  // APIConnectionError erft van APIError, dus die eerst controleren.
  if (err instanceof Anthropic.APIConnectionError) {
    return (
      "Geen verbinding met de API. Controleer je internet. Let op: als je dit " +
      "bestand rechtstreeks vanaf je schijf opent, blokkeert de browser het " +
      "verzoek. Zet de pagina online (bijvoorbeeld op Netlify) of gebruik de " +
      "versie met server."
    );
  }
  if (err instanceof Anthropic.APIError) {
    return `API-fout: ${err.message}`;
  }
  return err?.message || "Er ging iets mis bij het versturen.";
}

// === NETWERKLAAG: begin ===
/**
 * Roept de Claude API rechtstreeks aan vanuit de browser en meldt elke
 * gebeurtenis via `onEvent`, in hetzelfde formaat als de serverversie.
 */
async function requestAnswer(payload, onEvent) {
  const { signal, messages, system, model, effort } = payload;

  const apiKey = getApiKey();
  if (!apiKey) throw new Error("Er is nog geen API-sleutel ingevuld.");

  const client = new Anthropic({
    apiKey,
    // Nodig om de API vanuit een browser te mogen aanroepen. De sleutel is
    // hier die van de bezoeker zelf, uit zijn eigen browseropslag.
    dangerouslyAllowBrowser: true,
  });

  const stream = client.beta.messages.stream(
    buildRequest({
      messages,
      system: system ?? DEFAULT_SYSTEM_PROMPT,
      model,
      effort,
    }),
  );

  const abort = () => stream.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    for await (const event of stream) {
      if (signal?.aborted) return;

      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          onEvent({ type: "text", text: event.delta.text });
        } else if (event.delta.type === "thinking_delta") {
          onEvent({ type: "thinking", text: event.delta.thinking });
        }
      } else if (event.type === "content_block_start") {
        if (event.content_block.type === "thinking") {
          onEvent({ type: "thinking_start" });
        } else if (event.content_block.type === "text") {
          onEvent({ type: "text_start" });
        }
      }
    }

    if (signal?.aborted) return;

    const final = await stream.finalMessage();

    // Altijd eerst stop_reason controleren: bij een weigering is `content`
    // leeg of onvolledig. (stop_details is informatief en mag null zijn.)
    if (final.stop_reason === "refusal") {
      const category = final.stop_details?.category;
      onEvent({
        type: "error",
        message:
          "Dit verzoek is geweigerd door de veiligheidscontrole" +
          (category ? ` (categorie: ${category})` : "") +
          ". Probeer je vraag anders te formuleren.",
      });
      return;
    }

    const switched = final.content.some((block) => block.type === "fallback");

    onEvent({
      type: "done",
      stopReason: final.stop_reason,
      model: final.model,
      switchedModel: switched ? final.model : null,
      // De ruwe content-blokken worden bewaard en bij een volgende vraag
      // onveranderd teruggestuurd: thinking-blokken mogen niet wijzigen.
      content: toWireBlocks(final.content),
      usage: {
        input: final.usage.input_tokens,
        output: final.usage.output_tokens,
        cacheRead: final.usage.cache_read_input_tokens ?? 0,
        cacheWrite: final.usage.cache_creation_input_tokens ?? 0,
      },
    });
  } catch (err) {
    if (signal?.aborted || err?.name === "AbortError") return;
    throw new Error(describeError(err));
  } finally {
    signal?.removeEventListener("abort", abort);
  }
}
// === NETWERKLAAG: einde ===

/* ---------------------- Sleutelscherm ---------------------- */

function openKeyScreen({ canCancel }) {
  const modal = el("keyModal");
  el("keyInput").value = getApiKey();
  el("keyCancelBtn").hidden = !canCancel;
  modal.hidden = false;
  el("keyInput").focus();
}

function saveKeyFromScreen() {
  const value = el("keyInput").value.trim();
  if (value === "") {
    toast("Vul een sleutel in.");
    return;
  }
  if (!value.startsWith("sk-ant-")) {
    toast("Een Claude-sleutel begint met sk-ant-. Controleer of je hem goed hebt geplakt.");
    return;
  }
  setApiKey(value);
  el("keyModal").hidden = true;
  config.hasCredentials = true;
  ui.input.disabled = false;
  ui.input.placeholder = "Stel je vraag…";
  renderMessages();
  toast("Sleutel opgeslagen.");
  ui.input.focus();
}
