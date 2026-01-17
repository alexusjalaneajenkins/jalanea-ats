# Jalanea ATS — Project Overview

**Working name:** Jalanea ATS (ATS Mirror / Resume Intake Simulator)  
**Primary audience:** Job seekers (especially early‑career / career‑switchers)  
**Default mode:** **On‑Device** (privacy-first; zero resume exfiltration)  
**Optional mode:** **BYOK LLM** (Bring Your Own Key) for richer, semantic guidance  
**Status:** Product design + buildable MVP (portfolio-ready, extensible to Jalanea Works)  
**Date:** January 13, 2026

---

## 1. Elevator Pitch

Jalanea ATS helps job seekers **see what the software sees**. It extracts the plain text an ATS typically ingests, highlights where formatting causes “ghost data” (missing/garbled fields), checks for common **auto‑reject knockouts**, and measures **keyword coverage** against a pasted job description—without pretending to be a magic interview guarantee.

The vibe is: *truthful, educational, and privacy-respecting*.

---

## 2. The Problem (What’s actually going wrong)

A lot of ATS advice online is mythy and dramatic. The more boring reality is:

- **Parsing failures** can scramble or drop key info (multi‑column layouts, tables, headers/footers, icons-as-text).
- **Knockout questions** (work authorization, degree/licensure, location/onsite, availability) cause many “instant rejects.”
- **Ranking + human triage** means you can be qualified and still never be seen if your parsed profile doesn’t surface well.

So Jalanea’s core job is to prevent the “invisible candidate” problem by focusing on **parse fidelity**, **eligibility clarity**, and **recruiter-friendly readability**.

---

## 3. What Jalanea ATS Is (and isn’t)

### It *is*
- An **ATS intake simulator** (plain-text extraction + mapping sanity checks).
- A **risk scanner** for layout + content issues that commonly reduce visibility.
- A **job-description comparator** (keyword coverage + hard requirement prompts).
- A **report generator** you can use to iterate your resume intentionally.

### It’s *not*
- A guarantee engine (“100% ATS score” is marketing fluff).
- A job application bot.
- A recruiter/employer ATS product (at least in this version).
- A place where resumes are uploaded to a central database by default.

---

## 4. Target Users

1. **Job Seekers (Primary)**
   - Want to know why they’re getting ignored.
   - Need fast, understandable feedback without privacy anxiety.

2. **Career Coaches / Mentors (Secondary)**
   - Want a teachable artifact: “Here’s what your resume looks like to software.”

3. **Power Users / Builders (Tertiary)**
   - Want BYOK mode to get semantic suggestions and rewrite ideas.

---

## 5. Core Product Principles

- **Privacy by default:** No resume data leaves the device in On‑Device mode.
- **Transparency over mystique:** Show the raw extracted text and explain scoring.
- **Truth-based claims:** No “beat the bot” nonsense; focus on visibility mechanics.
- **Actionable outputs:** Every flag should come with a concrete fix.
- **Separation of concerns:** On‑Device works fully without accounts; BYOK is additive.

---

## 6. Product Modes

### Mode A — On‑Device (Default)
Runs fully in the browser.

**Capabilities**
- Local PDF/DOCX text extraction (PDF via `pdf.js`; DOCX via local parsing where feasible).
- Plain-text preview: “what the ATS ingests.”
- Layout risk detection (columns/tables/graphics/header contact risk heuristics).
- Contact info validation and section presence checks.
- JD keyword extraction + keyword coverage scoring.
- Knockout detector + checklist confirmation (e.g., work authorization, onsite, degree/licensure).
- Exportable report (JSON + shareable summary).

**Guarantee**
- “Zero Exfiltration” in default mode: no network requests containing resume text.

### Mode B — BYOK LLM (Optional)
User provides their own API key (Gemini/OpenAI/etc—implementation supports plug-in providers).

**Adds**
- Semantic mapping (“Frontend” ↔ “React,” synonyms, contextual skills).
- Rewrite suggestions and metric prompts.
- Smarter “knockout risk” interpretation from the JD wording (still user-confirmed).

**Safeguard**
- Clear warning: LLM output can be wrong or biased; user remains the editor.

---

## 7. MVP Feature Set (Portfolio-Ready)

- **Resume upload (PDF/DOCX)**
- **Plain Text Preview** (copy/pasteable)
- **Parse Health Score (0–100)**
  - Columns/tables/graphics/header contact risk
- **Keyword Coverage Score (0–100)** from pasted JD
- **Knockout Risk (Low/Med/High)** + checklist
- **Fix suggestions** tied to each detected failure mode
- **Local history** (sessions saved locally; user can delete anytime)
- **Export report** (JSON + human-readable summary)

---

## 8. Technical Snapshot (How it’s built)

### Frontend / App Layer
- **Next.js (App Router)** with client components for local file parsing.
- UI components for upload, preview, findings, scoring, and report export.

### On-Device Processing
- PDF text extraction using `pdf.js`.
- Heuristics for layout risks:
  - multi-column signals (text positioning / ordering anomalies)
  - header/footer contact loss
  - tables / iconography risk
  - missing anchors (“Experience”, “Education”, etc.)

### Optional Server (Strictly Non-PII)
- Minimal `/api/telemetry` endpoint for anonymous event counts and error rates.
- No resume text, no job description text, no raw PII.

### Storage Strategy
- Default: local-only (`IndexedDB` or `localStorage`) for session history.
- BYOK keys: stored only in memory by default (optionally user-managed secure storage).

---

## 9. Data Model (Conceptual)

A single “analysis session” is the core object:

- `ResumeArtifact`
  - metadata: filename, type, size, timestamps
  - extractedText (possibly truncated)
  - extractionMeta (warnings, page count, layout signals)

- `JobArtifact`
  - pasted job description text
  - extracted keywords + detected hard requirements

- `Scores`
  - parseHealth (0–100)
  - keywordCoverage (0–100)
  - knockoutRisk (enum + user confirmations)

- `Findings`
  - list of issues with evidence + fix recommendations

- `Exports`
  - JSON report + human summary

---

## 10. Success Metrics (Truthful + measurable)

- % of users who can see obvious parse failures in Plain Text Preview
- Reduction in “missing contact info” + “scrambled experience” flags after revisions
- Completion rate: upload → JD paste → report export
- (Optional, anonymous) average score improvements per user session over time

---

## 11. Milestones

- **M0 — Prototype:** local PDF extraction + plain-text preview
- **M1 — MVP:** scoring + findings + export + local history
- **M2 — BYOK:** provider plug-in + semantic suggestions + rewrite prompts
- **M3 — Coach Flow:** shareable report link (still private; user-controlled)
- **M4 — Jalanea Works bridge:** soft prompts/links to job-tracking product (opt-in)

---

## 12. Document Set (Project Canon)

- `Product_Requirements_Document.md` — What we’re building and why (scope, features, scoring)
- `User_Experience_Document.md` — Personas + user flows
- `Technical_Architecture_Document.md` — Structure, data types, APIs, processing pipeline
- `Compliance_and_Safeguards_Document.md` — Privacy, security, legal/compliance guardrails
- `Project_Overview.md` — This file (one-page orientation)

---

## 13. Key Decisions (So we don’t forget later)

- **Default is On‑Device.** Cloud processing is optional, never silent.
- **We don’t promise outcomes.** We promise visibility mechanics and clarity.
- **Scores must be explainable.** Every point deduction has a visible reason.
- **BYOK is the “free scaling” strategy.** Users can opt into LLM enrichment without the platform paying inference costs.

---

## 14. Future Enhancements (Nice-to-have)

- Better layout reconstruction for complex PDFs (spatial reading order)
- Local DOCX → structured Markdown pipeline with richer sectioning
- “Recruiter dashboard simulation” view (mock profile fields)
- Resume template generator that’s explicitly “parse-safe”
- Accessibility improvements (screen-reader friendly preview)

---
