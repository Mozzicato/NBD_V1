"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireVerified } from "@/lib/auth";
import { notify, track } from "@/lib/notify";
import { savePrivateFile, UploadError } from "@/lib/storage";
import { fail, str, type ActionState } from "@/lib/action-state";

/** Either party can dispute an in-progress or submitted job. This freezes auto-release (PRD F10). */
export async function openDispute(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireVerified();
  const jobId = str(form, "jobId");
  const reason = str(form, "reason").slice(0, 1000);
  if (reason.length < 10) return fail("Explain what went wrong (at least 10 characters).");

  const job = await db.job.findUnique({ where: { id: jobId }, include: { applications: { where: { status: "accepted" } } } });
  if (!job) return fail("Job not found.");
  const workers = job.applications.map((a) => a.workerId);
  if (job.posterId !== user.id && !workers.includes(user.id)) return fail("Only people on this job can open a dispute.");
  if (job.status !== "in_progress" && job.status !== "submitted") return fail("Disputes can be opened while work is in progress or submitted.");

  let evidenceRef: string | null = null;
  const file = form.get("evidence");
  if (file instanceof File && file.size > 0) {
    try {
      evidenceRef = await savePrivateFile("evidence", file);
    } catch (err) {
      if (err instanceof UploadError) return fail(err.message);
      throw err;
    }
  }

  const claimed = await db.$transaction(async (tx) => {
    const res = await tx.job.updateMany({ where: { id: job.id, status: job.status }, data: { status: "disputed" } });
    if (!res.count) return false;
    await tx.dispute.create({
      data: { jobId: job.id, openedById: user.id, reason, evidenceText: str(form, "details").slice(0, 2000) || null, evidenceRef, prevJobStatus: job.status },
    });
    return true;
  });
  if (!claimed) return fail("The job changed while you were writing. Refresh and try again.");

  await track("dispute_opened", user.id, { jobId: job.id });
  for (const id of [job.posterId, ...workers].filter((id) => id !== user.id)) {
    await notify(id, {
      type: "dispute_opened",
      title: "A dispute was opened",
      body: `${user.name} opened a dispute on "${job.title}". Payment is frozen while our team reviews it.`,
      link: `/jobs/${job.id}`,
    });
  }
  revalidatePath(`/jobs/${job.id}`);
  return { ok: "Dispute opened. Payment is frozen and our team will review it, usually within 48 hours." };
}
