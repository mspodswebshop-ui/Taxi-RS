/**
 * De betaalprovider-interface.
 *
 * Dit is bewust het enige punt waarop Paylity met de buitenwereld over geld
 * praat. Alles daarboven (API, dashboard, checkout) werkt alleen met deze
 * interface en weet niet welke provider eronder zit.
 *
 * Nu draait hier `SimulatedProvider`: die verwerkt geen echt geld en is
 * uitsluitend bedoeld om de flow te kunnen bouwen en testen.
 *
 * Wil je later een erkende betaalprovider koppelen, dan schrijf je een tweede
 * bestand dat deze interface implementeert en registreer je die in
 * `src/lib/providers/index.ts`. De rest van de app verandert niet.
 *
 * Wat een provider NOOIT van ons krijgt, in welke implementatie dan ook:
 * kaartnummers, CVC/CVV, pincodes, IBAN's of bankwachtwoorden. Die gegevens
 * hoort de klant rechtstreeks bij de provider in te vullen, op diens eigen
 * beveiligde pagina of veld. Paylity ziet ze niet en bewaart ze niet.
 */

export type PaymentMethodId = "bancontact" | "card";

export type ProviderPaymentStatus = "pending" | "paid" | "failed" | "cancelled";

export type CreatePaymentInput = {
  /** Bedrag in centen, als geheel getal. */
  amount: number;
  currency: string;
  method: PaymentMethodId;
  description: string;
  /** Onze eigen betaling-id, zodat een provider ernaar kan terugverwijzen. */
  reference: string;
  /** Waar de klant heen moet na afloop. */
  returnUrl: string;
};

export type CreatePaymentResult = {
  /** De referentie van de provider zelf. */
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  /**
   * Waar de klant de betaling afrondt. Bij een echte provider is dit diens
   * eigen beveiligde pagina; bij de simulatie is het onze testpagina.
   */
  redirectUrl: string;
};

export type ProviderPayment = {
  providerPaymentId: string;
  status: ProviderPaymentStatus;
  failureReason?: string;
};

export type RefundInput = {
  providerPaymentId: string;
  amount: number;
  reason?: string;
};

export type RefundResult = {
  providerRefundId: string;
  amount: number;
};

export interface PaymentProvider {
  /** Korte naam, zoals opgeslagen bij een betaling. */
  readonly id: string;
  /** Naam voor in de interface. */
  readonly label: string;
  /** Of deze provider echt geld verwerkt. De simulatie: nee. */
  readonly handlesRealMoney: boolean;
  /** Welke betaalmethodes deze provider aankan. */
  readonly methods: readonly PaymentMethodId[];

  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPayment(providerPaymentId: string): Promise<ProviderPayment>;
  refundPayment(input: RefundInput): Promise<RefundResult>;
}
