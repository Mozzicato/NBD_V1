import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { readPrivateFile } from "@/lib/storage";

export async function GET(_: Request, ctx: RouteContext<"/admin/disputes/[id]/evidence">) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return new Response("Not found", { status: 404 });
  const { id } = await ctx.params;
  const dispute = await db.dispute.findUnique({ where: { id } });
  if (!dispute?.evidenceRef) return new Response("Not found", { status: 404 });
  try {
    const { data, type } = await readPrivateFile(dispute.evidenceRef);
    return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "private, no-store" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
