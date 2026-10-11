import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { Card, PageHeader, Pill, timeAgo } from "@/components/ui";

export const metadata = { title: "Dev outbox" };

/** Development-only view of every email/SMS the app "sent" (OTP codes, magic links, notifications). */
export default async function OutboxPage() {
  if (config.isProd) notFound();
  const messages = await db.outboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 40 });
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Dev outbox" subtitle="Emails and SMS sent by the app. Disabled in production." />
      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m.id}>
            <Card className="p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Pill tone={m.channel === "sms" ? "accent" : "primary"}>{m.channel}</Pill>
                <span className="font-semibold">{m.to}</span>
                <span className="text-muted-foreground">· {timeAgo(m.createdAt)}</span>
              </div>
              {m.channel === "email" && <p className="mt-2 font-bold">{m.subject}</p>}
              <pre className="mt-1 whitespace-pre-wrap break-words font-sans text-sm">{linkify(m.body)}</pre>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}

function linkify(text: string) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? <a key={i} href={part} className="font-semibold text-primary underline">{part}</a> : part,
  );
}
