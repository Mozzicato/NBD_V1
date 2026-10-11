import "server-only";
import { db, type Tx } from "./db";
import { config } from "./config";
import { formatNaira } from "./money";
import { notify, track } from "./notify";
import { getPaymentProvider } from "./payments";

export class EscrowError extends Error {}

// ---------- Ledger ----------

/** Append a ledger entry, computing the running balance. userId null = platform account. */
export async function postEntry(
  tx: Tx,
  e: { userId: string | null; type: string; amount: number; gross?: number; ref?: string; jobId?: string; description: string },
) {
  // PostgreSQL permits concurrent transactions, so serialize balance updates per wallet.
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${e.userId ?? "platform"}))`;
  const last = await tx.walletEntry.findFirst({ where: { userId: e.userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  const balanceAfter = (last?.balanceAfter ?? 0) + e.amount;
  if (balanceAfter < 0) throw new EscrowError("Insufficient wallet balance.");
  return tx.walletEntry.create({ data: { ...e, gross: e.gross ?? Math.abs(e.amount), balanceAfter } });
}

export async function walletBalance(userId: string | null) {
  const last = await db.walletEntry.findFirst({ where: { userId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
  return last?.balanceAfter ?? 0;
}

/** Money the user has tied up in escrow: as a poster (funded jobs) and as a worker (accepted, unpaid). */
export async function pendingAmounts(userId: string) {
  const asPoster = await db.escrowTransaction.findMany({ where: { state: "funded", job: { posterId: userId } } });
  const asWorker = await db.application.findMany({
    where: { workerId: userId, status: "accepted", job: { status: { in: ["assigned", "in_progress", "submitted", "disputed"] } } },
    include: { job: { select: { amount: true } } },
  });
  return {
    heldForMyJobs: asPoster.reduce((s, e) => s + e.amount + e.commission, 0),
    incoming: asWorker.reduce((s, a) => s + a.job.amount, 0),
  };
}

// ---------- Funding ----------

/**
 * Reconcile a payment reference with the provider and, on success, fund escrow and open the job.
 * Idempotent: safe to call from the redirect callback and the webhook for the same reference.
 */
export async function confirmFunding(reference: string) {
  const payment = await db.payment.findUnique({ where: { reference }, include: { job: true } });
  if (!payment) throw new EscrowError("Unknown payment reference.");
  if (payment.status !== "pending") return payment.status;

  const result = await getPaymentProvider().verify(reference);
  if (result.status === "pending") return "pending";

  if (result.status === "failed" || result.amount !== payment.amount) {
    await db.payment.updateMany({ where: { reference, status: "pending" }, data: { status: "failed" } });
    await track("funding_failed", payment.userId, { jobId: payment.jobId, reference });
    return "failed";
  }

  const funded = await db.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({ where: { reference, status: "pending" }, data: { status: "success" } });
    if (claimed.count === 0) return false; // another request already handled it
    const job = await tx.job.findUniqueOrThrow({ where: { id: payment.jobId } });
    if (job.status !== "awaiting_payment" || (await tx.escrowTransaction.findUnique({ where: { jobId: job.id } }))) {
      // Paid twice or paid for a cancelled job: hold the money for the poster rather than lose it.
      await postEntry(tx, {
        userId: payment.userId,
        type: "refund",
        amount: payment.amount,
        ref: reference,
        jobId: job.id,
        description: `Duplicate payment credited back · ${job.title}`,
      });
      return false;
    }
    const pool = job.amount * job.slots;
    await tx.escrowTransaction.create({
      data: { jobId: job.id, amount: pool, commission: job.commission, providerRef: reference },
    });
    await tx.job.update({ where: { id: job.id }, data: { status: "open", fundedAt: new Date() } });
    await postEntry(tx, {
      userId: payment.userId,
      type: "funding",
      amount: 0,
      gross: payment.amount,
      ref: reference,
      jobId: job.id,
      description: `Funded escrow · ${job.title}`,
    });
    return true;
  });

  if (funded) {
    await track("job_funded", payment.userId, { jobId: payment.jobId, amount: payment.amount });
    await notify(payment.userId, {
      type: "job_funded",
      title: "Your job is live",
      body: `${formatNaira(payment.amount)} is held in escrow and "${payment.job.title}" is now open for applicants.`,
      link: `/jobs/${payment.jobId}`,
    });
  }
  return "success";
}

// ---------- Settlement ----------

type SettleOpts = {
  jobId: string;
  /** Percent of the accepted workers' pay to release (100 = full release, 0 = full refund). */
  workerSharePct: number;
  finalStatus: "completed" | "cancelled";
  reason: string;
};

/**
 * Settle a funded escrow exactly once. Accepted workers share the released pay equally,
 * the platform captures commission pro rata on what is released, and the rest is refunded to the poster.
 * Invariant: workerReleased + commissionCaptured + posterRefunded === amount + commission.
 */
export async function settleEscrow(opts: SettleOpts) {
  const pct = Math.max(0, Math.min(100, Math.round(opts.workerSharePct)));

  const outcome = await db.$transaction(async (tx) => {
    const job = await tx.job.findUniqueOrThrow({
      where: { id: opts.jobId },
      include: { escrow: true, applications: { where: { status: "accepted" } } },
    });
    const escrow = job.escrow;
    if (!escrow) throw new EscrowError("This job was never funded, so there is nothing to release.");
    if (escrow.state !== "funded") throw new EscrowError("Escrow for this job has already been settled.");

    const workers = job.applications.map((a) => a.workerId);
    const releasable = job.amount * workers.length;
    const perWorker = workers.length ? Math.floor((releasable * pct) / 100 / workers.length) : 0;
    const released = perWorker * workers.length;
    const commissionCaptured = escrow.amount ? Math.round((escrow.commission * released) / escrow.amount) : 0;
    const refunded = escrow.amount + escrow.commission - released - commissionCaptured;
    const state = released === 0 ? "refunded" : refunded === 0 ? "released" : "split";

    // Compare-and-set so concurrent settlements (e.g. confirm + auto-release) cannot both run.
    const claimed = await tx.escrowTransaction.updateMany({
      where: { id: escrow.id, state: "funded" },
      data: { state, workerReleased: released, commissionCaptured, posterRefunded: refunded, releasedAt: new Date() },
    });
    if (claimed.count !== 1) throw new EscrowError("Escrow for this job has already been settled.");

    for (const workerId of workers) {
      if (perWorker > 0) {
        await postEntry(tx, {
          userId: workerId,
          type: "payout",
          amount: perWorker,
          ref: escrow.providerRef,
          jobId: job.id,
          description: `Payment for ${job.title}`,
        });
      }
    }
    if (commissionCaptured > 0) {
      await postEntry(tx, {
        userId: null,
        type: "commission",
        amount: commissionCaptured,
        ref: escrow.providerRef,
        jobId: job.id,
        description: `Commission · ${job.title}`,
      });
    }
    if (refunded > 0) {
      await postEntry(tx, {
        userId: job.posterId,
        type: "refund",
        amount: refunded,
        ref: escrow.providerRef,
        jobId: job.id,
        description: `Escrow refund · ${job.title}`,
      });
    }

    const completed = opts.finalStatus === "completed";
    await tx.job.update({
      where: { id: job.id },
      data: { status: opts.finalStatus, completedAt: completed ? new Date() : undefined },
    });
    if (completed && released > 0) {
      await tx.user.updateMany({ where: { id: { in: workers } }, data: { jobsCompleted: { increment: 1 } } });
    }
    return { job, workers, perWorker, released, commissionCaptured, refunded };
  });

  const { job, workers, perWorker, refunded } = outcome;
  for (const workerId of workers) {
    await notify(workerId, {
      type: "payment_released",
      title: perWorker > 0 ? "Payment released" : "Job closed without payment",
      body:
        perWorker > 0
          ? `${formatNaira(perWorker)} for "${job.title}" is now in your wallet. ${opts.reason}`
          : `"${job.title}" was closed and escrow refunded to the poster. ${opts.reason}`,
      link: `/jobs/${job.id}`,
    });
  }
  if (refunded > 0) {
    await notify(job.posterId, {
      type: "escrow_refunded",
      title: "Escrow refunded",
      body: `${formatNaira(refunded)} from "${job.title}" was returned to your wallet. ${opts.reason}`,
      link: "/wallet",
    });
  }
  await track(opts.finalStatus === "completed" ? "escrow_released" : "escrow_refunded", null, {
    jobId: job.id,
    released: outcome.released,
    commission: outcome.commissionCaptured,
    refunded,
  });
  return outcome;
}

/**
 * Auto-release safeguard (PRD F6): jobs left in Submitted longer than the window are paid out.
 * Disputed jobs are never in "submitted", so an open dispute always blocks this.
 */
export async function runAutoRelease() {
  const cutoff = new Date(Date.now() - config.autoReleaseHours * 60 * 60 * 1000);
  const due = await db.job.findMany({
    where: { status: "submitted", submittedAt: { lte: cutoff }, disputes: { none: { status: "open" } } },
    select: { id: true },
  });
  let released = 0;
  for (const { id } of due) {
    try {
      await settleEscrow({
        jobId: id,
        workerSharePct: 100,
        finalStatus: "completed",
        reason: `Auto-released after ${config.autoReleaseHours} hours without confirmation or dispute.`,
      });
      released++;
    } catch (err) {
      if (!(err instanceof EscrowError)) console.error("[auto-release]", id, err);
    }
  }
  return released;
}

/** Run auto-release if this particular job is past its window. Returns true if anything was settled. */
export async function autoReleaseIfDue(job: { status: string; submittedAt: Date | null }) {
  if (job.status !== "submitted" || !job.submittedAt) return false;
  if (Date.now() - job.submittedAt.getTime() <= config.autoReleaseHours * 3_600_000) return false;
  return (await runAutoRelease()) > 0;
}

/** Reconcile a returning payer and decide where to send them. Used by the gateway callback and the mock checkout. */
export async function finishFunding(reference: string) {
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment) return "/my-jobs";
  let status: string;
  try {
    status = await confirmFunding(reference);
  } catch (err) {
    console.error("[funding] confirm failed", err);
    status = "pending";
  }
  if (status === "success") return `/jobs/${payment.jobId}?funded=1`;
  if (status === "failed") return `/jobs/${payment.jobId}/fund?error=failed`;
  return `/jobs/${payment.jobId}?pending=1`;
}
