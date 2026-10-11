// All amounts are integer kobo. ₦1 = 100 kobo.

export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function formatNaira(kobo: number): string {
  const naira = kobo / 100;
  return "₦" + naira.toLocaleString("en-NG", { minimumFractionDigits: naira % 1 ? 2 : 0, maximumFractionDigits: 2 });
}

export function commissionOn(kobo: number, bps: number): number {
  return Math.round((kobo * bps) / 10_000);
}

/** Funding breakdown for a job. Commission is added on top, so workers receive the full listed pay. */
export function fundingBreakdown(amountPerSlot: number, slots: number, bps: number) {
  const workerPool = amountPerSlot * slots;
  const commission = commissionOn(workerPool, bps);
  return { workerPool, commission, total: workerPool + commission };
}
