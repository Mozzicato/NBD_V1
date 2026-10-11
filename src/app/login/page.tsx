import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { login, sendMagicLink } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Card, Notice } from "@/components/ui";

export const metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNext(sp.next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="mt-2 text-muted-foreground">Log in with your password or get a one-tap link by email.</p>
      </div>
      {sp.error === "link" && <Notice tone="danger">That login link is invalid or has expired. Request a new one below.</Notice>}

      <Card>
        <h2 className="mb-4 font-bold">Log in with password</h2>
        <ActionForm action={login}>
          <input type="hidden" name="next" value={next} />
          <Field label="Email" htmlFor="email">
            <input id="email" name="email" type="email" required autoComplete="email" className="field" />
          </Field>
          <Field label="Password" htmlFor="password">
            <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
          </Field>
          <SubmitButton className="w-full">Log in</SubmitButton>
        </ActionForm>
      </Card>

      <Card>
        <h2 className="mb-1 font-bold">Email me a login link</h2>
        <p className="mb-4 text-sm text-muted-foreground">No password needed. New here? This creates your account.</p>
        <ActionForm action={sendMagicLink}>
          <input type="hidden" name="next" value={next} />
          <Field label="Email" htmlFor="magic-email">
            <input id="magic-email" name="email" type="email" required autoComplete="email" className="field" />
          </Field>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="consent" className="mt-1 size-5 accent-primary" />
            <span>
              If I&apos;m new, I agree to the <Link href="/terms" className="font-semibold text-primary underline">terms</Link> and{" "}
              <Link href="/privacy" className="font-semibold text-primary underline">privacy policy</Link>.
            </span>
          </label>
          <SubmitButton variant="secondary" className="w-full">
            Send login link
          </SubmitButton>
        </ActionForm>
      </Card>

      <p className="text-center text-sm text-muted-foreground">
        New to No Broke Dayz?{" "}
        <Link href="/signup" className="font-semibold text-primary underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
