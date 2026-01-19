/**
 * Analysis module exports
 */

export { analyzeResume } from './scoring';
export * from './findings';
export { extractKeywords, getSynonyms, SKILL_SYNONYMS } from './keywords';
export { detectKnockouts, getCategoryLabel, getCategoryIcon } from './knockouts';
export type { KnockoutCategory } from './knockouts';
export { calculateCoverage, getCoverageGrade, getCoverageColor } from './coverage';
export type { CoverageResult } from './coverage';
export {
  calculateKnockoutRisk,
  getRiskColor,
  getRiskBgColor,
  getRiskBorderColor,
  getRiskLabel,
} from './knockoutRisk';
export type { RiskLevel, KnockoutRiskResult } from './knockoutRisk';
export { calculateRecruiterSearch } from './recruiterSearch';
export type { RecruiterSearchResult } from './recruiterSearch';
export {
  calculateSemanticMatch,
  isSemanticMatchAvailable,
  getSemanticMatchLabel,
  getSemanticMatchColor,
} from './semantic';
export type { SemanticMatchResult, SubScore } from './semantic';
export {
  enhanceKnockoutsWithResume,
  detectExperienceKnockout,
  buildResumeProfile,
  extractExperienceRequirement,
  extractEducationRequirement,
  extractLocationRequirement,
} from './knockoutAnalysis';
export type {
  EnhancedKnockoutItem,
  ExperienceRequirement,
  EducationRequirement,
  LocationRequirement,
  ResumeProfile,
} from './knockoutAnalysis';
