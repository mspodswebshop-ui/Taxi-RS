/**
 * De ontwerpen (templates) waarmee een klantwebsite gemaakt kan worden.
 *
 * Een nieuw ontwerp toevoegen: maak een map naast `bakkerij/` met een
 * component en standaardinhoud, en zet het hieronder in TEMPLATES.
 */

import type { SiteContent } from "@/lib/content";
import { bakkerijDefaults } from "@/templates/bakkerij/defaults";

export type TemplateInfo = {
  id: string;
  label: string;
  description: string;
  defaults: (businessName: string) => SiteContent;
};

export const TEMPLATES: TemplateInfo[] = [
  {
    id: "bakkerij",
    label: "Bakkerij / voedingszaak",
    description: "Assortiment met prijzen, bestellen via WhatsApp, openingsuren, reviews.",
    defaults: bakkerijDefaults,
  },
];

export function getTemplate(id: string): TemplateInfo {
  return TEMPLATES.find(t => t.id === id) ?? TEMPLATES[0];
}

/** De pagina's van een site, in menuvolgorde. "" is de homepagina. */
export const PAGES = [
  { path: "", label: "Home" },
  { path: "assortiment", label: "Assortiment" },
  { path: "over-ons", label: "Over ons" },
  { path: "reviews", label: "Reviews" },
  { path: "contact", label: "Contact" },
  { path: "bestellen", label: "Bestellen" },
] as const;

export type PagePath = (typeof PAGES)[number]["path"];
