# Product Requirements Document (PRD)
## Jalanea ATS — Parse Health + Eligibility Risk Checker (Privacy-First)

**Document owner:** Jalanea  
**Last updated:** 2026-01-13  
**Status:** Draft (V1 for portfolio + future reuse)

---

## 1. Product Summary

Jalanea ATS is a privacy-first web tool that helps job seekers understand how their resume will likely **enter and survive** an Applicant Tracking System (ATS) pipeline.

Instead of promising “beat the ATS,” Jalanea ATS focuses on:
- **Parse Health:** “Will the software actually read my resume correctly?”
- **Eligibility/Knockout Risk:** “Am I about to auto-disqualify myself on requirements?”
- **Human Readability:** “If a recruiter opens this, will they see the right things fast?”

This tool is designed as:
- A **portfolio-grade product** (clear UX + honest mechanics)
- A **trust-building funnel** toward Jalanea Works (job-search platform)

---

## 2. Problem Statement

Job seekers often get stuck in a “black box” experience:
- They submit a resume.
- The ATS asks them to re-type everything (meaning parsing failed).
- They get rejected quickly and assume an “AI robot” filtered them out.

In reality, modern ATS platforms are primarily workflow + record systems and often use **deterministic filters** (eligibility questions) plus ranking/sorting, with humans making final decisions most of the time.

---

## 3. Goals

### 3.1 Primary Goals
1. **Show the user what the ATS likely “sees”**
   - Plain-text extraction preview
   - Section detection + contact detection + structure warnings

2. **Reduce invisible failures**
   - Detect multi-column / table-like structures and warn
   - Detect header/footer contact risk
   - Detect “graphics-only” risks (text in images)

3. **Help users avoid disqualifiers**
   - Extract “must-have / required” items from the job description (JD)
   - Convert to a checklist the user confirms (knockout risk)

4. **Remain free by default**
   - Default mode: on-device processing only (no resume leaves browser)

### 3.2 Secondary Goals
- Provide optional “enriched” insights via **BYOK LLM** (Bring Your Own Key), e.g., Gemini.
- Provide shareable outputs: “Resume Intake Report” (PDF/Markdown export).

---

## 4. Non-Goals

- Guaranteeing interviews, offers, or “passing ATS.”
- Claiming compatibility with every ATS vendor’s proprietary parser.
- Storing resumes on Jalanea servers (V1 default mode).
- Building a full ATS for employers (this is job-seeker tooling).

---

## 5. Users

### 5.1 Types of Users
1. **Job Seeker (Primary)**
   - Wants quick clarity, actionable fixes, privacy.
2. **Career Coach / Mentor**
   - Uses the tool with clients, wants explainability and exports.
3. **Power User**
   - Wants advanced checks, BYOK semantic suggestions.

---

## 6. User Stories

### Must-have (V1)
- As a job seeker, I can upload a PDF/DOCX and see the extracted plain text.
- As a job seeker, I can see whether my contact info is detected near the top.
- As a job seeker, I get warnings for common parsing risks (columns, tables, images).
- As a job seeker, I can paste a JD and get a checklist of “must-haves.”
- As a job seeker, I can see keyword coverage for critical JD terms.
- As a user, I can save my report locally and export it.

### Should-have (V1.1)
- As a user, I can enable BYOK mode (Gemini key stored locally) to get semantic matching + rewrite suggestions.
- As a user, I can compare two resume versions against one JD.

### Could-have (later)
- Integration CTA to Jalanea Works (job tracking + application automation).
- “ATS Vendor Profiles” (behavior differences: enterprise vs agency databases).
- Browser extension to check resume text before upload.

---

## 7. Functional Requirements

### 7.1 Resume Intake
- Accept **PDF** and **DOCX**.
- Client-side extraction:
  - PDF: PDF.js text extraction.
  - DOCX: Mammoth.js to HTML/Markdown then to text.
- Show a **Plain Text Preview** (unstyled, scrollable).

### 7.2 Parse Health Checks
- Detect and score:
  - **Contact Info Presence** (email/phone/link)
  - **Contact Info Position** (found in first ~20% of text)
  - **Section Anchors** (“Experience”, “Education”, “Skills”)
  - **Column / Reading Order Risk** (heuristic using line clustering and repeated Y-aligned blocks)
  - **Table Risk** (dense alignment patterns)
  - **Graphics Risk** (low extracted text vs file size; PDF operators indicating images)
  - **Filename Hygiene** (suggest “Name_Role_Resume.pdf”)
- Output an explanation for each flag (tooltip + “Why this matters”).

### 7.3 Job Description (JD) Analyzer
- Paste-in JD input (no file required).
- Extract:
  - “Required / Must-have” statements
  - Licenses/certs, clearance, work authorization phrases
  - Location/onsite constraints
- Present as a **Knockout Checklist**:
  - User confirms: Yes/No/Not sure
- Provide **Keyword Coverage**:
  - Extract skill nouns/phrases and compare exact matches in resume text.
  - Mark “missing exact phrases” for legacy ATS safety.

### 7.4 Scoring + Output
Provide a “Gatekeeper” style output:
- **Score A: Parse Health (0–100)**
- **Score B: Keyword Coverage (0–100)**
- **Score C: Knockout Risk (Low/Med/High)**

Also provide:
- A “Mock Candidate Profile” view (Recruiter-ish summary card)
  - Name, headline, most recent role, education, top skills
  - If fields are blank in the mock profile, user sees *why* they’re invisible.

### 7.5 Local Save + Export
- Default: store reports in localStorage/IndexedDB (user-controlled).
- Export:
  - Markdown report
  - PDF report (client-generated)
- Provide “Delete all local data” control.

### 7.6 BYOK Mode (Optional)
- User pastes their Gemini API key (stored locally only).
- Adds:
  - Semantic matching explanations
  - Rewrite suggestions with metrics
  - “Translate experience to requirement language” suggestions
- Always show a “review for bias” notice.

---

## 8. Non-Functional Requirements

### 8.1 Privacy & Security
- **Zero-exfiltration default:** no resume content is sent to servers in default mode.
- Clear disclosure for BYOK mode (data may be sent to the chosen model provider).
- Do not store API keys on servers; store locally; allow delete.

### 8.2 Performance
- Time-to-first-preview target: **< 5 seconds** for 1–2 page PDFs.
- Graceful handling for large files (show “extracting…” progress).

### 8.3 Accessibility
- Keyboard operable
- Screen reader labels for file input and results
- Avoid color-only status indicators

---

## 9. Success Metrics

- **Activation:** % of users who reach results after upload
- **Time-to-value:** median time from upload → Parse Health score
- **Fix rate:** % of users who take at least 1 action (download report, rename file, edit resume)
- **Trust:** low bounce rate after privacy modal
- **Funnel:** click-through to Jalanea Works (soft CTA)

---

## 10. Constraints & Assumptions

- Browser-only processing means some PDFs will extract poorly (scanned images).
- Mobile devices may struggle with very large PDFs; set file size guidance.
- Different ATS vendors parse differently; Jalanea is a simulator, not a clone.

---

## 11. Risks & Mitigations

- **Risk:** Users assume guarantees.
  - **Mitigation:** strong claims discipline + disclaimers.
- **Risk:** PDF extraction order errors (columns).
  - **Mitigation:** detection + warning + “recommended format” templates.
- **Risk:** Users paste sensitive info into BYOK mode.
  - **Mitigation:** in-flow warnings + local-first default.

---

## 12. Sources Consulted (Jan 2026)
- Workday: overview of ATS purpose and capabilities (workflow + tracking)
- Greenhouse: structured scorecards / evaluation approach
- FTC consumer guidance: avoiding scams and protecting personal info
- Mozilla PDF.js documentation + known ordering issues for text extraction
- Public resume/ATS formatting guidance from university/career resources and ATS vendors
- SmartRecruiters product notes (auto-reject workflows / matching features)
