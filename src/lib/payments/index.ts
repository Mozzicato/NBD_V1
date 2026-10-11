import "server-only";
import { config } from "../config";
import { mockProvider } from "./mock";
import { paystackProvider } from "./paystack";

export type VerifyResult = { status: "success" | "failed" | "pending"; amount: number };

export interface PaymentProvider {
  name: "mock" | "paystack";
  /** Start a collection; returns the URL to send the payer to. */
  initialize(opts: { reference: string; amount: number; email: string; callbackUrl: string }): Promise<{ authorizationUrl: string }>;
  /** Ask the provider for the authoritative outcome of a reference. */
  verify(reference: string): Promise<VerifyResult>;
}

export function getPaymentProvider(): PaymentProvider {
  if (config.isProd && !config.paystackSecretKey) {
    throw new Error("PAYSTACK_SECRET_KEY is required in production.");
  }
  return config.paystackSecretKey ? paystackProvider : mockProvider;
}
