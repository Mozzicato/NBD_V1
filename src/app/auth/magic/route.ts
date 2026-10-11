import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { consumeMagicToken } from "@/lib/otp";
import { createSession, safeNext } from "@/lib/auth";
import { track } from "@/lib/notify";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const otp = token ? await consumeMagicToken(token) : null;
  if (!otp) return NextResponse.redirect(new URL("/login?error=link", req.url));

  let user = await db.user.findUnique({ where: { email: otp.target } });
  if (!user) {
    // Consent was captured on the form that requested the link.
    user = await db.user.create({
      data: { email: otp.target, name: otp.target.split("@")[0], consentAt: new Date() },
    });
    await track("signup", user.id, { method: "magic_link" });
  }
  await createSession(user.id);
  const next = user.verificationStatus === "verified" ? safeNext(req.nextUrl.searchParams.get("next")) : "/verify";
  return NextResponse.redirect(new URL(next, req.url));
}
