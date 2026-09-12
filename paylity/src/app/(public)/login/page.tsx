import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/auth-form";

export const metadata: Metadata = { title: "Inloggen" };

export default function LoginPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col justify-center px-5 py-16">
      <h1 className="text-2xl font-bold tracking-tight">Inloggen</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        Welkom terug bij je dashboard.
      </p>

      <AuthForm mode="login" />

      <p className="mt-6 text-sm text-ink-500">
        Nog geen account?{" "}
        <Link href="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Maak er een aan
        </Link>
      </p>
    </div>
  );
}
