"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { randomToken, requireUser } from "@/lib/auth";
import { EscrowError, postEntry } from "@/lib/escrow";
import { formatNaira, nairaToKobo } from "@/lib/money";
import { notify, track } from "@/lib/notify";
import { consumeOtp, issueOtp } from "@/lib/otp";
import { sendSms } from "@/lib/outbox";
import { fail, str, type ActionState } from "@/lib/action-state";

const MIN_WITHDRAWAL = nairaToKobo(500);

/** Normalise Nigerian numbers to +234XXXXXXXXXX. */
function normalisePhone(raw: string) {
  const digits = raw.replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return "+234" + digits.slice(1);
  if (/^234[789][01]\d{8}$/.test(digits)) return "+" + digits;
  return null;
}

export async function sendPhoneCode(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/wallet");
  const phone = normalisePhone(str(form, "phone"));
  if (!phone) return fail("Enter a valid Nigerian phone number, e.g. 0803 123 4567.");
  await db.user.update({ where: { id: user.id }, data: { phone, phoneVerifiedAt: null } });
  const code = await issueOtp({ userId: user.id, purpose: "phone", target: phone });
  await sendSms(phone, `No Broke Dayz code: ${code}. Expires in 10 minutes.`);
  revalidatePath("/wallet");
  return { ok: `Code sent to ${phone}.` };
}

export async function verifyPhone(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/wallet");
  if (!user.phone) return fail("Add your phone number first.");
  const otp = await consumeOtp({ userId: user.id, purpose: "phone", target: user.phone, code: str(form, "code") });
  if (!otp) return fail("That code is wrong or expired.");
  await db.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
  revalidatePath("/wallet");
  return { ok: "Phone verified." };
}

export async function saveBankDetails(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/wallet");
  const bankName = str(form, "bankName");
  const bankAccountNumber = str(form, "bankAccountNumber").replace(/\s/g, "");
  const bankAccountName = str(form, "bankAccountName");
  if (!bankName) return fail("Choose your bank.");
  if (!/^\d{10}$/.test(bankAccountNumber)) return fail("Account number must be 10 digits (NUBAN).");
  if (bankAccountName.length < 3) return fail("Enter the account name exactly as your bank shows it.");
  await db.user.update({ where: { id: user.id }, data: { bankName, bankAccountNumber, bankAccountName } });
  revalidatePath("/wallet");
  return { ok: "Bank details saved." };
}

export async function sendWithdrawalCode(): Promise<ActionState> {
  const user = await requireUser("/wallet");
  if (!user.phone || !user.phoneVerifiedAt) return fail("Verify your phone number first.");
  const code = await issueOtp({ userId: user.id, purpose: "withdrawal", target: user.phone });
  await sendSms(user.phone, `No Broke Dayz withdrawal code: ${code}. Don't share it with anyone.`);
  return { ok: `Code sent to ${user.phone}.` };
}

export async function requestWithdrawal(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser("/wallet");
  if (config.demoMode) return fail("Withdrawals are disabled for demo funds.");
  if (!user.phone || !user.phoneVerifiedAt) return fail("Verify your phone number first.");
  if (!user.bankName || !user.bankAccountNumber || !user.bankAccountName) return fail("Add your bank details first.");
  const naira = Number(str(form, "amount").replace(/[,₦\s]/g, ""));
  if (!Number.isFinite(naira) || naira <= 0) return fail("Enter an amount.");
  const amount = nairaToKobo(naira);
  if (amount < MIN_WITHDRAWAL) return fail(`Minimum withdrawal is ${formatNaira(MIN_WITHDRAWAL)}.`);

  const otp = await consumeOtp({ userId: user.id, purpose: "withdrawal", target: user.phone, code: str(form, "code") });
  if (!otp) return fail("Enter the latest code sent to your phone.");

  const reference = `WD-${randomToken(9)}`;
  try {
    await db.$transaction(async (tx) => {
      await postEntry(tx, { userId: user.id, type: "withdrawal", amount: -amount, ref: reference, description: `Withdrawal to ${user.bankName} ••••${user.bankAccountNumber!.slice(-4)}` });
      await tx.withdrawal.create({
        data: { userId: user.id, amount, reference, bankName: user.bankName!, bankAccountNumber: user.bankAccountNumber!, bankAccountName: user.bankAccountName! },
      });
    });
  } catch (err) {
    if (err instanceof EscrowError) return fail("That's more than your available balance.");
    throw err;
  }
  await track("withdrawal_requested", user.id, { amount });
  await notify(user.id, { type: "withdrawal", title: "Withdrawal requested", body: `${formatNaira(amount)} is on its way to your bank. We'll let you know when it's sent.`, link: "/wallet" });
  revalidatePath("/", "layout");
  return { ok: `Withdrawal of ${formatNaira(amount)} requested.` };
}
