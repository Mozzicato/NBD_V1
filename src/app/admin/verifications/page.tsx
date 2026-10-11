import Link from "next/link";
import { db } from "@/lib/db";
import { reviewVerification } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, EmptyState, PageHeader, Pill, timeAgo } from "@/components/ui";

export default async function VerificationsPage() {
  const [pending, recent] = await Promise.all([
    db.verificationRequest.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, include: { user: true } }),
    db.verificationRequest.findMany({ where: { status: { not: "pending" } }, orderBy: { createdAt: "desc" }, take: 20, include: { user: true } }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="ID verification queue" subtitle="ID images are deleted as soon as you approve or reject." />
        {pending.length === 0 ? (
          <EmptyState title="Queue is clear" />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {pending.map((r) => (
              <li key={r.id}>
                <Card className="space-y-3 p-4">
                  <div>
                    <p className="font-bold">{r.user.name}</p>
                    <p className="text-sm text-muted-foreground">{r.user.email} · {r.user.faculty ?? "No faculty"} · {timeAgo(r.createdAt)}</p>
                  </div>
                  {r.evidenceRef && (
                    r.evidenceRef.endsWith(".pdf") ? (
                      <Link href={`/admin/verifications/${r.id}/file`} target="_blank" className="font-semibold text-primary underline">Open ID (PDF)</Link>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/admin/verifications/${r.id}/file`} alt={`Student ID submitted by ${r.user.name}`} className="max-h-72 w-full rounded-xl border border-border object-contain" />
                    )
                  )}
                  <ActionForm action={reviewVerification} className="space-y-2">
                    <input type="hidden" name="requestId" value={r.id} />
                    <label htmlFor={`note-${r.id}`} className="text-sm font-semibold">Note (required to reject)</label>
                    <input id={`note-${r.id}`} name="note" className="field" placeholder="e.g. Name doesn't match account, image unreadable" />
                    <div className="flex gap-2">
                      <SubmitButton name="decision" value="approve" variant="accent">Approve</SubmitButton>
                      <SubmitButton name="decision" value="reject" variant="danger">Reject</SubmitButton>
                    </div>
                  </ActionForm>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Recent decisions</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
          {recent.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
              <span><strong>{r.user.name}</strong> · {r.method === "school_email" ? r.schoolEmail : "Student ID"}{r.note ? ` · ${r.note}` : ""}</span>
              <Pill tone={r.status === "approved" ? "accent" : "danger"}>{r.status}</Pill>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
