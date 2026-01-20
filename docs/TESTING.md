# Jalanea ATS - Testing Documentation

## Overview

This document provides comprehensive test scenarios for the Jalanea ATS (Applicant Tracking System) Resume Score Checker. It covers user journeys, feature-specific tests, accessibility requirements, and edge cases.

**Last Updated:** January 19, 2026
**Application URL:** https://ats.jalanea.dev

---

## Table of Contents

1. [User Journeys](#1-user-journeys)
2. [Feature Tests](#2-feature-tests)
3. [UI/UX Component Tests](#3-uiux-component-tests)
4. [Accessibility Tests](#4-accessibility-tests)
5. [Responsive/Mobile Tests](#5-responsivemobile-tests)
6. [Edge Cases & Error Handling](#6-edge-cases--error-handling)
7. [Performance Tests](#7-performance-tests)
8. [Browser Compatibility](#8-browser-compatibility)

---

## 1. User Journeys

### 1.1 First-Time User - Basic Resume Analysis

**Scenario:** A new user wants to check their resume's ATS compatibility.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to https://ats.jalanea.dev | Landing page loads with file upload area visible |
| 2 | Click "API Key" button in header | API key modal opens |
| 3 | Enter valid Anthropic API key | Key is validated and stored in localStorage |
| 4 | Click/drag resume file (PDF/DOCX/TXT) to upload area | File is accepted, upload progress shown |
| 5 | Wait for analysis | Loading state displays, then redirects to results page |
| 6 | View results page | Parse Health and Knockout Risk scores visible |
| 7 | Review findings in "Findings" tab | Issues and positive findings listed |
| 8 | Click "Analyze Another Resume" button | Returns to upload page |

**Acceptance Criteria:**
- [ ] API key persists across page refreshes
- [ ] Analysis completes within 30 seconds for standard resumes
- [ ] All score cards render correctly
- [ ] Navigation between tabs works smoothly

---

### 1.2 Returning User - Job Description Matching

**Scenario:** A user returns to compare their resume against a specific job posting.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Navigate to application | API key already configured (from localStorage) |
| 2 | Upload resume | Analysis begins automatically |
| 3 | View results page | Scores display, sidebar shows "Paste Job Description" |
| 4 | Paste job description in sidebar | Text area accepts input |
| 5 | Click "Detect ATS" button | ATS vendor detected (or "Unknown") |
| 6 | Click "Analyze Job Match" | Semantic Match and Recruiter Search scores populate |
| 7 | Switch to "Job Match" tab | Keyword coverage analysis displayed |
| 8 | Review matched/missing keywords | Keywords color-coded by status |

**Acceptance Criteria:**
- [ ] Job description parsing works for various formats
- [ ] ATS detection identifies Greenhouse, Workday, Taleo, Lever, iCIMS
- [ ] Semantic Match score reflects keyword alignment
- [ ] Missing keywords are actionable recommendations

---

### 1.3 Power User - Compare Multiple Resumes

**Scenario:** A user wants to compare different versions of their resume.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload Resume Version A | Analysis completes |
| 2 | Note session ID from URL | URL format: `/results/{sessionId}` |
| 3 | Click "History" button in header | History modal shows previous analyses |
| 4 | Click "Analyze Another Resume" | Upload page loads |
| 5 | Upload Resume Version B | New analysis completes |
| 6 | Switch to "Compare" tab | Comparison interface loads |
| 7 | Select previous session for comparison | Side-by-side comparison displayed |
| 8 | Identify score differences | Delta indicators show improvements/regressions |

**Acceptance Criteria:**
- [ ] History persists in IndexedDB
- [ ] At least 10 previous sessions stored
- [ ] Comparison highlights meaningful differences
- [ ] Export comparison as JSON/Markdown works

---

### 1.4 Learning User - Educational Content

**Scenario:** A user wants to understand how ATS systems work.

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Upload resume and view results | Results page loads |
| 2 | Click "Learn" tab | Educational content displayed |
| 3 | View progress indicator | Shows "0/5" initially |
| 4 | Expand "ATS Myth vs Reality" section | Content expands, section marked as read |
| 5 | Progress updates | Shows "1/5" (20%) |
| 6 | Expand remaining sections | Each section gets checkmark when read |
| 7 | Complete all sections | Progress shows "5/5" (100%) with green check |
| 8 | Refresh page | Progress persists (localStorage) |

**Acceptance Criteria:**
- [ ] Progress indicator updates in real-time
- [ ] Read status persists across sessions
- [ ] "New" badges disappear after reading
- [ ] Content is accurate and educational

---

## 2. Feature Tests

### 2.1 File Upload

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid PDF | sample.pdf (< 10MB) | File accepted, parsing begins |
| Valid DOCX | sample.docx (< 10MB) | File accepted, parsing begins |
| Valid TXT | sample.txt (< 10MB) | File accepted, parsing begins |
| Oversized file | large.pdf (> 10MB) | Error message displayed |
| Invalid format | image.jpg | Error: "Unsupported file format" |
| Corrupted PDF | corrupt.pdf | Error: "Could not parse file" |
| Empty file | empty.txt (0 bytes) | Error: "File is empty" |
| Password-protected PDF | protected.pdf | Error: "Password-protected files not supported" |
| Drag and drop | Drag file to drop zone | File upload initiates |
| File picker | Click upload area, select file | File upload initiates |

---

### 2.2 API Key Management

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Valid API key | sk-ant-api03-... | Key validated, checkmark shown |
| Invalid API key | invalid-key-123 | Error: "Invalid API key format" |
| Empty submission | (empty) | Error: "API key required" |
| Key persistence | Refresh page | Key still configured |
| Key removal | Click "Remove" in modal | Key cleared, prompt to re-enter |
| Rate limited key | Key with quota exceeded | Error: "API rate limit exceeded" |

---

### 2.3 Score Cards

#### Parse Health Score

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| Excellent score | Score >= 80 | Green color, "Excellent" label |
| Good score | Score 60-79 | Yellow color, "Good" label |
| Fair score | Score 40-59 | Orange color, "Fair" label |
| Poor score | Score < 40 | Red color, "Poor" label, attention pulse |
| High score animation | Score > 85 | Celebrate animation plays |
| Low score animation | Score < 50 | Attention pulse animation plays |
| Threshold indicator | Any score | 85% line visible on gauge |
| Progressive disclosure | Click "Details" | Sub-scores expand (Layout, Contact, Section) |

#### Knockout Risk Score

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| Low risk | 0 flags | Green shield, "Low Risk" label |
| Medium risk | 1-2 flags | Yellow shield, "Medium Risk" label |
| High risk | 3+ flags | Red shield, "High Risk" label |
| Flag details | Hover info button | Tooltip shows knockout categories |

#### Semantic Match Score (requires job description)

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| No job description | Sidebar empty | Shows "Add Job Description" prompt |
| High match | Match >= 70% | Green color, high score |
| Low match | Match < 40% | Red color, recommendations shown |
| AI badge | Any state | "AI" badge visible in header |

#### Recruiter Search Score (requires job description)

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| No job description | Sidebar empty | Shows "Add Job Description" prompt |
| Boolean badge | Any state | "Boolean" badge visible |
| Simulates Greenhouse/Lever | Job description added | Score reflects boolean searchability |

---

### 2.4 Job Description Sidebar

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Paste text | Paste job posting | Text appears in textarea |
| Load sample | Click "Load sample" | Sample job description loads |
| Detect ATS | Click "Detect ATS" | Vendor name or "Unknown" shown |
| Collapse sidebar | Click "Collapse" | Sidebar hides, button shows "Show Job Description" |
| Expand sidebar | Click "Show Job Description" | Sidebar reappears |
| Minimum characters | Paste < 50 chars | "Analyze Job Match" disabled |
| Clear text | Delete all text | Semantic/Recruiter scores reset to prompts |

---

### 2.5 Tabs Navigation

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Findings tab | Click "Findings" | Issues and positives listed |
| Job Match tab | Click "Job Match" | Keyword coverage displayed (if JD provided) |
| Preview tab | Click "Preview" | Parsed resume preview shown |
| Learn tab | Click "Learn" | Educational content displayed |
| Compare tab | Click "Compare" | Comparison interface shown |
| Tab persistence | Refresh page | Returns to same tab |
| Keyboard navigation | Tab + Enter | Tabs accessible via keyboard |

---

## 3. UI/UX Component Tests

### 3.1 Sticky Footer

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Visibility | Scroll down | Footer remains fixed at bottom |
| Button hover | Hover over button | Scale increases, shadow intensifies |
| Button click | Click "Analyze Another Resume" | Navigates to upload page |
| Gradient | View button | Orange-to-pink gradient visible |
| Pointer events | Click behind footer | Content below still interactive |

---

### 3.2 Score Grouping Labels

| Test Case | Expected Result |
|-----------|-----------------|
| Technical Compliance label | Blue vertical bar, "TECHNICAL COMPLIANCE" text |
| Content Optimization label | Orange vertical bar, "CONTENT OPTIMIZATION" text |
| Card grouping | Parse Health + Knockout under Technical |
| Card grouping | Semantic + Recruiter under Content |

---

### 3.3 Card Interactive States

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Hover effect | Mouse over card | Scale 1.02, glow shadow, bg lightens |
| Active/press effect | Click card | Scale 0.98 |
| Focus indicator | Tab to card | Focus ring visible |
| Cursor | Hover over card | Cursor changes to pointer |
| Highlighted card | ATS-specific highlight | Orange border, "Priority" badge |

---

### 3.4 Learn Tab - Progress System

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Initial state | Open Learn tab | Progress 0/5, 0% |
| Expand section | Click accordion header | Section expands, marked as read |
| Progress update | Expand section | Counter increments (e.g., 1/5) |
| Circular gauge | Progress changes | Gauge fills proportionally |
| Completion | Read all 5 sections | 100% shown, green checkmark |
| New badges | Unread sections | "New" badge visible |
| Read indicator | Read sections | Green checkmark on icon |
| Persistence | Refresh page | Progress preserved |

---

### 3.5 2-Column Masonry Grid (Learn Tab)

| Test Case | Viewport | Expected Result |
|-----------|----------|-----------------|
| Desktop (>768px) | 1200px wide | 2-column grid layout |
| Tablet (768px) | 768px wide | 2-column grid layout |
| Mobile (<768px) | 375px wide | Single column layout |
| Expanded section | Click to expand | Section spans full width (col-span-2) |

---

### 3.6 Collapsible Sidebar

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Initial state | Load results page | Sidebar visible with "Collapse" button |
| Collapse | Click "Collapse" | Sidebar hides, button shows "Show Job Description" |
| Expand | Click "Show Job Description" | Sidebar reappears |
| Content reflow | Toggle sidebar | Main content adjusts width smoothly |
| State persistence | Refresh page | Sidebar state preserved |

---

### 3.7 Button Hierarchy

| Button Type | Visual Style | Usage |
|-------------|--------------|-------|
| Primary (`.btn-primary`) | Gradient orange-pink, white text, shadow | Main CTAs |
| Secondary (`.btn-secondary`) | Outlined indigo, transparent bg | Alternative actions |
| Tertiary (`.btn-tertiary`) | Text only, indigo color | Low-emphasis actions |
| Ghost (`.btn-ghost`) | Minimal, hover reveals bg | Dense UIs, toolbars |

---

## 4. Accessibility Tests

### 4.1 Screen Reader Compatibility

| Test Case | Expected Result |
|-----------|-----------------|
| Score announcement | Screen reader announces "Parse Health Score: 90 out of 100, rated Excellent" |
| Progress announcement | "Progress: 2 of 5 sections complete" |
| Button labels | All buttons have descriptive `aria-label` |
| Tooltips | Linked with `aria-describedby` |
| Live regions | Score changes announced via `aria-live` |
| Landmarks | Main content, navigation, footer properly marked |

---

### 4.2 Keyboard Navigation

| Test Case | Keys | Expected Result |
|-----------|------|-----------------|
| Tab through page | Tab | Focus moves logically through interactive elements |
| Activate buttons | Enter/Space | Buttons activate on keypress |
| Close modals | Escape | Modal closes, focus returns |
| Accordion toggle | Enter/Space | Accordion expands/collapses |
| Tab selection | Arrow keys | Tabs navigable with arrows |

---

### 4.3 Color & Contrast

| Test Case | Requirement | Expected Result |
|-----------|-------------|-----------------|
| Body text | 4.5:1 minimum | `#e0e7ff` on `#121218` = ~11:1 |
| Large text | 3:1 minimum | Headers meet requirement |
| Focus indicators | Visible | Pink/indigo outline on focus |
| Not color-alone | Color + icon/text | Scores use color + labels + icons |

---

### 4.4 Reduced Motion

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| Enable reduced motion | System preference | Animations disabled or reduced to 0.01ms |
| Score gauge | View gauge | No animation, instant fill |
| Hover effects | Hover on cards | Transitions instant or minimal |

---

## 5. Responsive/Mobile Tests

### 5.1 Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, stacked cards |
| Tablet | 640-1024px | 2-column scores, single content |
| Desktop | > 1024px | Full layout with sidebar |

---

### 5.2 Touch Interactions

| Test Case | Expected Result |
|-----------|-----------------|
| Touch targets | All buttons/links >= 44x44px |
| Tap cards | Cards respond to tap, same as click |
| Swipe gestures | Horizontal swipe on tabs (if implemented) |
| Pinch zoom | Page allows zoom to 200% |
| Long press | No unexpected context menus |

---

### 5.3 Mobile-Specific Tests

| Test Case | Action | Expected Result |
|-----------|--------|-----------------|
| File upload on mobile | Tap upload area | Native file picker opens |
| Camera option | Select "Take Photo" | Camera captures document (if supported) |
| Viewport meta | Check HTML | `width=device-width, initial-scale=1` |
| Safe area | Test on notched device | Content not obscured by notch/home bar |

---

## 6. Edge Cases & Error Handling

### 6.1 Network Errors

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| Offline upload | No network | Error: "Network unavailable" |
| API timeout | Slow response (>30s) | Error: "Request timed out" |
| API error 500 | Server error | Error: "Server error, please try again" |
| API error 429 | Rate limited | Error: "Rate limited, try again later" |
| Partial failure | Some analysis fails | Partial results shown, error for failed parts |

---

### 6.2 Data Edge Cases

| Test Case | Input | Expected Result |
|-----------|-------|-----------------|
| Very short resume | 10 words | Warning: "Resume seems incomplete" |
| Very long resume | 50+ pages | Processing continues, may take longer |
| Non-English resume | Japanese/Spanish text | Best-effort parsing, may affect accuracy |
| Special characters | Emojis, symbols | Characters preserved or gracefully handled |
| Resume with images | PDF with photos | Images ignored, text extracted |
| Tables in resume | Complex table layout | Tables parsed to best ability |

---

### 6.3 Browser Storage

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| localStorage full | Storage quota exceeded | Graceful fallback, warning shown |
| IndexedDB unavailable | Private browsing | Warning: "History not available" |
| Cookies disabled | Third-party cookies blocked | App still functions |
| Clear storage | User clears browser data | API key and history reset |

---

### 6.4 Session Management

| Test Case | Condition | Expected Result |
|-----------|-----------|-----------------|
| Invalid session ID | Navigate to `/results/invalid-id` | Error: "Session not found" |
| Expired session | Session > 30 days old | Warning: "Session expired" |
| Concurrent sessions | Multiple tabs | Each tab independent |
| Session recovery | Browser crash | IndexedDB preserves data |

---

## 7. Performance Tests

### 7.1 Load Time Benchmarks

| Metric | Target | Measurement |
|--------|--------|-------------|
| First Contentful Paint (FCP) | < 1.5s | Lighthouse |
| Largest Contentful Paint (LCP) | < 2.5s | Lighthouse |
| Time to Interactive (TTI) | < 3.5s | Lighthouse |
| Cumulative Layout Shift (CLS) | < 0.1 | Lighthouse |

---

### 7.2 Analysis Performance

| Test Case | Target | Measurement |
|-----------|--------|-------------|
| Small resume (1-2 pages) | < 10s | Stopwatch |
| Medium resume (3-5 pages) | < 20s | Stopwatch |
| Large resume (6+ pages) | < 45s | Stopwatch |
| Job description analysis | < 5s | Stopwatch |

---

### 7.3 Memory & Resources

| Test Case | Target | Tool |
|-----------|--------|------|
| Initial memory usage | < 100MB | Chrome DevTools |
| After 10 analyses | < 200MB | Chrome DevTools |
| No memory leaks | Stable over time | Chrome DevTools Heap Snapshot |

---

## 8. Browser Compatibility

### 8.1 Supported Browsers

| Browser | Version | Status |
|---------|---------|--------|
| Chrome | 90+ | Full support |
| Firefox | 88+ | Full support |
| Safari | 14+ | Full support |
| Edge | 90+ | Full support |
| Safari iOS | 14+ | Full support |
| Chrome Android | 90+ | Full support |

---

### 8.2 Browser-Specific Tests

| Test Case | Browser | Expected Result |
|-----------|---------|-----------------|
| File drag/drop | Safari | Works correctly |
| IndexedDB | Firefox Private | Graceful fallback |
| CSS backdrop-filter | Safari | Blur effects render |
| Framer Motion | All | Animations smooth |
| PDF.js parsing | All | PDFs extract correctly |

---

## Test Data

### Sample Resumes

| File | Description | Expected Parse Score |
|------|-------------|---------------------|
| `test-resume-good.pdf` | Clean, well-formatted | 85+ |
| `test-resume-poor.pdf` | Complex tables, columns | 40-60 |
| `test-resume-minimal.txt` | Plain text, minimal | 70-80 |
| `test-resume-creative.pdf` | Graphics-heavy | 30-50 |

### Sample Job Descriptions

| File | ATS Vendor | Description |
|------|------------|-------------|
| `jd-greenhouse.txt` | Greenhouse | Standard software engineer |
| `jd-workday.txt` | Workday | Enterprise position |
| `jd-taleo.txt` | Taleo | Corporate role |
| `jd-unknown.txt` | Unknown | Generic posting |

---

## Reporting Issues

When reporting bugs, include:
1. **Steps to reproduce**
2. **Expected vs actual result**
3. **Browser/OS version**
4. **Screenshots or screen recording**
5. **Console errors (if any)**
6. **Session ID (from URL)**

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-01-19 | 1.0 | Initial testing documentation |
| 2026-01-19 | 1.1 | Added UI/UX improvement tests |
