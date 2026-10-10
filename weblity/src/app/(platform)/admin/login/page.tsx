import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminLogin } from "@/components/admin-login";
import { Logo } from "@/components/ui";
import { currentAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Beheer", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Logo />
      <div className="mt-8 w-full max-w-md rounded-3xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold">Beheer</h1>
        <p className="mt-1 text-sm text-ink-500">Alleen voor het Weblity-team. Klanten loggen in op <a href="/beheer" className="text-brand-700 underline">/beheer</a>.</p>
        <AdminLogin />
      </div>
    </main>
  );
}
