# Stripe + Supabase Payment Implementation

**Created:** 2026-02-02
**Status:** Planning complete, ready for implementation
**Research Source:** [EXTERNAL - Gemini Deep Research]

---

## Goal

Implement payment system for Jalanea ATS:
- **$15 lifetime** — One-time Stripe payment
- **$5/month** — Stripe subscription
- **Free tier** — Already implemented (3 uses/day, no account required)
- **BYOK model** — Users bring their own API key, minimal costs for us

---

## Current State (as of 2026-02-02)

| Component | Status |
|-----------|--------|
| Supabase SDK | ✅ Installed (`@supabase/supabase-js`) |
| Supabase client | ✅ Configured (`/src/lib/supabase.ts`) |
| Supabase Auth | ❌ Not implemented |
| Stripe SDK | ❌ Not installed |
| Stripe env vars | ❌ Not configured |
| Payment API routes | ❌ Not created |
| Database schema | ❌ Only `ats_analyses` table exists |

---

## Research Findings [EXTERNAL - Gemini]

### 1. Database Schema Design

**Key insight:** Don't store Stripe state in `auth.users`. Use dedicated `public` schema tables that mirror Stripe objects.

**Tables needed:**
- `profiles` — Extends `auth.users` with `stripe_customer_id`
- `products` — Mirrored from Stripe (name, description, image)
- `prices` — Mirrored from Stripe (unit_amount, currency, type, interval)
- `subscriptions` — Core table with status, price_id, current_period_end, `is_lifetime` flag

### 2. Webhook Handling Patterns

**Source of truth:** Webhooks, not frontend state.

**Key patterns:**
- Use `request.text()` for raw body verification (App Router requirement)
- Implement idempotency via `events_log` table
- Use `client_reference_id` to link Stripe customer to Supabase user

**Core events to handle:**
- `checkout.session.completed` — Create subscription record, link stripe_customer_id
- `customer.subscription.updated` — Update status, period dates
- `customer.subscription.deleted` — Mark as canceled

### 3. Lifetime Deals vs Subscriptions

**Schema approach:**
- Add `is_lifetime BOOLEAN DEFAULT FALSE` to subscriptions table
- For lifetime: set `current_period_end` to `9999-12-31`
- Create unified `has_active_access(user_id)` function

**Stripe setup:**
- Lifetime: Product with "one_time" price ($15)
- Monthly: Product with "recurring" price ($5/month)

### 4. Row Level Security (RLS)

- Users can only view/update their own profile
- Users can only view their own subscriptions
- Premium features gated by `has_active_access(auth.uid())`

### 5. SDK Usage

| Context | SDK | Key Type |
|---------|-----|----------|
| Client-side | `@stripe/stripe-js` | Publishable key only |
| Server-side (API routes) | `stripe` | Secret key |
| Webhooks | `stripe` + Supabase service role | Secret key + service role |

### 6. Common Pitfalls

- **"Shadow User" problem:** User pays before account created → Use `client_reference_id`
- **Manual status checks:** Never trust frontend → Always verify via RLS or server
- **Webhook lag:** Show "Processing..." state until DB reflects update

---

## SQL Migration

Run this in Supabase SQL Editor:

```sql
-- 1. PROFILES: Extends Supabase Auth
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  billing_address JSONB,
  payment_method JSONB,
  stripe_customer_id TEXT UNIQUE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. PRODUCTS: Mirrored from Stripe
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  active BOOLEAN,
  name TEXT,
  description TEXT,
  image TEXT,
  metadata JSONB
);

-- 3. PRICES: Mirrored from Stripe
CREATE TYPE pricing_type AS ENUM ('one_time', 'recurring');
CREATE TYPE pricing_plan_interval AS ENUM ('day', 'week', 'month', 'year');

CREATE TABLE public.prices (
  id TEXT PRIMARY KEY,
  product_id TEXT REFERENCES public.products,
  active BOOLEAN,
  description TEXT,
  unit_amount BIGINT,
  currency TEXT CHECK (char_length(currency) = 3),
  type pricing_type,
  interval pricing_plan_interval,
  interval_count INTEGER,
  metadata JSONB
);

-- 4. SUBSCRIPTIONS: Supports recurring and lifetime
CREATE TYPE subscription_status AS ENUM (
  'trialing', 'active', 'canceled', 'incomplete',
  'incomplete_expired', 'past_due', 'unpaid'
);

CREATE TABLE public.subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  status subscription_status,
  metadata JSONB,
  price_id TEXT REFERENCES public.prices,
  quantity INTEGER,
  cancel_at_period_end BOOLEAN,
  created TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  current_period_end TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_start TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  is_lifetime BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 5. ACCESS CHECK FUNCTION
CREATE OR REPLACE FUNCTION public.has_active_access(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE subscriptions.user_id = has_active_access.user_id
    AND (
      (status = 'active') OR
      (is_lifetime = TRUE) OR
      (status = 'trialing')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. RLS POLICIES

-- Profiles: Users can view and update their own
CREATE POLICY "Can view own profile data"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Can update own profile data"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Subscriptions: Users can only view their own
CREATE POLICY "Can view own subscription data"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- 7. TRIGGER: Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## Implementation Phases

### Phase 1: Package Installation
```bash
npm install stripe @stripe/stripe-js @supabase/ssr
```

### Phase 2: Environment Variables
Add to `.env.local`:
```
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Phase 3: Database Migration
Run SQL above in Supabase SQL Editor.

### Phase 4: Stripe Products
Create in Stripe Dashboard:
1. Product: "Jalanea ATS Lifetime" → Price: $15 one-time
2. Product: "Jalanea ATS Monthly" → Price: $5/month recurring

### Phase 5: API Routes
Create:
- `/api/checkout/route.ts` — Create Stripe Checkout session
- `/api/webhooks/stripe/route.ts` — Handle Stripe events

### Phase 6: Auth Integration
- Add Supabase auth helpers
- Create login/signup UI
- Update middleware for session handling

### Phase 7: Access Gating
- Update AI features to check `has_active_access`
- Keep free tier (3 uses/day) for non-authenticated users
- Paid users get unlimited AI features

### Phase 8: UI Components
- Pricing page with plan options
- Account/subscription management
- Upgrade prompts in app

---

## Files to Create

| File | Purpose |
|------|---------|
| `/src/lib/stripe.ts` | Stripe client initialization |
| `/src/lib/supabase-server.ts` | Server-side Supabase with service role |
| `/src/app/api/checkout/route.ts` | Create checkout session |
| `/src/app/api/webhooks/stripe/route.ts` | Webhook handler |
| `/src/app/(auth)/login/page.tsx` | Login page |
| `/src/app/(auth)/signup/page.tsx` | Signup page |
| `/src/app/pricing/page.tsx` | Pricing page |
| `/src/app/account/page.tsx` | Account management |
| `/src/components/PricingCard.tsx` | Pricing display component |
| `/src/hooks/useSubscription.ts` | Subscription status hook |

---

## Test Plan

| Test | Expected Result |
|------|-----------------|
| User signup | Profile auto-created in DB |
| Checkout redirect | Redirects to Stripe Checkout |
| Successful payment | Subscription record created |
| Lifetime purchase | `is_lifetime = true`, `current_period_end = 9999-12-31` |
| Monthly subscription | `is_lifetime = false`, `current_period_end = +1 month` |
| Access check (paid) | `has_active_access` returns true |
| Access check (free) | `has_active_access` returns false |
| Cancel subscription | Status updated to 'canceled' |
| Webhook signature | Invalid signature rejected |

---

## Resume Instructions

If context is lost, share this document and say:
> "Continue implementing Stripe + Supabase payments. Here's the plan doc."

Current progress will be tracked in this section:

### Progress Tracker
- [x] Phase 1: Package installation ✅ (stripe@20.3.0, @stripe/stripe-js@8.7.0, @supabase/ssr@0.8.0)
- [x] Phase 2: Environment variables ✅ (placeholders added to .env.local)
- [x] Phase 3: Database migration ✅ (SQL file created: supabase/migrations/001_stripe_tables.sql)
- [ ] Phase 4: Stripe products created (USER ACTION: Create in Stripe Dashboard)
- [x] Phase 5: API routes ✅
  - `/src/lib/stripe.ts` - Server Stripe client
  - `/src/lib/stripe-client.ts` - Browser Stripe client
  - `/src/lib/supabase-server.ts` - Service role client
  - `/src/app/api/checkout/route.ts` - Checkout session API
  - `/src/app/api/webhooks/stripe/route.ts` - Webhook handler
- [ ] Phase 6: Auth integration (TODO)
- [ ] Phase 7: Access gating (TODO)
- [ ] Phase 8: UI components (TODO)

### User Actions Required
1. **Get Supabase Service Role Key**: Dashboard > Settings > API > service_role key
2. **Create Stripe Account**: https://dashboard.stripe.com
3. **Get Stripe API Keys**: Stripe Dashboard > Developers > API keys
4. **Run SQL Migration**: Supabase Dashboard > SQL Editor > paste contents of `supabase/migrations/001_stripe_tables.sql`
5. **Create Stripe Products**:
   - Product 1: "Jalanea ATS Lifetime" → Price: $15 one-time
   - Product 2: "Jalanea ATS Monthly" → Price: $5/month recurring
6. **Create Stripe Webhook**: Stripe Dashboard > Developers > Webhooks > Add endpoint
   - URL: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.*`
