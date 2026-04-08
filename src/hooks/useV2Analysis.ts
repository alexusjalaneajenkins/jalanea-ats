'use client';

/**
 * useV2Analysis Hook
 *
 * Calls the V2 engine API and manages loading/error state.
 */

import { useState, useCallback } from 'react';
import type { V2AnalysisResult } from '@/lib/v2';

export interface UseV2AnalysisReturn {
  result: V2AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  analyze: (resume: string, jobDescription: string) => Promise<V2AnalysisResult | null>;
  reset: () => void;
}

export function useV2Analysis(): UseV2AnalysisReturn {
  const [result, setResult] = useState<V2AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (
    resume: string,
    jobDescription: string
  ): Promise<V2AnalysisResult | null> => {
    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze-v2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `V2 analysis failed (${response.status})`);
      }

      setResult(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'V2 analysis failed';
      setError(msg);
      console.error('V2 analysis error:', err);
      return null;
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, isAnalyzing, error, analyze, reset };
}
