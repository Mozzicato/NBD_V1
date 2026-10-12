import { notFound, redirect } from "next/navigation";
import { FlaskConical } from "lucide-react";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { finishFunding } from "@/lib/escrow";
import { formatNaira } from "@/lib/money";
import { SubmitButton } from "@/components/form";
import { Card } from "@/components/ui";

export const metadata = { title: "Test checkout" };

async function choose(form: FormData) {
  "use server";
  const user = await requireUser();
  const reference = String(form.get("reference"));
  const outcome = form.get("outcome") === "success" ? "success" : "failed";
  await db.payment.updateMany({ where: { reference, userId: user.id, provider: "mock", status: "pending" }, data: { mockOutcome: outcome } });
  redirect(await finishFunding(reference));
}

/** Stand-in for the gateway's hosted checkout. Only reachable when the mock provider is the active one. */
export default async function MockCheckout({ params }: PageProps<"/pay/mock/[reference]">) {
  // Must mirror getPaymentProvider(): the mock provider is active in demo mode even when a
  // Paystack key is configured, so gating on the key alone 404s a checkout we just redirected to.
  if (config.paystackSecretKey && !config.demoMode) notFound();
  const { reference } = await params;
  const user = await requireUser();
  const payment = await db.payment.findUnique({ where: { reference }, include: { job: true } });
  if (!payment || payment.userId !== user.id || payment.provider !== "mock") notFound();
  if (payment.status !== "pending") redirect(`/jobs/${payment.jobId}`);

  return (
    <div className="mx-auto max-w-sm">
      <Card className="space-y-4 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-warning-soft text-warning"><FlaskConical aria-hidden /></span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-warning">Test checkout</p>
          <p className="mt-1 text-3xl font-extrabold">{formatNaira(payment.amount)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{payment.job.title}</p>
        </div>
        <p className="text-sm text-muted-foreground">This replaces the payment provider in development. Pick an outcome to simulate.</p>
        <form action={choose} className="space-y-2">
          <input type="hidden" name="reference" value={reference} />
          <SubmitButton variant="accent" className="w-full" name="outcome" value="success">Simulate successful payment</SubmitButton>
          <SubmitButton variant="danger" className="w-full" name="outcome" value="failed">Simulate failed payment</SubmitButton>
        </form>
        <p className="font-mono text-xs text-muted-foreground">{reference}</p>
      </Card>
    </div>
  );
}
