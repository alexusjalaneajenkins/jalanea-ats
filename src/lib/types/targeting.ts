/**
 * Structured targeting workflow models for guided resume tailoring.
 *
 * These types power the multi-step job targeting wizard so every stage uses
 * defensible, explicitly shaped data instead of ad-hoc UI objects.
 */

export type JobSignalPriority = 'must-have' | 'core' | 'preferred';
export type JobSignalCategory =
  | 'responsibility'
  | 'skill'
  | 'tool'
  | 'experience'
  | 'credential'
  | 'education'
  | 'domain'
  | 'soft-skill'
  | 'outcome'
  | 'other';

export type MatchStatus = 'proven' | 'partial' | 'missing' | 'research';

export type JobSignal = {
  id: string;
  label: string;
  category: JobSignalCategory;
  priority: JobSignalPriority;
  evidence: string;
  keywords: string[];
};

export type ParsedJobData = {
  titleHint: string | null;
  companyHint: string | null;
  seniorityHint: string | null;
  locationHint: string | null;
  summary: string;
  responsibilities: JobSignal[];
  mustHaves: JobSignal[];
  preferredSignals: JobSignal[];
  toolsAndPlatforms: string[];
  domainSignals: string[];
  outcomes: string[];
};

export type RoleBreakdown = {
  mission: string;
  dayToDayFocus: string[];
  proofAreas: string[];
  toolStack: string[];
  successMeasures: string[];
  hiringManagerChecklist: string[];
};

export type EmployerIntent = {
  primaryNeed: string;
  whyNow: string[];
  teamContext: string[];
  pressurePoints: string[];
  proofPriorities: string[];
  candidateWarnings: string[];
};

export type MatchEvidence = {
  id: string;
  requirement: string;
  status: MatchStatus;
  rationale: string;
  resumeEvidence: string[];
  jdEvidence: string;
  nextMove: string;
};

export type MatchAnalysis = {
  overallAssessment: string;
  strengths: string[];
  gaps: string[];
  defensibleWins: string[];
  proofMap: MatchEvidence[];
  unsupportedClaimsToAvoid: string[];
};

export type ResearchTask = {
  id: string;
  question: string;
  whyItMatters: string;
  sourceHint: string;
  output: string;
};

export type ResearchAssistant = {
  checklist: ResearchTask[];
  quickPrompts: string[];
  resumeProofRequests: string[];
};

export type TailoringSuggestion = {
  id: string;
  section: 'headline' | 'summary' | 'experience' | 'skills' | 'education' | 'projects' | 'general';
  action: 'add' | 'rewrite' | 'reorder' | 'trim' | 'quantify';
  instruction: string;
  rationale: string;
  proofRequired: string[];
  safeExample: string;
  guardrail: string;
};

export type TailoredDraft = {
  summaryLine: string;
  focusAreas: string[];
  suggestions: TailoringSuggestion[];
  draftText: string;
  proofReminder: string;
};

export type AtsReview = {
  readiness: 'ready' | 'needs-work' | 'risky';
  parseHealth: number;
  keywordCoverage: number;
  recruiterSearch?: number;
  knockoutRisk: 'low' | 'medium' | 'high';
  checklist: string[];
  blockers: string[];
  recommendation: string;
};

export type IterationSnapshot = {
  id: string;
  createdAt: string;
  label: string;
  notes: string[];
  draftText: string;
  proofGuardrail: string;
  changeSummary: string[];
};

export type TargetingArtifact = {
  version: 1;
  parsedJobData: ParsedJobData;
  roleBreakdown: RoleBreakdown;
  employerIntent: EmployerIntent;
  matchAnalysis: MatchAnalysis;
  researchAssistant: ResearchAssistant;
  tailoredDraft: TailoredDraft;
  atsReview: AtsReview;
  iterationHistory: IterationSnapshot[];
};
