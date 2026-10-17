import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Lock, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireVerified } from "@/lib/auth";
import { config } from "@/lib/config";
import { formatNaira } from "@/lib/money";
import { startFunding } from "@/app/actions/jobs";
import { SubmitButton } from "@/components/form";
import { Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Fund escrow" };

export default async function FundJobPage({ params, searchParams }: PageProps<"/jobs/[id]/fund">) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireVerified(`/jobs/${id}/fund`);
  const job = await db.job.findUnique({ where: { id } });
  if (!job || job.posterId !== user.id) notFound();
  if (job.status !== "awaiting_payment") redirect(`/jobs/${job.id}`);

  const workerPool = job.amount * job.slots;
  const total = workerPool + job.commission;
  const isMock = config.demoMode || !config.paystackSecretKey;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Fund escrow" subtitle="Your job goes live as soon as payment succeeds." />
      {sp.error && (
        <div className="mb-4">
          <Notice tone="danger">
            {sp.error === "failed" ? "Payment didn't go through and you weren't charged. Your job is saved, so try again when you're ready." : "We couldn't reach the payment provider. Please try again."}
          </Notice>
        </div>
      )}
      <Card className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Job</p>
          <p className="text-lg font-bold">{job.title}</p>
        </div>
        <dl className="space-y-2 rounded-xl bg-muted p-4 text-sm">
          <div className="flex justify-between"><dt>Worker payout{job.slots > 1 ? ` (${job.slots} × ${formatNaira(job.amount)})` : ""}</dt><dd className="font-semibold">{formatNaira(workerPool)}</dd></div>
          <div className="flex justify-between"><dt>Platform commission ({config.commissionBps / 100}%)</dt><dd className="font-semibold">{formatNaira(job.commission)}</dd></div>
          <div className="flex justify-between border-t border-border pt-2 text-base"><dt className="font-bold">Total charged</dt><dd className="font-extrabold">{formatNaira(total)}</dd></div>
        </dl>
        <ul className="space-y-2 text-sm">
          <li className="flex gap-2"><ShieldCheck size={18} className="shrink-0 text-accent-strong" aria-hidden /> Held in escrow, released only when you confirm the work is done.</li>
          <li className="flex gap-2"><ShieldCheck size={18} className="shrink-0 text-accent-strong" aria-hidden /> Cancel before work starts for a full refund to your wallet.</li>
          <li className="flex gap-2"><Lock size={18} className="shrink-0 text-accent-strong" aria-hidden /> Card details are handled by our payment partner, never stored by us.</li>
        </ul>
        <form action={startFunding}>
          <input type="hidden" name="jobId" value={job.id} />
          <SubmitButton variant="accent" className="w-full text-base">Pay {formatNaira(total)}</SubmitButton>
        </form>
        {isMock && <Notice tone="warning"><strong>Simulated payment.</strong> This is a demo: no real money is charged, held or paid out.</Notice>}
      </Card>
      <p className="mt-4 text-center text-sm">
        <Link href={`/jobs/${job.id}`} className="font-semibold text-primary underline">Save as draft and pay later</Link>
      </p>
    </div>
  );
}
