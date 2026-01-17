# User Experience Document (UXD)
## Jalanea ATS — Who We’re Building For + User Flows

**Document owner:** Jalanea  
**Last updated:** 2026-01-13  
**Status:** Draft (V1)

---

## 1. Product Positioning (UX Truth Pillars)

Jalanea ATS is not a magical “ATS beating” machine.

It is:
- A **mirror**: “Here’s what the system probably extracted.”
- A **seatbelt**: “Here are the common failure points.”
- A **flashlight**: “Here are the likely disqualifiers and missing language.”

The UX must communicate competence **without** promising outcomes.

---

## 2. Who We’re Building For

### 2.1 Types of Users
1. **Anxious Job Seeker (Primary)**
   - Time-poor, applying constantly
   - Feels “invisible”
   - Wants fast feedback and clear fixes

2. **Skeptical/Privacy-First User**
   - Worried about uploading resumes to random sites
   - Wants proof that the tool isn’t harvesting data
   - Needs “on-device by default” to trust the product

3. **Career Coach / Mentor**
   - Needs explainable outputs
   - Wants exports to send to clients
   - Wants consistent guidance (not vibes)

4. **Power User**
   - Comfortable with BYOK
   - Wants semantic suggestions and rewriting help
   - Wants version comparison

---

## 3. Jobs To Be Done

- “I need to know if my resume is readable by software.”
- “I need to avoid instant disqualification.”
- “I need to match the job language without lying.”
- “I need a simple checklist so I can iterate fast.”
- “I need to trust that my data isn’t being sold.”

---

## 4. Core UX Principles

1. **Show, don’t mystify**
   - Always show extracted text and what triggered each warning.

2. **Local-first trust**
   - Default mode: no upload to servers.
   - Make privacy visible (badge, explainer, toggles).

3. **Actionable clarity**
   - Every issue has a suggested fix and why it matters.

4. **Fast loop**
   - Upload → preview → score in seconds.

5. **Claims discipline**
   - No guarantees. No “beat the bot.” No “100%.”

---

## 5. Information Architecture (V1)

- **Home / Landing**
  - Value proposition + privacy stance + “Start check”
- **Upload**
  - File dropzone + file hygiene tips
- **Results Dashboard**
  - Parse Health
  - Plain Text Preview
  - Warnings + fixes
- **JD Check**
  - Paste JD
  - Knockout checklist
  - Keyword coverage
- **Export**
  - Download report
  - Save locally
- **Settings**
  - BYOK toggle + key manager
  - “Delete local data”
- **Help / FAQ**
  - What ATS is / isn’t
  - Why parsing fails
  - Safety + scams guidance
  - How BYOK works

---

## 6. Primary User Flows

### 6.1 Flow A — Quick Parse Health (No JD)
**Goal:** “Can the software read my resume?”

1) Landing → Start  
2) Upload resume (PDF/DOCX)  
3) Processing state (progress messages)  
4) Results Dashboard shows:
   - Parse Health score
   - Plain text preview
   - Contact check
   - Warnings (columns/tables/images/header risk)
5) User chooses:
   - Export report
   - Fix resume and re-upload
   - Save locally

**Success moment:** user sees a concrete problem (“my columns merged”) and a fix.

---

### 6.2 Flow B — Job-Specific Check (JD + Resume)
**Goal:** “Am I eligible and speaking the right language?”

1) From Results → “Check Against Job Description”  
2) Paste JD  
3) System extracts:
   - Required items checklist
   - Keyword list (critical)
4) User confirms knockout checklist:
   - Yes/No/Not sure
5) Results show:
   - Knockout Risk label (Low/Med/High)
   - Keyword Coverage score
   - Missing exact phrases list
6) User chooses:
   - Export report
   - Edit resume and re-run

**Success moment:** user catches a disqualifier early (“must be onsite”) and doesn’t waste time.

---

### 6.3 Flow C — BYOK Enriched Mode (Optional)
**Goal:** “Give me smarter suggestions without Jalanea paying for tokens.”

1) Settings → Enable BYOK  
2) User pastes Gemini key (stored locally)  
3) Toggle appears on results page:
   - “Semantic suggestions”
4) User runs enrich:
   - bullet rewrites
   - “translate experience → requirement language”
   - confidence + “review for bias” notice
5) Export enriched report

**Trust requirement:** very clear warning that enabling BYOK sends content to the model provider.

---

### 6.4 Flow D — Troubleshoot “My Text Is Blank / Garbage”
**Goal:** “Help me recover from parsing failure.”

Entry conditions:
- extracted text is extremely short
- obvious scrambled output
- missing contact info

UX response:
- Show “We couldn’t reliably extract this PDF” panel
- Suggest:
  - upload DOCX version
  - export PDF as “simple” or “print to PDF”
  - avoid columns/tables/icons
- Offer “Try Again” without losing the session

---

## 7. Key Screens + Content Requirements

### 7.1 Results Dashboard Layout
- Top: 3 tiles (Parse Health, Keyword Coverage, Knockout Risk)
- Next: “Mock Candidate Profile” (what a recruiter might see)
- Next: Plain text preview (the “robot view”)
- Next: Warnings list with:
  - Severity tag
  - Why it matters
  - Fix suggestion
  - “Re-run check” CTA

### 7.2 Microcopy Tone
- Clear, calm, not scary.
- Avoid “you failed.” Use “risk detected.”
- Always explain: “This is common, here’s how to fix it.”

---

## 8. Edge Cases

- Scanned PDF (image-only): prompt user to OCR or upload DOCX.
- Resume with no headings: suggest standard headings.
- International phone formats: avoid false negatives (broad regex).
- Multiple pages: maintain performance.
- Mobile upload limitations: recommend < 5MB.

---

## 9. Accessibility Requirements
- All scores readable by screen readers
- Plain text preview supports text selection and copy
- Focus states visible
- Contrast-compliant status indicators

---

## 10. UX Success Metrics
- Completion rate: Upload → Results
- Report export rate
- Re-upload loop rate (signals real iteration)
- BYOK enable rate (power-user adoption)
- CTA click-through to Jalanea Works (future)

---

## 11. Research Inputs (Jan 2026)
- ATS purpose + workflow framing from major ATS vendors
- Structured evaluation / scorecard practices
- Known resume parsing failure patterns (columns, headers, graphics)
- Privacy and scam risk considerations for job seekers
