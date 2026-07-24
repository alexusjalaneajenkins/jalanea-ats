# Jalanea ATS

Jalanea ATS is a Next.js resume checker with local document parsing,
deterministic ATS guidance, optional consent-gated Google Gemini analysis,
Supabase authentication and entitlements, Stripe billing, and Resend contact
delivery.

## Data flow

- PDF, DOCX, and TXT files are parsed in the browser.
- Resume sessions, history, and a signed-in user's optional Gemini key are
  stored in that browser. Browser storage is not presented as encrypted.
- Free and paid server AI requests send the extracted resume text and pasted
  job description to Google Gemini only after explicit consent.
- BYOK requests go from the browser to Google Gemini after consent. The key is
  scoped to the signed-in Supabase user ID and is never sent to Jalanea.
- Supabase stores shared identity plus ATS-specific membership, billing,
  entitlement, quota, deletion, and abuse-prevention records.
- Stripe stores payment/customer records. Resend receives contact-form content
  for delivery.

See the in-product Privacy Policy for user-facing details and
[`docs/FULL_REMEDIATION_AND_VERIFICATION_PLAN_2026-07-23.md`](docs/FULL_REMEDIATION_AND_VERIFICATION_PLAN_2026-07-23.md)
for the release acceptance matrix.

## Requirements

- Node.js 24
- Yarn 1.22.22
- Supabase CLI for database migrations
- Vercel CLI for production deployment
- Chromium for local Playwright verification

## Local setup

```bash
yarn install --frozen-lockfile
cp .env.example .env.local
yarn dev
```

Populate `.env.local` with development or test credentials. Never put live
provider secrets in a committed file.

## Environment variables

The complete inventory is in [`.env.example`](.env.example). Important groups:

- Supabase browser and service-role credentials
- Stripe secret, webhook, publishable key, and monthly/lifetime price IDs
- Gemini server key and identity-hashing salts
- Resend key plus verified contact sender/recipient
- Independent contact rate-limit HMAC secret
- Vercel `CRON_SECRET` for scheduled retention cleanup

Production must fail closed when a required server secret is missing.

## Verification

The release scripts intentionally distinguish source checks from live-provider
proof:

```bash
yarn check:release
yarn check:secrets
yarn typecheck
yarn lint
yarn test:unit
yarn build
yarn test:e2e
yarn audit:prod
```

`yarn verify` runs the source-level gate. Provider and production acceptance
still requires disposable-account authentication tests, Stripe test-mode
checkout/webhook/portal checks, Resend delivery inspection, deployed CSP/header
inspection, and desktop/mobile browser smoke tests.

## Supabase migrations

This application is linked to a shared Jalanea Supabase project. Do not delete,
renumber, or rewrite migrations owned by another Jalanea product.

Inspect the linked history before applying:

```bash
npx supabase migration list --linked
npx supabase db push --linked --dry-run
```

Apply reviewed pending migrations with the CLI:

```bash
npx supabase db push --linked --yes
```

Then run the applicable rollback-scoped SQL verifiers in `supabase/tests/`
against a disposable or explicitly approved connection. Administrative ATS
access grants are provisioned by immutable auth UUID outside source control;
email addresses must never be used as authorization.

## Deployment and rollback

Deploy only an exact, clean, reviewed commit:

```bash
vercel build --prod
vercel deploy --prebuilt --prod
```

After deployment, verify the production alias, authentication/session refresh,
resume uploads, deterministic and AI analysis paths, billing, deletion, contact
acceptance and delivery, jobs launcher, browser storage fallback, accessibility,
PWA offline notice, security headers, and runtime logs.

Keep the immediately previous production deployment ID/URL in the release
evidence. If a production gate fails, restore that deployment through Vercel
before investigating forward.

## Security and release notes

- Client UI state is never the authority for paid access.
- Service-only entitlement decisions are keyed to Supabase Auth UUIDs.
- Account deletion is serialized with checkout, webhook, subscription, quota,
  and administrative grant state.
- Contact and AI limits use durable atomic counters; provider errors are
  redacted from public responses.
- Generated output, linked Supabase temp state, conflict-copy files, debug logs,
  backups, and secrets must not be committed.

The historical audit is
[`docs/CODE_AUDIT_2026-07-21.md`](docs/CODE_AUDIT_2026-07-21.md).
