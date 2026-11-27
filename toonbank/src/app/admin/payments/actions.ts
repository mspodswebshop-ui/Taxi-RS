"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { baseUrl, proBillingEnabled, stripe, stripeEnabled } from "@/lib/stripe";

/** Maakt (zo nodig) een Stripe-rekening voor de winkel en stuurt naar de aanmelding bij Stripe. */
export async function startStripeOnboarding(): Promise<void> {
  const { store } = await requireMerchant();
  if (!stripeEnabled()) redirect("/admin/payments");

  let accountId = store.stripeAccountId;
  if (!accountId) {
    const account = await stripe().accounts.create({
      type: "express",
      email: store.email,
      business_profile: { name: store.name, url: `${baseUrl()}/s/${store.slug}` },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
        bancontact_payments: { requested: true },
      },
      metadata: { storeId: store.id },
    });
    accountId = account.id;
    await db.store.update({ where: { id: store.id }, data: { stripeAccountId: accountId } });
  }

  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${baseUrl()}/admin/payments`,
    return_url: `${baseUrl()}/admin/payments?terug=1`,
  });
  redirect(link.url);
}

export async function openStripeDashboard(): Promise<void> {
  const { store } = await requireMerchant();
  if (!store.stripeAccountId) redirect("/admin/payments");
  const link = await stripe().accounts.createLoginLink(store.stripeAccountId);
  redirect(link.url);
}

export async function upgradeToPro(): Promise<void> {
  const { store, user } = await requireMerchant();
  if (!proBillingEnabled() || store.plan === "pro") redirect("/admin/payments");

  const session = await stripe().checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID!, quantity: 1 }],
    customer: store.stripeCustomerId ?? undefined,
    customer_email: store.stripeCustomerId ? undefined : user.email,
    client_reference_id: store.id,
    metadata: { kind: "subscription", storeId: store.id },
    subscription_data: { metadata: { storeId: store.id } },
    success_url: `${baseUrl()}/admin/payments?pro=1`,
    cancel_url: `${baseUrl()}/admin/payments`,
  });
  redirect(session.url!);
}

export async function manageSubscription(): Promise<void> {
  const { store } = await requireMerchant();
  if (!store.stripeCustomerId) redirect("/admin/payments");
  const portal = await stripe().billingPortal.sessions.create({
    customer: store.stripeCustomerId,
    return_url: `${baseUrl()}/admin/payments`,
  });
  redirect(portal.url);
}

/** Alleen in testmodus: Pro uitproberen zonder te betalen. */
export async function togglePlanTestMode(): Promise<void> {
  const { store } = await requireMerchant();
  if (proBillingEnabled()) return;
  await db.store.update({ where: { id: store.id }, data: { plan: store.plan === "pro" ? "free" : "pro" } });
  revalidatePath("/admin/payments");
}
