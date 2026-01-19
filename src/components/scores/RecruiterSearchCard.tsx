'use client';

import { Search, FileText, Info } from 'lucide-react';
import { useState } from 'react';

interface RecruiterSearchCardProps {
  /** The recruiter search score (0-100), undefined if not calculated */
  score?: number;
  /** Whether a job description is needed */
  needsJobDescription?: boolean;
  /** Callback when user clicks to add job description */
  onAddJobDescription?: () => void;
  /** Whether this score is highlighted for the detected ATS */
  isHighlighted?: boolean;
}

/**
 * Recruiter Search Score Card
 *
 * Measures how likely you are to appear in recruiter Boolean searches.
 * This simulates how recruiters manually filter candidates in systems
 * like Greenhouse and Lever that don't auto-rank.
 *
 * Requires Job Description (but NOT BYOK).
 */
export function RecruiterSearchCard({
  score,
  needsJobDescription = true,
  onAddJobDescription,
  isHighlighted = false,
}: RecruiterSearchCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const showNeedsJD = needsJobDescription || score === undefined;
  const showScore = !needsJobDescription && score !== undefined;

  // Build aria-label based on state
  const getAriaLabel = () => {
    if (showNeedsJD) return 'Recruiter Search: Requires job description';
    if (showScore) return `Recruiter Search: ${score} out of 100`;
    return 'Recruiter Search';
  };

  return (
    <div
      className={`
        relative bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 p-4
        transition-all duration-300 card-hover-glow
        ${isHighlighted
          ? 'border-orange-500/50 shadow-lg shadow-orange-500/10'
          : 'border-indigo-500/30 hover:border-indigo-400/50'
        }
      `}
      role="region"
      aria-label={getAriaLabel()}
    >
      {/* Highlighted badge */}
      {isHighlighted && (
        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          Priority
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wide">
          Recruiter Search
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Search className="w-3 h-3" aria-hidden="true" />
            Boolean
          </span>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-indigo-500 hover:text-indigo-400 transition-colors -m-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              aria-label="More information about Recruiter Search score"
              aria-describedby={showTooltip ? 'recruiter-search-tooltip' : undefined}
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div
                id="recruiter-search-tooltip"
                role="tooltip"
                className="absolute z-50 bottom-full right-0 mb-2 px-3 py-2 text-xs text-white bg-indigo-900 border border-indigo-500/50 rounded-lg shadow-xl w-48 whitespace-normal"
              >
                <p className="font-medium mb-1">Keyword matching for:</p>
                <ul className="text-indigo-300 space-y-0.5">
                  <li>• Exact term matches</li>
                  <li>• Job title alignment</li>
                  <li>• Technical skills</li>
                  <li>• Industry terminology</li>
                </ul>
                <p className="text-indigo-400 mt-2 text-[10px]">
                  Target: 85%+ for high visibility
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content based on state */}
      {showNeedsJD && (
        <NeedsJobDescriptionState onAddJobDescription={onAddJobDescription} />
      )}

      {showScore && (
        <ScoreDisplay score={score!} />
      )}

      {/* Applicability */}
      <p className="text-[11px] text-indigo-400 text-center mt-3">
        {showNeedsJD
          ? 'Simulates Greenhouse, Lever workflows'
          : 'Will you appear in keyword searches?'
        }
      </p>
    </div>
  );
}

function NeedsJobDescriptionState({ onAddJobDescription }: { onAddJobDescription?: () => void }) {
  return (
    <>
      <div className="flex justify-center mb-3">
        <div
          className="w-20 h-20 rounded-full bg-indigo-800/50 border-2 border-dashed border-indigo-600/50 flex items-center justify-center"
          aria-hidden="true"
        >
          <FileText className="w-8 h-8 text-indigo-500" />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onAddJobDescription}
          className="text-sm font-bold bg-indigo-800/50 text-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-700/50 transition-colors flex items-center gap-1.5 mx-auto focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          aria-label="Add job description to calculate recruiter search score"
        >
          <FileText className="w-3.5 h-3.5" aria-hidden="true" />
          Add Job Description
        </button>
      </div>
    </>
  );
}

function ScoreDisplay({ score }: { score: number }) {
  const { color, bgColor, label, textColor } = getScoreStyle(score);
  const THRESHOLD = 85;
  const showCelebration = score > THRESHOLD;

  return (
    <>
      <div className={`flex justify-center mb-3 ${showCelebration ? 'animate-celebrate' : ''}`}>
        <div className="relative">
          <svg
            className="w-20 h-20 transform -rotate-90"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Recruiter Search: ${score}%`}
          >
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="rgba(34, 211, 238, 0.2)"
              strokeWidth="6"
            />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke={color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 201} 201`}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${color}40)` }}
            />
            {/* Threshold indicator at 85% */}
            <line
              x1="40"
              y1="6"
              x2="40"
              y2="12"
              stroke="rgba(255, 255, 255, 0.4)"
              strokeWidth="2"
              strokeLinecap="round"
              transform={`rotate(${(THRESHOLD / 100) * 360}, 40, 40)`}
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white" aria-hidden="true">{score}</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className={`text-sm font-bold ${bgColor} ${textColor} px-3 py-1 rounded-full`}>
          {label}
        </span>
      </div>
    </>
  );
}

function getScoreStyle(score: number): {
  color: string;
  bgColor: string;
  label: string;
  textColor: string;
} {
  if (score >= 80) {
    return { color: '#22d3ee', bgColor: 'bg-cyan-500/20', label: 'High Visibility', textColor: 'text-cyan-300' };
  }
  if (score >= 60) {
    return { color: '#06b6d4', bgColor: 'bg-cyan-500/20', label: 'Good Visibility', textColor: 'text-cyan-300' };
  }
  if (score >= 40) {
    return { color: '#0891b2', bgColor: 'bg-cyan-600/20', label: 'Moderate', textColor: 'text-cyan-400' };
  }
  return { color: '#64748b', bgColor: 'bg-slate-500/20', label: 'Low Visibility', textColor: 'text-slate-300' };
}
