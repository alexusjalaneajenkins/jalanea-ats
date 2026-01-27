# Jalanea ATS - Restructure & Improvement Plan

## Executive Summary

This document outlines a comprehensive plan to reorganize the codebase, fix UX issues, and add PWA capabilities to Jalanea ATS.

**Key Problems to Solve:**
1. Unclear purpose - users don't understand what the tool does
2. Confusing flow - too many elements competing for attention
3. Poor mobile experience - layout doesn't adapt well
4. Code organization - massive files, incomplete exports

---

## Phase 1: Code Cleanup & Restructure

### Current Structure Issues

```
src/
├── app/
│   ├── page.tsx (529 lines - acceptable)
│   └── results/[sessionId]/page.tsx (1,108 lines - TOO BIG!)
├── components/ (20+ components, many not exported properly)
├── lib/
│   └── analysis/
│       ├── keywords.ts
│       └── keywords 2.ts  ← DUPLICATE FILE
```

### Proposed New Structure

```
src/
├── app/
│   ├── layout.tsx (shared navigation + providers)
│   ├── page.tsx (simplified landing)
│   ├── results/[sessionId]/
│   │   ├── page.tsx (orchestration only, ~200 lines)
│   │   ├── _components/
│   │   │   ├── ResultsHeader.tsx
│   │   │   ├── ScoreSection.tsx
│   │   │   ├── TabsPanel.tsx
│   │   │   └── Sidebar.tsx
│   │   └── _hooks/
│   │       ├── useJobAnalysis.ts
│   │       └── useSession.ts
│   └── (marketing)/
│       ├── how-it-works/page.tsx (new - explain the tool)
│       └── privacy/page.tsx
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx (extracted from pages)
│   │   ├── Footer.tsx
│   │   └── MobileNav.tsx
│   ├── features/
│   │   ├── upload/
│   │   ├── analysis/
│   │   ├── job-match/
│   │   └── results/
│   └── ui/
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       └── ...
├── hooks/
│   ├── useLlmConfig.ts
│   ├── useProgress.ts
│   └── useMediaQuery.ts (new - for responsive behavior)
└── lib/
    ├── analysis/
    │   └── (remove keywords 2.ts)
    └── ...
```

### Files to Delete/Merge

| File | Action | Reason |
|------|--------|--------|
| `lib/analysis/keywords 2.ts` | DELETE | Duplicate/unused |
| `.DS_Store` | DELETE | macOS artifact |
| `next.config.ts.bak` | DELETE | Backup file |

### Large File Refactoring

**`results/[sessionId]/page.tsx` (1,108 lines) → Split into:**

1. `page.tsx` (~150 lines) - Layout and state orchestration
2. `_hooks/useSession.ts` (~100 lines) - Session loading logic
3. `_hooks/useJobAnalysis.ts` (~150 lines) - Job analysis logic
4. `_components/ResultsHeader.tsx` (~80 lines) - File info + breadcrumb
5. `_components/ScoreSection.tsx` (~100 lines) - Score cards grid
6. `_components/TabsPanel.tsx` (~200 lines) - Tab navigation + content
7. `_components/Sidebar.tsx` (~150 lines) - JD input + PDF signals
8. `_components/HistoryModal.tsx` (~100 lines) - History overlay

---

## Phase 2: UX Improvements

### Problem 1: Unclear Purpose

**Current:** Users land on a page that immediately asks for an API key, with no explanation of what they'll get.

**Solution:**

1. **Remove API key requirement to start** - Let users upload a resume first
2. **Add "How it Works" section** on landing page
3. **Show sample results** before requiring upload
4. **Simplify value proposition** - "See your resume the way robots see it"

**Before:**
```
[Step 1: Add API Key] ← Blocks everything
[Step 2: Upload Resume]
```

**After:**
```
[Upload Resume] ← Can start immediately!
[See Basic Results] ← Free, no API key needed
[Add API Key for AI Features] ← Optional enhancement
```

### Problem 2: Confusing Flow

**Current:** Results page has 5 tabs, 4 score cards, sidebar with inputs, and a floating action button - all visible at once.

**Solution:**

1. **Progressive disclosure** - Show one thing at a time
2. **Reduce tabs from 5 to 3:**
   - "Overview" (merge Findings + Score Cards)
   - "Job Match" (keep)
   - "Raw Text" (merge Preview + Learn)
3. **Remove "Compare" tab** - Move to separate page or feature
4. **Add clear "Next Step" prompts** throughout

**Simplified Tab Structure:**
```
[Overview] → [Job Match] → [Details]
    ↓           ↓            ↓
  Scores     Keywords      Raw text
  Issues     Knockouts     Tips
  Quick tips  AI insights   Export
```

### Problem 3: Mobile Experience

**Current Issues:**
- 3-column layout on desktop doesn't collapse well
- Tab overflow on mobile (5 tabs don't fit)
- Sidebar input competes with content

**Solutions:**

1. **Mobile-first redesign:**
   - Single column on mobile
   - Bottom sheet for job description input
   - Swipeable tabs instead of horizontal scroll

2. **Better responsive breakpoints:**
   ```css
   /* Mobile first */
   @media (min-width: 768px) { /* Tablet: 2 columns */ }
   @media (min-width: 1024px) { /* Desktop: 3 columns */ }
   ```

3. **Touch-friendly targets:**
   - Minimum 44px tap targets
   - Larger buttons on mobile
   - Remove hover-only interactions

---

## Phase 3: PWA Implementation

### Required Files

1. **`public/manifest.json`**
```json
{
  "name": "Jalanea ATS - Resume Checker",
  "short_name": "Jalanea ATS",
  "description": "Check if your resume will pass ATS screening",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#121218",
  "theme_color": "#f97316",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

2. **`public/sw.js`** (Service Worker)
   - Cache static assets
   - Offline fallback page
   - Background sync for analysis results

3. **App Icons** (create in Figma/Canva)
   - 192x192 PNG
   - 512x512 PNG
   - 512x512 maskable (for Android adaptive icons)
   - favicon.ico
   - apple-touch-icon.png

### PWA Plugin Options

**Recommended: `next-pwa`**
```bash
npm install next-pwa
```

```js
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

module.exports = withPWA({
  // existing config
});
```

**Alternative: `@ducanh2912/next-pwa`** (more actively maintained)
```bash
npm install @ducanh2912/next-pwa
```

### Offline Strategy

| Resource Type | Strategy | Reason |
|--------------|----------|--------|
| Static assets | Cache First | Fast load, rarely changes |
| App shell | Stale While Revalidate | Balance fresh + fast |
| API routes | Network Only | Can't cache without backend |
| Parsed resumes | IndexedDB | Already using `idb` package |

---

## Phase 4: Implementation Order

### Week 1: Foundation
1. ✅ Create this plan document
2. Delete unused files (keywords 2.ts, .DS_Store, etc.)
3. Extract shared Navbar component
4. Update layout.tsx with shared navigation

### Week 2: Results Page Refactor
1. Create hooks (useSession, useJobAnalysis)
2. Split page into smaller components
3. Simplify tab structure (5 → 3)
4. Test on mobile devices

### Week 3: Landing Page UX
1. Remove API key gate (make optional)
2. Add "How it Works" section
3. Show value before asking for anything
4. Add sample/demo mode

### Week 4: PWA
1. Create app icons
2. Add manifest.json
3. Install and configure next-pwa
4. Add offline fallback page
5. Test installation on mobile

---

## Quick Wins (Can Do Today)

1. **Delete `keywords 2.ts`** - Unused duplicate
2. **Delete `.DS_Store`** and add to .gitignore
3. **Fix component exports** - Update components/index.ts
4. **Add `<meta name="theme-color">** to layout.tsx
5. **Swap step order** - Let users upload before API key

---

## Metrics to Track

After implementing these changes, measure:

1. **Time to first upload** - Currently blocked by API key
2. **Mobile bounce rate** - Should decrease
3. **Tab usage** - Which tabs do users actually click?
4. **PWA installs** - New metric after PWA launch

---

## Questions to Resolve

1. Should "Compare" feature be removed entirely or moved?
2. Keep "Learn" tab content or merge into tooltips?
3. Do we need the "History" feature for MVP?
4. What's the branding direction for app icons?

---

*Document created: January 27, 2026*
*Next review: After Phase 1 completion*
