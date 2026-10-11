import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { updateProfile } from "@/app/actions/profile";
import { logout } from "@/app/actions/auth";
import { ActionForm, Field, SubmitButton } from "@/components/form";
import { Avatar, btn, Card, Notice, PageHeader } from "@/components/ui";

export const metadata = { title: "Edit profile" };

export default async function EditProfilePage({ searchParams }: PageProps<"/profile/edit">) {
  const user = await requireUser("/profile/edit");
  const { welcome } = await searchParams;

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Edit profile"
        subtitle="This is what posters see when you apply."
        action={<Link href={`/profile/${user.id}`} className={btn("secondary")}>View public profile</Link>}
      />
      {welcome && (
        <div className="mb-6">
          <Notice tone="accent">
            <strong>You&apos;re verified!</strong> Add your skills and availability so posters can pick you with confidence.
          </Notice>
        </div>
      )}
      <Card>
        <ActionForm action={updateProfile}>
          <div className="flex items-center gap-4">
            <Avatar name={user.name} url={user.photoUrl} size={64} />
            <Field label="Profile photo" htmlFor="photo" hint="Optional. JPG, PNG or WEBP up to 5MB.">
              <input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" className="text-sm file:mr-3 file:min-h-11 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:font-semibold file:text-primary" />
            </Field>
          </div>
          <Field label="Full name" htmlFor="name">
            <input id="name" name="name" defaultValue={user.name} required className="field" autoComplete="name" />
          </Field>
          <Field label="Faculty / department" htmlFor="faculty">
            <input id="faculty" name="faculty" defaultValue={user.faculty ?? ""} className="field" placeholder="e.g. Engineering, Mass Comm" />
          </Field>
          <Field label="Short bio" htmlFor="bio" hint="Up to 400 characters.">
            <textarea id="bio" name="bio" defaultValue={user.bio ?? ""} rows={3} maxLength={400} className="field" placeholder="What are you good at? What kind of work do you want?" />
          </Field>
          <Field label="Skills" htmlFor="skills" hint="Comma-separated, e.g. math tutoring, canva, typing, errands">
            <input id="skills" name="skills" defaultValue={user.skills.split(",").filter(Boolean).join(", ")} className="field" />
          </Field>
          <Field label="Availability" htmlFor="availability" hint="When are you usually free?">
            <input id="availability" name="availability" defaultValue={user.availability ?? ""} className="field" placeholder="e.g. Weekdays after 2pm, Saturdays" />
          </Field>
          <SubmitButton className="w-full">Save profile</SubmitButton>
        </ActionForm>
      </Card>
      <form action={logout} className="mt-6">
        <button type="submit" className={btn("danger", "w-full")}>Log out</button>
      </form>
    </div>
  );
}
