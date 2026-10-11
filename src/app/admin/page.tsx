import { db } from "@/lib/db";
import { walletBalance } from "@/lib/escrow";
import { formatNaira } from "@/lib/money";
import { triggerAutoRelease } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, PageHeader } from "@/components/ui";

export const metadata = { title: "Admin" };

function median(values: number[]) {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Beta metrics dashboard (PRD §3.3 / F12). */
export default async function AdminOverview() {
  const [users, verified, jobsPosted, jobsFunded, completed, releasedAll, releasedClean, disputed, escrowAgg, held, commission, firstApps, posterCounts, workerCounts, fundStarts, fundOk] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { verificationStatus: "verified" } }),
    db.job.count(),
    db.job.count({ where: { fundedAt: { not: null } } }),
    db.job.count({ where: { status: "completed" } }),
    db.escrowTransaction.count({ where: { workerReleased: { gt: 0 } } }),
    db.escrowTransaction.count({ where: { workerReleased: { gt: 0 }, job: { disputes: { none: {} } } } }),
    db.dispute.groupBy({ by: ["jobId"] }),
    db.escrowTransaction.aggregate({ _sum: { workerReleased: true, commissionCaptured: true } }),
    db.escrowTransaction.aggregate({ where: { state: "funded" }, _sum: { amount: true, commission: true } }),
    walletBalance(null),
    db.event.findMany({ where: { name: "application_submitted" }, select: { props: true } }),
    db.job.groupBy({ by: ["posterId"], where: { fundedAt: { not: null } }, _count: true }),
    db.application.groupBy({ by: ["workerId"], where: { status: "accepted" }, _count: true }),
    db.event.count({ where: { name: "funding_started" } }),
    db.event.count({ where: { name: "job_funded" } }),
  ]);

  const minutesToFirst = firstApps
    .map((e) => JSON.parse(e.props) as { first?: boolean; minutesSinceFunded?: number })
    .filter((p) => p.first && typeof p.minutesSinceFunded === "number")
    .map((p) => p.minutesSinceFunded!);
  const med = median(minutesToFirst);

  const activeUsers = new Map<string, number>();
  for (const p of posterCounts) activeUsers.set(p.posterId, (activeUsers.get(p.posterId) ?? 0) + p._count);
  for (const w of workerCounts) activeUsers.set(w.workerId, (activeUsers.get(w.workerId) ?? 0) + w._count);
  const repeat = [...activeUsers.values()].filter((n) => n >= 2).length;

  const stats = [
    { label: "Verified students", value: `${verified}`, sub: `of ${users} sign-ups · target 100` },
    { label: "Jobs posted", value: `${jobsPosted}`, sub: `${jobsFunded} funded · target ≥60` },
    { label: "Completed & paid", value: `${completed}`, sub: "target ≥30" },
    { label: "Median time to first applicant", value: med === null ? "n/a" : med < 60 ? `${Math.round(med)} min` : `${(med / 60).toFixed(1)} h`, sub: "target < 2 hours" },
    { label: "Released without dispute", value: releasedAll ? `${Math.round((releasedClean / releasedAll) * 100)}%` : "n/a", sub: "target > 90%" },
    { label: "Repeat users (≥2 jobs)", value: activeUsers.size ? `${Math.round((repeat / activeUsers.size) * 100)}%` : "n/a", sub: `${repeat} of ${activeUsers.size} active · target > 25%` },
    { label: "GMV released", value: formatNaira(escrowAgg._sum.workerReleased ?? 0), sub: "paid out to workers" },
    { label: "Commission collected", value: formatNaira(commission), sub: "platform ledger balance" },
    { label: "Held in escrow now", value: formatNaira((held._sum.amount ?? 0) + (held._sum.commission ?? 0)), sub: "funded, unsettled" },
    { label: "Funding success rate", value: fundStarts ? `${Math.round((fundOk / fundStarts) * 100)}%` : "n/a", sub: `${fundOk} of ${fundStarts} checkouts` },
    { label: "Completion rate", value: jobsFunded ? `${Math.round((completed / jobsFunded) * 100)}%` : "n/a", sub: "completed / funded" },
    { label: "Dispute rate", value: jobsFunded ? `${Math.round((disputed.length / jobsFunded) * 100)}%` : "n/a", sub: `${disputed.length} jobs disputed` },
  ];

  return (
    <div>
      <PageHeader title="Beta metrics" subtitle="UNILAG closed beta" />
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <li key={s.label}>
            <Card className="h-full p-4">
              <p className="text-sm font-semibold text-muted-foreground">{s.label}</p>
              <p className="mt-1 text-2xl font-black">{s.value}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
            </Card>
          </li>
        ))}
      </ul>
      <Card className="mt-6 p-4">
        <h2 className="font-bold">Auto-release</h2>
        <p className="mb-3 text-sm text-muted-foreground">Runs automatically via the cron endpoint. Use this to run it now.</p>
        <ActionForm action={triggerAutoRelease}>
          <SubmitButton variant="secondary">Run auto-release now</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
