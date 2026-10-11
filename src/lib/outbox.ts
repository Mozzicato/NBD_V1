import "server-only";
import { db } from "./db";
import { config } from "./config";

/**
 * Transactional email. Every message is written to the outbox (viewable at /dev/outbox outside production);
 * if RESEND_API_KEY is set it is also delivered for real.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  if (!config.resendApiKey) {
    if (config.isProd) throw new Error("RESEND_API_KEY is required in production.");
    await db.outboxMessage.create({ data: { channel: "email", to, subject, body } });
    console.log(`[email] to=${to} subject="${subject}"\n${body}\n`);
    return;
  }
  await db.outboxMessage.create({ data: { channel: "email", to, subject, body } });
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${config.resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: config.emailFrom, to, subject, text: body }),
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text());
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

/** SMS is outbox-only until an SMS provider is chosen. */
export async function sendSms(to: string, body: string) {
  await db.outboxMessage.create({ data: { channel: "sms", to, subject: "SMS", body } });
  console.log(`[sms] to=${to}\n${body}\n`);
}
