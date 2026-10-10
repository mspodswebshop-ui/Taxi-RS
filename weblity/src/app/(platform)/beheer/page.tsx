import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CodeLogin } from "@/components/code-login";
import { Logo } from "@/components/ui";
import { currentClientSite } from "@/lib/auth";

export const metadata: Metadata = { title: "Inloggen", robots: { index: false } };

export default async function BeheerLogin() {
  if (await currentClientSite()) redirect("/beheer/site");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <Link href="/"><Logo /></Link>
      <div className="mt-8 w-full max-w-md rounded-3xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="font-display text-2xl font-bold">Beheer je website</h1>
        <p className="mt-1 text-sm text-ink-500">Vul de code in die je van Weblity kreeg.</p>
        <CodeLogin />
      </div>
      <p className="mt-6 max-w-sm text-center text-sm text-ink-500">Code kwijt? Neem contact op met Weblity, dan maken we een nieuwe voor je.</p>
    </main>
  );
}
