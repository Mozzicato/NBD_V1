// Demo data for local development: an admin, a few verified students, and some funded jobs.
// Run with `npm run db:seed`. All demo accounts use the password "password123".
import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.NEON_DATABASE_URL ?? process.env.DATABASE_URL;
if (!connectionString || !connectionString.startsWith("postgres")) {
  throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
}
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const BPS = Number(process.env.COMMISSION_BPS ?? 1000);

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);
  const now = new Date();

  async function user(email: string, name: string, extra: Record<string, unknown> = {}) {
    return db.user.upsert({
      where: { email },
      update: {},
      create: { email, name, passwordHash, consentAt: now, verificationStatus: "verified", schoolEmail: email.endsWith("unilag.edu.ng") ? email : null, ...extra },
    });
  }

  await user("admin@nobrokedayz.com", "Ops Admin", { isAdmin: true, verificationStatus: "verified" });
  const chidinma = await user("chidinma@live.unilag.edu.ng", "Chidinma Okafor", { faculty: "Engineering", bio: "Final-year Systems Eng. Always need things printed yesterday.", skills: "printing,errands" });
  const tobi = await user("tobi@live.unilag.edu.ng", "Tobi Adeyemi", {
    faculty: "Science",
    bio: "200-level Maths. Free most afternoons. Patient tutor, fast typist.",
    skills: "math tutoring,typing,errands",
    availability: "Weekdays after 2pm",
  });
  const sug = await user("sug.social@live.unilag.edu.ng", "SUG Social Committee", { faculty: "Student Union", bio: "Running the best events on campus." });
  await user("amaka@gmail.com", "Amaka Eze", { verificationStatus: "unverified", schoolEmail: null });

  if ((await db.job.count()) > 0) {
    console.log("Jobs already exist, skipping job seed.");
    return;
  }

  const jobs = [
    { poster: chidinma, title: "Print & bind final-year project (3 copies)", category: "errands", locationType: "specific", locationDetail: "Pick up at Jaja Hall, drop at Faculty of Engineering", pay: 3000, slots: 1, desc: "Print my 80-page project (PDF provided), spiral bind 3 copies at the business centre, and drop them at the faculty office. I'll reimburse printing costs separately via transfer to you before you start." },
    { poster: sug, title: "Ushers for Freshers' Night", category: "events", locationType: "specific", locationDetail: "Main Auditorium", pay: 5000, slots: 4, desc: "We need 4 friendly ushers from 5pm to 10pm on Friday to guide guests, check tickets, and help with seating. Dress code: black." },
    { poster: sug, title: "Design an event flyer (IG + print)", category: "design", locationType: "remote", locationDetail: null, pay: 8000, slots: 1, desc: "Design a bold flyer for Freshers' Night in two sizes (1080×1350 for Instagram and A4 for print). Brand colours and copy provided. Two rounds of revisions." },
    { poster: chidinma, title: "MTH 101 tutoring: 2 sessions", category: "tutoring", locationType: "on_campus", locationDetail: "Main library", pay: 4000, slots: 1, desc: "Need help with limits and differentiation before the test next week. Two 1-hour sessions at the main library." },
  ];

  for (const j of jobs) {
    const amount = j.pay * 100;
    const pool = amount * j.slots;
    const commission = Math.round((pool * BPS) / 10_000);
    const reference = `SEED-${Math.random().toString(36).slice(2, 10)}`;
    const job = await db.job.create({
      data: {
        posterId: j.poster.id,
        title: j.title,
        description: j.desc,
        category: j.category,
        locationType: j.locationType,
        locationDetail: j.locationDetail,
        amount,
        commission,
        slots: j.slots,
        neededBy: new Date(Date.now() + 5 * 24 * 3_600_000),
        status: "open",
        fundedAt: now,
      },
    });
    await db.payment.create({ data: { reference, jobId: job.id, userId: j.poster.id, amount: pool + commission, provider: "mock", status: "success", mockOutcome: "success" } });
    await db.escrowTransaction.create({ data: { jobId: job.id, amount: pool, commission, providerRef: reference } });
    const last = await db.walletEntry.findFirst({ where: { userId: j.poster.id }, orderBy: { createdAt: "desc" } });
    await db.walletEntry.create({
      data: { userId: j.poster.id, type: "funding", amount: 0, gross: pool + commission, balanceAfter: last?.balanceAfter ?? 0, ref: reference, jobId: job.id, description: `Funded escrow · ${j.title}` },
    });
  }

  // Tobi has applied to the tutoring job.
  const tutoring = await db.job.findFirst({ where: { category: "tutoring" } });
  if (tutoring) await db.application.create({ data: { jobId: tutoring.id, workerId: tobi.id, note: "I got an A in MTH 101 and I'm free Tue/Thu afternoons." } });

  console.log("Seeded. Log in as admin@nobrokedayz.com / password123 (or any demo student).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
