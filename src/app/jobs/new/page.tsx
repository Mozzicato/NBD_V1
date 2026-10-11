import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { JobForm } from "@/components/job-form";
import { btn, Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Post a job" };

export default async function NewJobPage() {
  const user = await requireUser("/jobs/new");
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Post a job" subtitle="Verified students apply. You only pay out when the work is done." />
      {user.verificationStatus !== "verified" ? (
        <Notice tone="warning">
          <p className="font-semibold">Verify your student status to post jobs</p>
          <p className="mt-1">This keeps every job and every poster on the platform trustworthy.</p>
          <Link href="/verify" className={btn("primary", "mt-3")}>Verify now</Link>
        </Notice>
      ) : (
        <Card>
          <JobForm commissionBps={config.commissionBps} />
        </Card>
      )}
    </div>
  );
}
