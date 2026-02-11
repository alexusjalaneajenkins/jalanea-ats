'use client';

import { Lock, Key, FileText, Sparkles, Info } from 'lucide-react';
import { useState } from 'react';

interface SemanticMatchCardProps {
  /** The semantic match score (0-100), undefined if not calculated */
  score?: number;
  /** Whether the score is locked (needs BYOK configuration) */
  isLocked?: boolean;
  /** Whether the score is currently being calculated */
  isLoading?: boolean;
  /** Whether a job description is needed */
  needsJobDescription?: boolean;
  /** Callback when user clicks to configure BYOK */
  onConfigure?: () => void;
  /** Callback when user clicks to add job description */
  onAddJobDescription?: () => void;
  /** Whether this score is highlighted for the detected ATS */
  isHighlighted?: boolean;
}

/**
 * Semantic Match Score Card
 *
 * Measures conceptual alignment between resume and job description
 * using AI-powered vector similarity. Simulates how Workday HiredScore
 * and iCIMS Role Fit work.
 *
 * Requires BYOK (Bring Your Own Key) + Job Description.
 */
export function SemanticMatchCard({
  score,
  isLocked = true,
  isLoading = false,
  needsJobDescription = false,
  onConfigure,
  onAddJobDescription,
  isHighlighted = false,
}: SemanticMatchCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Determine which state to show
  const showLocked = isLocked;
  const showLoading = !isLocked && isLoading;
  const showNeedsJD = !isLocked && !isLoading && needsJobDescription;
  const showScore = !isLocked && !isLoading && !needsJobDescription && score !== undefined;

  // Build aria-label based on state
  const getAriaLabel = () => {
    if (showLocked) return 'Semantic Match: Requires API key configuration';
    if (showLoading) return 'Semantic Match: Analyzing with AI...';
    if (showNeedsJD) return 'Semantic Match: Requires job description';
    if (showScore) return `Semantic Match: ${score} out of 100`;
    return 'Semantic Match';
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
      aria-busy={showLoading}
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
          Semantic Match
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" />
            AI
          </span>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-indigo-500 hover:text-indigo-400 transition-colors -m-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              aria-label="More information about Semantic Match"
              aria-describedby={showTooltip ? 'semantic-match-tooltip' : undefined}
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div
                id="semantic-match-tooltip"
                role="tooltip"
                className="absolute z-50 bottom-full right-0 mb-2 px-3 py-2 text-xs text-white bg-indigo-900 border border-indigo-500/50 rounded-lg shadow-xl w-52 whitespace-normal"
              >
                <p className="font-medium mb-1">AI-powered analysis of:</p>
                <ul className="text-indigo-300 space-y-0.5">
                  <li>• Conceptual skills alignment</li>
                  <li>• Role responsibility match</li>
                  <li>• Experience level fit</li>
                  <li>• Industry domain relevance</li>
                </ul>
                <p className="text-indigo-400 mt-2 text-[10px]">
                  Target: 85%+ for strong fit
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content based on state */}
      {showLocked && (
        <LockedState onConfigure={onConfigure} />
      )}

      {showLoading && (
        <LoadingState />
      )}

      {showNeedsJD && (
        <NeedsJobDescriptionState onAddJobDescription={onAddJobDescription} />
      )}

      {showScore && (
        <ScoreDisplay score={score!} />
      )}

      {/* Applicability */}
      <p className="text-[11px] text-indigo-400 text-center mt-3">
        {showLocked
          ? 'Simulates Workday HiredScore, iCIMS Role Fit'
          : showLoading
            ? 'Analyzing with AI...'
            : showNeedsJD
              ? 'Paste a job description to calculate'
              : 'How conceptually aligned are you?'
        }
      </p>
    </div>
  );
}

function LockedState({ onConfigure }: { onConfigure?: () => void }) {
  return (
    <>
      <div className="flex justify-center mb-3">
        <div
          className="w-20 h-20 rounded-full bg-indigo-800/50 border-2 border-dashed border-indigo-600/50 flex items-center justify-center"
          aria-hidden="true"
        >
          <Lock className="w-8 h-8 text-indigo-500" />
        </div>
      </div>

      <div className="text-center">
        <button
          onClick={onConfigure}
          className="text-sm font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-300 px-3 py-1.5 rounded-full hover:from-purple-500/30 hover:to-pink-500/30 transition-colors flex items-center gap-1.5 mx-auto focus:outline-none focus:ring-2 focus:ring-purple-500/50"
          aria-label="Add Gemini key to enable semantic matching"
        >
          <Key className="w-3.5 h-3.5" aria-hidden="true" />
          Add Gemini Key
        </button>
      </div>
    </>
  );
}

function LoadingState() {
  return (
    <>
      <div className="flex justify-center mb-3">
        <div className="relative w-20 h-20">
          {/* Spinning border */}
          <div className="absolute inset-0 rounded-full border-2 border-purple-500/20" />
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-purple-500 animate-spin" />

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-sm font-medium text-purple-300">
          Calculating...
        </span>
      </div>
    </>
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
          className="text-sm font-bold bg-indigo-800/50 text-indigo-300 px-3 py-1.5 rounded-full hover:bg-indigo-700/50 transition-colors flex items-center gap-1.5 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
          aria-label="Add job description to calculate semantic match"
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
            aria-label={`Semantic Match: ${score}%`}
          >
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="rgba(168, 85, 247, 0.2)"
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
    return { color: '#a855f7', bgColor: 'bg-purple-500/20', label: 'Strong Match', textColor: 'text-purple-300' };
  }
  if (score >= 60) {
    return { color: '#8b5cf6', bgColor: 'bg-violet-500/20', label: 'Good Match', textColor: 'text-violet-300' };
  }
  if (score >= 40) {
    return { color: '#6366f1', bgColor: 'bg-indigo-500/20', label: 'Partial Match', textColor: 'text-indigo-300' };
  }
  return { color: '#64748b', bgColor: 'bg-slate-500/20', label: 'Low Match', textColor: 'text-slate-300' };
}
