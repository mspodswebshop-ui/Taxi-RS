import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input } from "@/components/ui";

import { login } from "../actions";

export const metadata: Metadata = { title: "Inloggen · Toonbank" };

export default function LoginPage() {
  return (
    <Card className="p-6">
      <h1 className="mb-1 text-xl font-semibold">Inloggen</h1>
      <p className="mb-6 text-sm text-ink-500">Naar het beheer van je winkel.</p>
      <ActionForm action={login} className="space-y-4">
        <Field label="E-mailadres">
          <Input name="email" type="email" autoComplete="email" required autoFocus />
        </Field>
        <Field label="Wachtwoord">
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>
        <SubmitButton className="w-full">Inloggen</SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-ink-500">
        Nog geen winkel?{" "}
        <Link href="/signup" className="font-medium text-brand-700 hover:underline">
          Open er gratis een
        </Link>
      </p>
    </Card>
  );
}
