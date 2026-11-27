"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cx } from "@/components/ui";

const items = [
  { href: "/admin", label: "Overzicht", exact: true },
  { href: "/admin/orders", label: "Bestellingen" },
  { href: "/admin/products", label: "Producten" },
  { href: "/admin/collections", label: "Collecties" },
  { href: "/admin/customers", label: "Klanten" },
  { href: "/admin/discounts", label: "Kortingscodes" },
  { href: "/admin/payments", label: "Betalingen & abonnement" },
  { href: "/admin/settings", label: "Instellingen" },
];

export function AdminNav({ pendingOrders }: { pendingOrders: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={cx(
              "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            {item.label}
            {item.href === "/admin/orders" && pendingOrders > 0 && (
              <span className={cx("rounded-full px-1.5 text-xs", active ? "bg-white/20" : "bg-brand-600 text-white")}>
                {pendingOrders}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-sm font-medium"
          aria-expanded={open}
        >
          {open ? "Sluiten" : "Menu"}
        </button>
        {open && <div className="absolute inset-x-0 top-14 z-20 border-b border-ink-200 bg-white p-3 shadow-lg">{links}</div>}
      </div>
      <div className="hidden lg:block">{links}</div>
    </>
  );
}
