/**
 * De betaallogica van Paylity.
 *
 * Zowel de REST API als de checkout gebruikt deze functies, zodat een betaling
 * langs één route door het systeem loopt en de statusregels op één plek staan.
 *
 * Statusverloop:
 *
 *   pending ──▶ paid ──▶ refunded
 *      │
 *      ├──▶ failed
 *      └──▶ cancelled
 *
 * Een betaling gaat nooit terug naar een eerdere stand. Dat wordt hier
 * afgedwongen, niet in de interface: een knop kan verdwijnen, een regel niet.
 */

import "server-only";

import { randomBytes } from "node:crypto";

import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import type { PaymentMethodId } from "@/lib/providers/types";
import { recordEvent } from "@/lib/webhooks";

export function newLinkSlug(): string {
  return `pl_${randomBytes(8).toString("hex")}`;
}

/** Maakt een betaling in status `pending` voor een betaallink. */
export async function startPaymentForLink(args: {
  linkSlug: string;
  method: PaymentMethodId;
  customerName?: string;
  customerEmail?: string;
  returnUrl: string;
}) {
  const link = await db.paymentLink.findUnique({
    where: { slug: args.linkSlug },
    include: { business: true },
  });

  if (!link) throw new Error("Deze betaallink bestaat niet.");
  if (!link.active) throw new Error("Deze betaallink is niet meer actief.");

  // Een klant aanmaken of hergebruiken, alleen als er een e-mailadres is.
  let customerId: string | null = null;
  if (args.customerEmail) {
    const customer = await db.customer.upsert({
      where: {
        businessId_email: { businessId: link.businessId, email: args.customerEmail },
      },
      update: { name: args.customerName || undefined },
      create: {
        businessId: link.businessId,
        email: args.customerEmail,
        name: args.customerName || args.customerEmail,
      },
    });
    customerId = customer.id;
  }

  const order = await db.order.create({
    data: {
      businessId: link.businessId,
      customerId,
      reference: `ord_${randomBytes(8).toString("hex")}`,
      description: link.title,
      amount: link.amount,
      currency: link.currency,
    },
  });

  const provider = getProvider();
  const payment = await db.payment.create({
    data: {
      businessId: link.businessId,
      orderId: order.id,
      customerId,
      paymentLinkId: link.id,
      amount: link.amount,
      currency: link.currency,
      method: args.method,
      status: "pending",
      description: link.title,
      provider: provider.id,
    },
  });

  const result = await provider.createPayment({
    amount: link.amount,
    currency: link.currency,
    method: args.method,
    description: link.title,
    reference: payment.id,
    returnUrl: args.returnUrl,
  });

  const updated = await db.payment.update({
    where: { id: payment.id },
    data: { providerPaymentId: result.providerPaymentId },
  });

  await recordEvent(link.businessId, "payment.created", {
    paymentId: updated.id,
    amount: updated.amount,
    currency: updated.currency,
    status: updated.status,
  });

  return { payment: updated, link, redirectUrl: result.redirectUrl };
}

/**
 * Rondt een betaling af.
 *
 * `uitkomst` komt bij de gesimuleerde provider van de keuze op de testpagina.
 * Bij een erkende provider komt die van de provider zelf, via diens webhook —
 * nooit van de browser van de klant.
 */
export async function settlePayment(
  paymentId: string,
  uitkomst: "success" | "failure",
) {
  const payment = await db.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Deze betaling bestaat niet.");

  if (payment.status !== "pending") {
    // Al afgerond: niets meer wijzigen. Zo kan iemand die de pagina herlaadt
    // een mislukte betaling niet alsnog op geslaagd zetten.
    return payment;
  }

  const geslaagd = uitkomst === "success";
  const updated = await db.payment.update({
    where: { id: paymentId },
    data: {
      status: geslaagd ? "paid" : "failed",
      paidAt: geslaagd ? new Date() : null,
      failureReason: geslaagd ? null : "Gesimuleerde weigering (testmodus)",
    },
  });

  await recordEvent(
    updated.businessId,
    geslaagd ? "payment.succeeded" : "payment.failed",
    {
      paymentId: updated.id,
      amount: updated.amount,
      currency: updated.currency,
      status: updated.status,
    },
  );

  return updated;
}

/** Betaalt (een deel van) een geslaagde betaling terug. */
export async function refundPayment(args: {
  businessId: string;
  paymentId: string;
  amount?: number;
  reason?: string;
}) {
  const payment = await db.payment.findFirst({
    where: { id: args.paymentId, businessId: args.businessId },
  });

  if (!payment) throw new Error("Deze betaling bestaat niet.");
  if (payment.status !== "paid" && payment.status !== "refunded") {
    throw new Error("Alleen een geslaagde betaling kan worden terugbetaald.");
  }

  const resterend = payment.amount - payment.refundedAmount;
  const bedrag = args.amount ?? resterend;

  if (bedrag <= 0 || bedrag > resterend) {
    throw new Error(
      `Er kan hoogstens ${(resterend / 100).toFixed(2)} worden terugbetaald.`,
    );
  }

  const provider = getProvider();
  const result = await provider.refundPayment({
    providerPaymentId: payment.providerPaymentId ?? payment.id,
    amount: bedrag,
    reason: args.reason,
  });

  const [refund, updated] = await db.$transaction([
    db.refund.create({
      data: { paymentId: payment.id, amount: bedrag, reason: args.reason },
    }),
    db.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: payment.refundedAmount + bedrag,
        // Pas bij een volledige terugbetaling verandert de status.
        status: payment.refundedAmount + bedrag >= payment.amount ? "refunded" : "paid",
      },
    }),
  ]);

  await recordEvent(payment.businessId, "payment.refunded", {
    paymentId: payment.id,
    refundId: refund.id,
    amount: bedrag,
    providerRefundId: result.providerRefundId,
  });

  return { refund, payment: updated };
}

/** Cijfers voor het dashboard, in één keer opgehaald. */
export async function businessStats(businessId: string) {
  const sinds = new Date();
  sinds.setDate(sinds.getDate() - 29);
  sinds.setHours(0, 0, 0, 0);

  const [betaald, mislukt, terugbetaald, recent, reeks] = await Promise.all([
    db.payment.aggregate({
      where: { businessId, status: { in: ["paid", "refunded"] } },
      _sum: { amount: true, refundedAmount: true },
      _count: true,
    }),
    db.payment.count({ where: { businessId, status: "failed" } }),
    db.payment.aggregate({
      where: { businessId, refundedAmount: { gt: 0 } },
      _sum: { refundedAmount: true },
      _count: true,
    }),
    db.payment.findMany({
      where: { businessId },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true },
    }),
    db.payment.findMany({
      where: { businessId, status: { in: ["paid", "refunded"] }, createdAt: { gte: sinds } },
      select: { amount: true, refundedAmount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const bruto = betaald._sum.amount ?? 0;
  const retour = betaald._sum.refundedAmount ?? 0;

  // Per dag optellen voor de grafiek, ook de dagen zonder omzet.
  const perDag = new Map<string, number>();
  for (let i = 0; i < 30; i++) {
    const d = new Date(sinds);
    d.setDate(d.getDate() + i);
    perDag.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of reeks) {
    const dag = p.createdAt.toISOString().slice(0, 10);
    if (perDag.has(dag)) {
      perDag.set(dag, (perDag.get(dag) ?? 0) + p.amount - p.refundedAmount);
    }
  }

  return {
    omzetCent: bruto - retour,
    geslaagd: betaald._count,
    mislukt,
    terugbetaaldCent: terugbetaald._sum.refundedAmount ?? 0,
    terugbetalingen: terugbetaald._count,
    recent,
    grafiek: [...perDag.entries()].map(([dag, cent]) => ({ dag, cent })),
  };
}
