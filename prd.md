# No Broke Dayz — Product Requirements Document (Web MVP)

**Product:** No Broke Dayz — the trusted infrastructure for campus work
**Platform:** Responsive web application (mobile-first)
**Author:** Mubarak Salaudeen — Founder & Product Lead
**Status:** Draft v1.0
**Last updated:** October 2026

---

## 1. Summary

No Broke Dayz is a campus-focused micro-job marketplace that connects university students to small, flexible earning opportunities, with student verification and escrow-backed payments so work gets done and everyone gets paid.

This document defines the **web-based MVP**: a mobile-first responsive web app we can ship fast, launch as a closed beta at the University of Lagos, and use to validate demand, the escrow model, and the 10% commission before building native apps or expanding to other campuses.

---

## 2. Problem

Students want to earn around their class schedules, and the opportunities exist — tutoring, notes, errands, design, event support. But they're scattered across WhatsApp groups and word of mouth, with no verification, no payment protection, and no accountability. Workers do the job and hope to get paid; posters pay upfront and hope it gets done. Both sides carry the risk.

**There is no trusted place to find campus micro-jobs and transact safely.**

---

## 3. Goals, non-goals & success metrics

### 3.1 Goals (MVP)
- G1 — Let a verified student find and complete a paid job end-to-end on the web.
- G2 — Let anyone post a job, fund it to escrow, and release payment on completion.
- G3 — Make trust visible and real: student verification, two-sided ratings, escrow.
- G4 — Validate the **10% commission** and the willingness to use escrow.
- G5 — Reach marketplace liquidity on **one campus** (UNILAG).

### 3.2 Non-goals (explicitly out of MVP)
- Native iOS/Android apps (web + PWA only).
- Multi-campus / multi-city support.
- In-app chat beyond the minimum needed to coordinate a job.
- Recruitment partnerships, featured listings, financial products (later revenue streams).
- Complex skills testing or automated matching/ML ranking.

### 3.3 Success metrics
| Metric | Target for beta |
|---|---|
| Verified students onboarded | 100 |
| Jobs posted | ≥ 60 |
| Jobs completed & paid (escrow released) | ≥ 30 |
| Job post → first applicant (median time) | < 2 hours |
| Successful escrow release rate (no dispute) | > 90% |
| Repeat usage (users with ≥ 2 jobs) | > 25% |
| Commission collected | Tracked; validates the 10% model |

---

## 4. Target users

**Workers (supply)** — University students looking for flexible income. Primary device: phone browser.

**Posters (demand)** — Fellow students, student organisations, lecturers/researchers, campus vendors, and small businesses around campus. A user can be both a worker and a poster on the same account.

### Personas
- **Tobi, 200-level student** — needs ₦2–5k this week, has free afternoons, wants jobs that fit between lectures and guaranteed payment.
- **Chidinma, final-year student** — needs quick help (print & bind project, run an errand) from someone reliable and verified.
- **SUG Social Committee** — needs ushers/designers for an event, fast, with accountability.

---

## 5. Scope — MVP feature set

Priority: **P0** = must-have for beta launch · **P1** = should-have · **P2** = nice-to-have / fast-follow.

| # | Feature | Priority |
|---|---|---|
| F1 | Account, authentication & student verification | P0 |
| F2 | User profiles (skills, availability, ratings) | P0 |
| F3 | Job posting + escrow funding | P0 |
| F4 | Job discovery (browse, search, filter) | P0 |
| F5 | Apply, accept & job lifecycle tracking | P0 |
| F6 | Escrow payment release & payouts | P0 |
| F7 | Two-sided ratings & reviews | P0 |
| F8 | Wallet & transaction history | P1 |
| F9 | Notifications (email + in-app) | P1 |
| F10 | Dispute reporting & basic resolution | P1 |
| F11 | Lightweight job-coordination messaging | P2 |
| F12 | Admin / ops console | P0 (internal) |

---

## 6. Functional requirements

### F1 — Account, authentication & student verification (P0)
- Users can register with email + password, or email magic link.
- **Student verification** is required to apply for or post jobs:
  - **Primary:** verify a school email (e.g. `@live.unilag.edu.ng`) via one-time code.
  - **Fallback:** upload a student ID card for assisted review (ops approves/rejects).
- Phone number capture + OTP for payout and account security.
- A user has a single account and can act as both worker and poster.
- Verification status is stored and shown as a badge on the profile and on every job/application.

**Acceptance criteria**
- A user who has not completed verification cannot post or apply; they see a clear prompt on what to do next.
- School-email verification completes without manual review when the domain is on the allow-list.
- ID-fallback requests appear in the admin console within one minute of submission.

### F2 — Profiles (P0)
- Profile holds: name, photo, campus/faculty, short bio, skills (tags), availability (free text or simple slots), verification badge, rating, completed-jobs count.
- Public profile view (what a poster sees before accepting an applicant).
- Users can edit their own profile.

**Acceptance criteria**
- Rating and completed-jobs count update automatically after a job is closed.
- A poster can open an applicant's public profile from the application list.

### F3 — Job posting + escrow funding (P0)
- Poster creates a job: title, description, category, location (on-campus / remote / specific), pay amount (₦), deadline/needed-by, number of people needed (default 1).
- On submit, the poster **funds the job to escrow** (job amount + any service fee) before it goes live. Unfunded jobs stay in "Draft/Awaiting payment" and are not discoverable.
- Commission (10%) is calculated and disclosed to the poster at funding time.

**Acceptance criteria**
- A job only becomes "Open" after escrow funding succeeds.
- The poster sees a clear breakdown: worker payout, platform commission, total charged.
- Failed payment returns the job to draft with a retry option and no funds captured.

### F4 — Job discovery (P0)
- Feed of open jobs, defaulting to the user's campus, newest first.
- Search by keyword; filter by category, pay range, location type, and needed-by date.
- Job card shows: title, pay, category, location, poster name + verified badge, time posted, "Escrow protected" indicator.

**Acceptance criteria**
- Only funded, open jobs appear in the feed.
- Filters combine correctly and results update without a full page reload.

### F5 — Apply, accept & lifecycle tracking (P0)
- A verified worker applies to a job (optional short note).
- Poster sees applicants, opens profiles, and **accepts one** (or up to N for multi-slot jobs).
- Job status lifecycle: `Open → Assigned → In progress → Submitted → Completed` (plus `Cancelled` and `Disputed`).
- Both parties see the current status and the next action required of them.

**Acceptance criteria**
- Accepting an applicant moves the job to `Assigned` and notifies both parties.
- Once filled, the job is removed from the public feed.
- Worker can mark work `Submitted`; poster is prompted to confirm.

### F6 — Escrow payment release & payouts (P0)
- Funds are held from F3 funding until the poster **confirms completion**, which releases the worker payout and captures platform commission.
- Payouts go to the worker's wallet and can be withdrawn to a Nigerian bank account.
- Auto-release safeguard: if the poster does not confirm or dispute within a set window after `Submitted` (e.g. 72 hours), funds auto-release to the worker (configurable).

**Acceptance criteria**
- Confirming completion releases exactly the agreed payout to the worker and the 10% to the platform.
- No funds can be released for a job that was never funded.
- Auto-release only fires when no dispute is open.

### F7 — Ratings & reviews (P0)
- After completion, both poster and worker rate each other (1–5) with an optional comment.
- Ratings are visible on profiles and aggregate into the profile score.

**Acceptance criteria**
- A user can rate only after a job they were part of reaches `Completed`.
- Reviews cannot be edited after submission (MVP); they can be reported.

### F8 — Wallet & transaction history (P1)
- Each user has a wallet showing available balance, pending (in-escrow) amounts, and full transaction history (funding, payouts, withdrawals, commission).
- Withdraw-to-bank flow with status tracking.

### F9 — Notifications (P1)
- Email + in-app notifications for: new applicant, application accepted, work submitted, payment released, withdrawal processed, dispute opened/updated.

### F10 — Dispute reporting & resolution (P1)
- Either party can open a dispute on a `Submitted`/`In progress` job, freezing auto-release.
- Dispute captures reason + evidence (text, optional file).
- Ops reviews in the admin console and resolves: release to worker, refund to poster, or split.

### F11 — Job-coordination messaging (P2)
- Minimal per-job thread so matched parties can coordinate (where/when). Not a general chat.

### F12 — Admin / ops console (P0, internal)
- Review ID-verification submissions; approve/reject users.
- View jobs, funding status, and the escrow ledger.
- Resolve disputes and trigger manual release/refund.
- Basic metrics dashboard (users, jobs, GMV, commission, completion rate).

---

## 7. Key user flows

**Earn (worker):** Register → verify student status → complete profile → browse/search jobs → apply → get accepted → do the work → mark submitted → poster confirms → payout to wallet → withdraw.

**Hire (poster):** Register → verify → post job → fund escrow (see 10% breakdown) → review applicants → accept one → receive submitted work → confirm completion (releases escrow) → rate worker.

**Dispute:** Submitted/In-progress → party opens dispute → auto-release frozen → ops reviews evidence → resolves (release / refund / split) → both parties notified.

---

## 8. Data model (core entities)

- **User** — id, name, email, school_email, phone, campus, faculty, photo, bio, role flags, verification_status, rating_avg, jobs_completed, bank_details, created_at.
- **VerificationRequest** — id, user_id, method (school_email | id_card), evidence_ref, status, reviewed_by, reviewed_at.
- **Job** — id, poster_id, title, description, category, location_type, location_detail, amount, commission, slots, needed_by, status, created_at.
- **Application** — id, job_id, worker_id, note, status (applied | accepted | rejected), created_at.
- **EscrowTransaction** — id, job_id, amount, commission, state (funded | released | refunded | split), provider_ref, created_at, released_at.
- **WalletEntry** — id, user_id, type (funding | payout | withdrawal | commission), amount, balance_after, ref, created_at.
- **Review** — id, job_id, rater_id, ratee_id, score, comment, created_at.
- **Dispute** — id, job_id, opened_by, reason, evidence_ref, status, resolution, resolved_by, created_at.

---

## 9. Non-functional requirements

- **Mobile-first & responsive** — primary experience is a phone browser; usable 320px–1440px. Ship as an installable PWA.
- **Performance** — key pages interactive in < 3s on a mid-range Android over 3G/4G; feed and filters update without full reloads.
- **Security** — hashed passwords, OTP for sensitive actions, HTTPS everywhere, role-based access control, no raw card data on our servers (handled by the payment provider).
- **Payments integrity** — escrow state is the source of truth; funding and release are idempotent and reconciled against the provider; a job can never be released without a matching funded transaction.
- **Privacy (NDPA 2023)** — collect only what's needed (data minimisation); clear consent at sign-up; a privacy policy; secure storage of ID documents with restricted access and a retention/deletion policy; honour access/deletion requests. (Lean on in-house privacy-engineering expertise here.)
- **Availability** — target 99% uptime during beta; graceful error states, never a dead end.
- **Accessibility** — sentence-case labels, visible focus states, sufficient contrast, keyboard-navigable core flows.
- **Observability** — error logging and an event stream for the metrics in §3.3.

---

## 10. Technical considerations (reference, not mandated)

- **Frontend:** component-based SPA/SSR framework (e.g. Next.js/React), mobile-first, PWA-enabled.
- **Backend:** REST/JSON API (e.g. Node/NestJS or Django), PostgreSQL for relational + transactional integrity.
- **Payments & escrow:** integrate a Nigerian gateway (e.g. Paystack or Flutterwave) for collections and transfers; hold escrowed funds in a platform-controlled wallet/sub-account and use split/transfer APIs to pay worker + capture commission on release.
  - **Open item:** confirm the compliant escrow/holding structure and any licensing/partner requirements before handling real money at scale.
- **Hosting:** managed cloud with CI/CD; secrets management; encrypted storage for ID documents.
- **Notifications:** transactional email provider + in-app notification store.

---

## 11. Analytics & instrumentation

Track: sign-ups, verification completion rate, job posts, funding success rate, applications per job, time-to-first-applicant, acceptance rate, completion rate, dispute rate, GMV, commission collected, repeat usage. These feed the §3.3 metrics and the beta learning goals.

---

## 12. Release plan

Consistent with current build status — **the MVP is in active development**.

- **Now — Building the MVP:** auth & verification, profiles, job marketplace, escrow payments (the P0 set).
- **Next — Finish & harden:** complete the escrow release/payout path, ratings, admin console, internal testing against real payment sandbox.
- **Beta — Closed launch at UNILAG:** onboard first 100 verified students, drive first posted and completed jobs, instrument everything.
- **Then — Iterate & prepare to scale:** act on beta feedback (verification, matching, disputes, ratings), then replicate the playbook to the next campus.

---

## 13. Risks, assumptions & open questions

**Assumptions to validate**
- Students will use a dedicated platform over informal channels.
- Posters will trust and use escrow.
- A single campus can reach enough activity for liquidity.
- 10% commission is acceptable to users.

**Risks**
- Cold-start liquidity (not enough jobs or workers early) → mitigate with concentrated, ambassador-driven onboarding on one campus.
- Payment/escrow compliance complexity → resolve the holding-structure open item early.
- Verification fraud → school-email first, ID fallback, ratings, and ops review.
- Off-platform leakage (users transacting outside to avoid commission) → keep escrow genuinely valuable (protection + ratings) so staying on-platform is worth it.

**Open questions**
- Final escrow/payout provider and compliant fund-holding structure?
- Auto-release window length (72h proposed)?
- Service fee split — commission from worker payout, added to poster total, or both?
- ID-verification review: manual for beta, or a vendor later?

---

*End of document.*