'use client';

/**
 * Score Announcer Component
 *
 * Provides an aria-live region for announcing score changes to screen readers.
 * Uses polite announcements to avoid interrupting user navigation.
 */

import { useEffect, useState, useRef } from 'react';

export interface ScoreUpdate {
  name: string;
  value: number | string;
  label?: string;
}

export interface ScoreAnnouncerProps {
  /** Current scores to announce */
  scores: ScoreUpdate[];
  /** Whether to announce on initial render */
  announceOnMount?: boolean;
}

export function ScoreAnnouncer({
  scores,
  announceOnMount = true,
}: ScoreAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const prevScoresRef = useRef<ScoreUpdate[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip if no scores
    if (scores.length === 0) return;

    // Handle initial announcement
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (announceOnMount) {
        const initialMessage = scores
          .map((s) => `${s.name}: ${s.value}${s.label ? `, ${s.label}` : ''}`)
          .join('. ');
        setAnnouncement(`Analysis complete. ${initialMessage}`);
      }
      prevScoresRef.current = scores;
      return;
    }

    // Check for changes and announce
    const changes: string[] = [];
    scores.forEach((score) => {
      const prev = prevScoresRef.current.find((p) => p.name === score.name);
      if (!prev || prev.value !== score.value) {
        changes.push(
          `${score.name} updated to ${score.value}${score.label ? `, ${score.label}` : ''}`
        );
      }
    });

    if (changes.length > 0) {
      setAnnouncement(changes.join('. '));
    }

    prevScoresRef.current = scores;
  }, [scores, announceOnMount]);

  // Clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

export default ScoreAnnouncer;
