"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { randomToken, requireUser, requireVerified } from "@/lib/auth";
import { EscrowError, settleEscrow } from "@/lib/escrow";
import { fundingBreakdown, nairaToKobo } from "@/lib/money";
import { notify, track } from "@/lib/notify";
import { getPaymentProvider } from "@/lib/payments";
import { CATEGORIES, LOCATION_TYPES } from "@/lib/types";
import { fail, str, type ActionState } from "@/lib/action-state";

const jobSchema = z.object({
  title: z.string().min(5, "Give your job a clear title (at least 5 characters).").max(90),
  description: z.string().min(20, "Describe the job in a bit more detail (at least 20 characters).").max(2000),
  category: z.enum(CATEGORIES.map((c) => c.id) as [string, ...string[]], { error: "Choose a category." }),
  locationType: z.enum(LOCATION_TYPES.map((l) => l.id) as [string, ...string[]], { error: "Choose where the work happens." }),
  locationDetail: z.string().max(120),
  pay: z.coerce.number({ error: "Enter the pay in naira." }).int("Use whole naira.").min(200, "Minimum pay is ₦200.").max(500_000, "Maximum pay is ₦500,000 per person."),
  slots: z.coerce.number().int().min(1).max(20, "Up to 20 people per job."),
  neededBy: z.string(),
});

export async function createJob(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified("/jobs/new");
  const parsed = jobSchema.safeParse({
    title: str(form, "title"),
    description: str(form, "description"),
    category: str(form, "category"),
    locationType: str(form, "locationType"),
    locationDetail: str(form, "locationDetail"),
    pay: str(form, "pay").replace(/[,₦\s]/g, ""),
    slots: str(form, "slots") || "1",
    neededBy: str(form, "neededBy"),
  });
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  const d = parsed.data;
  if (d.locationType === "specific" && !d.locationDetail) return fail("Tell workers where the job is.");

  let neededBy: Date | null = null;
  if (d.neededBy) {
    neededBy = new Date(d.neededBy);
    if (isNaN(neededBy.getTime())) return fail("Enter a valid date.");
    if (neededBy.getTime() < Date.now() - 24 * 60 * 60 * 1000) return fail("The needed-by date is in the past.");
  }

  const amount = nairaToKobo(d.pay);
  const { commission } = fundingBreakdown(amount, d.slots, config.commissionBps);
  const job = await db.job.create({
    data: {
      posterId: user.id,
      title: d.title,
      description: d.description,
      category: d.category,
      locationType: d.locationType,
      locationDetail: d.locationDetail || null,
      amount,
      commission,
      slots: d.slots,
      neededBy,
      campus: user.campus,
    },
  });
  await track("job_posted", user.id, { jobId: job.id, amount, slots: d.slots, category: d.category });
  redirect(`/jobs/${job.id}/fund`);
}

/** Start an escrow funding attempt with the payment provider (PRD F3). */
export async function startFunding(form: FormData) {
  const user = await requireVerified();
  const jobId = str(form, "jobId");
  const job = await db.job.findUnique({ where: { id: jobId } });
  if (!job || job.posterId !== user.id) redirect("/my-jobs");
  if (job.status !== "awaiting_payment") redirect(`/jobs/${job.id}`);

  // Commission is fixed at posting time, so the charge always matches the breakdown the poster saw.
  const charged = job.amount * job.slots + job.commission;
  const provider = getPaymentProvider();
  const reference = `NBD-${randomToken(9)}`;
  await db.payment.create({ data: { reference, jobId: job.id, userId: user.id, amount: charged, provider: provider.name } });
  await track("funding_started", user.id, { jobId: job.id, amount: charged });

  let url: string;
  try {
    ({ authorizationUrl: url } = await provider.initialize({
      reference,
      amount: charged,
      email: user.email,
      callbackUrl: `${config.appUrl}/pay/callback`,
    }));
  } catch (err) {
    console.error("[funding] initialize failed", err);
    await db.payment.update({ where: { reference }, data: { status: "failed" } });
    redirect(`/jobs/${job.id}/fund?error=init`);
  }
  redirect(url);
}

async function loadJob(jobId: string) {
  return db.job.findUnique({ where: { id: jobId }, include: { applications: true } });
}

function acceptedWorkerIds(job: NonNullable<Awaited<ReturnType<typeof loadJob>>>) {
  return job.applications.filter((a) => a.status === "accepted").map((a) => a.workerId);
}

function done(jobId: string, message: string): ActionState {
  revalidatePath(`/jobs/${jobId}`);
  revalidatePath("/", "layout");
  return { ok: message };
}

export async function applyToJob(_: ActionState, form: FormData): Promise<ActionState> {
  const jobId = str(form, "jobId");
  const user = await requireVerified(`/jobs/${jobId}`);
  const job = await loadJob(jobId);
  if (!job || job.status !== "open") return fail("This job is no longer taking applications.");
  if (job.posterId === user.id) return fail("You can't apply to your own job.");
  if (job.applications.some((a) => a.workerId === user.id && a.status !== "withdrawn")) return fail("You've already applied.");

  const note = str(form, "note").slice(0, 500) || null;
  await db.application.upsert({
    where: { jobId_workerId: { jobId, workerId: user.id } },
    create: { jobId, workerId: user.id, note },
    update: { status: "applied", note, createdAt: new Date() },
  });
  const isFirst = job.applications.length === 0;
  await track("application_submitted", user.id, {
    jobId,
    first: isFirst,
    minutesSinceFunded: isFirst && job.fundedAt ? Math.round((Date.now() - job.fundedAt.getTime()) / 60_000) : undefined,
  });
  await notify(job.posterId, {
    type: "new_applicant",
    title: "New applicant",
    body: `${user.name} applied to "${job.title}".`,
    link: `/jobs/${jobId}#applicants`,
  });
  return done(jobId, "Application sent! You'll be notified if you're accepted.");
}

export async function withdrawApplication(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = str(form, "jobId");
  const res = await db.application.updateMany({ where: { jobId, workerId: user.id, status: "applied" }, data: { status: "withdrawn" } });
  if (!res.count) return fail("Only pending applications can be withdrawn.");
  return done(jobId, "Application withdrawn.");
}

export async function decideApplication(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const applicationId = str(form, "applicationId");
  const decision = str(form, "decision");
  const app = await db.application.findUnique({ where: { id: applicationId }, include: { job: { include: { applications: true } }, worker: true } });
  if (!app || app.job.posterId !== user.id) return fail("Application not found.");
  const job = app.job;
  if (job.status !== "open") return fail("This job is no longer open.");
  if (app.status !== "applied") return fail("This application has already been handled.");

  if (decision === "reject") {
    await db.application.update({ where: { id: app.id }, data: { status: "rejected" } });
    await notify(app.workerId, { type: "application_rejected", title: "Application update", body: `The poster went with someone else for "${job.title}".`, link: "/jobs" });
    return done(job.id, `${app.worker.name} was declined.`);
  }

  const accepted = acceptedWorkerIds(job).length;
  if (accepted >= job.slots) return fail("All spots are already filled.");
  const filled = accepted + 1 >= job.slots;

  await db.$transaction(async (tx) => {
    await tx.application.update({ where: { id: app.id }, data: { status: "accepted" } });
    if (filled) {
      await tx.job.update({ where: { id: job.id }, data: { status: "assigned" } });
      await tx.application.updateMany({ where: { jobId: job.id, status: "applied" }, data: { status: "rejected" } });
    }
  });
  await track("application_accepted", user.id, { jobId: job.id, workerId: app.workerId });
  await notify(app.workerId, {
    type: "application_accepted",
    title: "You got the job!",
    body: `You were accepted for "${job.title}". Pay is held in escrow. Coordinate with the poster, then start work.`,
    link: `/jobs/${job.id}`,
  });
  await notify(user.id, {
    type: "application_accepted",
    title: filled ? "Job assigned" : "Applicant accepted",
    body: filled ? `"${job.title}" is fully staffed and assigned.` : `${app.worker.name} is on "${job.title}". ${job.slots - accepted - 1} spot(s) left.`,
    link: `/jobs/${job.id}`,
  });
  if (filled) {
    for (const other of job.applications.filter((a) => a.status === "applied" && a.id !== app.id)) {
      await notify(other.workerId, { type: "application_rejected", title: "Application update", body: `"${job.title}" has been filled.`, link: "/jobs" });
    }
  }
  return done(job.id, `${app.worker.name} accepted.`);
}

/** For multi-slot jobs: stop taking applicants and proceed with the people already accepted. */
export async function closeApplications(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const job = await loadJob(str(form, "jobId"));
  if (!job || job.posterId !== user.id || job.status !== "open") return fail("This job isn't open.");
  if (acceptedWorkerIds(job).length === 0) return fail("Accept at least one applicant first.");
  await db.$transaction([
    db.job.update({ where: { id: job.id }, data: { status: "assigned" } }),
    db.application.updateMany({ where: { jobId: job.id, status: "applied" }, data: { status: "rejected" } }),
  ]);
  return done(job.id, "Applications closed. Unfilled spots will be refunded when the job is settled.");
}

export async function startWork(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const job = await loadJob(str(form, "jobId"));
  if (!job || !acceptedWorkerIds(job).includes(user.id)) return fail("You're not assigned to this job.");
  const res = await db.job.updateMany({ where: { id: job.id, status: "assigned" }, data: { status: "in_progress", startedAt: new Date() } });
  if (!res.count) return fail("This job can't be started right now.");
  await notify(job.posterId, { type: "work_started", title: "Work started", body: `${user.name} started "${job.title}".`, link: `/jobs/${job.id}` });
  return done(job.id, "Marked as in progress.");
}

export async function submitWork(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const job = await loadJob(str(form, "jobId"));
  if (!job || !acceptedWorkerIds(job).includes(user.id)) return fail("You're not assigned to this job.");
  const res = await db.job.updateMany({
    where: { id: job.id, status: { in: ["assigned", "in_progress"] } },
    data: { status: "submitted", submittedAt: new Date(), startedAt: job.startedAt ?? new Date() },
  });
  if (!res.count) return fail("This job can't be submitted right now.");
  await track("work_submitted", user.id, { jobId: job.id });
  await notify(job.posterId, {
    type: "work_submitted",
    title: "Work submitted. Please confirm.",
    body: `${user.name} marked "${job.title}" as done. Confirm to release payment, or open a dispute. If you do neither, payment auto-releases in ${config.autoReleaseHours} hours.`,
    link: `/jobs/${job.id}`,
  });
  return done(job.id, "Submitted! The poster has been asked to confirm.");
}

export async function confirmCompletion(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const job = await loadJob(str(form, "jobId"));
  if (!job || job.posterId !== user.id) return fail("Job not found.");
  if (job.status !== "submitted") return fail("You can confirm once the worker has submitted.");
  try {
    await settleEscrow({ jobId: job.id, workerSharePct: 100, finalStatus: "completed", reason: "The poster confirmed completion." });
  } catch (err) {
    if (err instanceof EscrowError) return fail(err.message);
    throw err;
  }
  await track("job_completed", user.id, { jobId: job.id });
  return done(job.id, "Payment released. Thanks! Now rate your worker.");
}

export async function cancelJob(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const job = await loadJob(str(form, "jobId"));
  if (!job || job.posterId !== user.id) return fail("Job not found.");

  if (job.status === "awaiting_payment") {
    await db.job.update({ where: { id: job.id }, data: { status: "cancelled" } });
    return done(job.id, "Job cancelled.");
  }
  if (job.status !== "open" && job.status !== "assigned") {
    return fail("Once work has started, use a dispute instead of cancelling.");
  }
  // Refund everything: no worker pay is released on cancellation.
  try {
    await settleEscrow({ jobId: job.id, workerSharePct: 0, finalStatus: "cancelled", reason: "The poster cancelled the job before work started." });
  } catch (err) {
    if (err instanceof EscrowError) return fail(err.message);
    throw err;
  }
  await db.application.updateMany({ where: { jobId: job.id, status: "applied" }, data: { status: "rejected" } });
  await track("job_cancelled", user.id, { jobId: job.id });
  return done(job.id, "Job cancelled and escrow refunded to your wallet.");
}

export async function sendJobMessage(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const job = await loadJob(str(form, "jobId"));
  if (!job) return fail("Job not found.");
  const workers = acceptedWorkerIds(job);
  const isParty = job.posterId === user.id || workers.includes(user.id);
  if (!isParty) return fail("Only the poster and accepted workers can message here.");
  const body = str(form, "body").slice(0, 1000);
  if (!body) return fail("Write a message first.");
  await db.message.create({ data: { jobId: job.id, senderId: user.id, body } });
  const recipients = [job.posterId, ...workers].filter((id) => id !== user.id);
  for (const id of recipients) {
    await db.notification.create({
      data: { userId: id, type: "message", title: "New message", body: `${user.name} on "${job.title}": ${body.slice(0, 80)}`, link: `/jobs/${job.id}#messages` },
    });
  }
  revalidatePath(`/jobs/${job.id}`);
  return { ok: undefined };
}
