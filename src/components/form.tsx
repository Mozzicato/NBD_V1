"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { btn } from "./ui";
import type { ActionState } from "@/lib/action-state";

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;

/** Form bound to a server action, with inline success/error feedback. */
export function ActionForm({
  action,
  children,
  className = "space-y-4",
  resetOnSuccess = false,
}: {
  action: Action;
  children: React.ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state?.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      <div aria-live="polite">
        {state?.error && <p className="rounded-xl bg-destructive-soft p-3 text-sm font-medium text-destructive">{state.error}</p>}
        {state?.ok && <p className="rounded-xl bg-accent-soft p-3 text-sm font-medium text-accent-strong">{state.ok}</p>}
      </div>
    </form>
  );
}

export function SubmitButton({
  children,
  variant = "primary",
  className = "",
  name,
  value,
  confirm,
}: {
  children: React.ReactNode;
  variant?: Parameters<typeof btn>[0];
  className?: string;
  name?: string;
  value?: string;
  confirm?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending}
      aria-busy={pending}
      className={btn(variant, className)}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending && <LoaderCircle size={18} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({ label, hint, children, htmlFor }: { label: string; hint?: string; children: React.ReactNode; htmlFor: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
