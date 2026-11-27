"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import type { FormState } from "@/components/forms";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientIp, loginLimiter } from "@/lib/rate-limit";
import { uniqueSlug } from "@/lib/slug";

const signupSchema = z.object({
  name: z.string().trim().min(1, "Vul je naam in.").max(100),
  email: z.email("Dat is geen geldig e-mailadres.").trim().toLowerCase(),
  password: z.string().min(8, "Je wachtwoord moet minstens 8 tekens hebben.").max(200),
  storeName: z.string().trim().min(2, "Geef je winkel een naam.").max(80),
});

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const limit = loginLimiter.check(`signup:${clientIp(await headers())}`);
  if (!limit.allowed) return { error: "Te veel pogingen. Probeer het over een minuut opnieuw." };

  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password, storeName } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "Er bestaat al een account met dit e-mailadres. Log in." };
  }

  const slug = await uniqueSlug(storeName, async (s) =>
    Boolean(await db.store.findUnique({ where: { slug: s }, select: { id: true } })),
  );

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      stores: {
        create: {
          name: storeName,
          slug,
          email,
          heroTitle: storeName,
          heroText: "Welkom in onze winkel.",
        },
      },
    },
  });

  await createSession(user.id);
  redirect("/admin?welkom=1");
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string(),
});

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const limit = loginLimiter.check(`login:${clientIp(await headers())}`);
  if (!limit.allowed) return { error: "Te veel pogingen. Probeer het over een minuut opnieuw." };

  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Vul je e-mailadres en wachtwoord in." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Zelfde melding bij onbekend e-mailadres en fout wachtwoord: zo valt niet
  // af te leiden welke e-mailadressen een account hebben.
  if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "E-mailadres of wachtwoord klopt niet." };
  }

  await createSession(user.id);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await destroySession();
  redirect("/login");
}
