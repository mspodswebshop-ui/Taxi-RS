// Netlify-functie voor GET /api/config.
// Lokaal doet server.js hetzelfde; de logica komt uit lib/chat-core.js.
import { publicConfig } from "../../lib/chat-core.js";

export default async () =>
  new Response(JSON.stringify(publicConfig()), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

export const config = { path: "/api/config" };
