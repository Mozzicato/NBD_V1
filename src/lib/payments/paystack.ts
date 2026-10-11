import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";
import type { PaymentProvider } from "./index";

const API = "https://api.paystack.co";

async function paystack<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(API + path, {
    ...init,
    headers: { Authorization: `Bearer ${config.paystackSecretKey}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  const json = await res.json();
  if (!res.ok || !json.status) throw new Error(`Paystack ${path} failed: ${json.message ?? res.status}`);
  return json.data as T;
}

export const paystackProvider: PaymentProvider = {
  name: "paystack",
  async initialize({ reference, amount, email, callbackUrl }) {
    const data = await paystack<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({ reference, amount, email, callback_url: callbackUrl, currency: "NGN" }),
    });
    return { authorizationUrl: data.authorization_url };
  },
  async verify(reference) {
    const data = await paystack<{ status: string; amount: number }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    const status = data.status === "success" ? "success" : data.status === "failed" || data.status === "abandoned" ? "failed" : "pending";
    return { status, amount: data.amount };
  },
};

export function verifyPaystackSignature(rawBody: string, signature: string | null) {
  if (!signature || !config.paystackSecretKey) return false;
  const expected = createHmac("sha512", config.paystackSecretKey).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
