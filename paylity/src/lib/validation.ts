/**
 * Validatie van alle invoer, met Zod.
 *
 * Elk API-verzoek gaat hier doorheen voordat er iets met de database gebeurt.
 * Wat hier niet doorkomt, komt de rest van het systeem niet in.
 *
 * Let op wat er bewust NIET in staat: er is geen enkel veld voor een
 * kaartnummer, CVC/CVV, pincode, IBAN of bankwachtwoord. Paylity vraagt die
 * gegevens niet en bewaart ze niet.
 */

import { z } from "zod";

/** Bedragen zijn altijd gehele centen: 1 cent tot 1 miljoen euro. */
export const amountSchema = z
  .number()
  .int("Het bedrag moet in hele centen worden opgegeven.")
  .min(1, "Het bedrag moet groter zijn dan nul.")
  .max(100_000_000, "Het bedrag is te hoog.");

export const currencySchema = z
  .string()
  .length(3, "Een valuta bestaat uit drie letters, bijvoorbeeld EUR.")
  .toUpperCase()
  .refine((v) => ["EUR", "USD", "GBP"].includes(v), {
    message: "Alleen EUR, USD en GBP worden ondersteund.",
  });

export const paymentMethodSchema = z.enum(["bancontact", "card"]);

export const paymentStatusSchema = z.enum([
  "pending",
  "paid",
  "failed",
  "refunded",
  "cancelled",
]);

/* ---------------------------------------------------------------- */
/* Registreren en inloggen                                           */
/* ---------------------------------------------------------------- */

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Vul je naam in.").max(100),
  businessName: z.string().trim().min(2, "Vul je bedrijfsnaam in.").max(100),
  email: z.string().trim().toLowerCase().email("Dit is geen geldig e-mailadres."),
  password: z
    .string()
    .min(10, "Gebruik minstens 10 tekens.")
    .max(200, "Dat wachtwoord is wel erg lang."),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Dit is geen geldig e-mailadres."),
  password: z.string().min(1, "Vul je wachtwoord in."),
});

/* ---------------------------------------------------------------- */
/* Betaallinks                                                       */
/* ---------------------------------------------------------------- */

export const createPaymentLinkSchema = z.object({
  title: z.string().trim().min(1, "Geef de betaallink een titel.").max(120),
  description: z.string().trim().max(500).optional(),
  amount: amountSchema,
  currency: currencySchema.default("EUR"),
  active: z.boolean().default(true),
});

export const updatePaymentLinkSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  amount: amountSchema.optional(),
  active: z.boolean().optional(),
});

/* ---------------------------------------------------------------- */
/* Klanten                                                           */
/* ---------------------------------------------------------------- */

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, "Vul een naam in.").max(120),
  email: z.string().trim().toLowerCase().email("Dit is geen geldig e-mailadres."),
  phone: z.string().trim().max(40).optional(),
});

/* ---------------------------------------------------------------- */
/* Facturen                                                          */
/* ---------------------------------------------------------------- */

export const createInvoiceSchema = z.object({
  customerId: z.string().trim().min(1, "Kies een klant."),
  amount: amountSchema,
  currency: currencySchema.default("EUR"),
  description: z.string().trim().max(500).optional(),
  dueAt: z.coerce.date().optional(),
});

/* ---------------------------------------------------------------- */
/* Terugbetalingen                                                   */
/* ---------------------------------------------------------------- */

export const createRefundSchema = z.object({
  paymentId: z.string().trim().min(1, "Geef aan welke betaling terugbetaald wordt."),
  // Zonder bedrag wordt het volledige resterende bedrag terugbetaald.
  amount: amountSchema.optional(),
  reason: z.string().trim().max(300).optional(),
});

/* ---------------------------------------------------------------- */
/* Checkout (testbetaling)                                           */
/* ---------------------------------------------------------------- */

export const checkoutSchema = z.object({
  method: paymentMethodSchema,
  /**
   * Welke uitkomst de testbetaling moet nabootsen. Dit veld bestaat alleen
   * zolang de gesimuleerde provider actief is; een erkende provider bepaalt
   * de uitkomst zelf.
   */
  simulate: z.enum(["success", "failure"]),
  customerName: z.string().trim().max(120).optional(),
  customerEmail: z
    .string()
    .trim()
    .toLowerCase()
    .email("Dit is geen geldig e-mailadres.")
    .optional()
    .or(z.literal("")),
});

/* ---------------------------------------------------------------- */
/* Lijstweergaven                                                    */
/* ---------------------------------------------------------------- */

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  status: paymentStatusSchema.optional(),
  search: z.string().trim().max(120).optional(),
});

/* ---------------------------------------------------------------- */
/* Binnenkomende webhook                                             */
/* ---------------------------------------------------------------- */

export const incomingWebhookSchema = z.object({
  type: z.string().trim().min(1).max(100),
  data: z.record(z.string(), z.unknown()),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
