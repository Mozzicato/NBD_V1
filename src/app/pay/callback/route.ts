import { NextResponse, type NextRequest } from "next/server";
import { finishFunding } from "@/lib/escrow";

/** Where the payment provider sends the payer back. The webhook may have already confirmed it; both paths are idempotent. */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference") ?? req.nextUrl.searchParams.get("trxref");
  const to = reference ? await finishFunding(reference) : "/my-jobs";
  return NextResponse.redirect(new URL(to, req.url));
}
