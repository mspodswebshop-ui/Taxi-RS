import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Paylity — Payments made simple", template: "%s · Paylity" },
  description:
    "Paylity is een betaalplatform voor webshops. Deze versie draait volledig in testmodus en verwerkt geen echt geld.",
};

/**
 * Zet het thema vóór het eerste renderen.
 *
 * Zonder dit ziet de bezoeker eerst het lichte thema en daarna pas het donkere,
 * wat als een flits in beeld komt.
 */
const themeScript = `
(function () {
  try {
    var opgeslagen = localStorage.getItem("paylity-theme");
    var donker = opgeslagen
      ? opgeslagen === "dark"
      : window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (donker) document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="bg-ink-50 text-ink-900 antialiased dark:bg-ink-950 dark:text-ink-100">
        {children}
      </body>
    </html>
  );
}
