import Link from "next/link";
import { redirect } from "next/navigation";
import { BadgeCheck, BookOpen, CalendarDays, Package, Palette, PenLine, ShieldCheck, Star, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { btn } from "@/components/ui";

export default async function Home() {
  if (await getCurrentUser()) redirect("/jobs");

  const steps = [
    { icon: BadgeCheck, title: "Verify once", body: "Confirm you're a student with your school email in under a minute." },
    { icon: ShieldCheck, title: "Pay goes into escrow", body: "Posters fund the job before it goes live, so the money is already there." },
    { icon: Wallet, title: "Get paid on completion", body: "The poster confirms, the money lands in your wallet, and you withdraw to your bank." },
  ];
  const categories = [
    { icon: BookOpen, label: "Tutoring" },
    { icon: PenLine, label: "Notes & typing" },
    { icon: Package, label: "Errands" },
    { icon: Palette, label: "Design" },
    { icon: CalendarDays, label: "Event support" },
  ];

  return (
    <div className="space-y-16 sm:space-y-24">
      <section className="pt-4 text-center sm:pt-12">
        <p className="mx-auto inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1 text-sm font-semibold text-accent-strong">
          <ShieldCheck size={16} aria-hidden /> Closed beta at UNILAG
        </p>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
          Campus work that <span className="text-primary">actually pays.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Find small jobs that fit between lectures, or get a hand from a verified student. Every naira is held in escrow until the work is done.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/signup" className={btn("primary", "text-base px-7")}>Start earning</Link>
          <Link href="/signup" className={btn("secondary", "text-base px-7")}>Post a job</Link>
        </div>
        <ul className="mx-auto mt-10 flex max-w-2xl flex-wrap justify-center gap-2">
          {categories.map(({ icon: Icon, label }) => (
            <li key={label} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 py-2 text-sm font-semibold">
              <Icon size={16} className="text-primary" aria-hidden /> {label}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="problem-h" className="rounded-3xl bg-primary px-6 py-10 text-on-primary sm:px-12">
        <h2 id="problem-h" className="text-2xl font-extrabold sm:text-3xl">WhatsApp gigs are a gamble.</h2>
        <p className="mt-3 max-w-2xl text-lg opacity-90">
          Workers do the job and hope to get paid. Posters pay upfront and hope it gets done. No Broke Dayz takes the risk off both sides.
        </p>
      </section>

      <section aria-labelledby="how-h">
        <h2 id="how-h" className="text-center text-2xl font-extrabold sm:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }, i) => (
            <li key={title} className="rounded-2xl border border-border bg-card p-6">
              <span className="grid size-12 place-items-center rounded-2xl bg-primary-soft text-primary"><Icon aria-hidden /></span>
              <p className="mt-4 text-sm font-bold text-muted-foreground">Step {i + 1}</p>
              <h3 className="text-lg font-bold">{title}</h3>
              <p className="mt-1 text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="trust-h" className="grid gap-4 sm:grid-cols-3">
        <h2 id="trust-h" className="sr-only">Why it&apos;s safe</h2>
        {[
          { icon: BadgeCheck, title: "Verified students only", body: "Every poster and worker has verified their student status." },
          { icon: ShieldCheck, title: "Escrow on every job", body: "If something goes wrong, open a dispute and our team steps in." },
          { icon: Star, title: "Two-sided ratings", body: "Reputation follows you, so good work leads to more work." },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-2xl bg-accent-soft p-6">
            <Icon className="text-accent-strong" aria-hidden />
            <h3 className="mt-3 font-bold">{title}</h3>
            <p className="mt-1 text-sm">{body}</p>
          </div>
        ))}
      </section>

      <section className="text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl">No more broke days.</h2>
        <p className="mt-2 text-muted-foreground">Free to join. Posters pay a 10% fee on top; workers keep 100% of the listed pay.</p>
        <Link href="/signup" className={btn("accent", "mt-6 px-8 text-base")}>Create your free account</Link>
      </section>

      <footer className="flex flex-wrap justify-center gap-4 border-t border-border pt-6 text-sm text-muted-foreground">
        <Link href="/privacy" className="underline">Privacy</Link>
        <Link href="/terms" className="underline">Terms</Link>
        <span>© {new Date().getFullYear()} No Broke Dayz</span>
      </footer>
    </div>
  );
}
