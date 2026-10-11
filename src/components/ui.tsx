import Link from "next/link";
import { BadgeCheck, ShieldCheck, Star } from "lucide-react";
import { JOB_STATUS_LABEL, type JobStatus } from "@/lib/types";

type Variant = "primary" | "accent" | "secondary" | "ghost" | "danger";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-on-primary hover:bg-primary-strong",
  accent: "bg-accent text-on-accent hover:bg-accent-strong",
  secondary: "bg-card text-foreground border-2 border-border hover:border-primary",
  ghost: "text-primary hover:bg-primary-soft",
  danger: "bg-card text-destructive border-2 border-destructive/40 hover:bg-destructive-soft",
};

export function btn(variant: Variant = "primary", extra = "") {
  return `inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[15px] font-semibold transition-colors duration-200 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${extra}`;
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</div>;
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

const STATUS_STYLE: Record<JobStatus, string> = {
  awaiting_payment: "bg-warning-soft text-warning",
  open: "bg-accent-soft text-accent-strong",
  assigned: "bg-primary-soft text-primary",
  in_progress: "bg-primary-soft text-primary",
  submitted: "bg-warning-soft text-warning",
  completed: "bg-accent-soft text-accent-strong",
  cancelled: "bg-muted text-muted-foreground",
  disputed: "bg-destructive-soft text-destructive",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as JobStatus;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s] ?? "bg-muted"}`}>
      {JOB_STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: React.ReactNode;
  tone?: "muted" | "primary" | "accent" | "warning" | "danger";
}) {
  const tones = {
    muted: "bg-muted text-muted-foreground",
    primary: "bg-primary-soft text-primary",
    accent: "bg-accent-soft text-accent-strong",
    warning: "bg-warning-soft text-warning",
    danger: "bg-destructive-soft text-destructive",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

export function VerifiedBadge({ verified, size = 16 }: { verified: boolean; size?: number }) {
  if (!verified) return null;
  return (
    <span className="inline-flex items-center text-primary" title="Verified student">
      <BadgeCheck size={size} aria-hidden />
      <span className="sr-only">Verified student</span>
    </span>
  );
}

export function EscrowBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent-strong">
      <ShieldCheck size={14} aria-hidden /> Escrow protected
    </span>
  );
}

export function Rating({ avg, count }: { avg: number; count: number }) {
  if (!count) return <span className="text-sm text-muted-foreground">No ratings yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold">
      <Star size={15} className="fill-amber-400 text-amber-400" aria-hidden />
      {avg.toFixed(1)}
      <span className="font-normal text-muted-foreground">({count})</span>
    </span>
  );
}

export function Avatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-bold text-on-primary"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </span>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: { href: string; label: string } }) {
  return (
    <div className="rounded-2xl border-2 border-dashed border-border p-8 text-center">
      <p className="font-bold">{title}</p>
      {body && <p className="mt-1 text-muted-foreground">{body}</p>}
      {action && (
        <Link href={action.href} className={btn("primary", "mt-4")}>
          {action.label}
        </Link>
      )}
    </div>
  );
}

export function Notice({ tone = "primary", children }: { tone?: "primary" | "warning" | "danger" | "accent"; children: React.ReactNode }) {
  const tones = {
    primary: "bg-primary-soft border-primary/30",
    warning: "bg-warning-soft border-warning/30",
    danger: "bg-destructive-soft border-destructive/30",
    accent: "bg-accent-soft border-accent/30",
  };
  return <div className={`rounded-xl border p-4 text-sm ${tones[tone]}`}>{children}</div>;
}

export function timeAgo(date: Date) {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return date.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
