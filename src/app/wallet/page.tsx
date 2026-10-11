import { ArrowDownLeft, ArrowUpRight, Lock, ShieldCheck } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { pendingAmounts, walletBalance } from "@/lib/escrow";
import { formatNaira } from "@/lib/money";
import { requestWithdrawal, saveBankDetails, sendPhoneCode, sendWithdrawalCode, verifyPhone } from "@/app/actions/wallet";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Card, PageHeader, Pill } from "@/components/ui";

export const metadata = { title: "Wallet" };

const BANKS = ["Access Bank", "First Bank", "GTBank", "UBA", "Zenith Bank", "Fidelity Bank", "FCMB", "Sterling Bank", "Union Bank", "Wema Bank", "Stanbic IBTC", "Opay", "Moniepoint", "Kuda", "PalmPay"];

const ENTRY_LABEL: Record<string, string> = {
  funding: "Escrow funding",
  payout: "Job payment",
  refund: "Refund",
  withdrawal: "Withdrawal",
  withdrawal_reversal: "Withdrawal reversed",
};

export default async function WalletPage() {
  const user = await requireUser("/wallet");
  const [balance, pending, entries, withdrawals] = await Promise.all([
    walletBalance(user.id),
    pendingAmounts(user.id),
    db.walletEntry.findMany({ where: { userId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 50 }),
    db.withdrawal.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const phoneVerified = Boolean(user.phone && user.phoneVerifiedAt);
  const hasBank = Boolean(user.bankAccountNumber);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Wallet" />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl bg-primary p-5 text-on-primary sm:col-span-1">
          <p className="text-sm font-semibold opacity-90">Available</p>
          <p className="mt-1 text-3xl font-black">{formatNaira(balance)}</p>
          <p className="mt-1 text-xs opacity-80">Ready to withdraw</p>
        </div>
        <Card className="p-5">
          <p className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"><ArrowDownLeft size={16} aria-hidden /> Incoming</p>
          <p className="mt-1 text-2xl font-extrabold text-accent-strong">{formatNaira(pending.incoming)}</p>
          <p className="mt-1 text-xs text-muted-foreground">In escrow for jobs you&apos;re doing</p>
        </Card>
        <Card className="p-5">
          <p className="flex items-center gap-1 text-sm font-semibold text-muted-foreground"><Lock size={16} aria-hidden /> Held in escrow</p>
          <p className="mt-1 text-2xl font-extrabold">{formatNaira(pending.heldForMyJobs)}</p>
          <p className="mt-1 text-xs text-muted-foreground">For jobs you posted</p>
        </Card>
      </div>

      <Card className="space-y-5">
        <h2 className="text-lg font-bold">Withdraw to bank</h2>

        <div className="space-y-3">
          <h3 className="flex items-center gap-2 text-sm font-bold">1. Phone {phoneVerified ? <Pill tone="accent"><ShieldCheck size={12} aria-hidden /> Verified</Pill> : <Pill tone="warning">Required</Pill>}</h3>
          {phoneVerified ? (
            <p className="text-sm text-muted-foreground">{user.phone}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <ActionForm action={sendPhoneCode} className="space-y-2">
                <Field label="Phone number" htmlFor="phone">
                  <input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" defaultValue={user.phone ?? ""} placeholder="0803 123 4567" required className="field" />
                </Field>
                <SubmitButton variant="secondary">Send code</SubmitButton>
              </ActionForm>
              {user.phone && (
                <ActionForm action={verifyPhone} className="space-y-2">
                  <Field label="Code from SMS" htmlFor="phoneCode">
                    <input id="phoneCode" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required className="field" />
                  </Field>
                  <SubmitButton>Verify phone</SubmitButton>
                </ActionForm>
              )}
            </div>
          )}
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="flex items-center gap-2 text-sm font-bold">2. Bank account {hasBank ? <Pill tone="accent">Saved</Pill> : <Pill tone="warning">Required</Pill>}</h3>
          <ActionForm action={saveBankDetails} className="grid gap-3 sm:grid-cols-3">
            <Field label="Bank" htmlFor="bankName">
              <select id="bankName" name="bankName" defaultValue={user.bankName ?? ""} required className="field">
                <option value="" disabled>Choose bank</option>
                {BANKS.map((b) => <option key={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="Account number" htmlFor="acct">
              <input id="acct" name="bankAccountNumber" inputMode="numeric" maxLength={10} defaultValue={user.bankAccountNumber ?? ""} required className="field" />
            </Field>
            <Field label="Account name" htmlFor="acctName">
              <input id="acctName" name="bankAccountName" defaultValue={user.bankAccountName ?? ""} required className="field" />
            </Field>
            <div className="sm:col-span-3"><SubmitButton variant="secondary">{hasBank ? "Update bank details" : "Save bank details"}</SubmitButton></div>
          </ActionForm>
        </div>

        <div className="space-y-3 border-t border-border pt-5">
          <h3 className="text-sm font-bold">3. Withdraw</h3>
          {phoneVerified && hasBank ? (
            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-end">
              <ActionForm action={sendWithdrawalCode}>
                <SubmitButton variant="secondary">Get withdrawal code</SubmitButton>
              </ActionForm>
              <ActionForm action={requestWithdrawal} className="grid grid-cols-2 gap-3" resetOnSuccess>
                <Field label="Amount (₦)" htmlFor="amount" hint="Minimum ₦500">
                  <input id="amount" name="amount" inputMode="numeric" required className="field" />
                </Field>
                <Field label="Code" htmlFor="wdCode">
                  <input id="wdCode" name="code" inputMode="numeric" maxLength={6} autoComplete="one-time-code" required className="field" />
                </Field>
                <div className="col-span-2"><SubmitButton variant="accent" className="w-full">Withdraw</SubmitButton></div>
              </ActionForm>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Verify your phone and add a bank account first.</p>
          )}
        </div>
      </Card>

      {withdrawals.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold">Withdrawals</h2>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {withdrawals.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 p-4 text-sm">
                <div>
                  <p className="font-semibold">{formatNaira(w.amount)} → {w.bankName} ••••{w.bankAccountNumber.slice(-4)}</p>
                  <p className="text-xs text-muted-foreground">{w.createdAt.toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}</p>
                </div>
                <Pill tone={w.status === "paid" ? "accent" : w.status === "failed" ? "danger" : "warning"}>{w.status === "pending" ? "Processing" : w.status === "paid" ? "Sent" : "Failed"}</Pill>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Transaction history</h2>
        {entries.length === 0 ? (
          <p className="text-muted-foreground">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
            {entries.map((e) => {
              const inflow = e.amount > 0;
              const neutral = e.amount === 0;
              return (
                <li key={e.id} className="flex items-center gap-3 p-4">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${neutral ? "bg-muted text-muted-foreground" : inflow ? "bg-accent-soft text-accent-strong" : "bg-primary-soft text-primary"}`}>
                    {inflow ? <ArrowDownLeft size={18} aria-hidden /> : <ArrowUpRight size={18} aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{ENTRY_LABEL[e.type] ?? e.type} · {e.createdAt.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${inflow ? "text-accent-strong" : ""}`}>
                      {neutral ? formatNaira(e.gross) : `${inflow ? "+" : "−"}${formatNaira(Math.abs(e.amount))}`}
                    </p>
                    {neutral && <p className="text-xs text-muted-foreground">paid by card</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
