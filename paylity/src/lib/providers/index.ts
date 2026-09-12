/**
 * Welke betaalprovider Paylity gebruikt.
 *
 * Nu staat hier alleen de simulatie. Wil je later een erkende provider
 * koppelen:
 *
 *   1. Schrijf `src/lib/providers/mijn-provider.ts` die `PaymentProvider`
 *      uit `./types` implementeert.
 *   2. Zet hem hieronder in `providers`.
 *   3. Zet PAYMENT_PROVIDER=mijn-provider in .env
 *
 * De API, het dashboard en de checkout hoeven daarvoor niet te wijzigen.
 */

import { SimulatedProvider } from "./simulated";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  simulated: new SimulatedProvider(),
};

export function getProvider(): PaymentProvider {
  const name = process.env.PAYMENT_PROVIDER ?? "simulated";
  const provider = providers[name];

  if (!provider) {
    throw new Error(
      `Onbekende betaalprovider "${name}". Beschikbaar: ${Object.keys(providers).join(", ")}.`,
    );
  }
  return provider;
}

/** Of de app op dit moment echt geld verwerkt. In v1 altijd false. */
export function isTestMode(): boolean {
  return !getProvider().handlesRealMoney || process.env.PAYLITY_MODE !== "live";
}

export type { PaymentProvider } from "./types";
