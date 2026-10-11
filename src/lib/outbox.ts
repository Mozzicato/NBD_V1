import "server-only";
import { db } from "./db";
import { config } from "./config";

/**
 * Transactional email. Every message is written to the outbox (viewable at /dev/outbox outside production);
 * if BREVO_API_KEY is set it is also delivered for real.
 */
export async function sendEmail(to: string, subject: string, body: string) {
  if (!config.brevoApiKey) {
    if (config.isProd) throw new Error("BREVO_API_KEY is required in production.");
    await db.outboxMessage.create({ data: { channel: "email", to, subject, body } });
    console.log(`[email] to=${to} subject="${subject}"\n${body}\n`);
    return;
  }
  await db.outboxMessage.create({ data: { channel: "email", to, subject, body } });
  const from = parseSender(config.emailFrom);
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": config.brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: from, to: [{ email: to }], subject, textContent: body }),
    });
    if (!res.ok) console.error("[email] send failed", res.status, await res.text());
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

function parseSender(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^<>\s]+)>\s*$/);
  if (!match) return { email: value.trim() };
  return { name: match[1].trim(), email: match[2] };
}

/** SMS is outbox-only until an SMS provider is chosen. */
export async function sendSms(to: string, body: string) {
  await db.outboxMessage.create({ data: { channel: "sms", to, subject: "SMS", body } });
  console.log(`[sms] to=${to}\n${body}\n`);
}
