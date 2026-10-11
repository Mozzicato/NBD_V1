export const config = {
  appUrl: process.env.APP_URL ?? "http://localhost:3000",
  commissionBps: Number(process.env.COMMISSION_BPS ?? 1000),
  autoReleaseHours: Number(process.env.AUTO_RELEASE_HOURS ?? 72),
  schoolEmailDomains: (process.env.SCHOOL_EMAIL_DOMAINS ?? "live.unilag.edu.ng,unilag.edu.ng")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean),
  paystackSecretKey: process.env.PAYSTACK_SECRET_KEY ?? "",
  demoMode: process.env.DEMO_MODE === "true",
  cronSecret: process.env.CRON_SECRET ?? "",
  brevoApiKey: process.env.BREVO_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "No Broke Dayz <hello@nobrokedayz.com>",
  blobReadWriteToken: process.env.BLOB_READ_WRITE_TOKEN ?? "",
  isProd: process.env.NODE_ENV === "production",
};
