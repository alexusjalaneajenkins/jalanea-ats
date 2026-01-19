'use client';

import { Check, X, Star, Lightbulb } from 'lucide-react';
import { CoverageResult, getCoverageGrade } from '@/lib/analysis';
import { KeywordChipList } from '@/components/ui/KeywordChip';

interface KeywordCoveragePanelProps {
  /** Coverage calculation result */
  coverage: CoverageResult;
  /** Optional callback when a keyword is clicked */
  onKeywordClick?: (keyword: string) => void;
}

/**
 * Keyword Coverage Panel Component
 *
 * Displays keyword match score and lists found/missing keywords.
 * Styled for dark theme with accessible KeywordChip components.
 */
export function KeywordCoveragePanel({ coverage, onKeywordClick }: KeywordCoveragePanelProps) {
  const { score, foundKeywords, missingKeywords, bonusKeywords } = coverage;
  const grade = getCoverageGrade(score);

  // Get score-based colors for dark theme
  const getScoreColors = (s: number) => {
    if (s >= 80) return { text: 'text-emerald-400', bar: 'bg-emerald-500', glow: 'shadow-emerald-500/20' };
    if (s >= 50) return { text: 'text-amber-400', bar: 'bg-amber-500', glow: 'shadow-amber-500/20' };
    return { text: 'text-red-400', bar: 'bg-red-500', glow: 'shadow-red-500/20' };
  };

  const colors = getScoreColors(score);

  return (
    <div
      className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden card-hover-glow"
      role="region"
      aria-label={`Keyword Coverage: ${score}% - ${grade}`}
    >
      {/* Header with score */}
      <div className="px-4 py-4 border-b border-indigo-500/20 bg-gradient-to-r from-indigo-900/40 to-indigo-800/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-indigo-200 uppercase tracking-wide">
              Keyword Coverage
            </h3>
            <p className="text-xs text-indigo-400 mt-0.5">
              How well your resume matches the job requirements
            </p>
          </div>

          {/* Score display */}
          <div className="text-center" aria-label={`Score: ${score}%`}>
            <div className={`text-3xl font-black ${colors.text} drop-shadow-lg`}>
              {score}%
            </div>
            <div className={`text-xs font-semibold ${colors.text}`}>{grade}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="mt-3 h-2 bg-indigo-950/50 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Keyword coverage ${score}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${colors.bar}`}
            style={{ width: `${score}%`, boxShadow: `0 0 10px currentColor` }}
          />
        </div>
      </div>

      {/* Keywords sections */}
      <div className="divide-y divide-indigo-500/20">
        {/* Found keywords */}
        {foundKeywords.length > 0 && (
          <div className="p-4">
            <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Check className="w-4 h-4" aria-hidden="true" />
              Keywords Found ({foundKeywords.length})
            </h4>
            <KeywordChipList
              keywords={foundKeywords}
              status="matched"
              onKeywordClick={onKeywordClick}
              emptyMessage="No keywords found"
            />
          </div>
        )}

        {/* Missing keywords - show prominently */}
        {missingKeywords.length > 0 && (
          <div className="p-4 bg-red-950/20">
            <h4 className="text-xs font-bold text-red-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <X className="w-4 h-4" aria-hidden="true" />
              Missing Keywords ({missingKeywords.length})
            </h4>
            <KeywordChipList
              keywords={missingKeywords}
              status="missing"
              importance="critical"
              onKeywordClick={onKeywordClick}
              emptyMessage="All keywords found!"
            />
            <p className="text-xs text-indigo-400 mt-3 flex items-start gap-1.5">
              <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-400" aria-hidden="true" />
              <span>
                If you have these skills, consider adding the exact phrases to your resume.
              </span>
            </p>
          </div>
        )}

        {/* Bonus keywords */}
        {bonusKeywords.length > 0 && (
          <div className="p-4 bg-blue-950/20">
            <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
              <Star className="w-4 h-4" aria-hidden="true" />
              Bonus: Nice-to-Have ({bonusKeywords.length})
            </h4>
            <KeywordChipList
              keywords={bonusKeywords.slice(0, 10)}
              status="bonus"
              onKeywordClick={onKeywordClick}
              emptyMessage="No bonus keywords"
            />
            {bonusKeywords.length > 10 && (
              <span className="text-xs text-blue-400 mt-2 inline-block">
                +{bonusKeywords.length - 10} more
              </span>
            )}
          </div>
        )}

        {/* Empty state when no keywords at all */}
        {foundKeywords.length === 0 && missingKeywords.length === 0 && bonusKeywords.length === 0 && (
          <div className="p-4 text-center">
            <p className="text-sm text-indigo-400">
              No keyword analysis available. Add a job description to see keyword matches.
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="px-4 py-3 bg-indigo-950/30 border-t border-indigo-500/20">
        <p className="text-xs text-indigo-400">
          <strong className="text-indigo-300">Tip:</strong> ATS systems often filter resumes by exact keyword
          matches. Use the same terminology as the job posting.
        </p>
      </div>
    </div>
  );
}
