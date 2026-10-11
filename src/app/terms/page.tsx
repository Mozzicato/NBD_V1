import { PageHeader } from "@/components/ui";

export const metadata = { title: "Terms" };

// Draft for the beta. Have it reviewed before handling real money.
export default function TermsPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 leading-relaxed">
      <PageHeader title="Terms of use" subtitle="Draft for the closed beta" />
      <ol className="list-decimal space-y-3 pl-5">
        <li>You must be a currently enrolled student and verify your status to post or apply for jobs.</li>
        <li>Posters fund each job into escrow before it goes live. A 10% platform commission is added on top and shown before payment.</li>
        <li>Escrow is released to the worker when the poster confirms completion, or automatically 72 hours after the worker marks the job done, unless a dispute is open.</li>
        <li>Posters can cancel for a full refund to their wallet before work starts. After that, use a dispute.</li>
        <li>Disputes are reviewed by our team, who may release, refund, or split the escrow. Their decision is final for the beta.</li>
        <li>Keep payment on the platform. Arranging payment off-platform removes your escrow protection and may lead to suspension.</li>
        <li>No illegal, unsafe, or academically dishonest jobs (e.g. sitting exams or writing graded assignments for others).</li>
        <li>Reviews must be honest and relate to the job. They can&apos;t be edited after posting and may be removed if reported and found abusive.</li>
      </ol>
    </article>
  );
}
