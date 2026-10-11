"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notify, track } from "@/lib/notify";
import { fail, str, type ActionState } from "@/lib/action-state";

export async function submitReview(_: ActionState, form: FormData): Promise<ActionState> {
  const user = await requireUser();
  const jobId = str(form, "jobId");
  const rateeId = str(form, "rateeId");
  const score = Number(str(form, "score"));
  const comment = str(form, "comment").slice(0, 500) || null;
  if (!Number.isInteger(score) || score < 1 || score > 5) return fail("Pick a rating from 1 to 5 stars.");

  const job = await db.job.findUnique({ where: { id: jobId }, include: { applications: { where: { status: "accepted" } } } });
  if (!job || job.status !== "completed") return fail("You can rate once the job is completed.");
  const workers = job.applications.map((a) => a.workerId);
  const raterIsPoster = job.posterId === user.id;
  const valid = raterIsPoster ? workers.includes(rateeId) : workers.includes(user.id) && rateeId === job.posterId;
  if (!valid) return fail("You can only rate people you worked with on this job.");

  try {
    await db.$transaction(async (tx) => {
      await tx.review.create({ data: { jobId, raterId: user.id, rateeId, score, comment } });
      const agg = await tx.review.aggregate({ where: { rateeId }, _avg: { score: true }, _count: true });
      await tx.user.update({ where: { id: rateeId }, data: { ratingAvg: agg._avg.score ?? 0, ratingCount: agg._count } });
    });
  } catch {
    return fail("You've already rated this person for this job.");
  }
  await track("review_submitted", user.id, { jobId, score });
  await notify(rateeId, { type: "review", title: "You got a new review", body: `${user.name} rated you ${score}/5 for "${job.title}".`, link: `/profile/${rateeId}` });
  revalidatePath(`/jobs/${jobId}`);
  return { ok: "Thanks for your review!" };
}

export async function reportReview(form: FormData) {
  const user = await requireUser();
  const reviewId = str(form, "reviewId");
  const review = await db.review.update({ where: { id: reviewId }, data: { reported: true } });
  await track("review_reported", user.id, { reviewId });
  revalidatePath(`/profile/${review.rateeId}`);
}
