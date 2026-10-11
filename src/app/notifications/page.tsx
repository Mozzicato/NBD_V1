import Link from "next/link";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { EmptyState, PageHeader, timeAgo } from "@/components/ui";

export const metadata = { title: "Notifications" };

async function markAllRead() {
  "use server";
  const user = await requireUser();
  await db.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/", "layout");
}

export default async function NotificationsPage() {
  const user = await requireUser("/notifications");
  const items = await db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 60 });
  const unread = items.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Notifications"
        action={
          unread ? (
            <form action={markAllRead}>
              <button type="submit" className="min-h-11 cursor-pointer px-2 text-sm font-semibold text-primary underline">Mark all as read</button>
            </form>
          ) : undefined
        }
      />
      {items.length === 0 ? (
        <EmptyState title="You're all caught up" body="Applications, payments and job updates will show up here." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {items.map((n) => {
            const body = (
              <div className="flex gap-3 p-4">
                <span aria-hidden className={`mt-1.5 size-2.5 shrink-0 rounded-full ${n.readAt ? "bg-transparent" : "bg-primary"}`} />
                <div className="min-w-0 flex-1">
                  <p className={n.readAt ? "font-semibold" : "font-bold"}>{n.title}{!n.readAt && <span className="sr-only"> (unread)</span>}</p>
                  <p className="text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.createdAt)}</p>
                </div>
              </div>
            );
            return (
              <li key={n.id} className={n.readAt ? "" : "bg-primary-soft/40"}>
                {n.link ? <Link href={`/notifications/${n.id}`} className="block hover:bg-muted">{body}</Link> : body}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
