# SuperDesign Implementation Plan

## Source Design
- Project ID: `08fcafa5-f354-41e1-85b9-aed9904157d6`
- Draft title: `Jalanea Tutor - Student Login (Consistency + Tokens)`
- Draft ID: `6e673f6f-137b-4aba-a18b-60931206af0f`
- Local HTML snapshot: `.superdesign/drafts/student-login-6e673f6f.html`

## Design Summary
The fetched SuperDesign draft is a warm, light-theme, child-friendly login screen for `Jalanea Tutor`. The page has:
- a minimal top brand header with a leaf icon and `Jalanea Tutor` wordmark
- a centered single-column form with a friendly headline and supportive copy
- two fields: first name and 4-digit secret PIN
- one calm sage primary CTA (`Start Learning`)
- a lightweight help link and restrained footer copy

This is not a small variant of the current ATS login page. The existing implementation in `src/app/(auth)/login/page.tsx` is a dark, neon, account-oriented flow for `Jalanea ATS` with:
- email/password auth
- Google OAuth
- checkout-context messaging
- a glass-card visual style tied to the rest of the ATS product

## Recommendation
Treat this draft as a new student-auth surface, not a direct replacement for the current ATS `/login` route.

Why:
- the product branding changes from `Jalanea ATS` to `Jalanea Tutor`
- the credential model changes from email/password to name + PIN
- the current auth hook and Supabase browser client only support email/password and Google OAuth
- `/login` is already part of the ATS billing and account flow, including `/pricing` checkout redirects and `/account` access

Recommended route strategy:
1. Preserve the current ATS `/login` and `/signup` flows for resume-checker users.
2. Introduce a dedicated student route such as `/student/login` or `/tutor/login`.
3. Extract shared auth-shell primitives so future designs can share structure without merging incompatible auth logic.

## Current Code Touchpoints

### Existing auth UI
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/account/page.tsx`
- `src/app/help/page.tsx`

### Existing auth logic
- `src/hooks/useAuth.ts`
- `src/lib/supabase-browser.ts`
- `src/app/api/auth/callback/route.ts`

### Existing theme/layout
- `src/app/layout.tsx`
- `src/app/globals.css`
- `src/components/PWAInstall.tsx`

## Implementation Phases

### Phase 1: Product and auth-model decision
Decide which of these is true before writing UI code:

#### Option A: Visual reskin only
Keep Supabase email/password auth, but restyle the page to look closer to the SuperDesign draft.

Tradeoff:
- fastest path
- lowest backend risk
- least faithful to the actual design because the draft does not include email/password or Google sign-in

#### Option B: New student login flow
Build a separate student auth entry using name + PIN.

Tradeoff:
- faithful to the design
- requires new backend/auth work
- should not replace ATS `/login` unless the repo is intentionally changing products

Recommended option: `B` if this repo is now expected to host the Tutor product. Otherwise ship `A` as a visual experiment on a new route and defer true PIN auth.

### Phase 2: Create shared auth presentation primitives
Extract the duplicated auth shell from the current login/signup pages into reusable components before implementing the new design.

Suggested additions:
- `src/components/auth/AuthShell.tsx`
- `src/components/auth/AuthBrand.tsx`
- `src/components/auth/AuthField.tsx`
- `src/components/auth/AuthPrimaryButton.tsx`

Responsibilities:
- isolate page chrome from auth logic
- make it easy to support both ATS and Tutor variants
- reduce duplication currently present in `src/app/(auth)/login/page.tsx` and `src/app/(auth)/signup/page.tsx`

### Phase 3: Add a Tutor-specific token layer
The fetched draft uses a different visual system than the current app:
- warm off-white page background instead of dark indigo gradients
- `Outfit`/`Plus Jakarta Sans` instead of the current DM Sans/Space Grotesk/Geist mix
- sage accents instead of orange/pink/purple neon gradients
- very soft borders and restrained shadows instead of glass-card effects

Implementation approach:
- add a small auth-specific token namespace in `src/app/globals.css` or a dedicated auth stylesheet
- avoid breaking the ATS theme by scoping Tutor tokens to a wrapper class such as `.theme-tutor`
- preserve accessible focus rings, hover states, and reduced-motion behavior

Suggested token group:
- `--tutor-bg`
- `--tutor-surface`
- `--tutor-text`
- `--tutor-text-muted`
- `--tutor-accent`
- `--tutor-border`
- `--tutor-shadow`

### Phase 4: Build the new route
Preferred path:
- add `src/app/student/login/page.tsx`

Route behavior:
- render the Tutor brand header, centered content, help link, and footer from the draft
- use the new auth-shell components from Phase 2
- keep the current ATS `/login` untouched during rollout

If the decision is to replace `/login`, update these additional places:
- `/pricing` redirects in `src/app/pricing/page.tsx`
- `/account` unauthenticated redirects in `src/app/account/page.tsx`
- Help/FAQ copy in `src/app/help/page.tsx`

### Phase 5: Implement student auth backend
This is the largest gap between the draft and the current codebase.

Current state:
- `useAuth()` exposes `signIn(email, password)`, `signUp(email, password)`, `signInWithGoogle()`, `signOut()`
- `src/lib/supabase-browser.ts` only wraps Supabase email/password and OAuth auth
- there is no concept of student lookup by name or PIN

To support the design faithfully, add:
- a student identity model in Supabase or another backing store
- a secure PIN verification flow
- a post-login session strategy for student users
- server-side rate limiting / brute-force protection for PIN attempts

Likely code areas:
- extend `src/lib/supabase-browser.ts` with a student sign-in method or add a new `src/lib/student-auth.ts`
- add a dedicated route handler such as `src/app/api/student/login/route.ts`
- add types for student auth payloads and responses
- define where successful student auth redirects next

Important note:
Plain “first name + 4-digit PIN” is not unique or secure on its own. The implementation needs one of:
- school/class context
- unique student identifier
- teacher-issued login code
- or a stronger credential strategy than a global first-name lookup

### Phase 6: Content and UX states
The design is intentionally minimal, but the production flow still needs states not shown in the draft:
- invalid name/PIN error
- loading state on submit
- disabled button state
- help-link destination
- empty-state validation
- mobile keyboard optimization for numeric PIN entry
- possible “show PIN” control if support tickets become an issue

Map these into the UI without breaking the calm visual tone.

### Phase 7: QA and rollout
Verify:
- keyboard navigation and focus visibility
- numeric keypad behavior on mobile for the PIN input
- responsive alignment from 320px upward
- auth failures and lockout messaging
- no regression to ATS `/login`, `/signup`, `/pricing`, and `/account`

Suggested rollout:
1. Ship the new page behind a distinct route.
2. Test with stubbed student auth first.
3. Connect real auth once backend shape is approved.
4. Only then decide whether any ATS auth surface should inherit Tutor visual tokens.

## Proposed File Plan

### New files
- `src/app/student/login/page.tsx`
- `src/components/auth/AuthShell.tsx`
- `src/components/auth/AuthBrand.tsx`
- `src/components/auth/AuthField.tsx`
- `src/components/auth/AuthPrimaryButton.tsx`
- `src/lib/student-auth.ts` or `src/app/api/student/login/route.ts`

### Existing files likely to change
- `src/app/globals.css`
- `src/app/help/page.tsx`
- `src/hooks/useAuth.ts` if student auth is folded into the existing hook
- `src/lib/supabase-browser.ts` if student auth is folded into the existing client helper

### Existing files to avoid changing unless required
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/signup/page.tsx`
- `src/app/pricing/page.tsx`
- `src/app/account/page.tsx`

These files are tied to the current ATS billing/account funnel and should stay stable unless the product direction has explicitly changed.

## Acceptance Criteria
- The SuperDesign draft is represented as a real route in the codebase.
- ATS login continues to function unless the product decision is to replace it.
- Tutor visual tokens are scoped and do not regress the existing ATS theme.
- Student auth has a clear backend contract before UI wiring is finalized.
- The help flow and post-login destination are defined, not left as placeholders.

## Open Questions
- Is this repo now serving both `Jalanea ATS` and `Jalanea Tutor`, or is Tutor replacing ATS?
- Should the student experience live on a new route, subdomain, or separate app?
- What is the real identity key for a student besides first name?
- What should the help link do in production?
- Where should successful student login redirect?
