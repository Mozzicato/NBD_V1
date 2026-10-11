import "server-only";
import { db } from "./db";
import { config } from "./config";
import { sendEmail } from "./outbox";

/** In-app notification + email (PRD F9). */
export async function notify(userId: string, n: { type: string; title: string; body: string; link?: string }) {
  await db.notification.create({ data: { userId, ...n } });
  const user = await db.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (user) {
    const link = n.link ? `\n\nOpen: ${config.appUrl}${n.link}` : "";
    await sendEmail(user.email, n.title, `${n.body}${link}\n\n— No Broke Dayz`);
  }
}

/** Analytics event stream (PRD §11). Never throws. */
export async function track(name: string, userId?: string | null, props: Record<string, unknown> = {}) {
  try {
    await db.event.create({ data: { name, userId: userId ?? null, props: JSON.stringify(props) } });
  } catch (err) {
    console.error("[track] failed", name, err);
  }
}
