import type { V2AnalysisResult } from '@/lib/v2';

export interface FreeTierAnalysisResult {
  score: number;
  summary: string;
  strengths: string[];
  gaps: string[];
  recommendations: string[];
  keywordMatches: {
    found: string[];
    missing: string[];
    matchRate: number;
  };
  sections: {
    name: string;
    score: number;
    feedback: string;
  }[];
  formatting: {
    issues: string[];
    suggestions: string[];
  };
  overallSuggestions: string[];
  _freeTier?: {
    remaining: number;
    resetAt: string;
  };
}

export type PersistedExternalAnalysis =
  | {
      version: 1;
      inputRevision: string;
      completedAt: string;
      mode: 'paid-v2';
      result: V2AnalysisResult;
    }
  | {
      version: 1;
      inputRevision: string;
      completedAt: string;
      mode: 'free';
      result: FreeTierAnalysisResult;
    };
