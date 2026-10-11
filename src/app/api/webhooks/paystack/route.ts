import { confirmFunding } from "@/lib/escrow";
import { verifyPaystackSignature } from "@/lib/payments/paystack";

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifyPaystackSignature(raw, req.headers.get("x-paystack-signature"))) {
    return new Response("Invalid signature", { status: 401 });
  }
  const event = JSON.parse(raw) as { event: string; data?: { reference?: string } };
  if ((event.event === "charge.success" || event.event === "charge.failed") && event.data?.reference) {
    try {
      // confirmFunding re-verifies with Paystack's API rather than trusting the payload.
      await confirmFunding(event.data.reference);
    } catch (err) {
      console.error("[paystack webhook]", err);
      return new Response("Retry", { status: 500 });
    }
  }
  return new Response("ok");
}
