# Route Map

Routing model:
- Next.js App Router
- File-based routing under `src/app`
- No separate router config file detected
- All UI routes use the shared root layout in `src/app/layout.tsx`

## UI Routes

| URL | File | Layout | Summary |
| --- | --- | --- | --- |
| `/` | `src/app/page.tsx` | `src/app/layout.tsx` | Main ATS landing page with upload flow, auth entry point, and AI configuration modals. |
| `/login` | `src/app/(auth)/login/page.tsx` | `src/app/layout.tsx` | Existing ATS login page using email/password and Google OAuth. |
| `/signup` | `src/app/(auth)/signup/page.tsx` | `src/app/layout.tsx` | Existing ATS signup page with email/password, Google OAuth, and confirmation state. |
| `/account` | `src/app/account/page.tsx` | `src/app/layout.tsx` | Authenticated account overview with subscription, billing, email change, and account deletion actions. |
| `/pricing` | `src/app/pricing/page.tsx` | `src/app/layout.tsx` | Subscription pricing page with Stripe checkout entry points. |
| `/results/[sessionId]` | `src/app/results/[sessionId]/page.tsx` | `src/app/layout.tsx` | Resume analysis results experience with score panels, education content, export, and history. |
| `/help` | `src/app/help/page.tsx` | `src/app/layout.tsx` | FAQ/help center covering product usage, account, billing, and technical issues. |
| `/contact` | `src/app/contact/page.tsx` | `src/app/layout.tsx` | Contact/support form. |
| `/checkout/success` | `src/app/checkout/success/page.tsx` | `src/app/layout.tsx` | Post-checkout confirmation and subscription success flow. |
| `/privacy` | `src/app/privacy/page.tsx` | `src/app/layout.tsx` | Privacy policy content page. |
| `/terms` | `src/app/terms/page.tsx` | `src/app/layout.tsx` | Terms of service content page. |
| `/analyze` | `src/app/analyze/page.tsx` | `src/app/layout.tsx` | Redirect page that sends users back to `/`. |

## API Routes

| URL | File | Purpose |
| --- | --- | --- |
| `/api/analyze` | `src/app/api/analyze/route.ts` | Main analysis endpoint. |
| `/api/analyze-free` | `src/app/api/analyze-free/route.ts` | Free-tier analysis endpoint. |
| `/api/improve-bullet` | `src/app/api/improve-bullet/route.ts` | Resume bullet improvement endpoint. |
| `/api/contact` | `src/app/api/contact/route.ts` | Contact form submission handler. |
| `/api/checkout` | `src/app/api/checkout/route.ts` | Creates Stripe checkout sessions. |
| `/api/billing/portal` | `src/app/api/billing/portal/route.ts` | Opens Stripe billing portal sessions. |
| `/api/auth/callback` | `src/app/api/auth/callback/route.ts` | Handles Supabase OAuth callback exchange and redirects. |
| `/api/account/delete` | `src/app/api/account/delete/route.ts` | Deletes user account and cleans up billing/auth state. |
| `/api/webhooks/stripe` | `src/app/api/webhooks/stripe/route.ts` | Stripe webhook receiver. |

## Auth-Relevant Notes
- The existing auth surface is account-centric ATS auth, not student/tutor auth.
- `/login` and `/signup` are designed around Supabase email/password plus Google OAuth.
- `/pricing` redirects unauthenticated users to `/login?redirect=/pricing&reason=checkout`.
