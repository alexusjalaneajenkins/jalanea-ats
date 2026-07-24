'use client';

/**
 * useV2Analysis Hook
 *
 * Calls the V2 engine API and manages loading/error state.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { V2AnalysisResult } from '@/lib/v2';

export interface UseV2AnalysisReturn {
  result: V2AnalysisResult | null;
  isAnalyzing: boolean;
  error: string | null;
  inputRevision: string | null;
  analyze: (
    resume: string,
    jobDescription: string,
    consentGranted: boolean,
    inputRevision: string
  ) => Promise<V2AnalysisResult | null>;
  abort: () => void;
  restore: (result: V2AnalysisResult, inputRevision: string) => void;
  reset: () => void;
}

export function useV2Analysis(): UseV2AnalysisReturn {
  const [result, setResult] = useState<V2AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputRevision, setInputRevision] = useState<string | null>(null);
  const activeRequestRef = useRef<{
    inputRevision: string;
    controller: AbortController;
    promise: Promise<V2AnalysisResult | null>;
  } | null>(null);

  const analyze = useCallback(async (
    resume: string,
    jobDescription: string,
    consentGranted: boolean,
    requestedRevision: string
  ): Promise<V2AnalysisResult | null> => {
    const existingRequest = activeRequestRef.current;
    if (existingRequest?.inputRevision === requestedRevision) {
      return existingRequest.promise;
    }

    existingRequest?.controller.abort();
    const controller = new AbortController();
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setInputRevision(requestedRevision);

    const requestPromise = (async () => {
      await Promise.resolve();
      try {
        if (!consentGranted) {
          throw new Error('AI data-sharing consent is required');
        }

        const response = await fetch('/api/analyze-v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-AI-Consent': 'acknowledged',
          },
          body: JSON.stringify({ resume, jobDescription }),
          signal: controller.signal,
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || `V2 analysis failed (${response.status})`);
        }

        if (activeRequestRef.current?.inputRevision === requestedRevision) {
          setResult(data);
        }
        return data as V2AnalysisResult;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return null;
        }

        if (activeRequestRef.current?.inputRevision === requestedRevision) {
          const message = err instanceof Error ? err.message : 'V2 analysis failed';
          setError(message);
          console.error('V2 analysis request failed', {
            name: err instanceof Error ? err.name : 'UnknownError',
          });
        }
        return null;
      } finally {
        if (activeRequestRef.current?.inputRevision === requestedRevision) {
          activeRequestRef.current = null;
          setIsAnalyzing(false);
        }
      }
    })();

    activeRequestRef.current = {
      inputRevision: requestedRevision,
      controller,
      promise: requestPromise,
    };
    return requestPromise;
  }, []);

  const abort = useCallback(() => {
    activeRequestRef.current?.controller.abort();
    activeRequestRef.current = null;
    setIsAnalyzing(false);
  }, []);

  const restore = useCallback((
    restoredResult: V2AnalysisResult,
    restoredRevision: string
  ) => {
    abort();
    setResult(restoredResult);
    setInputRevision(restoredRevision);
    setError(null);
  }, [abort]);

  const reset = useCallback(() => {
    abort();
    setResult(null);
    setError(null);
    setInputRevision(null);
  }, [abort]);

  useEffect(() => abort, [abort]);

  return {
    result,
    isAnalyzing,
    error,
    inputRevision,
    analyze,
    abort,
    restore,
    reset,
  };
}
