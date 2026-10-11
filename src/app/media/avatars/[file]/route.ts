import { readPrivateFile } from "@/lib/storage";

// Profile photos are public; ID documents and evidence are never served from here.
export async function GET(_: Request, ctx: RouteContext<"/media/avatars/[file]">) {
  const { file } = await ctx.params;
  if (!/^[\w-]+\.(jpg|png|webp)$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const { data, type } = await readPrivateFile(`avatars/${file}`);
    return new Response(data, { headers: { "Content-Type": type, "Cache-Control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
