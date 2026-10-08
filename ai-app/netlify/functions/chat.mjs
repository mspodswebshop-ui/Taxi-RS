// Netlify-functie voor POST /api/chat.
//
// Levert hetzelfde Server-Sent-Events-antwoord als de lokale server, maar dan
// als serverless functie. De API-sleutel komt uit de omgevingsvariabelen die
// je in Netlify instelt en staat dus nooit in de browser.
import { chatEvents, hasCredentials, parseChatRequest, toSSE } from "../../lib/chat-core.js";
import { tokenUitCookies } from "../../lib/abonnement.js";
import { metVerbruik, poortVoorChat } from "../../lib/abonnement-routes.js";

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export default async (req) => {
  if (req.method !== "POST") {
    return json(405, { error: "Alleen POST is toegestaan." });
  }

  if (!hasCredentials()) {
    return json(401, {
      error:
        "Er is geen API-sleutel ingesteld. Zet ANTHROPIC_API_KEY in Netlify onder " +
        "Site configuration > Environment variables en publiceer de site opnieuw.",
    });
  }

  let parsed;
  try {
    parsed = parseChatRequest(await req.json());
  } catch (err) {
    return json(400, { error: err.message });
  }

  // Abonnement en limiet controleren. Zonder Stripe-sleutel is de app vrij
  // toegankelijk.
  const poort = await poortVoorChat(tokenUitCookies(req.headers.get("cookie")), parsed);
  if (!poort.ok) return json(poort.status, poort.json);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const events = metVerbruik(chatEvents(parsed, req.signal), poort.stand, parsed);
        for await (const event of events) {
          if (!req.signal.aborted) controller.enqueue(encoder.encode(toSSE(event)));
        }
      } catch (err) {
        // De verbinding kan al verbroken zijn; dan valt er niets meer te sturen.
        console.error("Fout in de chat-functie:", err);
      } finally {
        try {
          controller.close();
        } catch {
          /* al gesloten */
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
};

export const config = { path: "/api/chat" };
