// Escrow/ledger integration test against a throwaway SQLite DB.
// Run: npm run test:escrow
import assert from "node:assert/strict";
import { db } from "@/lib/db";
import { confirmFunding, EscrowError, postEntry, runAutoRelease, settleEscrow, walletBalance } from "@/lib/escrow";

let n = 0;
async function mkUser(name: string) {
  return db.user.create({ data: { name, email: `${name.toLowerCase()}${++n}@test.ng`, consentAt: new Date(), verificationStatus: "verified" } });
}

async function fundedJob(posterId: string, amountNaira: number, slots: number, outcome: "success" | "failed" = "success") {
  const amount = amountNaira * 100;
  const commission = Math.round((amount * slots * 1000) / 10_000);
  const job = await db.job.create({
    data: { posterId, title: `Job ${++n}`, description: "x".repeat(20), category: "other", locationType: "remote", amount, commission, slots },
  });
  const reference = `T-${n}`;
  await db.payment.create({ data: { reference, jobId: job.id, userId: posterId, amount: amount * slots + commission, provider: "mock", mockOutcome: outcome } });
  return { job, reference, total: amount * slots + commission };
}

async function accept(jobId: string, workerId: string) {
  await db.application.create({ data: { jobId, workerId, status: "accepted" } });
}

async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  PASS ${name}`);
  } catch (err) {
    console.error(`  FAIL ${name}\n`, err);
    process.exitCode = 1;
  }
}

async function main() {
  const poster = await mkUser("Poster");
  const w1 = await mkUser("WorkerA");
  const w2 = await mkUser("WorkerB");

  await check("failed payment leaves job unfunded and unreleasable", async () => {
    const { job, reference } = await fundedJob(poster.id, 1000, 1, "failed");
    assert.equal(await confirmFunding(reference), "failed");
    const j = await db.job.findUniqueOrThrow({ where: { id: job.id }, include: { escrow: true } });
    assert.equal(j.status, "awaiting_payment");
    assert.equal(j.escrow, null);
    await assert.rejects(settleEscrow({ jobId: job.id, workerSharePct: 100, finalStatus: "completed", reason: "" }), EscrowError);
  });

  await check("funding is idempotent (concurrent callback + webhook) and opens the job", async () => {
    const { job, reference, total } = await fundedJob(poster.id, 3000, 1);
    const [a, b] = await Promise.all([confirmFunding(reference), confirmFunding(reference)]);
    assert.ok(a === "success" || b === "success");
    assert.equal(await confirmFunding(reference), "success");
    const j = await db.job.findUniqueOrThrow({ where: { id: job.id }, include: { escrow: true } });
    assert.equal(j.status, "open");
    assert.equal(j.escrow!.amount + j.escrow!.commission, total);
    assert.equal(await db.escrowTransaction.count({ where: { jobId: job.id } }), 1);
  });

  await check("full release pays worker exactly and captures 10%", async () => {
    const { job, reference } = await fundedJob(poster.id, 5000, 1);
    await confirmFunding(reference);
    await accept(job.id, w1.id);
    const before = await walletBalance(w1.id);
    const platformBefore = await walletBalance(null);
    await settleEscrow({ jobId: job.id, workerSharePct: 100, finalStatus: "completed", reason: "" });
    assert.equal((await walletBalance(w1.id)) - before, 500_000);
    assert.equal((await walletBalance(null)) - platformBefore, 50_000);
    const e = await db.escrowTransaction.findUniqueOrThrow({ where: { jobId: job.id } });
    assert.equal(e.state, "released");
    assert.equal(e.posterRefunded, 0);
    assert.equal((await db.user.findUniqueOrThrow({ where: { id: w1.id } })).jobsCompleted, 1);
  });

  await check("double settlement is rejected (concurrent)", async () => {
    const { job, reference } = await fundedJob(poster.id, 2000, 1);
    await confirmFunding(reference);
    await accept(job.id, w1.id);
    const before = await walletBalance(w1.id);
    const results = await Promise.allSettled([
      settleEscrow({ jobId: job.id, workerSharePct: 100, finalStatus: "completed", reason: "" }),
      settleEscrow({ jobId: job.id, workerSharePct: 100, finalStatus: "completed", reason: "" }),
    ]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    assert.equal((await walletBalance(w1.id)) - before, 200_000);
  });

  await check("multi-slot: unfilled slots refunded, commission pro rata, invariant holds", async () => {
    const { job, reference, total } = await fundedJob(poster.id, 5000, 3);
    await confirmFunding(reference);
    await accept(job.id, w1.id);
    await accept(job.id, w2.id);
    const pBefore = await walletBalance(poster.id);
    const out = await settleEscrow({ jobId: job.id, workerSharePct: 100, finalStatus: "completed", reason: "" });
    assert.equal(out.perWorker, 500_000);
    assert.equal(out.released, 1_000_000);
    assert.equal(out.commissionCaptured, 100_000);
    assert.equal(out.refunded, 550_000);
    assert.equal(out.released + out.commissionCaptured + out.refunded, total);
    assert.equal((await walletBalance(poster.id)) - pBefore, 550_000);
  });

  await check("cancel before work refunds everything, no commission", async () => {
    const { job, reference, total } = await fundedJob(poster.id, 4000, 1);
    await confirmFunding(reference);
    const pBefore = await walletBalance(poster.id);
    const platformBefore = await walletBalance(null);
    await settleEscrow({ jobId: job.id, workerSharePct: 0, finalStatus: "cancelled", reason: "" });
    assert.equal((await walletBalance(poster.id)) - pBefore, total);
    assert.equal(await walletBalance(null), platformBefore);
    assert.equal((await db.escrowTransaction.findUniqueOrThrow({ where: { jobId: job.id } })).state, "refunded");
  });

  await check("dispute split 40%", async () => {
    const { job, reference, total } = await fundedJob(poster.id, 10000, 1);
    await confirmFunding(reference);
    await accept(job.id, w2.id);
    const out = await settleEscrow({ jobId: job.id, workerSharePct: 40, finalStatus: "completed", reason: "" });
    assert.equal(out.released, 400_000);
    assert.equal(out.commissionCaptured, 40_000);
    assert.equal(out.released + out.commissionCaptured + out.refunded, total);
    assert.equal((await db.escrowTransaction.findUniqueOrThrow({ where: { jobId: job.id } })).state, "split");
  });

  await check("auto-release fires after the window, never while disputed or early", async () => {
    const old = new Date(Date.now() - 73 * 3_600_000);
    const a = await fundedJob(poster.id, 1500, 1);
    await confirmFunding(a.reference);
    await accept(a.job.id, w1.id);
    await db.job.update({ where: { id: a.job.id }, data: { status: "submitted", submittedAt: old } });

    const b = await fundedJob(poster.id, 1500, 1);
    await confirmFunding(b.reference);
    await accept(b.job.id, w1.id);
    await db.job.update({ where: { id: b.job.id }, data: { status: "disputed", submittedAt: old } });
    await db.dispute.create({ data: { jobId: b.job.id, openedById: poster.id, reason: "not done", prevJobStatus: "submitted" } });

    const c = await fundedJob(poster.id, 1500, 1);
    await confirmFunding(c.reference);
    await accept(c.job.id, w1.id);
    await db.job.update({ where: { id: c.job.id }, data: { status: "submitted", submittedAt: new Date() } });

    assert.equal(await runAutoRelease(), 1);
    assert.equal((await db.job.findUniqueOrThrow({ where: { id: a.job.id } })).status, "completed");
    assert.equal((await db.job.findUniqueOrThrow({ where: { id: b.job.id } })).status, "disputed");
    assert.equal((await db.job.findUniqueOrThrow({ where: { id: c.job.id } })).status, "submitted");
  });

  await check("ledger refuses to overdraw", async () => {
    const bal = await walletBalance(w2.id);
    await assert.rejects(
      db.$transaction((tx) => postEntry(tx, { userId: w2.id, type: "withdrawal", amount: -(bal + 1), description: "too much" })),
      EscrowError,
    );
    assert.equal(await walletBalance(w2.id), bal);
  });
}

main().finally(() => db.$disconnect());
