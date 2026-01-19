/**
 * Jalanea ATS - Session Data Model
 *
 * Core types for the analysis session, representing the data structure
 * for resume parsing, job description analysis, and scoring.
 */

/**
 * The primary object representing a complete analysis session.
 * Contains all data from resume upload through scoring and export.
 */
export type AnalysisSession = {
  /** Unique identifier (UUID) */
  id: string;
  /** ISO timestamp of session creation */
  createdAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;

  /** Parsed resume data */
  resume: ResumeArtifact;
  /** Optional job description data (if user provided JD for comparison) */
  job?: JobArtifact;

  /** List of detected issues and recommendations */
  findings: Finding[];
  /** Calculated scores */
  scores: Scores;

  /** BYOK mode metadata (present only if user enabled LLM features) */
  byok?: ByokMetadata;
  /** History of generated exports */
  exports?: ExportArtifact[];
};

/**
 * Represents a parsed resume document.
 * Contains both the extracted text and metadata about the extraction process.
 */
export type ResumeArtifact = {
  /** Original filename */
  fileName: string;
  /** File type: PDF, DOCX, or TXT */
  fileType: 'pdf' | 'docx' | 'txt';
  /** File size in bytes */
  fileSizeBytes: number;

  /** Extracted plain text content (may be truncated for performance) */
  extractedText: string;
  /** Metadata about the extraction process */
  extractionMeta: ExtractionMeta;
};

/**
 * Metadata from the text extraction process.
 * Includes warnings and layout signals for PDFs.
 */
export type ExtractionMeta = {
  /** Total character count of extracted text */
  charCount: number;
  /** Number of pages (for PDFs) */
  pageCount?: number;
  /** Warnings generated during extraction */
  extractionWarnings: string[];
  /** PDF-specific layout analysis signals */
  pdfSignals?: PdfLayoutSignals;
};

/**
 * Layout analysis signals extracted from PDF documents.
 * Used to detect potential parsing issues like multi-column layouts.
 */
export type PdfLayoutSignals = {
  /** Estimated number of columns detected (1, 2, or 3+) */
  estimatedColumns: 1 | 2 | 3;
  /** Risk level that columns may merge incorrectly during parsing */
  columnMergeRisk: 'low' | 'medium' | 'high';
  /** Risk that contact info in header/footer may not be parsed */
  headerContactRisk: 'low' | 'medium' | 'high';
  /** Text density heuristic (low may indicate image-based PDF) */
  textDensity: 'low' | 'medium' | 'high';
};

/**
 * Represents a pasted job description with extracted keywords and requirements.
 */
export type JobArtifact = {
  /** Raw job description text as pasted by user */
  rawText: string;
  /** Extracted keywords categorized by importance */
  extractedKeywords: KeywordSet;
  /** Detected knockout/disqualifier requirements */
  detectedKnockouts: KnockoutItem[];
};

/**
 * Keywords extracted from a job description, categorized by importance.
 */
export type KeywordSet = {
  /** Most important keywords (likely requirements) */
  critical: string[];
  /** Secondary keywords (nice-to-haves) */
  optional: string[];
  /** All extracted keywords (deduplicated) */
  all: string[];
};

/**
 * A potential knockout/disqualifier requirement from the job description.
 * User must confirm whether they meet these requirements.
 */
export type KnockoutItem = {
  /** Unique identifier */
  id: string;
  /** User-friendly description of the requirement */
  label: string;
  /** Category of the knockout requirement */
  category: 'authorization' | 'location' | 'schedule' | 'license' | 'degree' | 'physical' | 'other';
  /** Text snippet from JD showing this requirement */
  evidence: string;
  /** User's confirmation: true = meets, false = doesn't meet, undefined = not confirmed */
  userConfirmed?: boolean;
};

/**
 * Finding codes representing specific issues detected during analysis.
 */
export type FindingCode =
  | 'MULTI_COLUMN_DETECTED'
  | 'HEADER_CONTACT_INFO_RISK'
  | 'LOW_TEXT_DENSITY_IMAGE_PDF'
  | 'MISSING_CONTACT_INFO'
  | 'MISSING_EMAIL'
  | 'MISSING_PHONE'
  | 'MISSING_SECTIONS'
  | 'MISSING_EXPERIENCE_SECTION'
  | 'MISSING_EDUCATION_SECTION'
  | 'TABLES_OR_COLUMNS_RISK'
  | 'FILENAME_HYGIENE'
  | 'DATE_FORMAT_RISK'
  | 'JD_KNOCKOUT_DETECTED'
  | 'MISSING_KEYWORD'
  | 'CONTACT_POSITION_RISK';

/**
 * A single finding/issue detected during resume analysis.
 * Each finding includes an explanation and actionable fix suggestion.
 */
export type Finding = {
  /** Unique identifier */
  id: string;
  /** Severity level of the finding */
  severity: 'info' | 'warn' | 'risk';
  /** Machine-readable code identifying the type of finding */
  code: FindingCode;
  /** User-friendly title */
  title: string;
  /** Explanation of why this issue matters for ATS parsing */
  whyItMatters: string;
  /** Concrete, actionable suggestion for fixing the issue */
  fix: string;
  /** Optional evidence snippet (never the whole resume) */
  evidence?: string;
};

/**
 * Calculated scores from the analysis.
 */
export type Scores = {
  /** Parse Health score (0-100) measuring extraction quality */
  parseHealth: number;
  /** Layout & Structure sub-score (0-100) */
  layoutScore: number;
  /** Contact Information sub-score (0-100) */
  contactScore: number;
  /** Section Headers sub-score (0-100) */
  sectionScore: number;
  /** Keyword Coverage score (0-100) - only present if JD provided */
  keywordCoverage?: number;
  /** Knockout Risk level - only present if JD provided */
  knockoutRisk?: 'low' | 'medium' | 'high';
  /** Human-readable explanations of scoring factors */
  notes?: string[];
};

/**
 * Metadata about BYOK (Bring Your Own Key) mode usage.
 */
export type ByokMetadata = {
  /** LLM provider used */
  provider: 'gemini' | 'openai' | 'other';
  /** Specific model used */
  model: string;
  /** ISO timestamp of user consent */
  consentAt: string;
  /** How the API key is stored */
  keyStorageMode: 'session' | 'local_encrypted' | 'local_plain';
};

/**
 * Represents an exported report.
 */
export type ExportArtifact = {
  /** Unique identifier */
  id: string;
  /** Export format */
  format: 'json' | 'markdown' | 'pdf';
  /** ISO timestamp of export */
  exportedAt: string;
  /** File size in bytes (if known) */
  fileSizeBytes?: number;
};

/**
 * Grade labels for Parse Health scores.
 */
export type ScoreGrade = 'Excellent' | 'Good' | 'Fair' | 'Poor';

/**
 * Converts a numeric score to a grade label.
 */
export function scoreToGrade(score: number): ScoreGrade {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
}

/**
 * Creates a new empty analysis session with generated ID.
 */
export function createSession(resume: ResumeArtifact): AnalysisSession {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    resume,
    findings: [],
    scores: {
      parseHealth: 100, // Will be calculated
      layoutScore: 100,
      contactScore: 100,
      sectionScore: 100,
    },
  };
}
