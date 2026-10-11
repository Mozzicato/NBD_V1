import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Clock, GraduationCap, Star } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { reportReview } from "@/app/actions/reviews";
import { Avatar, btn, Card, Pill, Rating, timeAgo, VerifiedBadge } from "@/components/ui";

export default async function ProfilePage({ params }: PageProps<"/profile/[id]">) {
  const { id } = await params;
  const [profile, viewer] = await Promise.all([
    db.user.findUnique({
      where: { id },
      include: {
        reviewsGot: { orderBy: { createdAt: "desc" }, take: 20, include: { rater: { select: { id: true, name: true, photoUrl: true } }, job: { select: { title: true } } } },
      },
    }),
    getCurrentUser(),
  ]);
  if (!profile) notFound();
  const isMe = viewer?.id === profile.id;
  const skills = profile.skills.split(",").filter(Boolean);
  const verified = profile.verificationStatus === "verified";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Card className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:text-left">
        <Avatar name={profile.name} url={profile.photoUrl} size={88} />
        <div className="flex-1">
          <h1 className="flex items-center justify-center gap-2 text-2xl font-extrabold sm:justify-start">
            {profile.name} <VerifiedBadge verified={verified} size={22} />
          </h1>
          <p className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground sm:justify-start">
            <span className="inline-flex items-center gap-1"><GraduationCap size={15} aria-hidden /> {profile.faculty ? `${profile.faculty} · ` : ""}{profile.campus}</span>
            <span className="inline-flex items-center gap-1"><Briefcase size={15} aria-hidden /> {profile.jobsCompleted} job{profile.jobsCompleted === 1 ? "" : "s"} completed</span>
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Rating avg={profile.ratingAvg} count={profile.ratingCount} />
            {verified ? <Pill tone="primary">Verified student</Pill> : <Pill>Not verified</Pill>}
          </div>
        </div>
        {isMe && <Link href="/profile/edit" className={btn("secondary")}>Edit profile</Link>}
      </Card>

      <Card className="space-y-4">
        <div>
          <h2 className="font-bold">About</h2>
          <p className="mt-1 whitespace-pre-line text-muted-foreground">{profile.bio || "No bio yet."}</p>
        </div>
        {skills.length > 0 && (
          <div>
            <h2 className="font-bold">Skills</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {skills.map((s) => (
                <li key={s}><Pill tone="primary">{s}</Pill></li>
              ))}
            </ul>
          </div>
        )}
        {profile.availability && (
          <p className="flex items-center gap-2 text-sm"><Clock size={16} className="text-primary" aria-hidden /> <span><strong>Available:</strong> {profile.availability}</span></p>
        )}
      </Card>

      <section>
        <h2 className="mb-3 text-lg font-bold">Reviews</h2>
        {profile.reviewsGot.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet.</p>
        ) : (
          <ul className="space-y-3">
            {profile.reviewsGot.map((r) => (
              <li key={r.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/profile/${r.rater.id}`} className="flex items-center gap-2 font-semibold hover:underline">
                      <Avatar name={r.rater.name} url={r.rater.photoUrl} size={32} /> {r.rater.name}
                    </Link>
                    <span className="inline-flex items-center gap-0.5" aria-label={`${r.score} out of 5 stars`}>
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star key={i} size={14} aria-hidden className={i < r.score ? "fill-amber-400 text-amber-400" : "text-border"} />
                      ))}
                    </span>
                  </div>
                  {r.comment && <p className="mt-2">{r.comment}</p>}
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{r.job.title} · {timeAgo(r.createdAt)}</span>
                    {viewer && !r.reported && viewer.id !== r.raterId && (
                      <form action={reportReview}>
                        <input type="hidden" name="reviewId" value={r.id} />
                        <button type="submit" className="min-h-11 px-2 font-semibold underline hover:text-destructive">Report</button>
                      </form>
                    )}
                    {r.reported && <span>Reported</span>}
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
