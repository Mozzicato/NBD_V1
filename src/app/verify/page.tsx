import Link from "next/link";
import { BadgeCheck, Clock, IdCard, Mail } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { confirmSchoolCode, demoVerify, sendSchoolCode, submitIdCard } from "@/app/actions/verify";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { btn, Card, Notice } from "@/components/ui";

export const metadata = { title: "Verify student status" };

export default async function VerifyPage({ searchParams }: PageProps<"/verify">) {
  const user = await requireUser("/verify");
  const sp = await searchParams;
  const sentTo = typeof sp.email === "string" ? sp.email : null;

  if (user.verificationStatus === "verified") {
    return (
      <div className="mx-auto max-w-md text-center">
        <BadgeCheck size={56} className="mx-auto text-primary" aria-hidden />
        <h1 className="mt-4 text-3xl font-extrabold">You&apos;re verified</h1>
        <p className="mt-2 text-muted-foreground">Your badge shows on your profile, jobs and applications.</p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/jobs" className={btn("primary")}>Find jobs</Link>
          <Link href="/jobs/new" className={btn("secondary")}>Post a job</Link>
        </div>
      </div>
    );
  }

  const lastRequest = await db.verificationRequest.findFirst({
    where: { userId: user.id, method: "id_card" },
    orderBy: { createdAt: "desc" },
  });
  const domains = config.schoolEmailDomains.map((d) => "@" + d).join(" or ");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Verify you&apos;re a student</h1>
        <p className="mt-2 text-muted-foreground">
          Every worker and poster is a verified student. That&apos;s what keeps the marketplace trustworthy. You&apos;ll need this before you can apply for or post jobs.
        </p>
      </div>

      {config.demoMode && (
        <Card className="border-2 border-warning/40">
          <h2 className="font-bold">Demo mode</h2>
          <p className="mt-1 text-sm text-muted-foreground">Student verification is switched off for this demo. Continue to start posting and applying for jobs.</p>
          <form action={demoVerify} className="mt-4">
            <SubmitButton variant="accent" className="w-full">Continue without verification</SubmitButton>
          </form>
        </Card>
      )}

      {user.verificationStatus === "pending" && (
        <Notice tone="warning">
          <p className="flex items-center gap-2 font-semibold"><Clock size={16} aria-hidden /> Your student ID is being reviewed</p>
          <p className="mt-1">We&apos;ll email you when it&apos;s done. You can still verify instantly with your school email below.</p>
        </Notice>
      )}
      {user.verificationStatus === "rejected" && (
        <Notice tone="danger">
          <p className="font-semibold">We couldn&apos;t verify your last ID upload</p>
          {lastRequest?.note && <p className="mt-1">Reason: {lastRequest.note}</p>}
          <p className="mt-1">Try your school email, or upload a clearer photo.</p>
        </Notice>
      )}

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><Mail size={20} aria-hidden /></span>
          <div>
            <h2 className="font-bold">School email <span className="ml-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-strong">Instant</span></h2>
            <p className="text-sm text-muted-foreground">We&apos;ll send a 6-digit code to your {domains} address.</p>
          </div>
        </div>
        {sentTo ? (
          <ActionForm action={confirmSchoolCode}>
            <input type="hidden" name="schoolEmail" value={sentTo} />
            <p className="text-sm">Code sent to <strong>{sentTo}</strong>.</p>
            <Field label="Verification code" htmlFor="code">
              <input id="code" name="code" inputMode="numeric" pattern="\d{6}" maxLength={6} required autoComplete="one-time-code" className="field text-center text-2xl tracking-[0.5em]" />
            </Field>
            <SubmitButton className="w-full">Verify</SubmitButton>
            <Link href="/verify" className="block text-center text-sm font-semibold text-primary underline">Use a different email or resend</Link>
          </ActionForm>
        ) : (
          <ActionForm action={sendSchoolCode}>
            <Field label="School email" htmlFor="schoolEmail">
              <input id="schoolEmail" name="schoolEmail" type="email" required placeholder={`matricno${config.schoolEmailDomains[0] ? "@" + config.schoolEmailDomains[0] : ""}`} defaultValue={config.schoolEmailDomains.some((d) => user.email.endsWith("@" + d)) ? user.email : ""} className="field" />
            </Field>
            <SubmitButton className="w-full">Send code</SubmitButton>
          </ActionForm>
        )}
      </Card>

      <Card>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><IdCard size={20} aria-hidden /></span>
          <div>
            <h2 className="font-bold">No school email? Upload your student ID</h2>
            <p className="text-sm text-muted-foreground">Our team reviews it by hand. The image is deleted once it&apos;s been reviewed.</p>
          </div>
        </div>
        <ActionForm action={submitIdCard}>
          <Field label="Faculty" htmlFor="faculty">
            <input id="faculty" name="faculty" defaultValue={user.faculty ?? ""} className="field" placeholder="e.g. Engineering" />
          </Field>
          <Field label="Photo of your student ID card" htmlFor="idCard" hint="JPG, PNG, WEBP or PDF, up to 5MB. Make sure your name and matric number are readable.">
            <input id="idCard" name="idCard" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required className="field file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-1.5 file:font-semibold file:text-primary" />
          </Field>
          <SubmitButton variant="secondary" className="w-full">Submit for review</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
