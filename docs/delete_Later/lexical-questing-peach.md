# Jalanea ATS: One-Day Sprint Plan

## Context

The app is functional but has visual clutter on the home page (redundant sections), a muddled nav that presents 3 access tiers in 3 different places, an untested payment flow, and several critical edge cases that could cause real user pain (open API endpoint, no webhook idempotency, success page that doesn't verify the subscription exists). Today's sprint addresses all 4 goals in priority order: security first, then payment verification, then UI/flow cleanup.

---

## Phase 1: Security & Edge Case Fixes (Critical)

### 1A. Rate-limit `/api/improve-bullet`
**File:** `src/app/api/improve-bullet/route.ts`

This endpoint uses the server's GEMINI_API_KEY with zero auth. Anyone can call it directly and burn through API quota. Add IP-based rate limiting matching the free tier pattern (reuse the IP extraction + daily count approach from `analyze-free/route.ts`). Gate: allow through if request has valid Bearer token (paid user), otherwise apply 3/day IP limit.

### 1B. Add webhook idempotency
**File:** `src/app/api/webhooks/stripe/route.ts`

For `checkout.session.completed` (lifetime): check if subscription with `id = session.id` already exists before inserting. For `customer.subscription.deleted`: skip update if status is already `canceled`. The existing `upsert` in `handleSubscriptionChange` is already safe by nature. Also: make `price_id` nullable in the upsert (set to `null` instead of FK reference) to avoid constraint failures when prices table isn't populated.

### 1C. Fix OAuth callback redirect
**File:** `src/app/api/auth/callback/route.ts`

Currently hardcoded to redirect to `/account` (line 39). Read a `redirect_to` query param and use it if present, fallback to `/account`. This allows the login page to pass through checkout intent.

### 1D. Add error handling for `checkAccess`
**File:** `src/hooks/useAuth.ts`

Wrap `checkSubscriptionStatus()` call in try/catch. Add `accessError: string | null` to state. On failure, don't set `hasAccess: false` (preserve previous state), but surface the error so UI can show a retry option.

---

## Phase 2: Checkout Success Verification

### 2A. Add subscription polling on success page
**File:** `src/app/checkout/success/page.tsx`

The page currently celebrates immediately without verifying the subscription exists (webhook may take 0.5-5 seconds). Add `useAuth` hook and poll `refreshAccess` every 2 seconds for up to 15 seconds. Show three states:
- **Verifying**: "Confirming your purchase..." with spinner (initial)
- **Verified**: Current celebration UI with confetti (subscription found)
- **Delayed**: "Payment received! It may take a moment to activate." (after timeout)

---

## Phase 3: Home Page UI Cleanup

### 3A. Remove redundant Feature Cards
**File:** `src/app/page.tsx`

Remove the `FeatureCard` component (lines 24-37) and the Feature Cards grid (lines 404-424). These 3 cards ("Privacy First", "See What ATS Sees", "Actionable Insights") duplicate what "How it Works" already says. The privacy message is already in the subtitle. Remove associated unused icon imports (`Shield`, `Eye`, `CheckCircle`).

### 3B. Remove redundant free tier banner from home page
**File:** `src/app/page.tsx`

Remove the large inline AI features banner (lines 354-402). The nav badge already shows free tier status, and the subtitle already says "No account needed for 3 free AI analyses per day." Two mentions is enough; three is clutter.

### 3C. Remove "Free forever" badge from results nav
**File:** `src/app/results/[sessionId]/page.tsx`

Remove the "Free forever" badge (lines 551-554). It contradicts paid tiers and adds noise. After removal, results nav has: logo, AI Settings, History -- clean.

### 3D. Standardize "AI Settings" label
**File:** `src/app/results/[sessionId]/page.tsx`

Change button label from "API Key checkmark" / "Add API Key" to "AI Settings checkmark" / "AI Settings" to match home page.

### 3E. Delete dead code
**File:** `src/components/StepGuide.tsx` -- DELETE (confirmed not imported anywhere)

### 3F. Clean unused CSS
**File:** `src/app/globals.css`

Remove `@keyframes float`, `@keyframes bounce-gentle`, `@keyframes gradient-shift`, `@keyframes shimmer` and their `.animate-*` utility classes + `.stagger-*` delay classes if confirmed unused in source files (verify with grep before removing).

---

## Phase 4: Payment Flow End-to-End Test

### 4A. Stripe CLI webhook testing (manual)
1. `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Navigate to /pricing, click "Get lifetime access" with test card `4242 4242 4242 4242`
3. Verify: webhook received 200, success page shows verification polling, account page shows active subscription
4. Resend webhook event with `stripe events resend evt_xxx` to confirm idempotency (no duplicate records)

### 4B. Login-to-checkout redirect test (manual)
1. Sign out, go to /pricing, click purchase
2. Confirm redirect to /login with checkout context
3. Log in, confirm redirect back to /pricing and checkout resumes

### 4C. Free tier limit test (manual)
1. Clear any existing usage
2. Run 3 free analyses, confirm 4th is blocked with friendly message
3. Verify count display updates correctly

---

## What Gets Deferred

| Issue | Why |
|-------|-----|
| In-memory rate limiter resets on deploy | Needs Redis/DB infra -- not a one-day fix |
| X-Forwarded-For IP spoofing | Needs deploy-env-specific header research |
| Free tier atomic increment (race condition) | Needs Supabase RPC migration |
| ConsentModal merge into ByokKeyModal | 4-step wizard is too complex to merge in one day; two-modal flow works, just feels slightly jarring |
| Results page refactor (1070 lines) | Maintainability, not user-facing today |
| API timeout handling (Stripe/Gemini) | Important but not visible today |

---

## Files Changed

| File | Phase | Change |
|------|-------|--------|
| `src/app/api/improve-bullet/route.ts` | 1A | Add rate limiting |
| `src/app/api/webhooks/stripe/route.ts` | 1B | Idempotency guards |
| `src/app/api/auth/callback/route.ts` | 1C | Read redirect_to param |
| `src/hooks/useAuth.ts` | 1D | Error handling for checkAccess |
| `src/app/checkout/success/page.tsx` | 2A | Subscription verification polling |
| `src/app/page.tsx` | 3A, 3B | Remove feature cards + free tier banner |
| `src/app/results/[sessionId]/page.tsx` | 3C, 3D | Remove badge, standardize label |
| `src/components/StepGuide.tsx` | 3E | Delete file |
| `src/app/globals.css` | 3F | Remove unused animations |

**Total: 9 files** (1 deleted, 8 modified)

---

## Verification

After each phase:
- `npx next build` must pass
- `npx eslint src/` must pass
- Type-check: `npx tsc --noEmit`

After Phase 4 manual tests:
- Stripe dashboard shows test payment
- Supabase `subscriptions` table has new row
- Success page transitions from "Confirming..." to celebration
- Account page shows "Active" subscription
- Webhook resend produces no duplicate rows
