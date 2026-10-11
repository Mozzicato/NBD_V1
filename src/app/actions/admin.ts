"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { EscrowError, postEntry, runAutoRelease, settleEscrow } from "@/lib/escrow";
import { formatNaira } from "@/lib/money";
import { notify, track } from "@/lib/notify";
import { deletePrivateFile } from "@/lib/storage";
import { fail, str, type ActionState } from "@/lib/action-state";

export async function reviewVerification(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const id = str(form, "requestId");
  const decision = str(form, "decision");
  const note = str(form, "note") || null;
  const req = await db.verificationRequest.findUnique({ where: { id }, include: { user: true } });
  if (!req || req.status !== "pending") return fail("This request was already reviewed.");
  if (decision === "reject" && !note) return fail("Add a reason so the student knows what to fix.");

  const approved = decision === "approve";
  await db.$transaction([
    db.verificationRequest.update({
      where: { id },
      data: { status: approved ? "approved" : "rejected", note, reviewedById: admin.id, reviewedAt: new Date(), evidenceRef: null },
    }),
    db.user.update({
      where: { id: req.userId },
      // Don't downgrade someone who verified by school email while the ID was queued.
      data: { verificationStatus: approved ? "verified" : req.user.verificationStatus === "verified" ? "verified" : "rejected" },
    }),
  ]);
  // Data minimisation: the ID image is deleted as soon as it has been reviewed.
  if (req.evidenceRef) await deletePrivateFile(req.evidenceRef);

  await track(approved ? "verification_completed" : "verification_rejected", req.userId, { method: "id_card" });
  await notify(req.userId, {
    type: "verification",
    title: approved ? "You're verified!" : "We couldn't verify your ID",
    body: approved ? "Your student status is confirmed. You can now apply for and post jobs." : `Reason: ${note}. You can try again from the verification page.`,
    link: approved ? "/jobs" : "/verify",
  });
  revalidatePath("/admin", "layout");
  return { ok: approved ? `${req.user.name} approved.` : `${req.user.name} rejected.` };
}

export async function resolveDispute(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const dispute = await db.dispute.findUnique({ where: { id: str(form, "disputeId") }, include: { job: true } });
  if (!dispute || dispute.status !== "open") return fail("This dispute is already resolved.");
  const resolution = str(form, "resolution");
  const note = str(form, "note");
  if (!note) return fail("Add a short note explaining the decision. Both parties will see it.");

  const pct = resolution === "release" ? 100 : resolution === "refund" ? 0 : Number(str(form, "workerSharePct"));
  if (resolution === "split" && !(Number.isInteger(pct) && pct > 0 && pct < 100)) return fail("For a split, enter a worker share between 1 and 99%.");
  if (!["release", "refund", "split"].includes(resolution)) return fail("Choose a resolution.");

  try {
    await settleEscrow({
      jobId: dispute.jobId,
      workerSharePct: pct,
      finalStatus: pct > 0 ? "completed" : "cancelled",
      reason: `Dispute resolved by No Broke Dayz: ${note}`,
    });
  } catch (err) {
    if (err instanceof EscrowError) return fail(err.message);
    throw err;
  }
  await db.dispute.update({
    where: { id: dispute.id },
    data: { status: "resolved", resolution, workerSharePct: pct, note, resolvedById: admin.id, resolvedAt: new Date() },
  });
  if (dispute.evidenceRef) await deletePrivateFile(dispute.evidenceRef);
  await track("dispute_resolved", admin.id, { jobId: dispute.jobId, resolution, pct });
  revalidatePath("/admin", "layout");
  return { ok: "Dispute resolved and funds settled." };
}

/** Manual release/refund for a funded job outside a dispute (ops override). */
export async function forceSettle(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const jobId = str(form, "jobId");
  const action = str(form, "action");
  const note = str(form, "note");
  if (!note) return fail("Add a note for the audit trail.");
  if (await db.dispute.findFirst({ where: { jobId, status: "open" } })) return fail("Resolve the open dispute instead.");
  try {
    await settleEscrow({
      jobId,
      workerSharePct: action === "release" ? 100 : 0,
      finalStatus: action === "release" ? "completed" : "cancelled",
      reason: `Settled by No Broke Dayz support: ${note}`,
    });
  } catch (err) {
    if (err instanceof EscrowError) return fail(err.message);
    throw err;
  }
  await track("escrow_manual_settle", admin.id, { jobId, action, note });
  revalidatePath("/admin", "layout");
  return { ok: action === "release" ? "Released to worker(s)." : "Refunded to poster." };
}

export async function processWithdrawal(_: ActionState, form: FormData): Promise<ActionState> {
  const admin = await requireAdmin();
  const w = await db.withdrawal.findUnique({ where: { id: str(form, "withdrawalId") } });
  if (!w || w.status !== "pending") return fail("Already processed.");
  const paid = str(form, "outcome") === "paid";
  const note = str(form, "note") || null;

  await db.$transaction(async (tx) => {
    const res = await tx.withdrawal.updateMany({ where: { id: w.id, status: "pending" }, data: { status: paid ? "paid" : "failed", note, processedAt: new Date() } });
    if (!res.count) throw new EscrowError("Already processed.");
    if (!paid) {
      await postEntry(tx, { userId: w.userId, type: "withdrawal_reversal", amount: w.amount, ref: w.reference, description: "Withdrawal failed, returned to wallet" });
    }
  });
  await track(paid ? "withdrawal_paid" : "withdrawal_failed", admin.id, { withdrawalId: w.id, amount: w.amount });
  await notify(w.userId, {
    type: "withdrawal",
    title: paid ? "Withdrawal sent" : "Withdrawal failed",
    body: paid
      ? `${formatNaira(w.amount)} has been sent to ${w.bankName} ••••${w.bankAccountNumber.slice(-4)}.`
      : `${formatNaira(w.amount)} could not be sent and is back in your wallet.${note ? " " + note : ""}`,
    link: "/wallet",
  });
  revalidatePath("/admin", "layout");
  return { ok: paid ? "Marked as paid." : "Marked failed and refunded to wallet." };
}

export async function clearReviewReport(form: FormData) {
  await requireAdmin();
  const id = str(form, "reviewId");
  if (str(form, "action") === "delete") {
    const review = await db.review.delete({ where: { id } });
    const agg = await db.review.aggregate({ where: { rateeId: review.rateeId }, _avg: { score: true }, _count: true });
    await db.user.update({ where: { id: review.rateeId }, data: { ratingAvg: agg._avg.score ?? 0, ratingCount: agg._count } });
  } else {
    await db.review.update({ where: { id }, data: { reported: false } });
  }
  revalidatePath("/admin", "layout");
}

export async function triggerAutoRelease(): Promise<ActionState> {
  await requireAdmin();
  const n = await runAutoRelease();
  revalidatePath("/admin", "layout");
  return { ok: n ? `Auto-released ${n} job(s).` : "No jobs are due for auto-release." };
}

