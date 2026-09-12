import type { Metadata } from "next";

import { Card } from "@/components/ui";

export const metadata: Metadata = { title: "Documentatie" };

const endpoints = [
  ["POST", "/api/v1/payment-links", "Een betaallink aanmaken"],
  ["GET", "/api/v1/payment-links", "Betaallinks opvragen"],
  ["GET", "/api/v1/payment-links/{id}", "Eén betaallink opvragen"],
  ["PATCH", "/api/v1/payment-links/{id}", "Een betaallink aanpassen"],
  ["GET", "/api/v1/payments", "Betalingen opvragen (filter op status)"],
  ["GET", "/api/v1/payments/{id}", "Eén betaling opvragen"],
  ["POST", "/api/v1/customers", "Een klant aanmaken"],
  ["GET", "/api/v1/customers", "Klanten opvragen"],
  ["POST", "/api/v1/invoices", "Een factuur aanmaken"],
  ["GET", "/api/v1/invoices", "Facturen opvragen"],
  ["POST", "/api/v1/refunds", "Een betaling terugbetalen"],
  ["POST", "/api/v1/webhooks/payment", "Melding van de betaalprovider ontvangen"],
];

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-ink-200 bg-ink-100 p-4 text-[13px] leading-relaxed dark:border-ink-800 dark:bg-ink-950">
      <code className="font-mono">{children}</code>
    </pre>
  );
}

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-16">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Documentatie</h1>
      <p className="mt-3 text-ink-600 dark:text-ink-300">
        De Paylity API is een gewone REST API. Alle bedragen zijn in centen als
        geheel getal, zodat er geen afrondingsfouten kunnen ontstaan.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Aanmelden</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
          Elke aanroep heeft een testsleutel nodig. Je vindt hem bij
          Instellingen in je dashboard. Zet een geheime sleutel nooit in code
          die in de browser draait — hij hoort alleen op je eigen server.
        </p>
        <div className="mt-4">
          <Code>{`curl https://paylity.example/api/v1/payments \\
  -H "Authorization: Bearer sk_test_..."`}</Code>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Een betaallink maken</h2>
        <div className="mt-4">
          <Code>{`curl -X POST https://paylity.example/api/v1/payment-links \\
  -H "Authorization: Bearer sk_test_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "title": "Bestelling #1042",
    "description": "Twee paar sokken",
    "amount": 2450,
    "currency": "EUR"
  }'`}</Code>
        </div>
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-400">
          Je krijgt een <code className="font-mono text-[13px]">url</code> terug
          zoals <code className="font-mono text-[13px]">/pay/pl_a1b2c3d4</code>.
          Die deel je met je klant.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Alle endpoints</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800">
              <tr>
                <th className="py-2 pr-4">Methode</th>
                <th className="py-2 pr-4">Pad</th>
                <th className="py-2">Wat het doet</th>
              </tr>
            </thead>
            <tbody>
              {endpoints.map(([methode, pad, uitleg]) => (
                <tr key={`${methode}-${pad}`} className="border-b border-ink-100 dark:border-ink-800/60">
                  <td className="py-2 pr-4 font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                    {methode}
                  </td>
                  <td className="py-2 pr-4 font-mono text-xs">{pad}</td>
                  <td className="py-2 text-ink-600 dark:text-ink-400">{uitleg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Webhooks</h2>
        <p className="mt-2 text-sm text-ink-600 dark:text-ink-400">
          Elke melding draagt een handtekening in de kop{" "}
          <code className="font-mono text-[13px]">Paylity-Signature</code>, in de
          vorm <code className="font-mono text-[13px]">t=&lt;tijd&gt;,v1=&lt;hmac&gt;</code>.
          Bereken dezelfde HMAC-SHA256 over{" "}
          <code className="font-mono text-[13px]">&quot;&lt;tijd&gt;.&lt;ruwe body&gt;&quot;</code>{" "}
          met je webhook-geheim en vergelijk. Klopt het niet, of is de tijd meer
          dan vijf minuten oud, weiger de melding dan.
        </p>
        <div className="mt-4">
          <Code>{`import { createHmac, timingSafeEqual } from "node:crypto";

function klopt(ruweBody, header, geheim) {
  const delen = Object.fromEntries(
    header.split(",").map((d) => d.split("=").map((s) => s.trim())),
  );
  const verwacht = createHmac("sha256", geheim)
    .update(\`\${delen.t}.\${ruweBody}\`)
    .digest("hex");

  const a = Buffer.from(delen.v1);
  const b = Buffer.from(verwacht);
  return a.length === b.length && timingSafeEqual(a, b);
}`}</Code>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold tracking-tight">Fouten</h2>
        <div className="mt-4">
          <Code>{`{
  "error": {
    "code": "validation_failed",
    "message": "De meegestuurde gegevens kloppen niet.",
    "details": [{ "veld": "amount", "melding": "Het bedrag moet groter zijn dan nul." }]
  }
}`}</Code>
        </div>
        <p className="mt-3 text-sm text-ink-600 dark:text-ink-400">
          401 betekent een ontbrekende of ongeldige sleutel, 404 een onbekend of
          niet van jou zijnd object, 422 gegevens die de validatie niet haalden
          en 429 te veel verzoeken.
        </p>
      </section>

      <Card className="mt-10 border-amber-400/40 bg-amber-400/10">
        <h2 className="font-semibold text-amber-800 dark:text-amber-200">
          Testmodus
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          Alle sleutels beginnen met <code className="font-mono">sk_test_</code>.
          Er wordt geen geld verwerkt en de API vraagt nooit om een kaartnummer,
          CVC, pincode of IBAN. Op de checkout kies je zelf of de testbetaling
          slaagt of mislukt.
        </p>
      </Card>
    </div>
  );
}
