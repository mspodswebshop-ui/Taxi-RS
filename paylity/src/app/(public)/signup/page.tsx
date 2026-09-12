import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Account aanmaken" };

export default function SignupPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Testaccount aanmaken</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Gratis, en er wordt geen echt geld verwerkt.
      </p>

      <AuthForm mode="signup" />

      <p className="mt-6 text-sm text-ink-500">
        Al een account?{" "}
        <Link href="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Inloggen
        </Link>
      </p>
    </div>
  );
}
