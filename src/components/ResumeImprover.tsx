'use client';

/**
 * Resume Improver Component
 *
 * Displays resume text with clickable bullet points that can be improved using AI.
 * Implements the "Select and Replace" pattern [EXTERNAL - Gemini research].
 *
 * Features:
 * - Click any bullet point to get AI improvement suggestions
 * - 3 variations per bullet (High Impact, Leadership, Concise)
 * - Edit-in-place before committing changes
 * - Tracks all changes for undo/export
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Undo,
  Download,
  Copy,
  Check,
  AlertCircle,
  MousePointer2,
  Wand2,
} from 'lucide-react';
import { BulletSuggestionPopover, BulletVariation } from './BulletSuggestionPopover';
import type { GeminiModel } from '@/lib/llm/types';

interface ResumeImproverProps {
  /** Original resume text */
  resumeText: string;
  /** Job description for context */
  jobDescription?: string;
  /** Missing keywords to incorporate */
  missingKeywords?: string[];
  /** Gaps detected in AI analysis */
  analysisGaps?: string[];
  /** Top recommendations from AI analysis */
  analysisRecommendations?: string[];
  /** Whether free tier or BYOK is available */
  isAiAvailable: boolean;
  /** Selected Gemini model (optional) */
  geminiModel?: GeminiModel;
  /** Callback when user wants to configure API */
  onConfigureClick?: () => void;
  /** Callback when the working draft changes */
  onDraftChange?: (payload: { draftText: string; changes: BulletChange[] }) => void;
}

export interface BulletChange {
  id: string;
  lineIndex: number;
  original: string;
  improved: string;
  timestamp: number;
}

export function ResumeImprover({
  resumeText,
  jobDescription,
  missingKeywords = [],
  analysisGaps = [],
  analysisRecommendations = [],
  isAiAvailable,
  geminiModel,
  onConfigureClick,
  onDraftChange,
}: ResumeImproverProps) {
  // Track all bullet changes
  const [changes, setChanges] = useState<BulletChange[]>([]);

  // Popover state
  const [selectedBullet, setSelectedBullet] = useState<{
    index: number;
    text: string;
    position: { top: number; left: number };
  } | null>(null);

  const [variations, setVariations] = useState<BulletVariation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isAutoImproving, setIsAutoImproving] = useState(false);
  const [autoImproveError, setAutoImproveError] = useState<string | null>(null);
  const [autoImproveSummary, setAutoImproveSummary] = useState<string | null>(null);

  // Parse resume into lines, identifying bullets
  const lines = useMemo(() => {
    return resumeText.split('\n').map((line, index) => {
      const trimmed = line.trim();
      const isBullet =
        trimmed.startsWith('•') ||
        trimmed.startsWith('-') ||
        trimmed.startsWith('*') ||
        /^\d+\./.test(trimmed) ||
        // Lines that look like achievements (start with action verb patterns)
        /^(Developed|Created|Managed|Led|Built|Designed|Implemented|Achieved|Increased|Decreased|Reduced|Improved|Launched|Established|Coordinated|Analyzed|Delivered|Generated|Negotiated|Streamlined|Spearheaded|Orchestrated|Championed|Pioneered|Transformed)/i.test(
          trimmed
        );

      // Check if this line has been changed
      const change = changes.find((c) => c.lineIndex === index);

      return {
        index,
        original: line,
        current: change ? change.improved : line,
        isBullet: isBullet && trimmed.length > 20,
        hasChange: !!change,
      };
    });
  }, [resumeText, changes]);

  // Get current full text (with changes applied)
  const currentText = useMemo(() => {
    return lines.map((l) => l.current).join('\n');
  }, [lines]);

  useEffect(() => {
    onDraftChange?.({
      draftText: currentText,
      changes,
    });
  }, [onDraftChange, currentText, changes]);

  // Fetch AI suggestions for a bullet
  const fetchSuggestions = useCallback(
    async (bullet: string) => {
      setIsLoading(true);
      setError(null);
      setVariations([]);

      try {
        const response = await fetch('/api/improve-bullet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bullet,
            jobDescription,
            missingKeywords,
            gaps: analysisGaps,
            recommendations: analysisRecommendations,
            model: geminiModel,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Failed to generate suggestions');
        }

        setVariations(data.variations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate suggestions');
      } finally {
        setIsLoading(false);
      }
    },
    [jobDescription, missingKeywords, analysisGaps, analysisRecommendations, geminiModel]
  );

  // Handle bullet click
  const handleBulletClick = useCallback(
    (e: React.MouseEvent, line: typeof lines[0]) => {
      if (!isAiAvailable || !line.isBullet) return;

      const rect = (e.target as HTMLElement).getBoundingClientRect();

      setSelectedBullet({
        index: line.index,
        text: line.current.trim(),
        position: {
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX,
        },
      });

      fetchSuggestions(line.current.trim());
    },
    [isAiAvailable, fetchSuggestions]
  );

  // Handle selecting a variation
  const handleSelectVariation = useCallback(
    (text: string) => {
      if (!selectedBullet) return;

      const newChange: BulletChange = {
        id: `change-${Date.now()}`,
        lineIndex: selectedBullet.index,
        original: lines[selectedBullet.index].original,
        improved: text,
        timestamp: Date.now(),
      };

      // Replace existing change for this line or add new
      setChanges((prev) => {
        const existing = prev.findIndex((c) => c.lineIndex === selectedBullet.index);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = newChange;
          return updated;
        }
        return [...prev, newChange];
      });

      setSelectedBullet(null);
    },
    [selectedBullet, lines]
  );

  // Undo last change
  const handleUndo = useCallback(() => {
    setChanges((prev) => prev.slice(0, -1));
  }, []);

  // Undo specific change
  const handleUndoChange = useCallback((changeId: string) => {
    setChanges((prev) => prev.filter((c) => c.id !== changeId));
  }, []);

  // Copy improved text
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(currentText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentText]);

  // Download as text file
  const handleDownload = useCallback(() => {
    const blob = new Blob([currentText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'improved-resume.txt';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentText]);

  // Regenerate suggestions
  const handleRegenerate = useCallback(() => {
    if (selectedBullet) {
      fetchSuggestions(selectedBullet.text);
    }
  }, [selectedBullet, fetchSuggestions]);

  const handleAutoImprove = useCallback(async () => {
    if (!isAiAvailable) return;

    setAutoImproveError(null);
    setAutoImproveSummary(null);
    setIsAutoImproving(true);

    try {
      const candidateLines = lines
        .filter((line) => line.isBullet)
        .slice(0, 3);

      if (candidateLines.length === 0) {
        setAutoImproveError('No eligible bullet points found to improve.');
        return;
      }

      const newChanges: BulletChange[] = [];

      for (const line of candidateLines) {
        const response = await fetch('/api/improve-bullet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bullet: line.current.trim(),
            jobDescription,
            missingKeywords,
            gaps: analysisGaps,
            recommendations: analysisRecommendations,
            model: geminiModel,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const message = data?.message || data?.error || 'Failed to improve bullets';
          throw new Error(message);
        }

        const variations = Array.isArray(data?.variations) ? data.variations as BulletVariation[] : [];
        if (variations.length === 0) {
          continue;
        }

        const preferred =
          variations.find((v) => v.strategy === 'high-impact') ||
          variations.find((v) => v.strategy === 'leadership') ||
          variations[0];

        if (!preferred?.text?.trim()) {
          continue;
        }

        newChanges.push({
          id: `auto-${line.index}-${Date.now()}`,
          lineIndex: line.index,
          original: lines[line.index].original,
          improved: preferred.text.trim(),
          timestamp: Date.now(),
        });
      }

      if (newChanges.length === 0) {
        setAutoImproveError('No improved bullets were generated. Try manual bullet improvement.');
        return;
      }

      setChanges((prev) => {
        const byLine = new Map<number, BulletChange>();
        for (const change of prev) byLine.set(change.lineIndex, change);
        for (const change of newChanges) byLine.set(change.lineIndex, change);
        return Array.from(byLine.values()).sort((a, b) => a.lineIndex - b.lineIndex);
      });

      setAutoImproveSummary(`Created an ATS-optimized draft by improving ${newChanges.length} bullet${newChanges.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setAutoImproveError(err instanceof Error ? err.message : 'Auto-improve failed');
    } finally {
      setIsAutoImproving(false);
    }
  }, [
    isAiAvailable,
    lines,
    jobDescription,
    missingKeywords,
    analysisGaps,
    analysisRecommendations,
    geminiModel,
  ]);

  if (!isAiAvailable) {
    return (
      <>
        <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-6 text-center">
          <div className="w-16 h-16 bg-amber-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-500/30">
            <Sparkles className="w-8 h-8 text-amber-400" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">Resume Improvement</h3>
          <p className="text-indigo-300 text-sm max-w-md mx-auto mb-4">
            Click any bullet point to get AI-powered improvement suggestions. Use the free demo or add your Gemini key to enable this feature.
          </p>
          {onConfigureClick && (
            <button
              onClick={onConfigureClick}
              className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors text-sm font-medium"
            >
              Enable AI Features
            </button>
          )}
        </div>
        {/* Keep AnimatePresence mounted to prevent hook count mismatch */}
        <AnimatePresence />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Resume Improver
          </h3>
          <p className="text-sm text-indigo-300 mt-1">
            Click any bullet point to improve it with AI, or auto-generate an ATS-ready draft
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAutoImprove}
            disabled={isAutoImproving}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors border
              ${isAutoImproving
                ? 'bg-indigo-800/40 text-indigo-400 border-indigo-700/40 cursor-not-allowed'
                : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border-cyan-500/30'
              }
            `}
            title="Automatically improve top bullets based on detected gaps and keywords"
          >
            <Wand2 className="w-4 h-4" />
            {isAutoImproving ? 'Auto-Improving...' : 'Auto-Improve Draft'}
          </button>

          {changes.length > 0 && (
            <button
              onClick={handleUndo}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-300 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
            >
              <Undo className="w-4 h-4" />
              Undo
            </button>
          )}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-indigo-300 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg border border-indigo-500/30 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Changes summary */}
      {changes.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-emerald-300">
              {changes.length} {changes.length === 1 ? 'improvement' : 'improvements'} made
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {changes.slice(-3).map((change) => (
              <div
                key={change.id}
                className="flex items-center gap-2 px-2 py-1 bg-emerald-500/20 rounded-lg text-xs"
              >
                <span className="text-emerald-300 max-w-[150px] truncate">
                  Line {change.lineIndex + 1}
                </span>
                <button
                  onClick={() => handleUndoChange(change.id)}
                  className="text-emerald-400 hover:text-white"
                  title="Undo this change"
                >
                  <Undo className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {autoImproveSummary && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3 text-sm text-cyan-200">
          {autoImproveSummary}
        </div>
      )}

      {autoImproveError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-300">
          {autoImproveError}
        </div>
      )}

      {/* Instructions */}
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-900/30 rounded-lg border border-indigo-500/20">
        <MousePointer2 className="w-4 h-4 text-indigo-400" />
        <span className="text-xs text-indigo-300">
          Click any <span className="text-amber-300 font-medium">highlighted bullet</span> to improve it
        </span>
      </div>

      {/* Resume text */}
      <div className="bg-indigo-950/50 rounded-xl border border-indigo-500/20 p-4 font-mono text-sm overflow-x-auto relative">
        <div className="whitespace-pre-wrap">
          {lines.map((line) => (
            <div
              key={line.index}
              className={`
                ${line.isBullet ? 'cursor-pointer hover:bg-amber-500/10 -mx-2 px-2 py-0.5 rounded transition-colors' : ''}
                ${line.hasChange ? 'bg-emerald-500/10 -mx-2 px-2 py-0.5 rounded border-l-2 border-emerald-500' : ''}
              `}
              onClick={(e) => line.isBullet && handleBulletClick(e, line)}
            >
              {line.isBullet && !line.hasChange && (
                <span className="text-amber-400/50 mr-1">✦</span>
              )}
              {line.hasChange && (
                <span className="text-emerald-400 mr-1">✓</span>
              )}
              <span className={line.hasChange ? 'text-emerald-200' : line.isBullet ? 'text-indigo-100' : 'text-indigo-300'}>
                {line.current}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Suggestion Popover */}
      <AnimatePresence>
        {selectedBullet && (
          <BulletSuggestionPopover
            original={selectedBullet.text}
            variations={variations}
            position={selectedBullet.position}
            isLoading={isLoading}
            error={error}
            onSelect={handleSelectVariation}
            onRegenerate={handleRegenerate}
            onClose={() => setSelectedBullet(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default ResumeImprover;
