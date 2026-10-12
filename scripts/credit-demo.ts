// One-off demo helper: credit a wallet with fake money for testing the demo flow.
// All money is stored as integer kobo (₦1 = 100 kobo), matching prisma/schema.prisma.
// Usage: npx tsx scripts/credit-demo.ts <email> [naira]
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString || !connectionString.startsWith("postgres")) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = process.argv[2];
const naira = Number(process.argv[3] ?? 1_000_000);

async function main() {
  if (!email) throw new Error("Usage: npx tsx scripts/credit-demo.ts <email> [naira]");
  if (!Number.isFinite(naira) || naira <= 0) throw new Error(`Invalid amount: ${process.argv[3]}`);
  const amount = Math.round(naira * 100); // kobo
  // Fixed ref keeps re-runs from crediting twice.
  const ref = `demo-credit:${email}`;

  const user = await db.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account with email ${email}.`);

  const existing = await db.walletEntry.findFirst({ where: { userId: user.id, ref } });
  if (existing) {
    console.log(`Already credited (ref "${ref}"). Balance is ₦${(existing.balanceAfter / 100).toLocaleString()}. Nothing to do.`);
    return;
  }

  // Mirrors postEntry() in src/lib/escrow.ts: serialize per wallet, then append the running balance.
  const entry = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    const last = await tx.walletEntry.findFirst({ where: { userId: user.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
    const balanceAfter = (last?.balanceAfter ?? 0) + amount;
    return tx.walletEntry.create({
      data: { userId: user.id, type: "topup", amount, gross: amount, balanceAfter, ref, description: "Demo top-up" },
    });
  });

  console.log(`${user.name} <${user.email}>`);
  console.log(`credited  ₦${(amount / 100).toLocaleString()}`);
  console.log(`balance   ₦${(entry.balanceAfter / 100).toLocaleString()}`);
}

main()
  .then(() => db.$disconnect())
  .catch(async (error) => {
    console.error(error instanceof Error ? error.message : error);
    await db.$disconnect();
    process.exit(1);
  });
