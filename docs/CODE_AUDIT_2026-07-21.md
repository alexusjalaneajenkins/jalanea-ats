# Jalanea ATS full-code audit

**Audit date:** July 21, 2026
**Repository:** `JalaneaATS/jalanea-ats`
**Branch / commit:** `main` at `ab7d998`, plus a large uncommitted working tree
**Production checked:** `https://ats.jalanea.dev`
**Conclusion:** **Do not treat this application as fully working or production-safe.** A build succeeds and the public shell loads, but the audit found one remotely verified P0 privilege-escalation defect, multiple high-impact privacy/billing/data-integrity defects, and major untested journeys.

## What this document means

This is a best-effort, whole-repository audit of the current checkout and its linked Supabase/Vercel state. “Everything works” cannot be established by reading code or by a successful build. This report therefore distinguishes four evidence types:

- **Confirmed defect:** the source or linked remote state demonstrates the failure condition.
- **High-confidence risk:** the faulty path is present in code, but exercising it would require destructive billing/account actions or production test identities.
- **Unverified journey:** code exists, but no complete test proves the real external-service flow.
- **Absent capability:** the product does not implement the behavior at all.

The review did not create payments, delete production users, send production email, or complete Google/email authentication with a real account. Those actions would change external state. Findings are a snapshot of this checkout and can change as its uncommitted files change.

## Audit plan used

1. Inventory the architecture, routes, data stores, third-party integrations, documentation, and test surface.
2. Review authentication, authorization, Supabase RLS/RPCs, AI consent and quotas, Stripe, account deletion, and API boundaries.
3. Trace the main browser journeys: upload, analysis, history, authentication, paid access, account management, and PWA behavior.
4. Run type checking, production build, lint, dependency audit, Supabase CLI checks, HTTP/API probes, and browser checks.
5. Deduplicate findings, rank P0–P3, and distinguish implemented, verified, unverified, and absent behavior.
6. Define containment, remediation, regression-test, and release gates.

## Severity definition

| Priority | Meaning |
|---|---|
| **P0** | Active critical security/data boundary failure. Contain immediately. |
| **P1** | High-impact security, privacy, billing, data-loss, or core-workflow failure. Fix before calling the product production-ready. |
| **P2** | Material correctness, reliability, accessibility, or operational-readiness defect. |
| **P3** | Lower-impact consistency, hygiene, maintainability, or polish issue. |

## Executive finding count

| Priority | Count | Overall theme |
|---|---:|---|
| P0 | 1 | Authenticated users can self-promote to admin in the linked shared Supabase schema. |
| P1 | 18 | AI consent/cost controls, Stripe correctness, deletion, auth state, stale analysis, parsing, legal truthfulness, sensitive logging, vulnerable dependencies, and release reproducibility. |
| P2 | 18 | Redirects/session refresh, scoring errors, persistence/recovery, accessibility/offline behavior, tests, lint, headers, and documentation. |
| P3 | 8 | Format/copy mismatches, missing assets, misleading controls, dead code, warnings, and repository hygiene. |

Counts group closely related symptoms under a single root cause so the same defect is not counted repeatedly.

---

## P0 — Critical

### P0-01 — Any authenticated user can promote their own profile to `admin`

**Evidence**

- `supabase/migrations/001_stripe_tables.sql:117-128` gives users a permissive own-row `UPDATE` policy on `public.profiles`.
- `supabase/migrations/20260405000001_student_access_foundation.sql:33-34` later adds the security-sensitive `role` column to that same table.
- `supabase/migrations/20260715000004_profile_self_service.sql:9-20` correctly explains why direct row updates are unsafe and adds an allowlisted RPC, but it does not remove the old broad policy/grant.
- PostgreSQL combines permissive policies with `OR`; the safe RPC does not constrain the still-available direct table update.
- `supabase/migrations/20260713000001_admin_console.sql:26-60` and other tutoring policies/RPCs trust `profiles.role = 'admin'` for privileged access.
- Supabase CLI inspection of the linked remote project confirmed that `authenticated` still has `UPDATE` on `profiles` and both broad own-row update policies remain active.

**Trigger**

1. Sign up or sign in as a normal user.
2. Call Supabase directly and update the caller’s own `profiles.role` to `admin`.
3. Invoke admin-facing policies or security-definer functions that trust that role.

**Impact**

An attacker can cross the ATS boundary into the shared tutoring schema, list authentication users and last-sign-in times, change roles, and access staff/admin-protected student, guardian, audit, or messaging data. This is an active authorization failure, not merely a missing test.

**Immediate containment**

1. Preserve and inspect role-change/audit evidence before modifying it.
2. Remove direct `authenticated` updates to `profiles`; expose only column-allowlisted RPCs for self-service fields.
3. Move administrator authority to a table/claim that browser users cannot mutate.
4. Audit every current `admin` role and privileged function invocation for unauthorized activity.
5. Add a remote regression test proving a normal JWT cannot change `role`, billing identifiers, or another profile.

---

## P1 — High priority

### P1-01 — Legacy `/api/analyze` bypasses consent, entitlement, durable quota, and size limits

`src/app/api/analyze/route.ts:5-51` accepts anonymous resume/JD text and calls the server-funded Gemini client without `X-AI-Consent`, subscription checks, daily quota, or maximum input size. Its only guard is the process-local map in `src/middleware.ts:3-35`, which resets and fragments across serverless instances. A caller can disclose resume data without the product’s consent flow and consume the Jalanea API key. Remove the route if unused, or bring it under the same validated consent, authorization, atomic quota, input, and cache controls as the canonical routes.

### P1-02 — Resume Improver sends resume/job text to Gemini without consent

`src/components/JobMatchStepper.tsx:259` treats an enabled free tier as AI access; `src/components/ResumeImprover.tsx:128-145` and `:269-280` call `/api/improve-bullet` without a consent header; and `src/app/api/improve-bullet/route.ts:116-228` never validates consent. Its three-per-day limiter is only an in-memory map and is consumed before input validation. Users can reach the feature after a local scan without accepting AI sharing, while instance churn bypasses the advertised daily limit. Enforce server-side consent and an atomic identity/user quota, and validate the body before consuming it.

### P1-03 — Stripe webhook state can move backward when events arrive out of order

`src/app/api/webhooks/stripe/route.ts:43-70` applies embedded event snapshots directly. Subscription upserts/deletions do not record the Stripe event ID or event creation time and do not retrieve current Stripe state. A delayed older `customer.subscription.updated` can therefore arrive after `customer.subscription.deleted` and restore paid access. Stripe does not guarantee event order. Store processed event IDs/timestamps and apply monotonic state, or retrieve the current subscription before committing entitlement. See [Stripe webhook guidance](https://docs.stripe.com/webhooks).

### P1-04 — Duplicate monthly checkouts can create multiple customers and ongoing charges

`src/app/api/checkout/route.ts:63-113` neither rejects an already-active subscriber nor passes the existing Stripe customer ID. Concurrent/repeated checkout requests can create multiple Stripe customers. The webhook overwrites the single `profiles.stripe_customer_id`, while `src/app/api/account/delete/route.ts:67-83` cancels subscriptions only for that most recently stored customer. Older subscriptions can keep charging after portal use or account deletion. Make checkout idempotent per user/plan, reuse the customer, reject duplicate active plans, and reconcile all customers/subscriptions tied to the user.

### P1-05 — Lifetime access can be granted before payment settles

The webhook grants lifetime access from `checkout.session.completed` based on mode/metadata without requiring `payment_status === 'paid'`, and it does not handle asynchronous payment success/failure events. A delayed payment can create permanent access before funds settle and remain active after an async failure. Fulfill only paid sessions and handle async success/failure idempotently. See [Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment).

### P1-06 — Stripe `paused` subscriptions cannot be persisted

The `subscription_status` enum in `supabase/migrations/001_stripe_tables.sql:64-68` and the webhook’s runtime assumptions omit Stripe’s valid `paused` status. A trial ending without a payment method can cause the webhook upsert to fail and retry while an older active row keeps access enabled. Add and explicitly map every Stripe state, with a deny-by-default entitlement rule.

### P1-07 — ATS account deletion can cancel billing, fail halfway, and damage tutoring data

`src/app/api/account/delete/route.ts:64-130` cancels Stripe, then separately deletes subscription rows, the shared profile, and the global Supabase Auth user. The same profile/auth identity owns records throughout the linked tutoring schema, and multiple foreign keys are restrictive rather than cascading. A dependent row can make deletion fail only after billing and some ATS data have already changed; where it succeeds, it can delete identity/data used by another product. Separate ATS product membership from the shared identity, preflight dependencies, use a database transaction/compensation strategy, and define cross-product deletion semantics before exposing this action.

### P1-08 — “Clear History” and “Delete account and all data” leave resume data locally

`src/components/history/HistoryDashboard.tsx:70-75` clears only history index records. Full resume/job text remains in `src/lib/storage/sessionStore.ts`, and the current-session pointer remains in `src/hooks/useProgress.ts:70-88`. `src/lib/supabase-browser.ts:169-185` deletes the server account and signs out without clearing either store or saved AI configuration. Returning to the site can reopen data the user believed was deleted, contradicting `src/app/privacy/page.tsx:127-128` and the account dialog. Implement one tested local-data erasure routine and invoke it from clear-history, account deletion, and an explicit “delete all local data” control.

### P1-09 — Auth/subscription race can silently erase a paid user’s saved API key

`src/hooks/useAuth.ts:72-83` marks auth loading complete before the asynchronous subscription lookup finishes. Effects on `src/app/page.tsx:43-57` and `src/app/results/[sessionId]/page.tsx:173-204` can observe a signed-in user with temporary `hasAccess=false` and persist an empty BYOK key. A slow reload can therefore delete the user’s configuration. Track authentication and entitlement loading separately; never mutate saved credentials from a transient authorization state.

### P1-10 — Editing a job description leaves old analysis attached to the new job

The results textarea updates `jobText` around `src/app/results/[sessionId]/page.tsx:895` without invalidating keyword, knockout, semantic, AI, tab-unlock, or export state. The UI can show/export advice calculated for job A alongside the text for job B; a delayed response for A can also overwrite B. Key every result to an immutable input revision/hash, cancel stale requests, and clear dependent state when either input changes.

### P1-11 — Concurrent AI analyses can consume quota and race each other

The results page launches external analysis without awaiting it around `src/app/results/[sessionId]/page.tsx:519`, clears the deterministic loading state, and does not include the external request state in `JobDescriptionInput`’s disabled condition. Repeated clicks create duplicate paid/free calls and last-response-wins output. Use a single analysis state machine, disable or coalesce duplicate requests, and cancel superseded work.

### P1-12 — Paid users can be blocked by exhausted anonymous free quota

Paid access is recognized around `src/app/results/[sessionId]/page.tsx:175`, but the input component receives only BYOK configuration around line 904. `src/components/JobDescriptionInput.tsx:103-115` disables analysis when free quota is zero and no personal key exists—even for an active subscriber. Pass the actual entitlement/mode into the guard and test paid, lifetime, free, BYOK, expired, and loading states independently.

### P1-13 — Common one-page PDFs lose bullet/line structure

`src/lib/parsers/pdf.ts:100` joins all text items on a page with spaces and preserves newlines only between pages. `src/components/ResumeImprover.tsx:89` depends on newline-separated bullets. A normal one-page resume can become one giant line, leaving no eligible bullets and degrading targeting/section analysis. Reconstruct lines from PDF text-item coordinates, preserve page/line breaks, and add representative one-column/two-column PDF fixtures.

### P1-14 — Password login trusts an arbitrary redirect string

`src/app/(auth)/login/page.tsx:13-34` reads the raw `redirect` query and passes it to `router.push` after password sign-in. External, protocol-relative, backslash-normalized, and dangerous-scheme inputs are not canonicalized or allowlisted. This creates post-login phishing/open-redirect risk; Next.js also warns that untrusted `router.push` URLs can execute dangerous schemes. Centralize a canonical same-origin path validator and use it for password and OAuth flows. See [Next.js `useRouter` guidance](https://nextjs.org/docs/app/api-reference/functions/use-router).

### P1-15 — Public privacy/terms promises contradict actual account and key behavior

`src/app/privacy/page.tsx:176-188` says Jalanea does not store personal information such as email, although Supabase accounts/profiles and Stripe linkage necessarily do. Lines 162-168 describe session-memory-by-default and optional `localStorage` key storage, while `src/lib/llm/storage.ts:53` persists keys in IndexedDB with no session-only choice. The Terms say BYOK is free (`src/app/terms/page.tsx:50-55`, `:146-168`), while `src/components/ByokKeyModal.tsx:257` requires sign-in and active paid access. Correct the behavior or obtain a legal/privacy review and update every disclosure before release.

### P1-16 — Production dependencies include high-severity upload-path vulnerabilities

`yarn audit --groups dependencies` failed with 12 findings (10 high, 2 moderate). Notable installed packages include vulnerable `@xmldom/xmldom@0.8.11` and `underscore@1.13.7` through `mammoth`, which parses user-uploaded DOCX files in `src/lib/parsers/docx.ts:50`; plus `ws@8.19.0`, `sharp@0.34.5`, and `postcss@8.4.31`. Upgrade the direct packages/lockfile, rerun parser fixtures, and document any remaining server/build-only exposure. Relevant advisories include [GHSA-wh4c-j3r5-mjhp](https://github.com/advisories/GHSA-wh4c-j3r5-mjhp), [GHSA-2v35-w6hq-6mfw](https://github.com/advisories/GHSA-2v35-w6hq-6mfw), [GHSA-96hv-2xvq-fx4p](https://github.com/advisories/GHSA-96hv-2xvq-fx4p), and [GHSA-f88m-g3jw-g9cj](https://github.com/advisories/GHSA-f88m-g3jw-g9cj).

### P1-17 — Failure diagnostics can persist resume-derived content

`src/app/api/analyze-free/route.ts:491-517` logs the first 500 characters of a failed AI response and returns a 200-character response preview in its error body. `src/app/api/analyze/route.ts:35-55` logs the entire retry response and returns raw exception messages. Model output can echo resume or job-description content, so provider parsing failures can place personal data in Vercel logs despite `src/app/privacy/page.tsx:139-145` and `:193-205` promising pass-through/no-personal-data errors. Remove response bodies/previews from production diagnostics, return stable public error codes, and use structured redacted telemetry with bounded retention.

### P1-18 — Production cannot be reproduced from Git

`origin/main` is still `ab7d998`, while the checkout contains 29 modified/staged tracked paths and about 70 untracked paths. Sixty-six of 68 Supabase migration files are untracked, including the applied atomic AI quota migration, and the live V2 implementation is split across staged/unstaged state. The READY Vercel production artifact was built from this dirty source. A fresh clone cannot reconstruct either deployed application behavior or migration history. First separate unrelated tutoring files, then intentionally commit the ATS source/migrations and require release-by-commit.

---

## P2 — Medium priority

### P2-01 — OAuth callback has a backslash redirect bypass and hides exchange errors

`src/app/api/auth/callback/route.ts:36-44` ignores `exchangeCodeForSession` errors and accepts strings beginning `/` unless they begin `//`. A value such as `/\evil.example` passes that check but canonicalizes to an external URL. Validate the final URL origin/path after parsing and route failures to an explicit auth-error page.

### P2-02 — Billing and checkout return destinations are client/header controlled

`src/app/api/billing/portal/route.ts:18-69` passes a client-supplied `returnUrl` directly to Stripe. `src/app/api/checkout/route.ts:68-74` derives success/cancel URLs from the request `Origin` header. These trusted payment surfaces can return users to an attacker-controlled domain when called outside the intended UI. Build all return URLs from a server-side canonical application URL or strict environment allowlist.

### P2-03 — Supabase server sessions are not refreshed consistently

`src/middleware.ts` only matches three analysis endpoints, and SSR clients in `analyze-free`/`analyze-v2` discard refreshed cookie writes. An expired access token can make a valid paid user appear unsubscribed until the browser refreshes independently. Implement Supabase’s request proxy/session-refresh pattern and write refreshed cookies. See [Supabase SSR guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client).

### P2-04 — V2 consumes rate limit before validating the request

`src/app/api/analyze-v2/route.ts:98-130` consumes a paid user’s five-per-minute slot before checking server model configuration, parsing JSON, or validating resume/JD fields. Malformed or impossible requests burn quota without model work. Validate configuration and input first, then atomically consume immediately before the provider call; refund on provider/internal failure if that is the intended policy.

### P2-05 — Unknown hard requirements are summarized as “passed”

`src/lib/v2/knockoutScreen.ts:51-59` defines aggregate pass as “zero explicit failures.” Work authorization and physical requirements return `needs-confirmation`, yet the engine describes the screen as passed and does not cap the score. Use a three-state aggregate (`pass`, `fail`, `needs-confirmation`) and prevent “passed” language until every hard requirement is resolved.

### P2-06 — No required skills produces a perfect section score

`src/lib/v2/sectionMatch.ts:113-123` returns a base score of 100 when the parser extracts zero required skills. A vague or failed-to-parse job description therefore contributes a perfect score with no supporting evidence. Return “not enough evidence”/null and lower confidence rather than awarding points.

### P2-07 — AI results are not persisted with the session

`src/app/results/[sessionId]/page.tsx` saves history before the external analysis starts around line 499. The later free/V2 result remains component state, so reload/history can lose the very output the user paid or consumed quota for. Persist a versioned result only if its input revision still matches, and test reload/history restore.

### P2-08 — Password recovery is claimed but not implemented

The login/account UI has no forgot-password or reset flow, while `src/app/help/page.tsx:67-68` says it is available in account settings. Add the Supabase recovery email, callback, and password-update journey with rate/error states, or remove the false claim.

### P2-09 — Auth network failures can leave login/signup indefinitely loading

`src/hooks/useAuth.ts:114-127` and the login/signup handlers do not use `try/finally` around rejected network requests. Offline or thrown client errors can prevent loading flags from resetting. Normalize auth exceptions and always settle state.

### P2-10 — `/checkout/success` displays “Payment Received” without validating a session

`src/app/checkout/success/page.tsx:13-169` eventually displays success after a timeout even when directly visited without a checkout session or payment. It does not grant access, but it gives a materially false billing confirmation. Retrieve and validate the session server-side, show pending/failed states, and never infer payment from time elapsed.

### P2-11 — Advertised offline support cannot reliably boot

`src/components/PWAInstall.tsx:90` promises offline use, but `public/sw.js:58-72` forces all `/_next/` assets to network-only. Cached HTML cannot start without its JavaScript/CSS chunks, and `src/lib/parsers/pdf.ts:179` loads a PDF worker from a CDN despite a local worker being present. Either implement/test an app-shell cache and local worker or remove the offline claim.

### P2-12 — Primary modals are not accessible dialogs

Consent, BYOK, onboarding, history, and account modals lack consistent `role="dialog"`, accessible naming, focus trapping, initial focus, focus restoration, and Escape behavior. Keyboard and assistive-technology users can tab into content behind the overlay or lose their place. Build one reusable accessible dialog primitive and migrate every modal.

### P2-13 — IndexedDB availability is assumed rather than tested

`src/lib/storage/sessionStore.ts:287` selects IndexedDB whenever the API exists; runtime open/write failures throw instead of falling back. Upload waits for storage before navigation in `src/app/page.tsx:129`, so quota/private-mode/storage errors can block the core journey. Probe writes, fall back safely, surface reduced persistence, and test denied/quota/full cases.

### P2-14 — Account deletion retains a stable user identifier in AI rate-limit storage

`src/app/api/analyze-v2/route.ts:72-78` embeds the auth UUID in the rate-limit bucket. `supabase/migrations/20260721004456_atomic_ai_usage_limits.sql` has no expiry/cleanup, and deletion does not remove those rows. Delete or expire user-associated buckets according to the product’s retention policy.

### P2-15 — Automated coverage cannot support the product claims

There are no unit, integration, coverage, or typecheck test scripts and no `.github` CI workflow. Playwright lists exactly one Chromium test. It covers one TXT upload/free-analysis path but not email/Google auth, signup confirmation, checkout, webhooks, portal, deletion, paid V2, BYOK, PDF/DOCX, history/export, contact delivery, mobile, or offline behavior. The manual matrix in `testing/scenarios/test-scenarios.md` is unchecked.

The only E2E currently fails: `e2e/analyze-smoke.spec.ts:48-68` checks whether the asynchronously rendered consent modal is visible without waiting, can skip it, then waits for an API response that never starts. Its response timeout is 45 seconds while Playwright’s default test timeout remains 30 seconds. Make consent deterministic and set an intentional overall timeout.

### P2-16 — Lint is failing and the default command is not a reliable gate

A completed source run reported 112 findings (51 errors, 61 warnings); a narrower frontend subset independently reported 50 errors and 38 warnings. The default `yarn lint` can also traverse `.vercel/output`, `.playwright-cli`, backup/generated files, and the PDF worker because `eslint.config.mjs:9-15` does not ignore them, causing stalls/deoptimized generated-bundle parsing. Fix source errors, define intentional generated-file ignores, and run lint in CI.

### P2-17 — Baseline browser security headers are incomplete

Production serves HSTS but no explicit Content Security Policy, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`; `next.config.js` is empty and there is no `vercel.json`. Add a tested CSP compatible with Gemini/Stripe/Supabase and the remaining defensive headers. This is especially important because the browser stores API keys and resume content.

### P2-18 — Documentation describes a different product and unverified behavior

`README.md` remains the create-next-app template and points at the wrong source path. `docs/TESTING.md` tells testers to enter an Anthropic key although the implementation uses Gemini, and documents flows as expected without completed evidence. The compliance/architecture documents still assume no accounts and BYOK-only transmission even though the product now has accounts, Jalanea-funded AI, and Stripe. Rewrite setup, environment, data-flow, testing, release, and rollback documentation from the current implementation.

---

## P3 — Lower priority

### P3-01 — Help and upload UI disagree about supported formats

`src/app/help/page.tsx:44-45` says only PDF is supported, while the uploader supports PDF, DOCX, and TXT.

### P3-02 — The file input accepts `.doc`, but the parser always rejects it

`src/components/UploadDropzone.tsx` advertises legacy `.doc`; `src/lib/parsers/docx.ts:42` rejects it. Remove `.doc` from `accept`/copy or implement a safe converter.

### P3-03 — The production Apple/PWA icon is missing

`src/app/layout.tsx:33-37` references `/icons/icon-192.png`, but `public/icons` contains only SVG assets and production returns 404.

### P3-04 — Knockout risk card exposes a nonfunctional keyboard “button”

`src/components/scores/KnockoutRiskCard.tsx:30` is focusable and styled/announced as interactive but has no click or keyboard action. Make it a real control or static content.

### P3-05 — Checkout success uses a different support address

The checkout-success page’s support email differs from the help/contact/legal surfaces. Choose one monitored address and centralize it.

### P3-06 — Next.js build emits migration warnings

The production build succeeds but warns that `src/middleware.ts` uses the deprecated middleware convention and that `themeColor` is placed in metadata rather than viewport. Migrate to the current convention and remove duplicate/invalid metadata.

### P3-07 — Dead cloud-history helpers point to a missing table

`src/lib/supabase.ts:64-160` implements `ats_analyses` helpers, but no source caller uses them and the linked remote database has no `public.ats_analyses` table. Remove the dead interface or implement/migrate it deliberately; it must not be mistaken for working cloud sync.

### P3-08 — Repository hygiene and runtime pinning are incomplete

Conflict/backup/generated artifacts include `src/app/api/analyze-v2/route 2.ts`, `src/lib/analysis/keywords 2.ts`, `next.config.ts.bak`, Firebase logs, `supabase/.temp/*`, Playwright output, and Vercel output. The stale V2 copy lacks current security controls. `.gitignore` does not cover all of these, and `package.json` has no `packageManager` or Node version pin. Clean them only after identifying user-owned files, then add ignore rules and runtime pins.

---

## Capability and journey truth table

| User expectation | Current conclusion |
|---|---|
| Public home/help/contact/legal/pricing pages load | **Partially verified.** Browser/HTTP checks passed without page/console errors. |
| Email/password sign-in | **Implemented, not proven end-to-end.** Redirect and failure-state defects exist. |
| Google sign-in | **Initiation verified only.** It reached Google Accounts for `jalanea.dev`; callback completion is unverified and has defects. |
| Sign up / email confirmation | **Implemented, not proven end-to-end.** |
| Upload TXT resume and reach results | **Partially verified.** Core browser path works; the only automated AI smoke is flaky/failing. |
| Parse PDF/DOCX accurately | **Not proven.** A confirmed one-page PDF structure bug and vulnerable DOCX parser dependencies exist. |
| Paste a job description and run deterministic analysis | **Implemented, but stale-input/scoring defects exist.** |
| Free Gemini analysis | **Implemented, not fully proven in the current E2E run.** Consent guard on `/api/analyze-free` works; the legacy route bypasses it. |
| Paid V2 Gemini analysis | **Implemented, not proven end-to-end.** Entitlement/quota checks exist, but UI and scoring defects remain. |
| BYOK analysis | **Implemented, not proven end-to-end.** Access rules contradict the Terms and auth loading can erase the key. |
| Stripe checkout / webhook / billing portal | **Implemented, not proven end-to-end and not safe to call complete.** Multiple P1 billing-state defects exist. |
| Clear history / delete all data | **Does not fulfill the promise.** Browser-local resume/session data survives. |
| Delete account | **Implemented, not proven end-to-end and unsafe across the shared schema.** |
| Contact-form delivery | **UI/API implemented, real delivery not proven.** |
| Find/search jobs inside Jalanea ATS | **Not implemented.** The app only links to LinkedIn/Indeed and asks the user to paste a posting. `/jobs` returns 404. |
| Import a job from URL | **Not implemented.** URL input recognizes vendors but does not fetch the posting. |
| Apply to or track jobs | **Not implemented.** |
| Password recovery | **Not implemented.** |
| Compare multiple jobs | **Unused component exists, but no reachable journey was found.** |
| Cloud/cross-device resume history | **Not implemented.** Core records are browser-local. |
| Reliable offline use | **Claimed but not operationally viable with the current service worker.** |

## Verification evidence

| Check | Result |
|---|---|
| TypeScript | `tsc --noEmit` passed. |
| Production build | Next.js 16.2.11 build passed; 24 routes generated with the P3 warnings above. |
| Source lint | Failed with errors/warnings; default repo lint also needs generated-file ignores. |
| Dependency audit | Failed: 12 production dependency findings, 10 high and 2 moderate. |
| Automated tests | One Chromium E2E test; current production-targeted run timed out at 30 seconds because consent was skipped by a race. |
| Supabase migrations | Linked remote list includes `20260721004456_atomic_ai_usage_limits.sql`. |
| Supabase database lint | No errors; two warnings in unrelated `generate_receipt_code` PL/pgSQL variables. This does not detect the P0 RLS/column-authorization composition. |
| Supabase authorization inspection | Confirmed the P0 broad authenticated profile update remains live. Atomic AI tables are RLS-enabled and their quota RPCs are service-role-only. |
| Anonymous API gates | Checkout, billing portal, and account deletion returned 401; V2 returned 403 without a subscription; these narrow checks passed. |
| AI consent gates | `/api/analyze-free` and `/api/analyze-v2` require consent; legacy `/api/analyze` and `/api/improve-bullet` do not. |
| Public routes | `/`, `/login`, `/signup`, `/pricing`, `/help`, `/contact`, `/privacy`, and `/terms` returned 200; `/account` redirected to login; `/analyze` redirected home; `/jobs` returned 404. |
| Production status | Current Vercel deployment is READY and aliased to `ats.jalanea.dev`; READY is deployment health, not functional sign-off. |
| Runtime monitoring | No recent Vercel error logs were observed, but there are no traffic counts, structured error monitoring, or alert evidence. |

## Remediation plan and release gates

### Phase 0 — Contain the active security boundary (immediate)

1. Treat P0-01 as an incident: preserve evidence, block direct `profiles` updates, and audit roles/privileged actions.
2. Disable or protect the legacy AI and bullet-improvement routes until consent and durable quotas are enforced.
3. Freeze claims that the system is fully secure or that deletion removes all data.
4. Verify the emergency Supabase migration with normal-user, admin, anonymous, and service-role tests before reopening affected flows.

**Gate:** A normal authenticated JWT cannot mutate `role`/billing/admin columns or invoke any admin capability; every existing admin is accounted for.

### Phase 1 — Billing, privacy, and data integrity

1. Make Stripe fulfillment idempotent and monotonic; support all statuses and async payment outcomes.
2. Reuse one customer per user and prevent duplicate active subscriptions.
3. Redesign ATS deletion as an app-scoped operation that cannot partially cancel billing or delete tutoring identity/data.
4. Centralize local-data erasure and remove resume-derived logging/debug payloads.
5. Fix password/OAuth/payment return URL validation.
6. Upgrade vulnerable upload/runtime dependencies and rerun malicious/corrupt fixture tests.
7. Commit a reproducible ATS-only release and migration history.

**Gate:** Stripe test-mode replay/out-of-order/duplicate tests pass; deletion leaves neither ATS server data nor browser-local sessions while preserving other-product identity; dependency audit has no unresolved high finding in an exercised path.

### Phase 2 — Core workflow correctness

1. Introduce explicit auth/entitlement and analysis state machines.
2. Key results to immutable input revisions; cancel duplicate/stale requests and persist successful AI output.
3. Fix paid entitlement gating, PDF line reconstruction, knockout unknown state, and zero-skill scoring.
4. Add password recovery, SSR session refresh, IndexedDB fallback, accessible dialogs, and truthful offline behavior.

**Gate:** Automated tests cover free, paid, lifetime, BYOK, expired, and failure states; representative PDF/DOCX/TXT fixtures produce stable expected results; keyboard-only modal testing passes.

### Phase 3 — Quality and operational readiness

1. Fix lint errors and bound lint to maintained source.
2. Add CI gates for typecheck, lint, unit/integration tests, build, migration checks, dependency audit, and Playwright.
3. Cover auth, billing/webhooks, deletion, history/export, contact, mobile, and offline journeys with safe test accounts/services.
4. Add CSP/security headers, structured redacted monitoring, alerts, and a rollback runbook.
5. Rewrite README, architecture, privacy/data-flow, testing, and release documentation; remove stale conflict/dead files.

**Gate:** A clean clone can reproduce the database and deployed artifact from one reviewed commit, every claimed user journey has a passing test or documented manual evidence, and production aliases are verified after deployment.

## Recommended order of ownership

| Workstream | First owner needed | First deliverable |
|---|---|---|
| Supabase security | Database/security engineer | Emergency profile-role hardening migration plus privilege audit |
| Stripe | Backend engineer | Idempotent entitlement state machine and duplicate-customer reconciliation |
| Privacy/deletion | Product + backend + legal/privacy review | Accurate data inventory and app-scoped deletion contract |
| Analysis correctness | Frontend/ML application engineer | Input-revision state model, scoring corrections, and parser fixtures |
| Quality/release | Full-stack/release engineer | Clean committed baseline and CI verification matrix |

Until the Phase 0 and Phase 1 gates pass, the accurate statement is: **the public application deploys and some narrow paths work, but sign-in, paid access, deletion, and all core external-service journeys are not comprehensively proven—and one critical authorization boundary is currently broken.**
