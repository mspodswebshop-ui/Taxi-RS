import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Toonbank: je eigen webshop", template: "%s" },
  description:
    "Open je eigen webshop in een paar minuten. Producten, bestellingen, kortingscodes en betalingen met Bancontact en kaart.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
