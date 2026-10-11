import Link from "next/link";
import { Suspense } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { nairaToKobo } from "@/lib/money";
import { JobCard } from "@/components/job-card";
import { JobFilters } from "@/components/job-filters";
import { btn, EmptyState, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Find jobs" };

function one(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export default async function JobsPage({ searchParams }: PageProps<"/jobs">) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const q = one(sp.q)?.trim();
  const category = one(sp.category);
  const location = one(sp.location);
  const minPay = Number(one(sp.minPay)) || 0;
  const maxPay = Number(one(sp.maxPay)) || 0;
  const neededBy = one(sp.neededBy);

  // Only funded, open jobs are discoverable (PRD F4).
  const where: Prisma.JobWhereInput = { status: "open", campus: user?.campus ?? "UNILAG" };
  if (q) where.OR = [{ title: { contains: q } }, { description: { contains: q } }];
  if (category) where.category = category;
  if (location) where.locationType = location;
  if (minPay || maxPay) where.amount = { ...(minPay ? { gte: nairaToKobo(minPay) } : {}), ...(maxPay ? { lte: nairaToKobo(maxPay) } : {}) };
  if (neededBy) {
    const d = new Date(neededBy + "T23:59:59");
    if (!isNaN(d.getTime())) where.neededBy = { lte: d };
  }

  const jobs = await db.job.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { poster: { select: { name: true, verificationStatus: true } } },
  });

  const filtered = Boolean(q || category || location || minPay || maxPay || neededBy);

  return (
    <div>
      <PageHeader
        title="Find jobs"
        subtitle={`Open, escrow-protected jobs at ${user?.campus ?? "UNILAG"}`}
        action={<div className="hidden md:block"><Link href="/jobs/new" className={btn("primary")}>Post a job</Link></div>}
      />
      {user && user.verificationStatus !== "verified" && (
        <div className="mb-4">
          <Notice tone="warning">
            <strong>Verify your student status to apply.</strong> It takes a minute with your school email.{" "}
            <Link href="/verify" className="font-semibold text-primary underline">Verify now</Link>
          </Notice>
        </div>
      )}
      <Suspense>
        <JobFilters />
      </Suspense>
      <p className="mt-4 text-sm text-muted-foreground" aria-live="polite">
        {jobs.length} job{jobs.length === 1 ? "" : "s"}{filtered ? " match your filters" : " open now"}
      </p>
      {jobs.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            title={filtered ? "No jobs match those filters" : "No open jobs right now"}
            body={filtered ? "Try widening your search." : "Check back soon, or post one yourself."}
            action={filtered ? undefined : { href: "/jobs/new", label: "Post a job" }}
          />
        </div>
      ) : (
        <ul className="mt-4 grid gap-4 md:grid-cols-2">
          {jobs.map((job) => (
            <li key={job.id}>
              <JobCard job={job} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
