import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { formatNaira } from "@/lib/money";
import { btn, EmptyState, PageHeader, Pill, StatusBadge, timeAgo } from "@/components/ui";

export const metadata = { title: "My jobs" };

function posterNextAction(status: string, applicants: number): { text: string; urgent?: boolean } {
  switch (status) {
    case "awaiting_payment": return { text: "Fund escrow to publish", urgent: true };
    case "open": return applicants ? { text: `Review ${applicants} applicant${applicants > 1 ? "s" : ""}`, urgent: true } : { text: "Waiting for applicants" };
    case "assigned": return { text: "Waiting for worker to start" };
    case "in_progress": return { text: "Work in progress" };
    case "submitted": return { text: "Confirm completion", urgent: true };
    case "completed": return { text: "Done. Rate your worker" };
    case "disputed": return { text: "Dispute under review" };
    default: return { text: "Closed" };
  }
}

function workerNextAction(jobStatus: string, appStatus: string): { text: string; urgent?: boolean } {
  if (appStatus === "applied") return { text: "Waiting for the poster" };
  if (appStatus === "rejected") return { text: "Not selected" };
  if (appStatus === "withdrawn") return { text: "Withdrawn" };
  switch (jobStatus) {
    case "assigned": return { text: "Start work", urgent: true };
    case "in_progress": return { text: "Mark as done when finished", urgent: true };
    case "submitted": return { text: "Waiting for confirmation" };
    case "completed": return { text: "Paid. Rate the poster" };
    case "disputed": return { text: "Dispute under review" };
    default: return { text: "Closed" };
  }
}

export default async function MyJobsPage({ searchParams }: PageProps<"/my-jobs">) {
  const user = await requireUser("/my-jobs");
  const { tab = "working" } = await searchParams;
  const hiring = tab === "hiring";

  const [posted, applications] = await Promise.all([
    db.job.findMany({
      where: { posterId: user.id, NOT: { status: "cancelled", fundedAt: null } },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { applications: { where: { status: "applied" } } } } },
    }),
    db.application.findMany({ where: { workerId: user.id }, orderBy: { createdAt: "desc" }, include: { job: true } }),
  ]);

  const tabCls = (active: boolean) =>
    `flex-1 min-h-11 inline-flex items-center justify-center rounded-lg text-sm font-semibold ${active ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="My jobs" subtitle="Everything you're working on or hiring for." />
      <nav aria-label="Job lists" className="mb-5 flex gap-1 rounded-xl bg-muted p-1">
        <Link href="/my-jobs?tab=working" aria-current={!hiring ? "page" : undefined} className={tabCls(!hiring)}>Working ({applications.length})</Link>
        <Link href="/my-jobs?tab=hiring" aria-current={hiring ? "page" : undefined} className={tabCls(hiring)}>Hiring ({posted.length})</Link>
      </nav>

      {hiring ? (
        posted.length === 0 ? (
          <EmptyState title="You haven't posted any jobs" body="Need a hand with something? Verified students are ready." action={{ href: "/jobs/new", label: "Post a job" }} />
        ) : (
          <ul className="space-y-3">
            {posted.map((j) => {
              const next = posterNextAction(j.status, j._count.applications);
              return (
                <li key={j.id}>
                  <JobRow href={j.id} title={j.title} status={j.status} amount={formatNaira(j.amount * j.slots)} meta={`Posted ${timeAgo(j.createdAt)}`} next={next} />
                </li>
              );
            })}
          </ul>
        )
      ) : applications.length === 0 ? (
        <EmptyState title="No applications yet" body="Find a job that fits between your lectures." action={{ href: "/jobs", label: "Find jobs" }} />
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => (
            <li key={a.id}>
              <JobRow href={a.job.id} title={a.job.title} status={a.job.status} amount={formatNaira(a.job.amount)} meta={`Applied ${timeAgo(a.createdAt)}`} next={workerNextAction(a.job.status, a.status)} />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-8 text-center">
        <Link href={hiring ? "/jobs/new" : "/jobs"} className={btn("secondary")}>{hiring ? "Post another job" : "Find more jobs"}</Link>
      </div>
    </div>
  );
}

function JobRow({ href, title, status, amount, meta, next }: { href: string; title: string; status: string; amount: string; meta: string; next: { text: string; urgent?: boolean } }) {
  return (
    <Link href={`/jobs/${href}`} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition-colors hover:border-primary">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={status} />
          <span className="text-xs text-muted-foreground">{meta}</span>
        </div>
        <p className="mt-1 truncate font-bold">{title}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-accent-strong">{amount}</span>
          {next.urgent ? <Pill tone="warning">{next.text}</Pill> : <span className="text-muted-foreground">{next.text}</span>}
        </div>
      </div>
      <ChevronRight className="shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
