/**
 * Jalanea ATS Engine V2 — Type Definitions
 *
 * AI-first structured parsing, multi-layer scoring.
 */

// ============================================================================
// Parsed Resume (output of Gemini resume parsing)
// ============================================================================

export interface ParsedResume {
  contactInfo: {
    name: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
  };
  summary?: string;
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
  skills: string[];
  certifications: string[];
  languages?: string[];
  volunteerWork?: VolunteerEntry[];
}

export interface WorkHistoryEntry {
  title: string;
  company: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  bullets: string[];
}

export interface EducationEntry {
  degree: string;
  field?: string;
  school: string;
  graduationDate?: string;
  gpa?: string;
}

export interface VolunteerEntry {
  role: string;
  organization: string;
  description?: string;
}

// ============================================================================
// Parsed Job Description (output of Gemini JD parsing)
// ============================================================================

export interface ParsedJobDescription {
  roleTitle: string;
  company?: string;
  location?: string;
  employmentType?: string;

  knockoutCriteria: KnockoutCriterion[];
  requiredSkills: RequiredSkill[];
  requiredEducation?: { minimumDegree: string; field?: string };
  requiredCertifications: string[];
  preferredQualifications: string[];
  keyResponsibilities: string[];
  booleanSearchTerms: string[];
}

export interface KnockoutCriterion {
  requirement: string;
  category: 'education' | 'certification' | 'authorization' | 'physical' | 'screening';
  isHardRequirement: boolean;
}

export interface RequiredSkill {
  skill: string;
  category: 'technical' | 'clinical' | 'soft' | 'tool';
  matchSection: 'skills' | 'certifications' | 'experience' | 'any';
}

// ============================================================================
// Layer Results
// ============================================================================

export type KnockoutStatus = 'pass' | 'fail' | 'needs-confirmation';

export interface KnockoutResult {
  requirement: string;
  category: KnockoutCriterion['category'];
  isHardRequirement: boolean;
  status: KnockoutStatus;
  checkedSection: string;
  evidence?: string;
}

export interface KnockoutLayerResult {
  results: KnockoutResult[];
  hardFailCount: number;
  needsConfirmationCount: number;
  overallStatus: KnockoutStatus;
  passed: boolean;
}

export interface SectionMatchItem {
  skill: string;
  category: RequiredSkill['category'];
  expectedSection: RequiredSkill['matchSection'];
  foundInSection?: string;
  matchingLine?: string;
  isCorrectSection: boolean;
  found: boolean;
  weight: number; // 1.0 = correct section, 0.6 = wrong section, 0 = not found
}

export interface SectionMatchLayerResult {
  matches: SectionMatchItem[];
  preferredMatches: SectionMatchItem[];
  score: number | null; // 0-100, or null when there are no required items
  evidenceStatus: 'evaluated' | 'not-evaluated';
  foundCount: number;
  totalRequired: number;
}

export interface BooleanSearchLayerResult {
  searchString: string;
  termResults: { term: string; found: boolean; isAndTerm: boolean }[];
  score: number; // 0-100
  evidenceStatus: 'evaluated' | 'not-evaluated';
  wouldSurface: boolean | null;
}

export interface AIRankingResult {
  fitScore: number;
  fitLabel: 'Strong Match' | 'Good Match' | 'Partial Match' | 'Weak Match';
  summary: string;
  strengths: string[];
  gaps: string[];
  conceptualMatches: string[];
  recommendations: string[];
}

// ============================================================================
// Composite V2 Result
// ============================================================================

export interface V2AnalysisResult {
  parsedResume: ParsedResume;
  parsedJD: ParsedJobDescription;
  knockout: KnockoutLayerResult;
  sectionMatch: SectionMatchLayerResult;
  booleanSearch: BooleanSearchLayerResult;
  aiRanking: AIRankingResult;
  composite: {
    score: number; // 0-100
    knockoutGatePassed: boolean;
    knockoutGateStatus: KnockoutStatus;
    confidence: 'full' | 'limited';
    weights: { sectionMatch: number; booleanSearch: number; aiFit: number };
    breakdown: {
      sectionMatchWeighted: number;
      booleanSearchWeighted: number;
      aiFitWeighted: number;
    };
  };
  parseWarnings: string[];
}
