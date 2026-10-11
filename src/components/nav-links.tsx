"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, ClipboardList, PlusCircle, Search, UserRound, Wallet } from "lucide-react";

const LINKS = [
  { href: "/jobs", label: "Find jobs", icon: Search },
  { href: "/my-jobs", label: "My jobs", icon: ClipboardList },
  { href: "/jobs/new", label: "Post a job", icon: PlusCircle },
  { href: "/wallet", label: "Wallet", icon: Wallet },
];

function isActive(pathname: string, href: string) {
  if (href === "/jobs") return pathname === "/jobs" || (pathname.startsWith("/jobs/") && pathname !== "/jobs/new");
  return pathname === href || pathname.startsWith(href + "/");
}

export function NavLinks({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const links = isAdmin ? [...LINKS, { href: "/admin", label: "Admin", icon: Briefcase }] : LINKS;
  return (
    <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={isActive(pathname, href) ? "page" : undefined}
          className="rounded-lg px-3 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground aria-[current=page]:bg-primary-soft aria-[current=page]:text-primary"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}

/** Bottom tab bar on phones (≤5 items). */
export function MobileTabs() {
  const pathname = usePathname();
  const tabs = [...LINKS.slice(0, 2), { href: "/jobs/new", label: "Post", icon: PlusCircle }, LINKS[3], { href: "/profile", label: "Profile", icon: UserRound }];
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${active ? "text-primary" : "text-muted-foreground"}`}
              >
                <Icon size={22} aria-hidden strokeWidth={active ? 2.5 : 2} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
