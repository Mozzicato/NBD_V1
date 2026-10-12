import "server-only";
import { db } from "./db";
import { config } from "./config";

export type EmailResult = { ok: true } | { ok: false; error: string };

/**
 * Transactional email. Every message is written to the outbox (viewable at /dev/outbox outside production);
 * if BREVO_API_KEY is set it is also delivered for real.
 *
 * Never throws: background callers (notify) must not be able to break escrow or job flows. Callers where
 * someone is waiting on the message (OTP codes, magic links) check `.ok` and tell them it failed.
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<EmailResult> {
  await db.outboxMessage.create({ data: { channel: "email", to, subject, body } });

  if (!config.brevoApiKey) {
    if (config.isProd) {
      console.error(`[email] BREVO_API_KEY is not set on this deployment; nothing was sent to ${to}.`);
      return { ok: false, error: "Email isn't configured on this deployment." };
    }
    console.log(`[email] to=${to} subject="${subject}"\n${body}\n`);
    return { ok: true };
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": config.brevoApiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ sender: parseSender(config.emailFrom), to: [{ email: to }], subject, textContent: body }),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error(`[email] Brevo refused the message to ${to}: HTTP ${res.status} ${detail}`);
      return { ok: false, error: brevoError(res.status, detail) };
    }
    return { ok: true };
  } catch (err) {
    console.error(`[email] Couldn't reach Brevo for ${to}:`, err);
    return { ok: false, error: "We couldn't reach the email service just now." };
  }
}

/** Turns Brevo's response into something worth showing a student. The full detail is in the server log. */
function brevoError(status: number, detail: string) {
  if (status === 401) return "Email is misconfigured (the API key was rejected).";
  if (/sender/i.test(detail)) return "Email is misconfigured (the sender address isn't verified in Brevo).";
  return "We couldn't send that email just now. Please try again.";
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
