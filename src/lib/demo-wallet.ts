import "server-only";
import { db } from "@/lib/db";
import { config } from "@/lib/config";
import { postEntry } from "@/lib/escrow";

const NEW_ACCOUNT_DEMO_CREDIT = 100_000 * 100;

/** Give newly created demo accounts a ledger-backed starting balance. */
export async function grantDemoStartingBalance(userId: string) {
  if (!config.demoMode) return;

  await db.$transaction(async (tx) => {
    const ref = `demo_signup_${userId}`;
    const alreadyGranted = await tx.walletEntry.findFirst({ where: { userId, ref } });
    if (alreadyGranted) return;

    await postEntry(tx, {
      userId,
      type: "demo_credit",
      amount: NEW_ACCOUNT_DEMO_CREDIT,
      gross: NEW_ACCOUNT_DEMO_CREDIT,
      ref,
      description: "Demo starting balance",
    });
  });
}
