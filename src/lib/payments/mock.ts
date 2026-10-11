import "server-only";
import { db } from "../db";
import type { PaymentProvider } from "./index";

/** Local stand-in for a payment gateway. The /pay/mock/[reference] page lets you choose the outcome. */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async initialize({ reference }) {
    return { authorizationUrl: `/pay/mock/${reference}` };
  },
  async verify(reference) {
    const payment = await db.payment.findUnique({ where: { reference } });
    if (!payment || !payment.mockOutcome) return { status: "pending", amount: 0 };
    return { status: payment.mockOutcome === "success" ? "success" : "failed", amount: payment.amount };
  },
};
