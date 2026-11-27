import type { Metadata } from "next";
import Link from "next/link";

import { logout } from "@/app/(auth)/actions";
import { AdminNav } from "@/components/admin-nav";
import { Logo } from "@/components/logo";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { stripeEnabled } from "@/lib/stripe";

export const metadata: Metadata = { title: "Beheer · Toonbank" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { store, user } = await requireMerchant();
  // "Nog te verzenden": betaald maar nog niet verzonden.
  const toShip = await db.order.count({
    where: { storeId: store.id, status: "paid", fulfillment: "unfulfilled" },
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="relative flex items-center justify-between border-b border-ink-200 bg-white px-4 py-3 lg:sticky lg:top-0 lg:block lg:h-screen lg:border-r lg:border-b-0 lg:px-3 lg:py-5">
        <div className="lg:mb-6 lg:px-3">
          <Link href="/admin">
            <Logo />
          </Link>
          <p className="mt-1 hidden truncate text-sm text-ink-500 lg:block">{store.name}</p>
        </div>
        <AdminNav pendingOrders={toShip} />
        <div className="hidden lg:absolute lg:inset-x-3 lg:bottom-5 lg:block">
          <a
            href={`/s/${store.slug}`}
            target="_blank"
            className="mb-2 block rounded-lg border border-ink-200 px-3 py-2 text-center text-sm font-medium hover:bg-ink-50"
          >
            Bekijk winkel ↗
          </a>
          <form action={logout}>
            <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-ink-500 hover:bg-ink-100">
              Uitloggen ({user.name})
            </button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        {!stripeEnabled() && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
            <strong>Testmodus.</strong> Het platform heeft nog geen Stripe-sleutel. Bestellingen werken, maar klanten
            betalen met een testknop en er gaat geen echt geld rond.
          </div>
        )}
        <div className="mx-auto max-w-6xl">{children}</div>
        <div className="mt-10 flex gap-3 text-sm lg:hidden">
          <a href={`/s/${store.slug}`} target="_blank" className="font-medium text-brand-700">
            Bekijk winkel ↗
          </a>
          <form action={logout}>
            <button className="text-ink-500">Uitloggen</button>
          </form>
        </div>
      </main>
    </div>
  );
}
