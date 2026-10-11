import Link from "next/link";
import { Bell } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { Avatar, btn } from "./ui";
import { NavLinks, MobileTabs } from "./nav-links";
import { Logo } from "./logo";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const unread = user ? await db.notification.count({ where: { userId: user.id, readAt: null } }) : 0;

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link href={user ? "/jobs" : "/"} className="flex items-center gap-2" aria-label="No Broke Dayz home">
          <Logo />
        </Link>
        {user && <NavLinks isAdmin={user.isAdmin} />}
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/notifications"
                className="relative inline-flex size-11 items-center justify-center rounded-xl hover:bg-primary-soft"
                aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
              >
                <Bell size={22} aria-hidden />
                {unread > 0 && (
                  <span className="absolute right-1.5 top-1.5 min-w-5 rounded-full bg-destructive px-1 text-center text-[11px] font-bold leading-5 text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
              <Link href="/profile" className="hidden rounded-full md:inline-flex" aria-label="Your profile">
                <Avatar name={user.name} url={user.photoUrl} size={36} />
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className={btn("ghost", "whitespace-nowrap px-3")}>
                Log in
              </Link>
              <Link href="/signup" className={btn("primary", "whitespace-nowrap px-4")}>
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export async function BottomNav() {
  const user = await getCurrentUser();
  if (!user) return null;
  return <MobileTabs />;
}
