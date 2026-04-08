# Extractable Components

## RootLayout
- Source: `src/app/layout.tsx`
- Category: layout
- Description: Global app shell that provides metadata, fonts, global CSS, and the persistent PWA install surface.
- Extractable props: none
- Hardcoded: HTML shell, Geist font setup, Jalanea ATS metadata, manifest, theme color, `PWAInstall`

## PWAInstallBanner
- Source: `src/components/PWAInstall.tsx`
- Category: layout
- Description: Fixed install banner that appears across the app when a PWA install prompt is available.
- Extractable props: `showBanner` (boolean, derived), install CTA labels if externalized
- Hardcoded: Jalanea ATS copy, gradient icon treatment, bottom-right positioning, indigo/orange visual language

## KeywordChip
- Source: `src/components/ui/KeywordChip.tsx`
- Category: basic
- Description: Status-driven pill component for keyword coverage and ATS findings.
- Extractable props: `keyword`, `status`, `importance`, `size`, `onClick`
- Hardcoded: icon mapping per status, emerald/red/amber/blue palette, rounded pill styling

## Tooltip
- Source: `src/components/ui/Tooltip.tsx`
- Category: basic
- Description: Reusable tooltip wrapper with directional positioning and motion transitions.
- Extractable props: `content`, `position`, `delay`, `className`
- Hardcoded: indigo tooltip surface, arrow styling, motion variants

## ScoreAnnouncer
- Source: `src/components/ui/ScoreAnnouncer.tsx`
- Category: basic
- Description: Accessibility-only live region for announcing score changes.
- Extractable props: `scores`, `announceOnMount`
- Hardcoded: polite ARIA live region behavior, hidden visual presentation

## AuthBrandLockup
- Source: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
- Category: basic
- Description: Duplicated auth-page brand lockup that could be extracted into a reusable brand header component.
- Extractable props: `href`, optional subtitle or product name variant
- Hardcoded: `Sparkles` icon, orange/pink/purple gradient badge, `Jalanea ATS` wordmark, centered auth placement

## AuthCardShell
- Source: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/signup/page.tsx`
- Category: layout
- Description: Duplicated glass-card auth shell used by both login and signup pages.
- Extractable props: `title`, `subtitle`, `children`, optional banner slot, footer CTA
- Hardcoded: `glass-card` outer shell, indigo-to-purple inner panel, rounded radii, spacing rhythm
