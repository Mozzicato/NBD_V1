# No Broke Dayz: Web MVP

A campus micro-job marketplace with student verification and escrow-backed payments. Built from [prd.md](prd.md).

**Stack:** Next.js 16 (App Router, server actions) · TypeScript · Tailwind CSS v4 · Prisma 7 with Postgres · Zod · Lucide icons.

## Getting started

```bash
npm install            # also generates the Prisma client
npx prisma migrate deploy
npm run db:seed        # demo users + funded jobs
npm run dev            # http://localhost:3000
```

Demo accounts (password `password123`):

| Email | Role |
|---|---|
| `admin@nobrokedayz.com` | Ops admin (`/admin`) |
| `chidinma@live.unilag.edu.ng` | Verified student, poster |
| `tobi@live.unilag.edu.ng` | Verified student, worker |
| `sug.social@live.unilag.edu.ng` | Verified student org |
| `amaka@gmail.com` | Unverified user |

**No real email, SMS or money in dev.** OTP codes, magic links and notification emails appear at **`/dev/outbox`**. Payments use a mock checkout that lets you simulate success or failure.

## What's built

| PRD | Feature | Where |
|---|---|---|
| F1 | Email + password and magic-link auth; school-email OTP verification against an allow-list; student-ID upload fallback with manual review; phone OTP | `/signup`, `/login`, `/verify`, `/wallet` |
| F2 | Profiles: photo, faculty, bio, skills, availability, badge, rating, jobs completed | `/profile/[id]`, `/profile/edit` |
| F3 | Job posting with live payout/commission/total breakdown, then escrow funding. Jobs stay hidden until funded; failed payment returns to draft with retry | `/jobs/new`, `/jobs/[id]/fund` |
| F4 | Feed of open, funded jobs; keyword search plus category/location/pay/date filters without page reloads | `/jobs` |
| F5 | Apply → accept (multi-slot supported) → start → submit → confirm, with "next step" guidance for each role | `/jobs/[id]`, `/my-jobs` |
| F6 | Confirm releases exact pay to workers and 10% to the platform; 72h auto-release (blocked by disputes) | `src/lib/escrow.ts` |
| F7 | Two-sided 1–5 ratings after completion; no editing; reportable | `/jobs/[id]`, `/profile/[id]` |
| F8 | Wallet: available/incoming/held balances, history, OTP-gated withdrawals to a bank | `/wallet` |
| F9 | In-app + email notifications for every lifecycle event | `/notifications` |
| F10 | Disputes with reason + evidence that freeze auto-release; ops resolves as release/refund/split | `/jobs/[id]`, `/admin/disputes` |
| F11 | Minimal per-job coordination thread | `/jobs/[id]` |
| F12 | Ops console: §3.3 metrics, ID queue, jobs + escrow ledger, manual settle, disputes, withdrawals, reported reviews | `/admin` |

Also: PWA manifest, privacy/terms drafts, and an analytics event stream (`Event` table) feeding the admin metrics.

## How money works

- All amounts are integer **kobo**.
- **Commission is added on top**: the poster pays `pay × people + 10%` and workers receive the full listed pay. Change the rate with `COMMISSION_BPS`. (This settles the PRD §13 open question; easy to revisit.)
- `EscrowTransaction` (one per job) is the source of truth. `WalletEntry` is an append-only ledger with running balances; `userId = null` is the platform's commission account.
- Every settlement (confirm, auto-release, cancel, dispute, ops override) goes through **`settleEscrow()`**. It runs a compare-and-set on `state = funded`, so it can't pay out twice. It also maintains `workerReleased + commissionCaptured + posterRefunded = amount + commission`.
- Funding is confirmed by re-verifying with the provider (`confirmFunding()`). This is idempotent across the redirect callback and the webhook.

`npm run test:escrow` runs integration tests for all of this against a throwaway DB.

## Configuration (`.env`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Neon/Postgres pooled connection URL used by the app |
| `DIRECT_DATABASE_URL` | Neon direct (non-pooled) URL used only to apply migrations |
| `APP_URL` | Absolute URL used in emails and payment callbacks |
| `COMMISSION_BPS` | Commission in basis points (1000 = 10%) |
| `AUTO_RELEASE_HOURS` | Auto-release window after "Submitted" (default 72) |
| `SCHOOL_EMAIL_DOMAINS` | Comma-separated allow-list for instant verification |
| `DEMO_MODE` | Set to `true` only for fake-money demos; forces mock checkout, gives each new account ₦100,000 in demo funds, and disables withdrawals |
| `PAYSTACK_SECRET_KEY` | Required in production unless `DEMO_MODE=true`; enables Paystack (test keys work) |
| `CRON_SECRET` | Bearer token for `POST /api/cron/auto-release` (schedule every ~15 min) |
| `BREVO_API_KEY`, `EMAIL_FROM` | Brevo API key and verified sender used for email delivery |
| `BLOB_READ_WRITE_TOKEN` | Required in production for private ID/evidence storage and avatars |

Paystack webhook URL: `https://<your-domain>/api/webhooks/paystack`.

## Vercel deployment

1. Create a private Vercel Blob store and copy its `BLOB_READ_WRITE_TOKEN` into Vercel.
2. Add all production values from `.env.example`, including Neon `DATABASE_URL` (pooled) and `DIRECT_DATABASE_URL` (direct), `APP_URL`, `CRON_SECRET`, Paystack key, Brevo key and Blob token.
3. Set the Vercel build command to `npm run vercel-build`. It applies committed Prisma migrations before the application build.
4. Configure the Paystack webhook URL above. The daily cron in `vercel.json` invokes overdue escrow release with Vercel's `CRON_SECRET` authorization.

## Before handling real money

- **Escrow holding structure** (PRD §10/§13 open item): confirm the compliant setup with your provider and counsel.
- **Withdrawals are processed manually** in `/admin/withdrawals`. Automate with Paystack Transfers once the holding structure is settled.
- **SMS is outbox-only.** Plug in an SMS provider (e.g. Termii) in `src/lib/outbox.ts`.
- **SMS is outbox-only.** Plug in an SMS provider (e.g. Termii) in `src/lib/outbox.ts` before making phone verification mandatory.
- Have the privacy policy and terms reviewed (NDPA 2023).
