import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Clock, MapPin, Users } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { autoReleaseIfDue } from "@/lib/escrow";
import { formatNaira } from "@/lib/money";
import { categoryLabel, locationLabel } from "@/lib/types";
import { ApplyForm, DecideButtons, DisputeForm, JobActionButton, MessageForm, ReviewForm } from "@/components/job-actions";
import { Avatar, btn, Card, EscrowBadge, formatDate, Notice, Pill, Rating, StatusBadge, timeAgo, VerifiedBadge } from "@/components/ui";

async function loadJob(id: string) {
  return db.job.findUnique({
    where: { id },
    include: {
      poster: true,
      escrow: true,
      applications: { orderBy: { createdAt: "asc" }, include: { worker: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { id: true, name: true, photoUrl: true } } } },
      reviews: true,
      disputes: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function generateMetadata({ params }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const job = await db.job.findUnique({ where: { id }, select: { title: true } });
  return { title: job?.title ?? "Job" };
}

export default async function JobPage({ params, searchParams }: PageProps<"/jobs/[id]">) {
  const { id } = await params;
  const sp = await searchParams;
  let job = await loadJob(id);
  if (!job) notFound();

  // Settle an overdue auto-release lazily too, in case the cron hasn't run yet.
  if (await autoReleaseIfDue(job)) job = (await loadJob(id))!;

  const user = await getCurrentUser();
  const isPoster = user?.id === job.posterId;
  const accepted = job.applications.filter((a) => a.status === "accepted");
  const myApp = user ? job.applications.find((a) => a.workerId === user.id) : undefined;
  const isWorker = myApp?.status === "accepted";
  const isParty = isPoster || isWorker;
  const verified = user?.verificationStatus === "verified";

  // Jobs that aren't live are only visible to the people on them (and ops).
  if (!isParty && !user?.isAdmin && job.status !== "open" && !myApp) {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="text-2xl font-extrabold">This job is no longer available</h1>
        <p className="mt-2 text-muted-foreground">It may have been filled or closed.</p>
        <Link href="/jobs" className={btn("primary", "mt-6")}>Browse open jobs</Link>
      </div>
    );
  }

  const pending = job.applications.filter((a) => a.status === "applied");
  const openDispute = job.disputes.find((d) => d.status === "open");
  const lastDispute = job.disputes[0];
  const autoReleaseAt = job.submittedAt ? new Date(job.submittedAt.getTime() + config.autoReleaseHours * 3_600_000) : null;
  const workerPool = job.amount * job.slots;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        {sp.funded && <Notice tone="accent"><strong>Payment received.</strong> Your job is live and {formatNaira(workerPool + job.commission)} is held in escrow.</Notice>}
        {sp.pending && <Notice tone="warning">We&apos;re still waiting for the payment provider to confirm your payment. Refresh in a minute.</Notice>}

        <Card>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <Pill tone="primary">{categoryLabel(job.category)}</Pill>
            {job.escrow?.state === "funded" && <EscrowBadge />}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold leading-tight sm:text-3xl">{job.title}</h1>
          <p className="mt-2 text-3xl font-black text-accent-strong">
            {formatNaira(job.amount)}
            {job.slots > 1 && <span className="ml-1 text-base font-semibold text-muted-foreground">per person</span>}
          </p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <li className="flex items-center gap-2"><MapPin size={16} className="text-primary" aria-hidden /> {locationLabel(job.locationType, job.locationDetail)}</li>
            {job.neededBy && <li className="flex items-center gap-2"><CalendarClock size={16} className="text-primary" aria-hidden /> Needed by {formatDate(job.neededBy)}</li>}
            <li className="flex items-center gap-2"><Users size={16} className="text-primary" aria-hidden /> {accepted.length}/{job.slots} {job.slots === 1 ? "person" : "people"} hired</li>
            <li className="flex items-center gap-2"><Clock size={16} className="text-primary" aria-hidden /> Posted {timeAgo(job.createdAt)}</li>
          </ul>
          <h2 className="mt-6 font-bold">About the job</h2>
          <p className="mt-1 whitespace-pre-line">{job.description}</p>
        </Card>

        {isPoster && job.status === "open" && (
          <section id="applicants" aria-labelledby="applicants-h">
            <h2 id="applicants-h" className="mb-3 text-lg font-bold">Applicants ({pending.length})</h2>
            {pending.length === 0 ? (
              <p className="text-muted-foreground">No applicants yet. We&apos;ll notify you as soon as someone applies.</p>
            ) : (
              <ul className="space-y-3">
                {pending.map((a) => (
                  <li key={a.id}>
                    <Card className="space-y-3 p-4">
                      <div className="flex items-start gap-3">
                        <Avatar name={a.worker.name} url={a.worker.photoUrl} size={44} />
                        <div className="min-w-0 flex-1">
                          <Link href={`/profile/${a.worker.id}`} className="inline-flex items-center gap-1 font-bold hover:underline">
                            {a.worker.name} <VerifiedBadge verified={a.worker.verificationStatus === "verified"} />
                          </Link>
                          <div className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
                            <Rating avg={a.worker.ratingAvg} count={a.worker.ratingCount} />
                            <span>{a.worker.jobsCompleted} jobs done</span>
                            <span>{timeAgo(a.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      {a.note && <p className="rounded-xl bg-muted p-3 text-sm">{a.note}</p>}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Link href={`/profile/${a.worker.id}`} className="text-sm font-semibold text-primary underline">View profile</Link>
                        <DecideButtons applicationId={a.id} name={a.worker.name} />
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {isParty && accepted.length > 0 && ["assigned", "in_progress", "submitted", "disputed", "completed"].includes(job.status) && (
          <section id="messages" aria-labelledby="messages-h">
            <h2 id="messages-h" className="mb-3 text-lg font-bold">Coordinate</h2>
            <Card className="space-y-3 p-4">
              {job.messages.length === 0 ? (
                <p className="text-sm text-muted-foreground">Agree on where and when. Keep payment on No Broke Dayz so you stay protected.</p>
              ) : (
                <ul className="max-h-80 space-y-3 overflow-y-auto">
                  {job.messages.map((m) => (
                    <li key={m.id} className={`flex gap-2 ${m.senderId === user?.id ? "flex-row-reverse text-right" : ""}`}>
                      <Avatar name={m.sender.name} url={m.sender.photoUrl} size={28} />
                      <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${m.senderId === user?.id ? "bg-primary text-on-primary" : "bg-muted"}`}>
                        <p className="whitespace-pre-line text-left">{m.body}</p>
                        <p className="mt-0.5 text-[11px] opacity-75">{m.sender.name.split(" ")[0]} · {timeAgo(m.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {job.status !== "completed" && <MessageForm jobId={job.id} />}
            </Card>
          </section>
        )}

        {job.status === "completed" && isParty && user && (
          <section aria-labelledby="reviews-h" className="space-y-3">
            <h2 id="reviews-h" className="text-lg font-bold">Ratings</h2>
            {(isPoster ? accepted.map((a) => ({ id: a.workerId, name: a.worker.name })) : [{ id: job.posterId, name: job.poster.name }]).map((ratee) => {
              const existing = job.reviews.find((r) => r.raterId === user.id && r.rateeId === ratee.id);
              return (
                <Card key={ratee.id} className="p-4">
                  {existing ? (
                    <p className="text-sm">You rated <strong>{ratee.name}</strong> {existing.score}/5. Thanks!</p>
                  ) : (
                    <ReviewForm jobId={job.id} rateeId={ratee.id} rateeName={ratee.name} />
                  )}
                </Card>
              );
            })}
          </section>
        )}
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card className="space-y-4">
          <h2 className="font-bold">{isParty ? "Next step" : "Interested?"}</h2>
          {nextStep()}
        </Card>

        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posted by</p>
          <Link href={`/profile/${job.poster.id}`} className="flex items-center gap-3 hover:underline">
            <Avatar name={job.poster.name} url={job.poster.photoUrl} size={44} />
            <div>
              <p className="flex items-center gap-1 font-bold">{job.poster.name} <VerifiedBadge verified={job.poster.verificationStatus === "verified"} /></p>
              <Rating avg={job.poster.ratingAvg} count={job.poster.ratingCount} />
            </div>
          </Link>
        </Card>

        {isParty && accepted.length > 0 && (
          <Card className="p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Hired</p>
            <ul className="space-y-2">
              {accepted.map((a) => (
                <li key={a.id}>
                  <Link href={`/profile/${a.worker.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                    <Avatar name={a.worker.name} url={a.worker.photoUrl} size={32} /> {a.worker.name}
                    <VerifiedBadge verified={a.worker.verificationStatus === "verified"} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </aside>
    </div>
  );

  function nextStep() {
    const j = job!;
    if (!user) {
      return (
        <>
          <p className="text-sm text-muted-foreground">Log in with a verified student account to apply.</p>
          <Link href={`/login?next=/jobs/${j.id}`} className={btn("primary", "w-full")}>Log in to apply</Link>
        </>
      );
    }

    if (isPoster) {
      switch (j.status) {
        case "awaiting_payment":
          return (
            <>
              <p className="text-sm">Fund escrow to publish this job. It isn&apos;t visible to workers until it&apos;s funded.</p>
              <Link href={`/jobs/${j.id}/fund`} className={btn("accent", "w-full")}>Fund {formatNaira(workerPool + j.commission)}</Link>
              <JobActionButton action="cancelJob" jobId={j.id} label="Delete draft" variant="ghost" confirm="Delete this draft?" />
            </>
          );
        case "open":
          return (
            <>
              <p className="text-sm">Your job is live. Review applicants and accept {j.slots === 1 ? "one" : `up to ${j.slots}`}.</p>
              {j.slots > 1 && accepted.length > 0 && (
                <JobActionButton action="closeApplications" jobId={j.id} label={`Start with ${accepted.length} hired`} variant="secondary" confirm="Stop taking applicants? Unfilled spots are refunded when the job is settled." />
              )}
              <JobActionButton action="cancelJob" jobId={j.id} label="Cancel & refund" variant="danger" confirm="Cancel this job? The full escrow amount returns to your wallet." />
            </>
          );
        case "assigned":
          return (
            <>
              <p className="text-sm">Waiting for your worker to start. Use messages to agree on details.</p>
              <JobActionButton action="cancelJob" jobId={j.id} label="Cancel & refund" variant="danger" confirm="Cancel this job? The full escrow amount returns to your wallet." />
            </>
          );
        case "in_progress":
          return (
            <>
              <p className="text-sm">Work is in progress. You&apos;ll be asked to confirm when it&apos;s submitted.</p>
              <DisputeForm jobId={j.id} />
            </>
          );
        case "submitted":
          return (
            <>
              <p className="text-sm">Work is marked as done. Confirm to release <strong>{formatNaira(j.amount * accepted.length)}</strong> to {accepted.length === 1 ? accepted[0].worker.name : "your workers"}.</p>
              {autoReleaseAt && <p className="text-xs text-muted-foreground">If you don&apos;t confirm or dispute, payment auto-releases on {autoReleaseAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}.</p>}
              <JobActionButton action="confirmCompletion" jobId={j.id} label="Confirm & release payment" variant="accent" confirm="Confirm the work is done? This releases payment and can't be undone." />
              <DisputeForm jobId={j.id} />
            </>
          );
        default:
          return statusSummary();
      }
    }

    if (isWorker) {
      switch (j.status) {
        case "assigned":
          return (
            <>
              <p className="text-sm">You&apos;re hired! {formatNaira(j.amount)} is held in escrow for you.</p>
              <JobActionButton action="startWork" jobId={j.id} label="Start work" />
              <JobActionButton action="submitWork" jobId={j.id} label="Mark as done" variant="secondary" confirm="Mark this job as done? The poster will be asked to confirm." />
            </>
          );
        case "in_progress":
          return (
            <>
              <p className="text-sm">When you&apos;ve finished, mark it as done so the poster can release payment.</p>
              <JobActionButton action="submitWork" jobId={j.id} label="Mark as done" confirm="Mark this job as done? The poster will be asked to confirm." />
              <DisputeForm jobId={j.id} />
            </>
          );
        case "submitted":
          return (
            <>
              <p className="text-sm">Waiting for the poster to confirm.{autoReleaseAt && <> If they don&apos;t respond, payment auto-releases on <strong>{autoReleaseAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</strong>.</>}</p>
              <DisputeForm jobId={j.id} />
            </>
          );
        default:
          return statusSummary();
      }
    }

    // Visitor or applicant
    if (myApp?.status === "applied") {
      return (
        <>
          <Notice tone="primary">You&apos;ve applied. We&apos;ll notify you when the poster decides.</Notice>
          <JobActionButton action="withdrawApplication" jobId={j.id} label="Withdraw application" variant="ghost" />
        </>
      );
    }
    if (myApp?.status === "rejected") return <p className="text-sm text-muted-foreground">This job went to someone else. Keep going: new jobs are posted daily.</p>;
    if (j.status !== "open") return statusSummary();
    if (!verified) {
      return (
        <>
          <p className="text-sm">Only verified students can apply. It takes about a minute.</p>
          <Link href="/verify" className={btn("primary", "w-full")}>Verify to apply</Link>
        </>
      );
    }
    return <ApplyForm jobId={j.id} />;
  }

  function statusSummary() {
    const j = job!;
    const e = j.escrow;
    if (j.status === "disputed") {
      return (
        <Notice tone="danger">
          <p className="font-semibold">Dispute under review</p>
          <p className="mt-1">Payment is frozen while our team looks into it. Both of you will be notified of the outcome.</p>
          {openDispute && <p className="mt-2 text-xs">Reason: {openDispute.reason}</p>}
        </Notice>
      );
    }
    if (j.status === "completed") {
      return (
        <div className="space-y-2 text-sm">
          <Notice tone="accent"><strong>Completed.</strong> {e ? `${formatNaira(e.workerReleased)} released to ${isPoster ? "your worker(s)" : "you"}.` : ""}</Notice>
          {lastDispute?.status === "resolved" && <p className="text-muted-foreground">Resolved by our team: {lastDispute.note}</p>}
          {isPoster && e && e.posterRefunded > 0 && <p className="text-muted-foreground">{formatNaira(e.posterRefunded)} unused escrow was refunded to your wallet.</p>}
        </div>
      );
    }
    if (j.status === "cancelled") {
      return <Notice>This job was cancelled.{isPoster && e ? ` ${formatNaira(e.posterRefunded)} was refunded to your wallet.` : ""}</Notice>;
    }
    return <p className="text-sm text-muted-foreground">This job is no longer taking applications.</p>;
  }
}
