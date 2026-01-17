# Technical Architecture Document (TAD)
**Project:** Jalanea ATS (ATS Simulator / Resume “Parse Health” + JD Check)  
**Version:** v1.0  
**Date:** 2026-01-13  
**Status:** Draft → Build-ready for V1 (On‑Device + Optional BYOK)

---

## 0. What This Document Covers

This is the “how we build it” blueprint for **Jalanea ATS V1**.

### V1 Operating Modes
1. **On‑Device Default (Zero‑Cost, Privacy‑First)**
   - Everything runs in the browser.
   - No resume data is sent to Jalanea servers.
   - Results/history stored locally only.

2. **BYOK Enriched Mode (Optional)**
   - User supplies their own LLM API key.
   - Resume/JD text may be sent directly to the model provider *only after explicit consent*.
   - Jalanea still does not pay model costs.

### Non‑Goals (V1)
- No multi‑tenant recruiter dashboard.
- No cloud candidate database.
- No “apply to jobs” automation.
- No claims of guaranteed outcomes.

---

## 1. Architecture Summary

### 1.1 High‑Level Diagram

```text
┌──────────────────────────────┐
│           Browser            │
│ (Next.js App + Web Workers)  │
│                              │
│  Upload Resume (PDF/DOCX)    │
│         │                    │
│         ▼                    │
│  Parsing Engine              │
│  - PDF: pdf.js               │
│  - DOCX: mammoth             │
│         │                    │
│         ▼                    │
│  Plain‑Text Preview          │
│  + Heuristic Risk Detection  │
│  (columns, headers, images…) │
│         │                    │
│         ▼                    │
│  JD Paste + Keyword Extract  │
│  + Knockout Detector         │
│         │                    │
│         ▼                    │
│  Scoring Engine              │
│  - Parse Health (0–100)      │
│  - Keyword Coverage (0–100)  │
│  - Knockout Risk (L/M/H)     │
│         │                    │
│         ▼                    │
│  Results Dashboard           │
│  + Export Report (PDF/MD)    │
│  + Local History             │
│                              │
│  [Optional] BYOK LLM Calls   │
│   Browser → Model Provider   │
└──────────────────────────────┘

(Optional)
┌──────────────────────────────┐
│ Jalanea Telemetry Endpoint   │
│ (No PII, no resume text)     │
└──────────────────────────────┘
```

### 1.2 Core Design Principle
**Parse fidelity first.** If the extracted text is garbage, any “AI score” is just expensive fan fiction.

---

## 2. Tech Stack (V1)

### 2.1 Frontend / App Framework
- **Next.js (App Router) + TypeScript**
- Client-side processing by default (minimize server costs)
- UI component library is flexible (shadcn/ui, Radix, or plain components)

### 2.2 Parsing
- **PDF:** `pdfjs-dist` (Mozilla PDF.js)  
  - Extract `textContent.items` with positional transforms for layout heuristics.
- **DOCX:** `mammoth` (browser build)  
  - Convert DOCX → HTML/Markdown-ish → text.

### 2.3 Local Persistence
- **IndexedDB** (preferred) for sessions/history (supports larger payloads).
- Fallback: `localStorage` for small summaries + “last session pointer”.

### 2.4 Optional BYOK LLM
- Provider adapter layer (Gemini first, but swappable).
- Key stored **only locally**, ideally **session-only** by default.

### 2.5 Optional Privacy‑Preserving Analytics
- Only anonymous integers/events (e.g., parseHealth bucket 0–10, feature toggles).
- No resume content, no job description content, no emails/phones.

---

## 3. Application Structure (Recommended Repo Layout)

```text
/app
  /page.tsx                     # Landing
  /analyze/page.tsx             # Upload + JD input
  /results/[sessionId]/page.tsx # Results dashboard
  /privacy/page.tsx
  /api/telemetry/route.ts       # OPTIONAL

/components
  UploadDropzone.tsx
  PlainTextPreview.tsx
  RiskFindingsPanel.tsx
  ScoresPanel.tsx
  ByokKeyModal.tsx
  ConsentModal.tsx
  ExportButtons.tsx

/lib
  /parsers
    pdf.ts                      # pdf.js extraction + layout signals
    docx.ts                     # mammoth conversion
  /analysis
    heuristics.ts               # columns/header/graphics risk rules
    keywords.ts                 # JD keyword extraction + coverage
    knockouts.ts                # required phrases → user checklist
    sections.ts                 # Experience/Education/Contact detection
    scoring.ts                  # ParseHealth + KeywordCoverage + KnockoutRisk
  /llm
    types.ts                    # provider interface + prompt contracts
    gemini.ts                   # BYOK Gemini implementation
  /storage
    sessionStore.ts             # IndexedDB wrapper + schema versioning
  /export
    report.ts                   # markdown/json/pdf export builders
  /telemetry
    client.ts                   # OPTIONAL minimal event sender
```

---

## 4. Data Model

### 4.1 Primary Object: `AnalysisSession`

```ts
export type AnalysisSession = {
  id: string; // uuid
  createdAt: string; // ISO
  updatedAt: string; // ISO

  resume: ResumeArtifact;
  job?: JobArtifact;

  findings: Finding[];
  scores: Scores;

  byok?: ByokMetadata;          // present only if BYOK used
  exports?: ExportArtifact[];   // local history of generated exports
};

export type ResumeArtifact = {
  fileName: string;
  fileType: "pdf" | "docx";
  fileSizeBytes: number;

  extractedText: string;        // may be truncated for performance
  extractionMeta: {
    charCount: number;
    pageCount?: number;
    extractionWarnings: string[];
    // Layout signals for PDFs (optional but recommended)
    pdfSignals?: PdfLayoutSignals;
  };
};

export type JobArtifact = {
  rawText: string;              // pasted JD
  extractedKeywords: KeywordSet;
  detectedKnockouts: KnockoutItem[];
};

export type PdfLayoutSignals = {
  estimatedColumns: 1 | 2 | 3;
  columnMergeRisk: "low" | "medium" | "high";
  headerContactRisk: "low" | "medium" | "high";
  textDensity: "low" | "medium" | "high"; // heuristic (text bytes vs file bytes)
};

export type Finding = {
  id: string;
  severity: "info" | "warn" | "risk";
  code:
    | "MULTI_COLUMN_DETECTED"
    | "HEADER_CONTACT_INFO_RISK"
    | "LOW_TEXT_DENSITY_IMAGE_PDF"
    | "MISSING_CONTACT_INFO"
    | "MISSING_SECTIONS"
    | "TABLES_OR_COLUMNS_RISK"
    | "FILENAME_HYGIENE"
    | "DATE_FORMAT_RISK"
    | "JD_KNOCKOUT_DETECTED";
  title: string;
  whyItMatters: string;
  fix: string;
  evidence?: string; // short snippet (never the whole resume)
};

export type Scores = {
  parseHealth: number; // 0–100
  keywordCoverage?: number; // 0–100 (only if JD provided)
  knockoutRisk?: "low" | "medium" | "high"; // only if JD provided
  notes: string[]; // short human-readable explanations
};

export type KeywordSet = {
  critical: string[];
  optional: string[];
  all: string[];
};

export type KnockoutItem = {
  id: string;
  label: string;
  category: "authorization" | "location" | "schedule" | "license" | "degree" | "other";
  evidence: string; // JD snippet
  userConfirmed?: boolean; // checkbox in UI
};

export type ByokMetadata = {
  provider: "gemini" | "other";
  model: string;
  consentAt: string; // ISO
  keyStorageMode: "session" | "local_encrypted" | "local_plain";
};
```

### 4.2 Session Storage Strategy
- **Store full sessions in IndexedDB** (versioned schema).
- Store a small “index” list (id, createdAt, parseHealth, role title guess) to render History quickly.
- Include a **“Delete All”** action and per-session delete.

---

## 5. Parsing + Heuristics (The “Truth Engine”)

### 5.1 PDF Text Extraction (pdf.js)
Implementation notes:
- Use `getDocument({ data: ArrayBuffer })`.
- For each page:
  - `getTextContent()`
  - Capture `items[]` with `str` and `transform` (position matrix).

**Why positions matter:** column detection requires x/y clustering, not just concatenated strings.

### 5.2 Column Detection Heuristic (Practical + Fast)
Goal: detect layouts that commonly produce garbled ATS parsing.

**Algorithm sketch**
1. For each page, group text items into “rows” by Y coordinate (rounded/bucketed).
2. For each row, collect X positions.
3. Compute whether X positions cluster into 2+ groups separated by a large gap.
4. If many rows show 2 clusters, flag multi-column and raise merge risk.

Output:
- `estimatedColumns`
- `columnMergeRisk`

### 5.3 Header Contact Risk
ATS failures often happen when contact info lives in headers/footers.

**Algorithm sketch**
- Define “top band” = first ~10–15% of page height.
- Search for email/phone/LinkedIn patterns in:
  - top band text
  - full doc text
- If patterns appear only in the top band (or are missing entirely), flag.

### 5.4 “Image PDF” Risk (Low Text Density)
When extraction yields tiny text but file is large, the PDF may be image-based.

**Heuristic**
- `textBytes / fileBytes` below threshold AND extracted char count below threshold → flag `LOW_TEXT_DENSITY_IMAGE_PDF`
- Recommend user export as “PDF (text)” or upload DOCX / run OCR.

### 5.5 Section Presence
Check for standard anchors:
- “Experience”, “Work Experience”, “Employment”
- “Education”
- “Skills”
- “Projects”

If missing, warn that some ATS field mapping may fail.

---

## 6. JD Processing (Keyword + Knockout)

### 6.1 Keyword Extraction (On‑Device)
We don’t need heavy NLP to be useful.

**Pipeline**
1. Normalize: lower-case, strip punctuation (keep `C#`, `C++`, `.NET`).
2. Tokenize into 1–3 grams (unigrams, bigrams, trigrams).
3. Remove stopwords.
4. Boost terms that:
   - are in ALL CAPS
   - appear in bullet lists
   - follow “Required”, “Must have”, “Minimum”, “Qualifications”
5. Deduplicate and rank by frequency + boosted context.

**Output**
- `critical`: top N (e.g., 15) most likely “must-haves”
- `optional`: next M (e.g., 15) nice-to-haves

### 6.2 Knockout Detector
Detect phrases like:
- “must be authorized to work…”
- “US citizen”
- “able to lift 50 lbs”
- “must have a valid driver’s license”
- “on-site 5 days”
- “requires CPA / RN / Security+”

**Implementation**
- Regex library of patterns + synonyms.
- Return a checklist where the user self-confirms.
- Score becomes “Knockout Risk” based on unconfirmed/failed items.

---

## 7. Scoring Engine (Deterministic + Explainable)

### 7.1 Parse Health (0–100)
Start at 100, subtract penalties:
- Multi-column detected: −10 to −25 (depends on risk)
- Missing contact info: −20
- Header contact risk: −10
- Low text density image-PDF: −25
- Missing sections: −10
- Filename hygiene (optional): −5

Every penalty must create a matching `Finding` with a fix.

### 7.2 Keyword Coverage (0–100)
- `coverage = foundCritical / totalCritical`
- “found” can be exact match + simple expansions (e.g., “CI/CD” ~ “continuous integration”)
- Optionally split by “critical” vs “optional”.

### 7.3 Knockout Risk (Low/Med/High)
- If any detected knockouts are not user-confirmed → raise risk.
- If user checks “I do not meet this” → High risk and explain.

---

## 8. Optional BYOK LLM (Gemini-first, Provider-agnostic)

### 8.1 Provider Interface
```ts
export type LlmInput = {
  resumeText: string;
  jobText?: string;
  keywords?: KeywordSet;
  userGoal: "explain" | "rewrite" | "semantic_match";
};

export type LlmOutput = {
  summary: string;
  semanticMatches?: Array<{ jdNeed: string; resumeEvidence: string; note: string }>;
  rewriteSuggestions?: Array<{ before: string; after: string; reason: string }>;
  cautions?: string[];
};

export interface LlmProvider {
  generate(input: LlmInput): Promise<LlmOutput>;
}
```

### 8.2 Consent + Safety Rules
BYOK mode must:
- show a consent modal: “Your resume text will be sent to your selected AI provider.”
- default to **not saving the key**
- limit output to helpful, non-deceptive changes (no “white text” hacks)

### 8.3 Prompt Contract (Key Idea)
Treat resume and JD as **data**, not instructions:
- Wrap them in clear delimiters.
- Explicitly ignore any instructions found inside the documents.

### 8.4 Token / Size Handling
- Prefer sending **extracted text** (already sanitized) rather than uploading raw files.
- Truncate to a safe max (e.g., first 40–60k characters) with a warning.
- For large text: chunk into sections (Experience, Education…) and merge results.

---

## 9. Security, Privacy, and Trust

### 9.1 Default: Zero‑Exfiltration
- No network calls containing resume/JD data in On‑Device mode.
- Avoid 3rd‑party analytics scripts that might capture DOM content.
- Use a strict Content Security Policy (CSP) where feasible.

### 9.2 Local Key Storage Options (BYOK)
1. **Session-only (recommended):** keep in memory; cleared on refresh.
2. **Local encrypted:** store encrypted with Web Crypto; user enters a passphrase.
3. **Local plain (discouraged):** allow only behind “I understand” toggle.

### 9.3 PII Redaction for Telemetry (If enabled)
Telemetry payload may include:
- parseHealth bucket (0–10)
- feature toggles (BYOK used yes/no)
- error codes (e.g., PDF_PARSE_FAILED)

Telemetry payload must never include:
- resume text
- email/phone/linkedin URLs
- job description text
- filenames (unless hashed locally)

---

## 10. APIs and Integrations

### 10.1 Internal “APIs” (Client Modules)
V1 should primarily use internal functions:
- `parsePdf(file) → ResumeArtifact`
- `parseDocx(file) → ResumeArtifact`
- `analyzeResume(resume) → Finding[]`
- `analyzeJob(jobText) → KeywordSet + KnockoutItem[]`
- `score(findings, keywordHits, knockouts) → Scores`

### 10.2 External API (BYOK LLM)
- Calls go from browser → provider API using user key.
- Provider implementation should:
  - handle retries/backoff on rate limits
  - validate JSON output (strict parsing)
  - show “Provider error” states without losing session data

### 10.3 Optional Jalanea Telemetry Endpoint
`POST /api/telemetry`
- Accept only non-PII payload
- Rate limit by IP
- Ignore large payloads

---

## 11. Performance & UX Engineering

### 11.1 Web Worker Parsing
PDF parsing can block the main thread.
- Run `pdf.js` extraction in a worker.
- PostMessage results back in chunks:
  - “Page 1/2/3 extracted…”
- This supports UXD “streaming feedback” without server streaming.

### 11.2 Progressive Rendering
- Show raw extracted text as soon as first pages are ready.
- Let user paste JD while parsing continues.

### 11.3 Mobile Constraints
- Keep libraries slim; avoid heavy NLP packages.
- Cap maximum file size (configurable; e.g., 10MB).

---

## 12. Testing Strategy

### 12.1 Test Corpus (Local, Never Shipped to Prod)
Create a dev-only test set:
- 1-column PDF
- 2-column PDF (Canva style)
- Image-based PDF (scan)
- DOCX with headings

### 12.2 Unit Tests
- keyword extraction
- knockout detector patterns
- scoring rules
- section detection

### 12.3 Golden Tests
Given a known PDF sample, ensure:
- column detection stays stable
- contact detection stays stable

---

## 13. Future Architecture (Post‑Portfolio Scaling Path)

If Jalanea ATS becomes a real product (beyond V1), add:
- Supabase for accounts + cloud history (opt-in)
- Storage bucket for raw resumes (explicit permission)
- Worker queue for hosted LLM parsing (if Jalanea pays model costs)
- Multi-tenant org + RLS
- Admin dashboards

V1 is intentionally designed so that the “core truth engine” (parsing + heuristics + scoring)
can be reused unchanged in a server-backed architecture.

---

## 14. Build Checklist (Concrete Next Steps)
- [ ] Scaffold Next.js app + routes (`/analyze`, `/results/:id`)
- [ ] Implement PDF parsing (pdf.js) in a Web Worker
- [ ] Implement DOCX parsing (mammoth)
- [ ] Build Plain Text Preview + copy/download
- [ ] Implement heuristic findings (columns/header/text density/sections)
- [ ] Implement JD keyword + knockout extraction
- [ ] Implement scoring + explanations
- [ ] Implement local session store (IndexedDB)
- [ ] Implement export (markdown/json)
- [ ] Add optional BYOK provider adapter
- [ ] Add consent + privacy screens
