import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signup } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Card } from "@/components/ui";

export const metadata = { title: "Sign up" };

export default async function SignupPage() {
  if (await getCurrentUser()) redirect("/jobs");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
      <p className="mt-2 text-muted-foreground">One account to earn and to hire. You&apos;ll verify your student status next.</p>
      <Card className="mt-6">
        <ActionForm action={signup}>
          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" required autoComplete="name" className="field" />
          </Field>
          <Field label="Email" htmlFor="email" hint="Any email works. Your school email is used for verification.">
            <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          </Field>
          <Field label="Password" htmlFor="password" hint="At least 8 characters.">
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="field" />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" required className="mt-1 size-5 accent-primary" />
            <span>
              I agree to the <Link href="/terms" className="font-semibold text-primary underline">terms</Link> and consent to my data being
              processed as described in the <Link href="/privacy" className="font-semibold text-primary underline">privacy policy</Link>.
            </span>
          </label>
          <SubmitButton className="w-full">Create account</SubmitButton>
        </ActionForm>
      </Card>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-primary underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
