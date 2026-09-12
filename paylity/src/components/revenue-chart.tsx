"use client";

import { useId, useMemo, useState } from "react";

import { formatMoney } from "@/lib/money";

type Punt = { dag: string; cent: number };

/**
 * Omzet per dag over de laatste 30 dagen.
 *
 * Eén reeks die een verloop in de tijd toont, dus een vlakdiagram met een lijn
 * erop. Geen legenda: bij één reeks zegt de titel al wat je ziet. De kleur
 * draagt geen betekenis die je ook nodig hebt — de cijfers staan in de
 * tooltip en in de tabelweergave, zodat het ook zonder kleurzicht werkt.
 */
export function RevenueChart({ data }: { data: Punt[] }) {
  const [actief, setActief] = useState<number | null>(null);
  const [tabel, setTabel] = useState(false);
  const id = useId();

  const breedte = 720;
  const hoogte = 180;
  const marge = { top: 12, right: 8, bottom: 24, left: 52 };
  const vlakB = breedte - marge.left - marge.right;
  const vlakH = hoogte - marge.top - marge.bottom;

  const { max, punten, pad, vlakPad, totaal, topIndex } = useMemo(() => {
    const hoogsteWaarde = Math.max(...data.map((d) => d.cent), 0);
    // Altijd een beetje ruimte boven de piek, en nooit delen door nul.
    const max = hoogsteWaarde > 0 ? hoogsteWaarde * 1.15 : 100;

    const x = (i: number) =>
      marge.left + (data.length <= 1 ? vlakB / 2 : (i / (data.length - 1)) * vlakB);
    const y = (c: number) => marge.top + vlakH - (c / max) * vlakH;

    const punten = data.map((d, i) => ({ ...d, x: x(i), y: y(d.cent) }));
    const pad = punten.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
    const vlakPad =
      punten.length > 0
        ? `${pad} L${punten[punten.length - 1].x},${marge.top + vlakH} L${punten[0].x},${marge.top + vlakH} Z`
        : "";

    const totaal = data.reduce((som, d) => som + d.cent, 0);
    const topIndex = hoogsteWaarde > 0 ? data.findIndex((d) => d.cent === hoogsteWaarde) : -1;

    return { max, punten, pad, vlakPad, totaal, topIndex };
  }, [data, vlakB, vlakH, marge.left, marge.top]);

  const kortDatum = (dag: string) =>
    new Date(dag).toLocaleDateString("nl-BE", { day: "numeric", month: "short" });

  if (tabel) {
    return (
      <div>
        <Schakelaar tabel={tabel} zet={setTabel} />
        <div className="mt-3 max-h-64 overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 border-b border-ink-200 bg-white text-xs uppercase tracking-wider text-ink-500 dark:border-ink-800 dark:bg-ink-900">
              <tr>
                <th className="py-2">Dag</th>
                <th className="py-2 text-right">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.dag} className="border-b border-ink-100 last:border-0 dark:border-ink-800/60">
                  <td className="py-1.5">{kortDatum(d.dag)}</td>
                  <td className="tabular py-1.5 text-right">{formatMoney(d.cent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Schakelaar tabel={tabel} zet={setTabel} />

      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${breedte} ${hoogte}`}
          className="w-full"
          style={{ height: "auto" }}
          role="img"
          aria-label={`Omzet per dag over ${data.length} dagen. Totaal ${formatMoney(totaal)}.`}
          onMouseLeave={() => setActief(null)}
          onMouseMove={(e) => {
            const doel = e.currentTarget.getBoundingClientRect();
            // Muispositie omrekenen naar de schaal van de viewBox.
            const xInBeeld = ((e.clientX - doel.left) / doel.width) * breedte;
            const verhouding = (xInBeeld - marge.left) / vlakB;
            const i = Math.round(verhouding * (data.length - 1));
            setActief(i >= 0 && i < data.length ? i : null);
          }}
        >
          <defs>
            <linearGradient id={`${id}-vlak`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4a7dff" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#4a7dff" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Rasterlijnen en bedragen: bewust ingetogen, ze zijn hulplijnen. */}
          {[0, 0.5, 1].map((deel) => {
            const y = marge.top + vlakH - deel * vlakH;
            return (
              <g key={deel}>
                <line
                  x1={marge.left}
                  y1={y}
                  x2={breedte - marge.right}
                  y2={y}
                  className="stroke-ink-200 dark:stroke-ink-800"
                  strokeWidth="1"
                />
                <text
                  x={marge.left - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-ink-500 text-[10px] tabular"
                >
                  {formatMoney(Math.round(max * deel)).replace(/,00$/, "")}
                </text>
              </g>
            );
          })}

          {punten.length > 1 ? (
            <>
              <path d={vlakPad} fill={`url(#${id}-vlak)`} />
              <path
                d={pad}
                fill="none"
                stroke="#4a7dff"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </>
          ) : null}

          {/* Alleen de piek krijgt een vast label; een getal bij elk punt maakt
              de grafiek onleesbaar. */}
          {topIndex >= 0 && actief === null ? (
            <g>
              <circle
                cx={punten[topIndex].x}
                cy={punten[topIndex].y}
                r="4"
                fill="#4a7dff"
                className="stroke-white dark:stroke-ink-900"
                strokeWidth="2"
              />
              <text
                x={Math.min(punten[topIndex].x, breedte - marge.right - 40)}
                y={Math.max(punten[topIndex].y - 9, marge.top + 8)}
                textAnchor="middle"
                className="fill-ink-600 text-[10px] font-semibold tabular dark:fill-ink-300"
              >
                {formatMoney(data[topIndex].cent).replace(/,00$/, "")}
              </text>
            </g>
          ) : null}

          {/* Aanwijslijn */}
          {actief !== null && punten[actief] ? (
            <g>
              <line
                x1={punten[actief].x}
                y1={marge.top}
                x2={punten[actief].x}
                y2={marge.top + vlakH}
                className="stroke-ink-300 dark:stroke-ink-600"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={punten[actief].x}
                cy={punten[actief].y}
                r="5"
                fill="#4a7dff"
                className="stroke-white dark:stroke-ink-900"
                strokeWidth="2"
              />
            </g>
          ) : null}

          {/* Datums: begin, midden en eind, anders lopen ze over elkaar. */}
          {[0, Math.floor(data.length / 2), data.length - 1].map((i) =>
            punten[i] ? (
              <text
                key={i}
                x={punten[i].x}
                y={hoogte - 6}
                textAnchor={i === 0 ? "start" : i === data.length - 1 ? "end" : "middle"}
                className="fill-ink-500 text-[10px]"
              >
                {kortDatum(data[i].dag)}
              </text>
            ) : null,
          )}
        </svg>

        {/* Tooltip */}
        {actief !== null && data[actief] ? (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border border-ink-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-ink-700 dark:bg-ink-800"
            style={{
              left: `${(punten[actief].x / breedte) * 100}%`,
              top: `${(punten[actief].y / hoogte) * 100}%`,
            }}
          >
            <div className="font-semibold">{kortDatum(data[actief].dag)}</div>
            <div className="tabular text-ink-600 dark:text-ink-300">
              {formatMoney(data[actief].cent)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Schakelaar({
  tabel,
  zet,
}: {
  tabel: boolean;
  zet: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => zet(!tabel)}
      className="rounded-lg border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-600 transition hover:bg-ink-100 dark:border-ink-700 dark:text-ink-400 dark:hover:bg-ink-800"
    >
      {tabel ? "Toon grafiek" : "Toon als tabel"}
    </button>
  );
}
