/**
 * Analysis History Types
 *
 * Types for tracking analysis history over time.
 */

import { ATSVendor } from '../ats';

/**
 * Score snapshot at time of analysis
 */
export interface ScoreSnapshot {
  parseHealth: number;
  knockoutRisk: 'low' | 'medium' | 'high';
  semanticMatch?: number;
  recruiterSearch?: number;
  keywordCoverage?: number;
}

/**
 * Job description metadata
 */
export interface JobMetadata {
  title?: string;
  company?: string;
  url?: string;
  atsVendor?: ATSVendor;
  keywordCount?: number;
}

/**
 * Analysis history entry
 *
 * A summarized record of an analysis session.
 */
export interface HistoryEntry {
  id: string;
  timestamp: string;

  // Resume info
  resumeFileName: string;
  resumeFileSize: number;
  resumeFileType: 'pdf' | 'docx' | 'txt';
  resumeHash: string; // For detecting same resume across analyses

  // Scores at time of analysis
  scores: ScoreSnapshot;

  // Job description info (if provided)
  job?: JobMetadata;

  // Session ID for linking back to full analysis
  sessionId: string;
}

/**
 * Resume group - groups history entries by resume file
 */
export interface ResumeGroup {
  resumeHash: string;
  resumeFileName: string;
  entries: HistoryEntry[];
  latestEntry: HistoryEntry;
  improvement?: {
    parseHealth: number; // Change from first to latest
    direction: 'improved' | 'declined' | 'unchanged';
  };
}

/**
 * History statistics
 */
export interface HistoryStats {
  totalAnalyses: number;
  uniqueResumes: number;
  averageParseHealth: number;
  mostRecentAnalysis: string | null;
}

/**
 * History export format
 */
export interface HistoryExport {
  version: string;
  exportedAt: string;
  entries: HistoryEntry[];
}

/**
 * Generate a simple hash from resume content for grouping
 */
export function generateResumeHash(content: string): string {
  // Simple hash based on content length and first/last chars
  // This is not cryptographically secure but sufficient for grouping
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  const len = normalized.length;

  if (len === 0) return 'empty';

  // Take samples from the text to create a fingerprint
  const samples = [
    normalized.substring(0, 50),
    normalized.substring(Math.floor(len / 2) - 25, Math.floor(len / 2) + 25),
    normalized.substring(Math.max(0, len - 50)),
  ].join('');

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < samples.length; i++) {
    const char = samples.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return `${Math.abs(hash).toString(36)}-${len.toString(36)}`;
}
