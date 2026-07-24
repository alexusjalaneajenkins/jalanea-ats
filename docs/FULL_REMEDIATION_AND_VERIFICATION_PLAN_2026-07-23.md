# Jalanea ATS full remediation and verification plan

**Created:** July 23, 2026
**Source audit:** `docs/CODE_AUDIT_2026-07-21.md`
**Objective:** Make every currently documented or advertised Jalanea ATS journey work safely, close every P0-P3 audit finding, test each previously failing path, deploy the exact verified source and database state, and only then report that the scoped product works.

## The promise this plan does and does not make

“Everything works” will not mean “the build passed.” It will mean:

1. Every audit finding has a fix, removal, or truthful product decision.
2. Every advertised user journey has an acceptance test.
3. Every previously failing test is rerun after the fix.
4. Security and billing boundaries have negative as well as positive tests.
5. A clean checkout can reproduce the application and database.
6. The exact verified source is deployed.
7. The production journeys pass again after deployment.

An entirely new job marketplace, scraping system, or application-tracking product is not silently included. The required “Find Jobs” outcome for this release is an honest, reachable job-search launcher that accepts a role/location and opens supported job-board searches. Internal aggregation requires a separately approved data provider, licensing terms, schema, and product scope.

## Stage ownership

Each stage has one accountable agent. The coordinating agent preserves the evidence and does not mark a later stage complete until its entry gate passes.

| Stage | Accountable agent | Deliverable | Exit gate |
|---|---|---|---|
| 0. Scope and baseline | Coordinator | This plan, frozen acceptance criteria, dirty-tree inventory | No user-owned work is overwritten; scope and success language are explicit |
| 1. Current-state audit | Audit agent | Finding-by-finding current closure matrix | Every P0-P3 item is still-present/fixed/changed with evidence |
| 2. Test baseline | Test agent | Local and production pass/fail matrix with artifacts | Every advertised journey has a current observed status |
| 3. Official research | Research agent | Source-backed design decisions for failed boundaries | Supabase, Stripe, Next.js, browser/PWA, and accessibility choices are current |
| 4. Fix design | Planning agent | Ordered implementation packets, migrations, tests, rollback | Every failure has files, dependencies, acceptance tests, and rollback |
| 5. Implementation | Implementation agents, one risk wave at a time | Reviewed code, forward migrations, tests, docs | P0, then P1, then P2/P3 packets pass locally before the next wave |
| 6. Regression verification | Verification agent | Clean-clone and full-story evidence | Every previously failed test passes; no open P0-P2; no false product claim |
| 7. Release | Release agent | Applied migrations, exact-source deployment, production verification | Production alias points to the verified artifact and full smoke matrix passes |
| 8. Closure | Coordinator | Final finding/journey matrix | “Works” is used only beside passing evidence and known external limitations |

## Stage 1 — Re-audit current state

### Code and repository

- Confirm the nested Git checkout, current commit, branch, remote, staged/unstaged/untracked files, generated artifacts, and deployment linkage.
- Preserve all unrelated dirty-tree changes.
- Map all 45 audit findings to the current source.
- Identify changed behavior since July 21 and any new regression.
- Separate ATS-owned migrations from tutoring-owned/shared-schema migrations.
- Identify the canonical migration repository for the linked Supabase project.

### Architecture and data flow

- Trace browser → route handler → Supabase/Stripe/Gemini → response for each journey.
- Inventory every public API route and verify authentication, authorization, consent, validation, quotas, cache policy, errors, and logging.
- Inventory every exposed Supabase table/view/function, role grant, RLS policy, security-definer function, and storage policy touched by ATS identities.
- Inventory every Stripe product/price/customer/subscription/event state used by the code.

### Exit artifact

A table with: finding ID, current status, evidence, affected journey, fix dependency, required test, and release blocker.

## Stage 2 — Establish the test baseline

### Static and repository checks

- Dependency install/integrity from a clean temporary verifier.
- TypeScript, ESLint, production build, dependency audit, secret scan, migration ordering/checksum review, Supabase database lint/advisors, and `git diff --check`.
- Verify Node/package-manager pins and reproducible scripts.

### Browser journeys

Test desktop and mobile where relevant:

1. Public navigation and legal/help/contact pages.
2. TXT, PDF, and DOCX upload, extraction preview, local analysis, and error cases.
3. Job-description paste/edit/reanalyze; stale and concurrent-request prevention.
4. AI consent accept, cancel, revoke, and required-header enforcement.
5. Anonymous free analysis and quota exhaustion/reset.
6. Email signup, confirmation, login, logout, failure recovery, and password reset.
7. Google OAuth start, callback success/failure, safe return path, and session refresh.
8. Paid monthly and lifetime checkout in Stripe test mode.
9. Webhook duplicate, retry, reordering, async payment success/failure, paused/canceled, and renewal states.
10. Billing portal and safe return path.
11. Paid V2 and BYOK authorization/loading/failure states.
12. Resume Improver consent, quota, parsing, and persistence.
13. History save/reload/export/delete and complete local erasure.
14. ATS-scoped account deletion without deleting tutoring identity/data.
15. Contact delivery with a controlled test destination.
16. Find Jobs launcher with role/location and supported outbound searches.
17. Keyboard-only, screen-reader semantics, focus management, reduced motion, and color/zoom checks.
18. Installable PWA and either verified offline shell or removal of the offline claim.

### Negative security tests

- Normal authenticated user cannot change `profiles.role`, billing identifiers, or another profile.
- Anonymous/authenticated clients cannot call privileged functions directly.
- Unconsented AI text never reaches Gemini.
- Free/paid quotas cannot be bypassed by invalid bodies, instance churn, retries, or concurrency.
- External, protocol-relative, backslash, and script-scheme redirects are rejected.
- Service-role/Stripe/Gemini/Resend secrets never reach client bundles or responses.
- Logs and error payloads contain no resume/job content.

### Exit artifact

Every journey gets `PASS`, `FAIL`, `BLOCKED BY EXTERNAL CONFIG`, or `NOT IMPLEMENTED`, with reproduction evidence. `BLOCKED` is not treated as working.

## Stage 3 — Research failed boundaries

Only primary/current sources are acceptable:

- Supabase changelog and documentation for SSR sessions, grants, RLS, column-safe self-service, security-definer functions, deletion/session revocation, and CLI migration workflow.
- Stripe documentation for Checkout idempotency, customer reuse, webhook ordering/retries, event IDs, payment status, async payment events, subscription statuses, portal return URLs, and test clocks.
- Next.js documentation for proxy/session refresh, route handlers, security headers, server/client boundaries, and supported production versions.
- WAI-ARIA Authoring Practices for dialogs and keyboard interaction.
- Browser/service-worker documentation for installability and an honest offline contract.
- Package advisories and upstream releases for every audit finding.

Research must result in a code decision and an acceptance test, not a link collection.

## Stage 4 — Ordered fix design

### Wave 0: immediate containment

1. Create a forward migration with the Supabase CLI.
2. Revoke direct browser updates to security-sensitive profile columns.
3. Drop every broad self-update policy and expose only an allowlisted self-service RPC.
4. Move or harden admin authority so users cannot self-assign it.
5. Audit existing admin roles and privileged activity.
6. Remove/disable the insecure legacy AI route and require consent plus durable quota on Resume Improver.

**Gate:** remote normal-user negative tests pass before any other production claim.

### Wave 1: billing, identity, privacy, and deletion

- Add a Stripe event inbox/idempotency record with monotonic event handling.
- Reuse one customer per identity and reject/coalesce duplicate active checkout.
- Require paid settlement for lifetime fulfillment; handle async success/failure and every subscription state.
- Make portal/checkout return URLs server-canonical.
- Separate ATS membership/deletion from the shared tutoring Auth identity.
- Add compensating behavior for Stripe/database partial failures.
- Centralize complete local erasure and retention cleanup.
- Redact provider errors/logs and correct privacy/terms/help copy.
- Upgrade vulnerable exercised-path dependencies.

### Wave 2: analysis and authentication correctness

- Split authentication loading from entitlement loading.
- Never erase saved BYOK configuration from transient state.
- Use an immutable input revision/hash and abort superseded analyses.
- Prevent concurrent requests and persist the successful result for its exact inputs.
- Pass paid entitlement independently of anonymous quota.
- Reconstruct PDF lines from coordinates and add parser fixtures.
- Use three-state knockout results and evidence-aware section scoring.
- Implement password recovery and SSR session refresh.
- Validate redirects through one canonical helper.

### Wave 3: accessibility, PWA, quality, and truthful capability

- Migrate all modals to one accessible dialog primitive.
- Add robust IndexedDB probing/fallback and clear reduced-storage messaging.
- Implement a tested app shell or remove offline promises.
- Fix assets, misleading controls, copy/support-address drift, and format acceptance.
- Add the honest Find Jobs launcher.
- Remove dead/conflict/generated source and add safe ignores/runtime pins.
- Add CSP and baseline response headers.
- Rewrite README, setup, architecture/data-flow, testing, release, and rollback docs.

### Wave 4: automated safety net

- Unit tests for redirects, scoring, parsing, storage erasure, entitlement state, quota order, and webhook reduction.
- Integration tests for route authorization/consent and Supabase grants/RLS.
- Stripe fixture/replay tests for duplicates, retries, reordering, async payment, pause, cancel, and renewal.
- Playwright journeys for the complete browser matrix.
- CI gates: install, typecheck, lint, unit/integration, build, dependency/security checks, migration validation, and E2E.

## Stage 5 — Implementation rules

- Use forward migrations only; never rewrite applied migration history.
- Create migrations with `supabase migration new`.
- Apply the smallest risk wave and test it before starting the next.
- Do not delete or reformat unrelated user-owned files.
- Do not use production customers/users for destructive tests.
- Use Stripe test mode/test clocks and dedicated Supabase test identities.
- Keep production disabled/contained where a P0 boundary is not yet proven.
- Every code change must add or update the test that proves its acceptance criterion.

## Stage 6 — Regression and release candidate

A release candidate is eligible only when:

- P0: zero open.
- P1: zero open.
- P2: zero open.
- P3: all fixed or product copy/behavior intentionally removed with a test.
- TypeScript, focused and repository lint, tests, build, dependency checks, and database checks pass from a clean verifier.
- All previous failures have named passing regression tests.
- No secret or resume/JD content appears in bundles, logs, or error payloads.
- A clean clone plus committed migrations reproduces the candidate.

## Stage 7 — Deployment

1. Record pre-release database and Vercel rollback points.
2. Apply verified forward migrations with the Supabase CLI.
3. Re-run remote grants/RLS/RPC negative and positive tests.
4. Deploy the exact reviewed commit.
5. Confirm the production alias targets that deployment.
6. Run the production-safe browser/API smoke matrix.
7. Inspect runtime logs and Stripe/Supabase state for the test journeys.
8. Roll back application traffic if a release gate fails; use forward database repair where rollback is unsafe.

## Stage 8 — Final evidence

The final report will contain:

- Every audit finding with before evidence, fix, test, and production status.
- Every product journey with browser/API/data evidence.
- Exact migration versions and deployment/commit identifiers.
- Any external dependency that prevents a journey from being proven.
- A plain-language answer:
  - **“Verified working”** only if all boundaries passed.
  - **“Not yet verified”** if any boundary lacks evidence.
  - **“Does not work”** if any boundary still fails.

No successful build, READY deployment, or absence of recent logs will be used as a substitute for this matrix.
