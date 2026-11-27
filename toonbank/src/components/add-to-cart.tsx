"use client";

import { useState } from "react";

import { ActionForm, SubmitButton, type FormAction } from "@/components/forms";
import { cx } from "@/components/ui";
import { formatMoney } from "@/lib/money";

type V = { id: string; title: string; priceCents: number; compareAtCents: number | null; inventory: number | null };

export function AddToCart({ action, variants, optionName, currency }: { action: FormAction; variants: V[]; optionName: string; currency: string }) {
  const firstAvailable = variants.find((v) => v.inventory == null || v.inventory > 0) ?? variants[0];
  const [selected, setSelected] = useState(firstAvailable.id);
  const [qty, setQty] = useState(1);
  const v = variants.find((x) => x.id === selected) ?? firstAvailable;
  const soldOut = v.inventory != null && v.inventory <= 0;
  const max = v.inventory == null ? 99 : Math.max(1, Math.min(99, v.inventory));

  return (
    <ActionForm action={action} className="space-y-6">
      <div className="flex items-baseline gap-3">
        <span className="tabular text-2xl font-medium">{formatMoney(v.priceCents, currency)}</span>
        {v.compareAtCents && v.compareAtCents > v.priceCents && (
          <>
            <span className="tabular text-lg text-ink-400 line-through">{formatMoney(v.compareAtCents, currency)}</span>
            <span className="bg-accent text-on-accent rounded-full px-2 py-0.5 text-xs font-medium">
              −{Math.round((1 - v.priceCents / v.compareAtCents) * 100)}%
            </span>
          </>
        )}
      </div>
      <p className="-mt-4 text-xs text-ink-500">Inclusief btw.</p>

      {optionName && variants.length > 1 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">
            {optionName}: <span className="font-normal text-ink-600">{v.title}</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {variants.map((x) => {
              const out = x.inventory != null && x.inventory <= 0;
              return (
                <button
                  key={x.id}
                  type="button"
                  onClick={() => {
                    setSelected(x.id);
                    setQty(1);
                  }}
                  aria-pressed={x.id === selected}
                  className={cx(
                    "min-w-12 rounded-lg border px-4 py-2 text-sm transition",
                    x.id === selected ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 hover:border-ink-500",
                    out && "text-ink-400 line-through decoration-1",
                    out && x.id === selected && "text-white/70",
                  )}
                >
                  {x.title}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <input type="hidden" name="variantId" value={v.id} />

      <div className="flex gap-3">
        <div className="flex items-center rounded-full border border-ink-200">
          <button type="button" className="px-4 py-3 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.max(1, q - 1))} disabled={qty <= 1} aria-label="Minder">
            −
          </button>
          <input name="quantity" value={qty} readOnly className="tabular w-8 bg-transparent text-center" aria-label="Aantal" />
          <button type="button" className="px-4 py-3 text-lg disabled:opacity-30" onClick={() => setQty((q) => Math.min(max, q + 1))} disabled={qty >= max} aria-label="Meer">
            +
          </button>
        </div>
        {soldOut ? (
          <button type="button" disabled className="flex-1 cursor-not-allowed rounded-full bg-ink-200 px-6 py-3 font-medium text-ink-500">
            Uitverkocht
          </button>
        ) : (
          <SubmitButton className="bg-accent text-on-accent flex-1 rounded-full! py-3! text-base! hover:opacity-90" pendingText="Toevoegen…">
            In winkelwagen
          </SubmitButton>
        )}
      </div>
      {v.inventory != null && v.inventory > 0 && v.inventory <= 5 && (
        <p className="text-sm text-amber-700">Nog maar {v.inventory} op voorraad.</p>
      )}
    </ActionForm>
  );
}
