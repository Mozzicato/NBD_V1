import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, safeNext } from "@/lib/auth";

/** Marks a notification read, then follows its link. */
export async function GET(req: NextRequest, ctx: RouteContext<"/notifications/[id]">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));
  const n = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!n) return NextResponse.redirect(new URL("/notifications", req.url));
  if (!n.readAt) await db.notification.update({ where: { id }, data: { readAt: new Date() } });
  return NextResponse.redirect(new URL(safeNext(n.link, "/notifications"), req.url));
}
