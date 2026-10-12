"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { createSession, destroySession, hashPassword, randomToken, safeNext, verifyPassword } from "@/lib/auth";
import { issueOtp } from "@/lib/otp";
import { sendEmail } from "@/lib/outbox";
import { track } from "@/lib/notify";
import { grantDemoStartingBalance } from "@/lib/demo-wallet";
import { fail, str, type ActionState } from "@/lib/action-state";

const signupSchema = z.object({
  name: z.string().min(2, "Enter your full name.").max(80),
  email: z.email("Enter a valid email address.").transform((e) => e.toLowerCase()),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export async function signup(_: ActionState, form: FormData): Promise<ActionState> {
  if (form.get("consent") !== "on") return fail("Please agree to the terms and privacy policy to continue.");
  const parsed = signupSchema.safeParse({ name: str(form, "name"), email: str(form, "email"), password: form.get("password") });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) return fail("An account with this email already exists. Try logging in.");

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password), consentAt: new Date() },
  });
  await grantDemoStartingBalance(user.id);
  await track("signup", user.id, { method: "password" });
  await createSession(user.id);
  redirect("/verify");
}

export async function login(_: ActionState, form: FormData): Promise<ActionState> {
  const email = str(form, "email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    return fail("That email and password don't match. Try again or use a login link.");
  }
  await createSession(user.id);
  redirect(safeNext(form.get("next")));
}

/** Email magic link. Creates the account on first use (consent required). */
export async function sendMagicLink(_: ActionState, form: FormData): Promise<ActionState> {
  const parsed = z.email().safeParse(str(form, "email").toLowerCase());
  if (!parsed.success) return fail("Enter a valid email address.");
  const email = parsed.data;
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing && form.get("consent") !== "on") {
    return fail("No account uses this email yet. Tick the consent box to create one with this link.");
  }

  const token = randomToken();
  await issueOtp({ purpose: "magic_link", target: email, code: token, minutes: 20, userId: existing?.id });
  const next = safeNext(form.get("next"));
  const link = `${config.appUrl}/auth/magic?token=${token}&next=${encodeURIComponent(next)}${existing ? "" : "&new=1"}`;
  const sent = await sendEmail(email, "Your No Broke Dayz login link", `Tap to log in (expires in 20 minutes):\n\n${link}\n\nIf you didn't ask for this, ignore this email.`);
  if (!sent.ok) return fail(sent.error);
  return { ok: `Check ${email} for your login link. It expires in 20 minutes.` };
}

export async function logout() {
  await destroySession();
  redirect("/");
}
