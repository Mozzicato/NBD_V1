import { PageHeader } from "@/components/ui";

export const metadata = { title: "Privacy policy" };

// Draft for the beta. Have it reviewed against the NDPA 2023 before launch.
export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-2xl space-y-5 leading-relaxed">
      <PageHeader title="Privacy policy" subtitle="Draft for the closed beta" />
      <section>
        <h2 className="text-lg font-bold">What we collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Account details: name, email, password (hashed, never stored in plain text).</li>
          <li>Verification: your school email, or a photo of your student ID if you choose that route.</li>
          <li>Profile details you choose to add: photo, faculty, bio, skills, availability.</li>
          <li>For payouts: phone number and bank account details.</li>
          <li>Activity on the platform: jobs, applications, messages, ratings, transactions.</li>
        </ul>
        <p className="mt-2">Card details are handled entirely by our payment partner and never reach our servers.</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Why we use it</h2>
        <p className="mt-2">To verify you&apos;re a student, run the marketplace, hold and release escrow payments, prevent fraud, resolve disputes, and improve the service. We don&apos;t sell your data.</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Student ID images</h2>
        <p className="mt-2">ID images are stored in restricted storage that only our verification team can access, and are permanently deleted as soon as they&apos;ve been reviewed. We keep only the outcome (approved or rejected).</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Who can see what</h2>
        <p className="mt-2">Your public profile (name, photo, faculty, bio, skills, ratings, jobs completed) is visible to signed-in users. Your email, phone and bank details are never shown to other users.</p>
      </section>
      <section>
        <h2 className="text-lg font-bold">Your rights</h2>
        <p className="mt-2">Under the Nigeria Data Protection Act 2023 you can ask to access, correct or delete your data, or withdraw consent. Email privacy@nobrokedayz.com and we&apos;ll respond within 30 days. Some transaction records must be kept for legal and accounting reasons.</p>
      </section>
    </article>
  );
}
