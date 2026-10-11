import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [verifs, disputes, withdrawals, reports] = await Promise.all([
    db.verificationRequest.count({ where: { status: "pending" } }),
    db.dispute.count({ where: { status: "open" } }),
    db.withdrawal.count({ where: { status: "pending" } }),
    db.review.count({ where: { reported: true } }),
  ]);
  const links = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/verifications", label: "Verifications", count: verifs },
    { href: "/admin/jobs", label: "Jobs & escrow" },
    { href: "/admin/disputes", label: "Disputes", count: disputes },
    { href: "/admin/withdrawals", label: "Withdrawals", count: withdrawals },
    { href: "/admin/reviews", label: "Reported reviews", count: reports },
  ];
  return (
    <div>
      <p className="mb-2 text-xs font-bold uppercase tracking-widest text-primary">Ops console</p>
      <nav aria-label="Admin" className="-mx-4 mb-6 overflow-x-auto px-4">
        <ul className="flex gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="inline-flex min-h-11 items-center gap-2 whitespace-nowrap rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:border-primary">
                {l.label}
                {l.count ? <span className="rounded-full bg-destructive px-2 text-xs text-white">{l.count}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      {children}
    </div>
  );
}
