import Link from "next/link";
import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { forceSettle } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/form";
import { PageHeader, Pill, StatusBadge, timeAgo } from "@/components/ui";

export default async function AdminJobsPage({ searchParams }: PageProps<"/admin/jobs">) {
  const { status } = await searchParams;
  const [jobs, ledger] = await Promise.all([
    db.job.findMany({
      where: typeof status === "string" && status ? { status } : {},
      orderBy: { updatedAt: "desc" },
      take: 100,
      include: { poster: { select: { name: true } }, escrow: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
    }),
    db.walletEntry.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50, include: { user: { select: { name: true } } } }),
  ]);
  const statuses = ["", "awaiting_payment", "open", "assigned", "in_progress", "submitted", "disputed", "completed", "cancelled"];

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="Jobs & escrow" />
        <form className="mb-4 flex items-end gap-2">
          <div>
            <label htmlFor="status" className="text-xs font-semibold">Status</label>
            <select id="status" name="status" defaultValue={typeof status === "string" ? status : ""} className="field">
              {statuses.map((s) => <option key={s} value={s}>{s || "All"}</option>)}
            </select>
          </div>
          <button type="submit" className="min-h-11 cursor-pointer rounded-xl bg-primary px-4 font-semibold text-on-primary">Filter</button>
        </form>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr>
                <th className="p-3">Job</th><th className="p-3">Status</th><th className="p-3">Funding</th><th className="p-3">Escrow</th><th className="p-3">Manual settle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((j) => (
                <tr key={j.id} className="align-top">
                  <td className="p-3">
                    <Link href={`/jobs/${j.id}`} className="font-semibold text-primary underline">{j.title}</Link>
                    <p className="text-xs text-muted-foreground">{j.poster.name} · {formatNaira(j.amount)} × {j.slots} · {timeAgo(j.createdAt)}</p>
                  </td>
                  <td className="p-3"><StatusBadge status={j.status} /></td>
                  <td className="p-3 text-xs">{j.payments[0] ? <>{j.payments[0].provider} · {j.payments[0].status}<br /><span className="font-mono">{j.payments[0].reference}</span></> : "No attempts"}</td>
                  <td className="p-3 text-xs">
                    {j.escrow ? (
                      <>
                        <Pill tone={j.escrow.state === "funded" ? "warning" : "accent"}>{j.escrow.state}</Pill>
                        <p className="mt-1">Held {formatNaira(j.escrow.amount + j.escrow.commission)}</p>
                        {j.escrow.state !== "funded" && <p>Worker {formatNaira(j.escrow.workerReleased)} · Fee {formatNaira(j.escrow.commissionCaptured)} · Refund {formatNaira(j.escrow.posterRefunded)}</p>}
                      </>
                    ) : "Not funded"}
                  </td>
                  <td className="p-3">
                    {j.escrow?.state === "funded" && j.status !== "disputed" ? (
                      <ActionForm action={forceSettle} className="space-y-1">
                        <input type="hidden" name="jobId" value={j.id} />
                        <input name="note" aria-label="Audit note" placeholder="Audit note" className="field text-sm" />
                        <div className="flex gap-1">
                          <SubmitButton name="action" value="release" variant="accent" className="px-3 text-xs" confirm="Release escrow to worker(s)?">Release</SubmitButton>
                          <SubmitButton name="action" value="refund" variant="danger" className="px-3 text-xs" confirm="Refund escrow to poster?">Refund</SubmitButton>
                        </div>
                      </ActionForm>
                    ) : <span className="text-xs text-muted-foreground">n/a</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Ledger (latest 50)</h2>
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted text-xs uppercase text-muted-foreground">
              <tr><th className="p-3">When</th><th className="p-3">Account</th><th className="p-3">Type</th><th className="p-3">Description</th><th className="p-3 text-right">Amount</th><th className="p-3 text-right">Balance</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {ledger.map((e) => (
                <tr key={e.id}>
                  <td className="p-3 text-xs">{e.createdAt.toLocaleString("en-NG", { dateStyle: "short", timeStyle: "short" })}</td>
                  <td className="p-3">{e.user?.name ?? <strong>Platform</strong>}</td>
                  <td className="p-3"><Pill>{e.type}</Pill></td>
                  <td className="p-3">{e.description}</td>
                  <td className="p-3 text-right font-mono">{e.amount === 0 ? `(${formatNaira(e.gross)})` : formatNaira(e.amount)}</td>
                  <td className="p-3 text-right font-mono">{formatNaira(e.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
