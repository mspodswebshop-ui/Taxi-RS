import Link from "next/link";

import { Logo } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-8">
      <header className="flex items-center justify-between">
        <Logo />
        <Link href="/admin" className="text-sm font-medium text-ink-500 hover:text-ink-800">Beheer</Link>
      </header>

      <section className="my-auto py-16 text-center">
        <p className="mb-4 inline-block rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">Websites voor lokale ondernemers</p>
        <h1 className="mx-auto max-w-3xl font-display text-4xl font-bold tracking-tight text-ink-900 sm:text-6xl">
          Jouw website, <span className="text-brand-600">zelf</span> aanpassen.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-ink-500">
          Openingsuren veranderd? Nieuw product? Met je persoonlijke code pas je je website in een paar klikken aan, ook op je telefoon.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/beheer" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white shadow-sm hover:bg-brand-700">
            Inloggen met mijn code
          </Link>
        </div>
      </section>

      <section className="grid gap-4 pb-8 sm:grid-cols-3">
        {[
          ["🔑", "Eén code per zaak", "Elke klant krijgt een eigen code en kan alleen zijn eigen website aanpassen."],
          ["📱", "Werkt overal", "Aanpassen kan op je computer, tablet of telefoon."],
          ["⚡", "Meteen online", "Opslaan en je website is bijgewerkt. Geen technische kennis nodig."],
        ].map(([icon, title, text]) => (
          <div key={title} className="rounded-2xl border border-ink-200 bg-white p-5">
            <div className="text-2xl">{icon}</div>
            <h2 className="mt-2 font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-ink-500">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
