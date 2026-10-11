import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readPrivateFile } from "@/lib/storage";

/** Admin-only access to a pending ID document. */
export async function GET(_: Request, ctx: RouteContext<"/admin/verifications/[id]/file">) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const req = await db.verificationRequest.findUnique({ where: { id } });
  if (!req?.evidenceRef) return new Response("Not found", { status: 404 });
  try {
    const { data, type } = await readPrivateFile(req.evidenceRef);
    return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
