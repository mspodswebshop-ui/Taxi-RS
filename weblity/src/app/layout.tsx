import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Weblity", template: "%s · Weblity" },
  description: "Websites voor lokale ondernemers, die ze zelf kunnen beheren.",
};

/**
 * Basislayout. De stijl zit bewust niet hier maar per deel van de app:
 * het beheerplatform gebruikt Tailwind, de klantwebsites hun eigen ontwerp.
 * Zo zitten die twee elkaar nooit in de weg.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
