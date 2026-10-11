export const JOB_STATUSES = [
  "awaiting_payment",
  "open",
  "assigned",
  "in_progress",
  "submitted",
  "completed",
  "cancelled",
  "disputed",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  awaiting_payment: "Awaiting payment",
  open: "Open",
  assigned: "Assigned",
  in_progress: "In progress",
  submitted: "Submitted",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export const CATEGORIES = [
  { id: "tutoring", label: "Tutoring" },
  { id: "notes", label: "Notes & typing" },
  { id: "errands", label: "Errands & delivery" },
  { id: "design", label: "Design & creative" },
  { id: "events", label: "Event support" },
  { id: "tech", label: "Tech & digital" },
  { id: "research", label: "Research assistance" },
  { id: "other", label: "Other" },
] as const;
export type Category = (typeof CATEGORIES)[number]["id"];

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export const LOCATION_TYPES = [
  { id: "on_campus", label: "On campus" },
  { id: "remote", label: "Remote" },
  { id: "specific", label: "Specific location" },
] as const;
export type LocationType = (typeof LOCATION_TYPES)[number]["id"];

export function locationLabel(type: string, detail?: string | null) {
  const base = LOCATION_TYPES.find((l) => l.id === type)?.label ?? type;
  return detail ? `${base} · ${detail}` : base;
}

export type VerificationStatus = "unverified" | "pending" | "verified" | "rejected";
