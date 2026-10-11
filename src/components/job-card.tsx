import Link from "next/link";
import { CalendarClock, MapPin, Users } from "lucide-react";
import { formatNaira } from "@/lib/money";
import { categoryLabel, locationLabel } from "@/lib/types";
import { EscrowBadge, Pill, timeAgo, VerifiedBadge } from "./ui";

export type JobCardData = {
  id: string;
  title: string;
  amount: number;
  category: string;
  locationType: string;
  locationDetail: string | null;
  slots: number;
  neededBy: Date | null;
  createdAt: Date;
  poster: { name: string; verificationStatus: string };
};

export function JobCard({ job }: { job: JobCardData }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block rounded-2xl border border-border bg-card p-5 transition-colors duration-200 hover:border-primary focus-visible:border-primary"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Pill tone="primary">{categoryLabel(job.category)}</Pill>
          <h3 className="mt-2 text-lg font-bold leading-snug group-hover:text-primary">{job.title}</h3>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xl font-extrabold text-accent-strong">{formatNaira(job.amount)}</p>
          {job.slots > 1 && <p className="text-xs text-muted-foreground">per person</p>}
        </div>
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <li className="inline-flex items-center gap-1"><MapPin size={15} aria-hidden /> {locationLabel(job.locationType, job.locationDetail)}</li>
        {job.neededBy && (
          <li className="inline-flex items-center gap-1"><CalendarClock size={15} aria-hidden /> By {job.neededBy.toLocaleDateString("en-NG", { day: "numeric", month: "short" })}</li>
        )}
        {job.slots > 1 && <li className="inline-flex items-center gap-1"><Users size={15} aria-hidden /> {job.slots} people</li>}
      </ul>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
        <span className="inline-flex items-center gap-1 text-sm">
          <span className="font-semibold">{job.poster.name}</span>
          <VerifiedBadge verified={job.poster.verificationStatus === "verified"} />
          <span className="text-muted-foreground">· {timeAgo(job.createdAt)}</span>
        </span>
        <EscrowBadge />
      </div>
    </Link>
  );
}
