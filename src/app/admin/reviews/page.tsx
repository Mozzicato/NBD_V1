import Link from "next/link";
import { db } from "@/lib/db";
import { clearReviewReport } from "@/app/actions/admin";
import { btn, Card, EmptyState, PageHeader } from "@/components/ui";

export default async function ReportedReviewsPage() {
  const reviews = await db.review.findMany({
    where: { reported: true },
    orderBy: { createdAt: "desc" },
    include: { rater: { select: { name: true } }, ratee: { select: { id: true, name: true } }, job: { select: { id: true, title: true } } },
  });
  return (
    <div>
      <PageHeader title="Reported reviews" />
      {reviews.length === 0 ? (
        <EmptyState title="No reported reviews" />
      ) : (
        <ul className="space-y-3">
          {reviews.map((r) => (
            <li key={r.id}>
              <Card className="space-y-2 p-4">
                <p className="text-sm text-muted-foreground">
                  {r.rater.name} → <Link href={`/profile/${r.ratee.id}`} className="underline">{r.ratee.name}</Link> on{" "}
                  <Link href={`/jobs/${r.job.id}`} className="underline">{r.job.title}</Link>
                </p>
                <p><strong>{r.score}/5</strong> {r.comment}</p>
                <div className="flex gap-2">
                  <form action={clearReviewReport}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <button type="submit" name="action" value="keep" className={btn("secondary")}>Keep review</button>
                  </form>
                  <form action={clearReviewReport}>
                    <input type="hidden" name="reviewId" value={r.id} />
                    <button type="submit" name="action" value="delete" className={btn("danger")}>Remove review</button>
                  </form>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
