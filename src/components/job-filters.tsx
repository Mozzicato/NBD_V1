"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, LOCATION_TYPES } from "@/lib/types";

const FILTER_KEYS = ["category", "location", "minPay", "maxPay", "neededBy"] as const;

/** Updates the URL in place; the server re-renders results without a full page reload (PRD F4). */
export function JobFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [open, setOpen] = useState(FILTER_KEYS.some((k) => params.get(k)));
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  useEffect(() => () => clearTimeout(debounce.current), []);

  const activeCount = FILTER_KEYS.filter((k) => params.get(k)).length;

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <label htmlFor="q" className="sr-only">Search jobs</label>
          <Search size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            id="q"
            type="search"
            value={q}
            placeholder="Search tutoring, typing, errands…"
            className="field pl-10"
            onChange={(e) => {
              setQ(e.target.value);
              clearTimeout(debounce.current);
              const v = e.target.value.trim();
              debounce.current = setTimeout(() => update("q", v), 300);
            }}
          />
          {pending && <LoaderCircle size={18} aria-label="Loading results" className="absolute right-3.5 top-1/2 -translate-y-1/2 animate-spin text-primary" />}
        </div>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="job-filters"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border-2 border-border bg-card px-4 font-semibold hover:border-primary"
        >
          <SlidersHorizontal size={18} aria-hidden />
          <span className="hidden sm:inline">Filters</span>
          {activeCount > 0 && <span className="rounded-full bg-primary px-2 text-xs text-on-primary">{activeCount}</span>}
        </button>
      </div>

      {open && (
        <div id="job-filters" className="grid grid-cols-2 gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-5">
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <label htmlFor="f-category" className="text-xs font-semibold">Category</label>
            <select id="f-category" className="field" value={params.get("category") ?? ""} onChange={(e) => update("category", e.target.value)}>
              <option value="">All</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <label htmlFor="f-location" className="text-xs font-semibold">Location</label>
            <select id="f-location" className="field" value={params.get("location") ?? ""} onChange={(e) => update("location", e.target.value)}>
              <option value="">Anywhere</option>
              {LOCATION_TYPES.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="f-min" className="text-xs font-semibold">Min pay (₦)</label>
            <input id="f-min" inputMode="numeric" className="field" defaultValue={params.get("minPay") ?? ""} onBlur={(e) => update("minPay", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="space-y-1">
            <label htmlFor="f-max" className="text-xs font-semibold">Max pay (₦)</label>
            <input id="f-max" inputMode="numeric" className="field" defaultValue={params.get("maxPay") ?? ""} onBlur={(e) => update("maxPay", e.target.value.replace(/\D/g, ""))} />
          </div>
          <div className="col-span-2 space-y-1 sm:col-span-1">
            <label htmlFor="f-date" className="text-xs font-semibold">Needed by</label>
            <input id="f-date" type="date" className="field" value={params.get("neededBy") ?? ""} onChange={(e) => update("neededBy", e.target.value)} />
          </div>
          {activeCount > 0 && (
            <button
              type="button"
              className="col-span-2 inline-flex min-h-11 cursor-pointer items-center justify-center gap-1 text-sm font-semibold text-primary underline sm:col-span-5"
              onClick={() => {
                const next = new URLSearchParams(params.toString());
                FILTER_KEYS.forEach((k) => next.delete(k));
                startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
              }}
            >
              <X size={16} aria-hidden /> Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
