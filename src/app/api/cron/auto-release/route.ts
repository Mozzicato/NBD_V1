import { config } from "@/lib/config";
import { runAutoRelease } from "@/lib/escrow";

/** Call on a schedule (e.g. every 15 minutes) with `Authorization: Bearer $CRON_SECRET`. */
export async function POST(req: Request) {
  if (!config.cronSecret || req.headers.get("authorization") !== `Bearer ${config.cronSecret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const released = await runAutoRelease();
  return Response.json({ released });
}

export const GET = POST;
