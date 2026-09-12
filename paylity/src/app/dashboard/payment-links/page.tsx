import type { Metadata } from "next";

import { PaymentLinkForm } from "@/components/payment-link-form";
import { Card, EmptyState, Money, PageHeader, TestModeBadge } from "@/components/ui";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata: Metadata = { title: "Betaallinks" };
export const dynamic = "force-dynamic";

export default async function PaymentLinksPage() {
  const user = (await currentUser())!;

  const links = await db.paymentLink.findMany({
    where: { businessId: user.businessId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { payments: true } } },
  });

  return (
    <>
      <PageHeader
        title="Betaallinks"
        description="Maak een link met een vast bedrag en deel hem met je klant."
        action={<TestModeBadge />}
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="font-semibold">Nieuwe betaallink</h2>
          <PaymentLinkForm />
        </Card>

        <Card>
          <h2 className="mb-4 font-semibold">Je links</h2>

          {links.length === 0 ? (
            <EmptyState
              title="Nog geen betaallinks"
              description="Maak er links een aan. Je krijgt meteen een deelbare link."
            />
          ) : (
            <ul className="space-y-3">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="rounded-lg border border-ink-200 p-3.5 dark:border-ink-800"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{link.title}</p>
                      {link.description ? (
                        <p className="mt-0.5 truncate text-sm text-ink-500">
                          {link.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="font-semibold">
                      <Money cents={link.amount} currency={link.currency} />
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <a
                      href={`/pay/${link.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-ink-100 px-2 py-1 font-mono text-xs text-ink-700 hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                    >
                      /pay/{link.slug}
                    </a>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                        link.active
                          ? "border-emerald-500/30 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                          : "border-ink-500/30 bg-ink-500/12 text-ink-600 dark:text-ink-400"
                      }`}
                    >
                      {link.active ? "Actief" : "Inactief"}
                    </span>
                    <span className="text-xs text-ink-500">
                      {link._count.payments}{" "}
                      {link._count.payments === 1 ? "betaling" : "betalingen"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
