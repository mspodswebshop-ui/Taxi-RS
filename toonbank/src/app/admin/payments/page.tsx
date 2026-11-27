import { Badge, Card, CardHeader, Notice, buttonStyles } from "@/components/ui";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { feePercentFor, proBillingEnabled, stripeEnabled, syncStripeAccount } from "@/lib/stripe";

import {
  manageSubscription,
  openStripeDashboard,
  startStripeOnboarding,
  togglePlanTestMode,
  upgradeToPro,
} from "./actions";

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ terug?: string; pro?: string }> }) {
  const { store } = await requireMerchant();
  const { terug, pro } = await searchParams;

  let chargesEnabled = store.stripeChargesEnabled;
  let syncError = false;
  if (terug && store.stripeAccountId && stripeEnabled()) {
    try {
      chargesEnabled = await syncStripeAccount(store.id, store.stripeAccountId);
    } catch {
      syncError = true;
    }
  }

  const since = new Date(Date.now() - 30 * 86_400_000);
  const fees = await db.order.aggregate({
    where: { storeId: store.id, status: "paid", paidAt: { gte: since } },
    _sum: { platformFeeCents: true, totalCents: true },
  });
  const fee = feePercentFor(store.plan).toLocaleString("nl-BE");

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Betalingen & abonnement</h1>

      <Card>
        <CardHeader title="Betalingen ontvangen" description="Klanten betalen met Bancontact, kaart, Apple Pay en meer. Het geld komt op je eigen rekening." />
        <div className="space-y-4 p-5 text-sm">
          {!stripeEnabled() ? (
            <Notice>
              Het platform staat in <strong>testmodus</strong>: klanten rekenen af met een testknop en er gaat geen geld rond. Zodra de
              beheerder van het platform een Stripe-sleutel instelt, kun je hier je rekening koppelen.
            </Notice>
          ) : chargesEnabled ? (
            <>
              <div className="flex items-center gap-2">
                <Badge tone="green">Gekoppeld</Badge> Je ontvangt betalingen via Stripe.
              </div>
              <form action={openStripeDashboard}>
                <button className={buttonStyles.secondary}>Uitbetalingen bekijken bij Stripe ↗</button>
              </form>
            </>
          ) : (
            <>
              {syncError && <Notice tone="red">We konden je Stripe-status niet ophalen. Probeer het zo meteen opnieuw.</Notice>}
              {store.stripeAccountId ? (
                <p>Je aanmelding bij Stripe is nog niet af. Stripe vraagt je gegevens en je rekeningnummer om je te kunnen uitbetalen.</p>
              ) : (
                <p>Koppel een Stripe-rekening. Dat duurt een paar minuten: Stripe vraagt je bedrijfsgegevens en je rekeningnummer.</p>
              )}
              <form action={startStripeOnboarding}>
                <button className={buttonStyles.brand}>{store.stripeAccountId ? "Aanmelding afmaken" : "Koppel je rekening"}</button>
              </form>
              <p className="text-ink-500">Tot je rekening gekoppeld is, kunnen klanten in je winkel nog niet afrekenen.</p>
            </>
          )}
        </div>
      </Card>

      <Card>
        <CardHeader title="Abonnement" />
        <div className="space-y-4 p-5 text-sm">
          {pro && <Notice tone="green">Bedankt! Je abonnement is actief zodra Stripe de betaling bevestigt, meestal binnen een paar seconden.</Notice>}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-lg font-semibold">{store.plan === "pro" ? "Pro" : "Start"}</span>
            <span className="text-ink-500">{fee}% platformkosten per verkoop</span>
          </div>
          <p className="text-ink-600">
            Laatste 30 dagen: {formatMoney(fees._sum.totalCents ?? 0, store.currency)} omzet,{" "}
            {formatMoney(fees._sum.platformFeeCents ?? 0, store.currency)} platformkosten.
          </p>
          {proBillingEnabled() ? (
            store.plan === "pro" ? (
              <form action={manageSubscription}>
                <button className={buttonStyles.secondary}>Abonnement beheren ↗</button>
              </form>
            ) : (
              <form action={upgradeToPro}>
                <button className={buttonStyles.brand}>
                  Overstappen op Pro: €29 per maand, {feePercentFor("pro").toLocaleString("nl-BE")}% per verkoop
                </button>
              </form>
            )
          ) : (
            <form action={togglePlanTestMode}>
              <button className={buttonStyles.secondary}>{store.plan === "pro" ? "Terug naar Start (test)" : "Pro uitproberen (test, gratis)"}</button>
            </form>
          )}
        </div>
      </Card>
    </div>
  );
}
