import Link from "next/link";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { resolveDispute } from "@/app/actions/admin";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Card, EmptyState, PageHeader, Pill, timeAgo } from "@/components/ui";

export default async function DisputesPage() {
  const [open, resolved] = await Promise.all([
    db.dispute.findMany({
      where: { status: "open" },
      orderBy: { createdAt: "asc" },
      include: {
        openedBy: true,
        job: { include: { poster: true, escrow: true, applications: { where: { status: "accepted" }, include: { worker: true } }, messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } } } },
      },
    }),
    db.dispute.findMany({ where: { status: "resolved" }, orderBy: { resolvedAt: "desc" }, take: 20, include: { job: { select: { title: true, id: true } } } }),
  ]);

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="Open disputes" subtitle="Auto-release is frozen for every job below." />
        {open.length === 0 ? (
          <EmptyState title="No open disputes" />
        ) : (
          <ul className="space-y-4">
            {open.map((d) => {
              const j = d.job;
              const workers = j.applications.map((a) => a.worker.name).join(", ");
              return (
                <li key={d.id}>
                  <Card className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <Link href={`/jobs/${j.id}`} className="text-lg font-bold text-primary underline">{j.title}</Link>
                        <p className="text-sm text-muted-foreground">Poster: {j.poster.name} · Worker(s): {workers} · was {d.prevJobStatus.replace("_", " ")}</p>
                      </div>
                      <Pill tone="danger">Opened by {d.openedBy.name} · {timeAgo(d.createdAt)}</Pill>
                    </div>
                    <div className="rounded-xl bg-muted p-3 text-sm">
                      <p className="font-semibold">Reason</p>
                      <p className="whitespace-pre-line">{d.reason}</p>
                      {d.evidenceText && <><p className="mt-2 font-semibold">Details</p><p className="whitespace-pre-line">{d.evidenceText}</p></>}
                      {d.evidenceRef && <Link href={`/admin/disputes/${d.id}/evidence`} target="_blank" className="mt-2 inline-block font-semibold text-primary underline">View evidence file</Link>}
                    </div>
                    {j.messages.length > 0 && (
                      <details className="text-sm">
                        <summary className="min-h-11 cursor-pointer py-2 font-semibold">Job messages ({j.messages.length})</summary>
                        <ul className="space-y-1 pl-2">
                          {j.messages.map((m) => <li key={m.id}><strong>{m.sender.name}:</strong> {m.body}</li>)}
                        </ul>
                      </details>
                    )}
                    {j.escrow && (
                      <p className="text-sm">Escrow: <strong>{formatNaira(j.escrow.amount + j.escrow.commission)}</strong> ({formatNaira(j.amount)} × {j.applications.length} hired of {j.slots}; commission pro rata)</p>
                    )}
                    <ActionForm action={resolveDispute} className="grid gap-3 sm:grid-cols-[1fr_140px]">
                      <input type="hidden" name="disputeId" value={d.id} />
                      <Field label="Decision note (shown to both parties)" htmlFor={`n-${d.id}`}>
                        <input id={`n-${d.id}`} name="note" required className="field" />
                      </Field>
                      <Field label="Worker share % (split)" htmlFor={`p-${d.id}`}>
                        <input id={`p-${d.id}`} name="workerSharePct" type="number" min={1} max={99} className="field" placeholder="50" />
                      </Field>
                      <div className="flex flex-wrap gap-2 sm:col-span-2">
                        <SubmitButton name="resolution" value="release" variant="accent" confirm="Release full pay to the worker(s)?">Release to worker</SubmitButton>
                        <SubmitButton name="resolution" value="refund" variant="danger" confirm="Refund everything to the poster?">Refund poster</SubmitButton>
                        <SubmitButton name="resolution" value="split" variant="secondary" confirm="Split escrow using the worker share %?">Split</SubmitButton>
                      </div>
                    </ActionForm>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Recently resolved</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
          {resolved.map((d) => (
            <li key={d.id} className="p-3">
              <Link href={`/jobs/${d.job.id}`} className="font-semibold underline">{d.job.title}</Link> · {d.resolution}{d.resolution === "split" ? ` (${d.workerSharePct}% to worker)` : ""} · {d.note}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
