"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { requireUser } from "@/lib/auth";
import { consumeOtp, issueOtp } from "@/lib/otp";
import { sendEmail } from "@/lib/outbox";
import { track } from "@/lib/notify";
import { savePrivateFile, UploadError } from "@/lib/storage";
import { fail, str, type ActionState } from "@/lib/action-state";

function isAllowedSchoolEmail(email: string) {
  const domain = email.split("@")[1] ?? "";
  return config.schoolEmailDomains.includes(domain);
}

export async function sendSchoolCode(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/verify");
  const parsed = z.email().safeParse(str(form, "schoolEmail").toLowerCase());
  if (!parsed.success) return fail("Enter a valid school email address.");
  const email = parsed.data;
  if (!isAllowedSchoolEmail(email)) {
    return fail(`Use your school email (${config.schoolEmailDomains.map((d) => "@" + d).join(" or ")}), or verify with your student ID below.`);
  }
  const taken = await db.user.findFirst({ where: { schoolEmail: email, NOT: { id: user.id } } });
  if (taken) return fail("This school email is already linked to another account.");

  const code = await issueOtp({ userId: user.id, purpose: "school_email", target: email });
  const sent = await sendEmail(email, "Your No Broke Dayz verification code", `Your verification code is ${code}. It expires in 10 minutes.`);
  if (!sent.ok) {
    return fail(`${sent.error} You can still verify by uploading your student ID below.`);
  }
  await track("verification_started", user.id, { method: "school_email" });
  redirect(`/verify?email=${encodeURIComponent(email)}`);
}

export async function confirmSchoolCode(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/verify");
  const email = str(form, "schoolEmail").toLowerCase();
  const code = str(form, "code");
  if (!/^\d{6}$/.test(code)) return fail("Enter the 6-digit code from your email.");
  if (!isAllowedSchoolEmail(email)) return fail("That email isn't on the school allow-list.");

  const otp = await consumeOtp({ userId: user.id, purpose: "school_email", target: email, code });
  if (!otp) return fail("That code is wrong or has expired. Check the latest email or send a new code.");

  await db.$transaction([
    db.user.update({ where: { id: user.id }, data: { schoolEmail: email, verificationStatus: "verified" } }),
    db.verificationRequest.create({
      data: { userId: user.id, method: "school_email", schoolEmail: email, status: "approved", reviewedAt: new Date() },
    }),
  ]);
  await track("verification_completed", user.id, { method: "school_email" });
  revalidatePath("/", "layout");
  redirect("/profile/edit?welcome=1");
}

export async function submitIdCard(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/verify");
  if (user.verificationStatus === "verified") return fail("You're already verified.");
  const file = form.get("idCard");
  if (!(file instanceof File) || file.size === 0) return fail("Choose a photo of your student ID card.");
  const faculty = str(form, "faculty");

  let key: string;
  try {
    key = await savePrivateFile("ids", file);
  } catch (err) {
    if (err instanceof UploadError) return fail(err.message);
    throw err;
  }

  await db.$transaction([
    db.verificationRequest.create({ data: { userId: user.id, method: "id_card", evidenceRef: key, status: "pending" } }),
    db.user.update({ where: { id: user.id }, data: { verificationStatus: "pending", faculty: faculty || user.faculty } }),
  ]);
  await track("verification_started", user.id, { method: "id_card" });
  revalidatePath("/verify");
  return { ok: "Thanks! Your ID is in the review queue. We'll email you once it's checked, usually within a day." };
}
