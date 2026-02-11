'use client';

/**
 * useFreeTier Hook
 *
 * Manages free tier usage state for AI analysis.
 * Fetches and tracks remaining daily uses from the server.
 */

import { useState, useEffect, useCallback } from 'react';
import type { GeminiModel } from '@/lib/llm/types';

export interface FreeTierStatus {
  enabled: boolean;
  dailyLimit: number;
  used: number;
  remaining: number;
  resetAt: string;
}

export interface FreeTierAnalysisResult {
  score: number;
  summary: string;
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

export interface UseFreeTierReturn {
  status: FreeTierStatus | null;
  isLoading: boolean;
  error: string | null;
  analyze: (resume: string, jobDescription: string, model?: GeminiModel) => Promise<FreeTierAnalysisResult>;
  refresh: () => Promise<void>;
}

export function useFreeTier(): UseFreeTierReturn {
  const [status, setStatus] = useState<FreeTierStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch status on mount
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/analyze-free');

      if (!response.ok) {
        if (response.status === 503) {
          // Free tier not available
          setStatus({
            enabled: false,
            dailyLimit: 0,
            used: 0,
            remaining: 0,
            resetAt: '',
          });
          return;
        }
        throw new Error('Failed to fetch free tier status');
      }

      const data = await response.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch free tier status:', err);
      setError(err instanceof Error ? err.message : 'Failed to load free tier status');
      setStatus({
        enabled: false,
        dailyLimit: 0,
        used: 0,
        remaining: 0,
        resetAt: '',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const analyze = useCallback(async (
    resume: string,
    jobDescription: string,
    model?: GeminiModel
  ): Promise<FreeTierAnalysisResult> => {
    setError(null);

    const response = await fetch('/api/analyze-free', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ resume, jobDescription, model }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Update status if we got rate limit info
      if (data.remaining !== undefined) {
        setStatus((prev) =>
          prev
            ? {
                ...prev,
                remaining: data.remaining,
                used: prev.dailyLimit - data.remaining,
              }
            : null
        );
      }

      throw new Error(data.message || data.error || 'Analysis failed');
    }

    // Update remaining uses from response
    if (data._freeTier) {
      setStatus((prev) =>
        prev
          ? {
              ...prev,
              remaining: data._freeTier.remaining,
              used: prev.dailyLimit - data._freeTier.remaining,
              resetAt: data._freeTier.resetAt,
            }
          : null
      );
    }

    return data;
  }, []);

  const refresh = useCallback(async () => {
    await fetchStatus();
  }, []);

  return {
    status,
    isLoading,
    error,
    analyze,
    refresh,
  };
}

export default useFreeTier;
