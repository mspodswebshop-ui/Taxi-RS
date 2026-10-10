/**
 * De inhoud van een klantwebsite.
 *
 * Alles wat een klant zelf kan aanpassen, staat in één JSON-object in de
 * database (Site.content). Dit schema bepaalt welke velden er zijn en wat er
 * in mag. Elke opslag gaat hier doorheen, dus ook een klant die met de
 * ontwikkelaarstools van zijn browser speelt, krijgt er niets anders in.
 *
 * Wat er op de website verschijnt, wordt door React als tekst getoond en
 * nooit als HTML. Een klant kan dus geen scripts in zijn site plakken.
 */

import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Tijd moet de vorm UU:MM hebben");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Kleur moet de vorm #RRGGBB hebben");
const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine(v => v === "" || /^https:\/\/[^\s"'<>]+$/.test(v), "Link moet met https:// beginnen");

export const ART = ["loaf", "baguette", "round", "square", "croissant", "cookie", "cake"] as const;
export const ART_LABELS: Record<(typeof ART)[number], string> = {
  loaf: "Brood",
  baguette: "Stokbrood",
  round: "Rond brood",
  square: "Plat / msemen",
  croissant: "Croissant",
  cookie: "Koekjes",
  cake: "Taart",
};

export const productSchema = z.object({
  id: text(40).min(1),
  name: text(80).min(1, "Elk product heeft een naam nodig"),
  description: text(240),
  /** In centen, om afrondingsfouten te vermijden. */
  priceCents: z.number().int().min(0).max(100_000_00),
  category: text(40),
  art: z.enum(ART),
  featured: z.boolean(),
  visible: z.boolean(),
});

export const reviewSchema = z.object({
  id: text(40).min(1),
  name: text(60).min(1, "Elke review heeft een naam nodig"),
  when: text(40),
  stars: z.number().int().min(1).max(5),
  text: text(800).min(1, "Een review mag niet leeg zijn"),
  tags: z.array(text(30)).max(6),
});

export const daySchema = z.object({
  closed: z.boolean(),
  open: time,
  close: time,
});

export const contentSchema = z.object({
  business: z.object({
    name: text(80).min(1, "De zaak heeft een naam nodig"),
    tagline: text(160),
    street: text(120),
    city: text(80),
    phone: text(40),
    /** Alleen cijfers, internationaal formaat zonder +, bv. 32470123456. */
    whatsapp: z.string().trim().regex(/^\d{0,15}$/, "WhatsApp-nummer: alleen cijfers, bv. 32470123456"),
    email: z.union([z.literal(""), z.string().trim().email("Ongeldig e-mailadres").max(120)]),
    googleUrl: httpsUrl,
    googleRating: z.number().min(0).max(5),
    googleCount: z.number().int().min(0).max(1_000_000),
  }),
  hero: z.object({
    title: text(80),
    highlight: text(40),
    titleEnd: text(80),
    intro: text(400),
  }),
  highlights: z.array(text(60)).max(3),
  about: z.object({
    title: text(100),
    body: text(3000),
    quote: text(200),
  }),
  /** Index 0 = zondag ... 6 = zaterdag, zoals Date.getDay(). */
  hours: z.array(daySchema).length(7),
  hoursNote: text(200),
  categories: z.array(text(40).min(1)).max(12),
  products: z.array(productSchema).max(200),
  reviews: z.array(reviewSchema).max(100),
  showReviews: z.boolean(),
  ordering: z.object({
    enabled: z.boolean(),
    note: text(300),
    greeting: text(80),
  }),
  theme: z.object({
    primary: hex,
    accent: hex,
    secondary: hex,
  }),
});

export type SiteContent = z.infer<typeof contentSchema>;
export type Product = z.infer<typeof productSchema>;
export type Review = z.infer<typeof reviewSchema>;

export const DAY_NAMES = ["Zondag", "Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag"];

/** Kleurensets waar de klant met één klik uit kan kiezen. */
export const PALETTES: { name: string; primary: string; accent: string; secondary: string }[] = [
  { name: "Terracotta", primary: "#b5492b", accent: "#e9a23b", secondary: "#2c4a9a" },
  { name: "Majorelle", primary: "#2c4a9a", accent: "#e9a23b", secondary: "#b5492b" },
  { name: "Olijf", primary: "#4f6b45", accent: "#d9a441", secondary: "#8e3519" },
  { name: "Chocolade", primary: "#6b3e26", accent: "#d99a4e", secondary: "#2f6f6a" },
  { name: "Framboos", primary: "#a63a5b", accent: "#f0b44c", secondary: "#3b5b8c" },
];

/** Leest inhoud uit de database. Valt terug op een lege basis bij onzin. */
export function parseContent(raw: unknown, fallback: SiteContent): SiteContent {
  const result = contentSchema.safeParse(raw);
  return result.success ? result.data : fallback;
}

/** Een eerste fout in leesbare vorm, voor de melding in de editor. */
export function firstIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return "Ongeldige inhoud.";
  const where = issue.path.length ? ` (${issue.path.join(" › ")})` : "";
  return `${issue.message}${where}`;
}

export function formatPrice(cents: number): string {
  return new Intl.NumberFormat("nl-BE", { style: "currency", currency: "EUR" }).format(cents / 100);
}

/** "2,60" of "2.60" naar 260 centen. Geeft null bij onzin. */
export function parsePrice(input: string): number | null {
  const clean = input.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  return Math.round(Number(clean) * 100);
}
