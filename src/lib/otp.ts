import "server-only";
import { randomInt } from "node:crypto";
import { db } from "./db";
import { sha256 } from "./auth";

const OTP_MINUTES = 10;
const MAX_ATTEMPTS = 5;

export type OtpPurpose = "school_email" | "phone" | "withdrawal" | "magic_link";

/** Create a 6-digit code (or a caller-supplied token for magic links). Earlier unused codes for the same target are voided. */
export async function issueOtp(opts: { userId?: string; purpose: OtpPurpose; target: string; code?: string; minutes?: number }) {
  const code = opts.code ?? String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.otpCode.updateMany({
    where: { target: opts.target, purpose: opts.purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  await db.otpCode.create({
    data: {
      userId: opts.userId,
      purpose: opts.purpose,
      target: opts.target,
      codeHash: sha256(code),
      expiresAt: new Date(Date.now() + (opts.minutes ?? OTP_MINUTES) * 60_000),
    },
  });
  return code;
}

/** Returns the OTP record if the code is valid (and consumes it), otherwise null. */
export async function consumeOtp(opts: { userId?: string; purpose: OtpPurpose; target: string; code: string }) {
  const otp = await db.otpCode.findFirst({
    where: { target: opts.target, purpose: opts.purpose, consumedAt: null, ...(opts.userId ? { userId: opts.userId } : {}) },
    orderBy: { createdAt: "desc" },
  });
  if (!otp || otp.expiresAt < new Date() || otp.attempts >= MAX_ATTEMPTS) return null;
  if (otp.codeHash !== sha256(opts.code.trim())) {
    await db.otpCode.update({ where: { id: otp.id }, data: { attempts: { increment: 1 } } });
    return null;
  }
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return otp;
}

/** Magic links carry a random token instead of a code; look it up by hash alone. */
export async function consumeMagicToken(token: string) {
  const otp = await db.otpCode.findFirst({ where: { codeHash: sha256(token), purpose: "magic_link", consumedAt: null } });
  if (!otp || otp.expiresAt < new Date()) return null;
  await db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: new Date() } });
  return otp;
}
