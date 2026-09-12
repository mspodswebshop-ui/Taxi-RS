import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CheckoutForm } from "@/components/checkout-form";
import { Logo } from "@/components/ui";
import { db } from "@/lib/db";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ paymentLinkId: string }>;
}): Promise<Metadata> {
  const { paymentLinkId } = await params;
  const link = await db.paymentLink.findUnique({
    where: { slug: paymentLinkId },
    select: { title: true },
  });
  return { title: link ? `Betalen — ${link.title}` : "Betalen" };
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ paymentLinkId: string }>;
}) {
  const { paymentLinkId } = await params;

  const link = await db.paymentLink.findUnique({
    where: { slug: paymentLinkId },
    include: { business: { select: { name: true } } },
  });

  if (!link) notFound();

  if (!link.active) {
    return (
      <Schil>
        <div className="text-center">
          <h1 className="text-xl font-bold">Deze betaallink is niet meer actief</h1>
          <p className="mt-2 text-sm text-ink-500">
            Vraag de verkoper om een nieuwe link.
          </p>
        </div>
      </Schil>
    );
  }

  return (
    <Schil>
      {/* ---------- Wat je betaalt ---------- */}
      <div className="border-b border-ink-200 pb-5 dark:border-ink-800">
        <p className="text-sm font-semibold text-ink-500">{link.business.name}</p>
        <h1 className="mt-1 text-lg font-bold tracking-tight">{link.title}</h1>
        {link.description ? (
          <p className="mt-1 text-sm text-ink-600 dark:text-ink-400">{link.description}</p>
        ) : null}

        <p className="tabular mt-4 text-3xl font-bold tracking-tight">
          {formatMoney(link.amount, link.currency)}
        </p>
      </div>

      <CheckoutForm
        slug={link.slug}
        amountLabel={formatMoney(link.amount, link.currency)}
      />
    </Schil>
  );
}

function Schil({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-100 px-4 py-10 dark:bg-ink-950">
      <div className="w-full max-w-md">
        <div className="mb-5 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm dark:border-ink-800 dark:bg-ink-900">
          {children}
        </div>

        <p className="mt-5 text-center text-xs leading-relaxed text-ink-500">
          Beveiligde betaling via Paylity. Wij vragen en bewaren nooit je
          kaartnummer, CVC, pincode of IBAN.
        </p>
      </div>
    </div>
  );
}
