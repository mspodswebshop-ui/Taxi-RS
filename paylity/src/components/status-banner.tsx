import { databaseStatus } from "@/lib/status";

/**
 * Waarschuwing boven het inlog- en registratieformulier.
 *
 * Werkt de database niet, dan heeft invullen geen zin. Dat hoor je te weten
 * vóór je je gegevens intypt, niet erna.
 */
export async function StatusBanner() {
  const status = await databaseStatus();
  if (status.ok) return null;

  return (
    <div
      role="alert"
      className="mt-5 rounded-xl border border-amber-500/40 bg-amber-400/10 p-4"
    >
      <p className="text-sm font-bold text-amber-900 dark:text-amber-200">
        Inloggen en registreren werken nu niet
      </p>
      <p className="mt-1 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
        {status.melding}
      </p>
      {status.oplossing ? (
        <p className="mt-2 text-sm leading-relaxed text-amber-900/80 dark:text-amber-100/80">
          <span className="font-semibold">Wat je eraan doet: </span>
          {status.oplossing}
        </p>
      ) : null}
    </div>
  );
}
