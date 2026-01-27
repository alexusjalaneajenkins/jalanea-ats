'use client';

import { useState, useEffect, useCallback } from 'react';

const PROGRESS_STORAGE_KEY = 'jalanea-user-progress';

export interface UserProgress {
  /** Whether the user has configured an API key */
  hasApiKey: boolean;
  /** The last session ID (if any) */
  lastSessionId: string | null;
  /** Timestamp of the last session */
  lastSessionTime: number | null;
  /** The filename of the last uploaded resume */
  lastFileName: string | null;
  /** Whether a job description was added in the last session */
  hadJobDescription: boolean;
}

const DEFAULT_PROGRESS: UserProgress = {
  hasApiKey: false,
  lastSessionId: null,
  lastSessionTime: null,
  lastFileName: null,
  hadJobDescription: false,
};

/**
 * Hook to manage user progress persistence
 *
 * Tracks the user's progress through the workflow and saves it to localStorage.
 * This allows showing a "Continue where you left off" prompt on return visits.
 */
export function useProgress() {
  const [progress, setProgress] = useState<UserProgress>(DEFAULT_PROGRESS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load progress from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as UserProgress;
        setProgress(parsed);
      }
    } catch {
      // localStorage not available or invalid JSON
    }
    setIsLoaded(true);
  }, []);

  // Save progress to localStorage
  const saveProgress = useCallback((updates: Partial<UserProgress>) => {
    setProgress((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  }, []);

  // Update API key status
  const setHasApiKey = useCallback((hasKey: boolean) => {
    saveProgress({ hasApiKey: hasKey });
  }, [saveProgress]);

  // Save session info
  const saveSession = useCallback((sessionId: string, fileName: string, hadJobDescription: boolean = false) => {
    saveProgress({
      lastSessionId: sessionId,
      lastSessionTime: Date.now(),
      lastFileName: fileName,
      hadJobDescription,
    });
  }, [saveProgress]);

  // Clear last session
  const clearSession = useCallback(() => {
    saveProgress({
      lastSessionId: null,
      lastSessionTime: null,
      lastFileName: null,
      hadJobDescription: false,
    });
  }, [saveProgress]);

  // Check if we have a recent session (within last 24 hours)
  const hasRecentSession = useCallback(() => {
    if (!progress.lastSessionId || !progress.lastSessionTime) return false;
    const hoursSinceLastSession = (Date.now() - progress.lastSessionTime) / (1000 * 60 * 60);
    return hoursSinceLastSession < 24;
  }, [progress.lastSessionId, progress.lastSessionTime]);

  // Format the time since last session
  const getTimeSinceLastSession = useCallback(() => {
    if (!progress.lastSessionTime) return null;

    const minutes = Math.floor((Date.now() - progress.lastSessionTime) / (1000 * 60));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;

    const days = Math.floor(hours / 24);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  }, [progress.lastSessionTime]);

  return {
    progress,
    isLoaded,
    setHasApiKey,
    saveSession,
    clearSession,
    hasRecentSession,
    getTimeSinceLastSession,
  };
}
