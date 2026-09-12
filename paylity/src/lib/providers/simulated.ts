/**
 * Gesimuleerde betaalprovider.
 *
 * LET OP: deze provider verwerkt GEEN echt geld. Hij bestaat om de volledige
 * betaalflow te kunnen bouwen en testen zonder een vergunningsplichtige
 * partij en zonder ooit gevoelige gegevens aan te raken.
 *
 * De simulatie vraagt bewust geen kaartnummer, CVC/CVV, pincode of IBAN. Op
 * de testcheckout kiest de klant simpelweg "betaling slaagt" of "betaling
 * mislukt". Dat is genoeg om beide uitkomsten door het hele systeem te zien
 * lopen, en het maakt het onmogelijk om per ongeluk echte gegevens op te
 * slaan.
 *
 * De stand van een gesimuleerde betaling staat gewoon in onze eigen database
 * (`Payment.status`); deze klasse leest die uit, net zoals een echte provider
 * zijn eigen administratie zou raadplegen.
 */

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  ProviderPayment,
  RefundInput,
  RefundResult,
} from "./types";

export class SimulatedProvider implements PaymentProvider {
  readonly id = "simulated";
  readonly label = "Gesimuleerde provider (test)";
  readonly handlesRealMoney = false;
  readonly methods = ["bancontact", "card"] as const;

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error("Het bedrag moet een positief geheel getal in centen zijn.");
    }

    const providerPaymentId = `sim_${randomBytes(12).toString("hex")}`;

    return {
      providerPaymentId,
      status: "pending",
      // Bij een echte provider wijst dit naar diens eigen beveiligde pagina.
      redirectUrl: input.returnUrl,
    };
  }

  async getPayment(providerPaymentId: string): Promise<ProviderPayment> {
    const payment = await db.payment.findFirst({
      where: { providerPaymentId },
      select: { status: true, failureReason: true },
    });

    if (!payment) {
      return { providerPaymentId, status: "failed", failureReason: "onbekende betaling" };
    }

    // "refunded" is bij ons een vervolgstap op een geslaagde betaling; voor de
    // provider blijft die betaling zelf geslaagd.
    const status =
      payment.status === "refunded"
        ? "paid"
        : (payment.status as ProviderPayment["status"]);

    return {
      providerPaymentId,
      status,
      failureReason: payment.failureReason ?? undefined,
    };
  }

  async refundPayment(input: RefundInput): Promise<RefundResult> {
    if (!Number.isInteger(input.amount) || input.amount <= 0) {
      throw new Error("Het terug te betalen bedrag moet een positief geheel getal zijn.");
    }

    return {
      providerRefundId: `simref_${randomBytes(12).toString("hex")}`,
      amount: input.amount,
    };
  }
}
