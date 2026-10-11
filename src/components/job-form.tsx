"use client";

import { useState } from "react";
import { createJob } from "@/app/actions/jobs";
import { fundingBreakdown, formatNaira, nairaToKobo } from "@/lib/money";
import { CATEGORIES, LOCATION_TYPES } from "@/lib/types";
import { ActionForm, Field, SubmitButton } from "./form";

export function JobForm({ commissionBps }: { commissionBps: number }) {
  const [pay, setPay] = useState("");
  const [slots, setSlots] = useState("1");
  const [locationType, setLocationType] = useState("on_campus");
  const payKobo = nairaToKobo(Number(pay.replace(/[^\d]/g, "")) || 0);
  const b = fundingBreakdown(payKobo, Math.max(1, Number(slots) || 1), commissionBps);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <ActionForm action={createJob} className="space-y-5">
      <Field label="Job title" htmlFor="title" hint="e.g. Print & bind final-year project (3 copies)">
        <input id="title" name="title" required minLength={5} maxLength={90} className="field" />
      </Field>
      <Field label="Description" htmlFor="description" hint="What needs doing, what “done” looks like, and anything the worker should bring.">
        <textarea id="description" name="description" required minLength={20} maxLength={2000} rows={5} className="field" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Category" htmlFor="category">
          <select id="category" name="category" required className="field" defaultValue="">
            <option value="" disabled>Choose a category</option>
            {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </Field>
        <Field label="Needed by" htmlFor="neededBy" hint="Optional">
          <input id="neededBy" name="neededBy" type="date" min={today} className="field" />
        </Field>
      </div>
      <fieldset className="space-y-2">
        <legend className="text-sm font-semibold">Where does the work happen?</legend>
        <div className="grid grid-cols-3 gap-2">
          {LOCATION_TYPES.map((l) => (
            <label key={l.id} className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border-2 border-border bg-card px-2 text-center text-sm font-semibold has-checked:border-primary has-checked:bg-primary-soft has-checked:text-primary">
              <input type="radio" name="locationType" value={l.id} checked={locationType === l.id} onChange={() => setLocationType(l.id)} className="sr-only" />
              {l.label}
            </label>
          ))}
        </div>
        {locationType !== "remote" && (
          <input name="locationDetail" aria-label="Location details" required={locationType === "specific"} maxLength={120} className="field" placeholder={locationType === "specific" ? "e.g. Jaja Hall, Room B12" : "Optional, e.g. Faculty of Arts"} />
        )}
      </fieldset>
      <div className="grid grid-cols-2 gap-5">
        <Field label="Pay per person (₦)" htmlFor="pay" hint="Min ₦200">
          <input id="pay" name="pay" inputMode="numeric" required value={pay} onChange={(e) => setPay(e.target.value)} className="field text-lg font-bold" placeholder="3000" />
        </Field>
        <Field label="People needed" htmlFor="slots">
          <input id="slots" name="slots" type="number" min={1} max={20} required value={slots} onChange={(e) => setSlots(e.target.value)} className="field" />
        </Field>
      </div>

      <div className="rounded-2xl border-2 border-primary/30 bg-primary-soft p-4" aria-live="polite">
        <h2 className="mb-2 font-bold">What you&apos;ll pay into escrow</h2>
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between"><dt>Worker payout{Number(slots) > 1 ? ` (${slots} × ${formatNaira(payKobo)})` : ""}</dt><dd className="font-semibold">{formatNaira(b.workerPool)}</dd></div>
          <div className="flex justify-between"><dt>Platform commission ({commissionBps / 100}%)</dt><dd className="font-semibold">{formatNaira(b.commission)}</dd></div>
          <div className="flex justify-between border-t border-primary/30 pt-2 text-base"><dt className="font-bold">Total charged</dt><dd className="font-extrabold">{formatNaira(b.total)}</dd></div>
        </dl>
        <p className="mt-2 text-xs text-muted-foreground">Held safely until you confirm the work is done. Cancel before work starts for a full refund.</p>
      </div>

      <SubmitButton className="w-full">Continue to payment</SubmitButton>
    </ActionForm>
  );
}
