"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import {
  applyToJob,
  cancelJob,
  closeApplications,
  confirmCompletion,
  decideApplication,
  sendJobMessage,
  startWork,
  submitWork,
  withdrawApplication,
} from "@/app/actions/jobs";
import { openDispute } from "@/app/actions/disputes";
import { submitReview } from "@/app/actions/reviews";
import { ActionForm, Field, SubmitButton } from "./form";

type Variant = Parameters<typeof SubmitButton>[0]["variant"];

const SIMPLE = { startWork, submitWork, confirmCompletion, cancelJob, closeApplications, withdrawApplication } as const;

/** A one-button form for a job lifecycle action. */
export function JobActionButton({
  action,
  jobId,
  label,
  variant = "primary",
  confirm,
}: {
  action: keyof typeof SIMPLE;
  jobId: string;
  label: string;
  variant?: Variant;
  confirm?: string;
}) {
  return (
    <ActionForm action={SIMPLE[action]} className="space-y-2">
      <input type="hidden" name="jobId" value={jobId} />
      <SubmitButton variant={variant} className="w-full" confirm={confirm}>{label}</SubmitButton>
    </ActionForm>
  );
}

export function ApplyForm({ jobId }: { jobId: string }) {
  return (
    <ActionForm action={applyToJob}>
      <input type="hidden" name="jobId" value={jobId} />
      <Field label="Note to the poster (optional)" htmlFor="note" hint="Why you're a good fit, when you're free.">
        <textarea id="note" name="note" rows={3} maxLength={500} className="field" />
      </Field>
      <SubmitButton className="w-full">Apply for this job</SubmitButton>
    </ActionForm>
  );
}

export function DecideButtons({ applicationId, name }: { applicationId: string; name: string }) {
  return (
    <ActionForm action={decideApplication} className="flex flex-wrap gap-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <SubmitButton name="decision" value="accept" variant="accent" confirm={`Accept ${name} for this job?`}>Accept</SubmitButton>
      <SubmitButton name="decision" value="reject" variant="secondary">Decline</SubmitButton>
    </ActionForm>
  );
}

export function MessageForm({ jobId }: { jobId: string }) {
  return (
    <ActionForm action={sendJobMessage} className="flex gap-2" resetOnSuccess>
      <input type="hidden" name="jobId" value={jobId} />
      <label htmlFor="msg" className="sr-only">Message</label>
      <input id="msg" name="body" required maxLength={1000} className="field" placeholder="Where and when should you meet?" autoComplete="off" />
      <SubmitButton>Send</SubmitButton>
    </ActionForm>
  );
}

export function DisputeForm({ jobId }: { jobId: string }) {
  const [open, setOpen] = useState(false);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="min-h-11 w-full cursor-pointer text-sm font-semibold text-destructive underline">
        Something went wrong? Open a dispute
      </button>
    );
  }
  return (
    <div className="rounded-2xl border-2 border-destructive/30 p-4">
      <h3 className="mb-1 font-bold">Open a dispute</h3>
      <p className="mb-3 text-sm text-muted-foreground">Payment is frozen until our team reviews it. Try messaging the other person first.</p>
      <ActionForm action={openDispute}>
        <input type="hidden" name="jobId" value={jobId} />
        <Field label="What went wrong?" htmlFor="reason">
          <textarea id="reason" name="reason" required minLength={10} maxLength={1000} rows={3} className="field" />
        </Field>
        <Field label="Extra details (optional)" htmlFor="details">
          <textarea id="details" name="details" rows={2} maxLength={2000} className="field" />
        </Field>
        <Field label="Evidence (optional)" htmlFor="evidence" hint="Screenshot or photo: JPG, PNG, WEBP or PDF up to 5MB. Only our team sees it.">
          <input id="evidence" name="evidence" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="text-sm" />
        </Field>
        <div className="flex gap-2">
          <SubmitButton variant="danger">Open dispute</SubmitButton>
          <button type="button" onClick={() => setOpen(false)} className="min-h-11 cursor-pointer px-4 font-semibold">Cancel</button>
        </div>
      </ActionForm>
    </div>
  );
}

export function ReviewForm({ jobId, rateeId, rateeName }: { jobId: string; rateeId: string; rateeName: string }) {
  const [score, setScore] = useState(0);
  return (
    <ActionForm action={submitReview}>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="rateeId" value={rateeId} />
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Rate {rateeName}</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer p-1">
              <input type="radio" name="score" value={n} required className="sr-only" onChange={() => setScore(n)} />
              <Star size={32} aria-hidden className={n <= score ? "fill-amber-400 text-amber-400" : "text-border"} />
              <span className="sr-only">{n} star{n > 1 ? "s" : ""}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Comment (optional)" htmlFor={`c-${rateeId}`}>
        <textarea id={`c-${rateeId}`} name="comment" rows={2} maxLength={500} className="field" />
      </Field>
      <p className="text-xs text-muted-foreground">Reviews can&apos;t be edited after you submit.</p>
      <SubmitButton>Submit review</SubmitButton>
    </ActionForm>
  );
}
