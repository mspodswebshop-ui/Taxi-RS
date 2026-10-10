"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui";

/** Zet "wbl7k3f9qx2m4tp" om naar "WBL-7K3F-9QX2-M4TP" terwijl je typt. */
function format(input: string): string {
  let raw = input.toUpperCase().replace(/[^0-9A-Z]/g, "");
  if (raw.startsWith("WBL")) raw = raw.slice(3);
  raw = raw.slice(0, 12);
  const groups = raw.match(/.{1,4}/g) ?? [];
  return groups.length ? `WBL-${groups.join("-")}` : "";
}

export function CodeLogin() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/code", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Inloggen is niet gelukt.");
      router.push("/beheer/site");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-ink-700">Jouw code</label>
      <input
        id="code"
        value={code}
        onChange={e => setCode(format(e.target.value))}
        placeholder="WBL-XXXX-XXXX-XXXX"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        className="w-full rounded-xl border border-ink-200 bg-white px-4 py-3.5 text-center font-mono text-xl tracking-widest outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
      />
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}
      <Button type="submit" className="mt-4 w-full py-3" disabled={busy || code.length < 18}>
        {busy ? "Even geduld…" : "Inloggen"}
      </Button>
    </form>
  );
}
