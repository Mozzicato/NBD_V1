import { db } from "@/lib/db";
import { formatNaira } from "@/lib/money";
import { processWithdrawal } from "@/app/actions/admin";
import { ActionForm, SubmitButton } from "@/components/form";
import { Card, EmptyState, PageHeader, Pill, timeAgo } from "@/components/ui";

export default async function WithdrawalsPage() {
  const [pending, recent] = await Promise.all([
    db.withdrawal.findMany({ where: { status: "pending" }, orderBy: { createdAt: "asc" }, include: { user: true } }),
    db.withdrawal.findMany({ where: { status: { not: "pending" } }, orderBy: { processedAt: "desc" }, take: 20, include: { user: { select: { name: true } } } }),
  ]);
  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="Withdrawals" subtitle="Send the transfer from the platform account, then mark it paid. Failed transfers are returned to the user's wallet." />
        {pending.length === 0 ? (
          <EmptyState title="No pending withdrawals" />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {pending.map((w) => (
              <li key={w.id}>
                <Card className="space-y-3 p-4">
                  <p className="text-2xl font-black">{formatNaira(w.amount)}</p>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                    <dt className="text-muted-foreground">User</dt><dd>{w.user.name} ({w.user.phone})</dd>
                    <dt className="text-muted-foreground">Bank</dt><dd>{w.bankName}</dd>
                    <dt className="text-muted-foreground">Account</dt><dd className="font-mono">{w.bankAccountNumber}</dd>
                    <dt className="text-muted-foreground">Name</dt><dd>{w.bankAccountName}</dd>
                    <dt className="text-muted-foreground">Ref</dt><dd className="font-mono">{w.reference}</dd>
                    <dt className="text-muted-foreground">Requested</dt><dd>{timeAgo(w.createdAt)}</dd>
                  </dl>
                  <ActionForm action={processWithdrawal} className="space-y-2">
                    <input type="hidden" name="withdrawalId" value={w.id} />
                    <input name="note" aria-label="Note" placeholder="Note (optional, shown to user if failed)" className="field" />
                    <div className="flex gap-2">
                      <SubmitButton name="outcome" value="paid" variant="accent" confirm="Confirm the transfer has been sent?">Mark paid</SubmitButton>
                      <SubmitButton name="outcome" value="failed" variant="danger" confirm="Mark failed and return funds to the user's wallet?">Mark failed</SubmitButton>
                    </div>
                  </ActionForm>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section>
        <h2 className="mb-3 text-lg font-bold">Recently processed</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card text-sm">
          {recent.map((w) => (
            <li key={w.id} className="flex items-center justify-between p-3">
              <span>{w.user.name} · {formatNaira(w.amount)} · {w.bankName}</span>
              <Pill tone={w.status === "paid" ? "accent" : "danger"}>{w.status}</Pill>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
