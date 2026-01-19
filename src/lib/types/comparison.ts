/**
 * Multi-JD Comparison Types
 *
 * Types for comparing one resume against multiple job descriptions.
 */

import { ATSVendor } from '../ats';

/**
 * Scores for a single job comparison
 */
export interface JobScores {
  parseHealth: number;
  knockoutRisk: 'low' | 'medium' | 'high';
  semanticMatch?: number;
  recruiterSearch?: number;
  keywordCoverage?: number;
}

/**
 * A single job in the comparison
 */
export interface ComparisonJob {
  id: string;
  title: string;
  company?: string;
  url?: string;
  atsVendor?: ATSVendor;
  rawText: string;
  scores: JobScores;
  matchedKeywords: string[];
  missingKeywords: string[];
  addedAt: string;
}

/**
 * Common missing keyword with frequency
 */
export interface CommonMissingKeyword {
  keyword: string;
  count: number; // How many JDs need this
  jobIds: string[]; // Which jobs need it
}

/**
 * Comparison session - one resume vs multiple jobs
 */
export interface ComparisonSession {
  id: string;
  resumeFileName: string;
  resumeHash: string;
  sessionId: string; // Link to original analysis session
  jobs: ComparisonJob[];
  commonMissingKeywords: CommonMissingKeyword[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Job match badge type
 */
export type MatchBadge = 'best-match' | 'good-match' | 'weak-match' | 'field-mismatch';

/**
 * Get match badge for a job based on scores
 */
export function getMatchBadge(job: ComparisonJob): MatchBadge {
  const semantic = job.scores.semanticMatch ?? 0;
  const recruiter = job.scores.recruiterSearch ?? 0;
  const avgMatch = (semantic + recruiter) / 2;

  if (avgMatch >= 70) return 'best-match';
  if (avgMatch >= 50) return 'good-match';
  if (avgMatch >= 25) return 'weak-match';
  return 'field-mismatch';
}

/**
 * Calculate common missing keywords across jobs
 */
export function calculateCommonMissing(jobs: ComparisonJob[]): CommonMissingKeyword[] {
  const keywordCounts = new Map<string, { count: number; jobIds: string[] }>();

  for (const job of jobs) {
    for (const keyword of job.missingKeywords) {
      const normalized = keyword.toLowerCase().trim();
      const existing = keywordCounts.get(normalized) || { count: 0, jobIds: [] };
      existing.count++;
      existing.jobIds.push(job.id);
      keywordCounts.set(normalized, existing);
    }
  }

  // Convert to array and sort by count descending
  const result: CommonMissingKeyword[] = [];
  for (const [keyword, data] of keywordCounts) {
    result.push({
      keyword,
      count: data.count,
      jobIds: data.jobIds,
    });
  }

  return result.sort((a, b) => b.count - a.count);
}

/**
 * Get best matching job from comparison
 */
export function getBestMatch(jobs: ComparisonJob[]): ComparisonJob | null {
  if (jobs.length === 0) return null;

  return jobs.reduce((best, current) => {
    const bestScore = (best.scores.semanticMatch ?? 0) + (best.scores.recruiterSearch ?? 0);
    const currentScore = (current.scores.semanticMatch ?? 0) + (current.scores.recruiterSearch ?? 0);
    return currentScore > bestScore ? current : best;
  });
}

/**
 * Sort jobs by overall match score
 */
export function sortJobsByMatch(jobs: ComparisonJob[]): ComparisonJob[] {
  return [...jobs].sort((a, b) => {
    const scoreA = (a.scores.semanticMatch ?? 0) + (a.scores.recruiterSearch ?? 0);
    const scoreB = (b.scores.semanticMatch ?? 0) + (b.scores.recruiterSearch ?? 0);
    return scoreB - scoreA;
  });
}

/**
 * Generate recommendations based on comparison
 */
export interface ComparisonRecommendation {
  type: 'add-skill' | 'focus-role' | 'avoid-role' | 'general';
  priority: 'high' | 'medium' | 'low';
  message: string;
}

export function generateRecommendations(
  jobs: ComparisonJob[],
  commonMissing: CommonMissingKeyword[]
): ComparisonRecommendation[] {
  const recommendations: ComparisonRecommendation[] = [];

  // Recommend adding skills that appear in 50%+ of jobs
  const threshold = Math.ceil(jobs.length / 2);
  const frequentMissing = commonMissing.filter(k => k.count >= threshold);

  for (const keyword of frequentMissing.slice(0, 3)) {
    recommendations.push({
      type: 'add-skill',
      priority: keyword.count === jobs.length ? 'high' : 'medium',
      message: `Adding "${keyword.keyword}" could improve ${keyword.count} of ${jobs.length} applications.`,
    });
  }

  // Identify best matching roles
  const bestMatches = jobs.filter(j => getMatchBadge(j) === 'best-match');
  if (bestMatches.length > 0) {
    recommendations.push({
      type: 'focus-role',
      priority: 'high',
      message: `You're a strong match for ${bestMatches.length} ${bestMatches.length === 1 ? 'role' : 'roles'}. Prioritize these applications.`,
    });
  }

  // Warn about field mismatches
  const mismatches = jobs.filter(j => getMatchBadge(j) === 'field-mismatch');
  if (mismatches.length > 0) {
    recommendations.push({
      type: 'avoid-role',
      priority: 'low',
      message: `${mismatches.length} ${mismatches.length === 1 ? 'role is' : 'roles are'} a weak match. Consider if these align with your career goals.`,
    });
  }

  return recommendations;
}
