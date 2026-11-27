import type { Metadata } from "next";
import Link from "next/link";

import { ActionForm, SubmitButton } from "@/components/forms";
import { Card, Field, Input } from "@/components/ui";

import { signup } from "../actions";

export const metadata: Metadata = { title: "Open je winkel · Toonbank" };

export default function SignupPage() {
  return (
    <Card className="p-6">
      <h1 className="mb-1 text-xl font-semibold">Open je winkel</h1>
      <p className="mb-6 text-sm text-ink-500">Gratis starten. Je betaalt pas als je verkoopt.</p>
      <ActionForm action={signup} className="space-y-4">
        <Field label="Naam van je winkel">
          <Input name="storeName" placeholder="Bijv. Atelier Noor" required autoFocus />
        </Field>
        <Field label="Je naam">
          <Input name="name" autoComplete="name" required />
        </Field>
        <Field label="E-mailadres">
          <Input name="email" type="email" autoComplete="email" required />
        </Field>
        <Field label="Wachtwoord" hint="Minstens 8 tekens.">
          <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <SubmitButton variant="brand" className="w-full" pendingText="Winkel wordt aangemaakt…">
          Maak mijn winkel
        </SubmitButton>
      </ActionForm>
      <p className="mt-6 text-center text-sm text-ink-500">
        Al een winkel?{" "}
        <Link href="/login" className="font-medium text-brand-700 hover:underline">
          Log in
        </Link>
      </p>
    </Card>
  );
}
