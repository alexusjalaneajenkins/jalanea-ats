'use client';

import { Info, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ParseHealthCardProps {
  /** The parse health score (0-100) */
  score: number;
  /** Whether this score is highlighted for the detected ATS */
  isHighlighted?: boolean;
  /** Sub-scores for progressive disclosure */
  layoutScore?: number;
  contactScore?: number;
  sectionScore?: number;
}

/** Threshold indicator position (85% is recommended target) */
const THRESHOLD = 85;

/**
 * Parse Health Score Card
 *
 * Measures how well the resume will survive ATS text extraction.
 * Applies to ALL ATS systems.
 */
export function ParseHealthCard({
  score,
  isHighlighted = false,
  layoutScore,
  contactScore,
  sectionScore,
}: ParseHealthCardProps) {
  const { color, bgColor, label, textColor } = getScoreStyle(score);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Confidence is high when we have clear signals
  const confidence = score >= 70 ? 'High' : score >= 40 ? 'Medium' : 'Low';

  // Show celebration animation for high scores on mount
  useEffect(() => {
    if (score > THRESHOLD) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 600);
      return () => clearTimeout(timer);
    }
  }, [score]);

  // Check if sub-scores are available
  const hasSubScores = layoutScore !== undefined || contactScore !== undefined || sectionScore !== undefined;

  return (
    <div
      className={`
        relative bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 p-4
        transition-all duration-300 card-hover-glow cursor-pointer
        hover:bg-indigo-900/40 hover:scale-[1.02] active:scale-[0.98]
        ${score < 50 ? 'animate-attention-pulse' : ''}
        ${isHighlighted
          ? 'border-orange-500/50 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20'
          : 'border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-indigo-500/10'
        }
      `}
      role="button"
      tabIndex={0}
      onClick={() => hasSubScores && setIsExpanded(!isExpanded)}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && hasSubScores) {
          e.preventDefault();
          setIsExpanded(!isExpanded);
        }
      }}
      aria-label={`Parse Health Score: ${score} out of 100, rated ${label}${hasSubScores ? '. Click to view details.' : ''}`}
      aria-expanded={hasSubScores ? isExpanded : undefined}
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
          Parse Health
        </h3>
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-indigo-500 bg-indigo-950/50 px-2 py-0.5 rounded-full">
            All ATS
          </span>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onFocus={() => setShowTooltip(true)}
              onBlur={() => setShowTooltip(false)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-indigo-500 hover:text-indigo-400 transition-colors -m-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              aria-label="More information about Parse Health score"
              aria-describedby={showTooltip ? 'parse-health-tooltip' : undefined}
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div
                id="parse-health-tooltip"
                role="tooltip"
                className="absolute z-50 bottom-full right-0 mb-2 px-3 py-2 text-xs text-white bg-indigo-900 border border-indigo-500/50 rounded-lg shadow-xl w-40 sm:w-48 max-w-[calc(100vw-2rem)] whitespace-normal"
              >
                <p className="font-medium mb-1">Parse Health measures:</p>
                <ul className="text-indigo-300 space-y-0.5">
                  <li>• Section header detection</li>
                  <li>• Contact info parsing</li>
                  <li>• Date format readability</li>
                  <li>• Layout complexity</li>
                </ul>
                <div className="mt-2 pt-2 border-t border-indigo-700">
                  <span className="text-indigo-400">Target: </span>
                  <span className="font-medium text-indigo-200">{THRESHOLD}%+</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Circular score */}
      <div className={`flex justify-center mb-3 ${showCelebration ? 'animate-celebrate' : ''}`}>
        <div className="relative">
          <svg
            className="w-20 h-20 transform -rotate-90"
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Parse Health: ${score}%`}
          >
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="rgba(99, 102, 241, 0.2)"
              strokeWidth="6"
            />
            {/* Progress circle */}
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

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-black text-white" aria-hidden="true">{score}</span>
          </div>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <span className={`text-sm font-bold ${bgColor} ${textColor} px-3 py-1 rounded-full`}>
          {label}
        </span>
      </div>

      {/* Description */}
      <p className="text-[11px] text-indigo-400 text-center mt-3">
        Will your resume survive text extraction?
      </p>

      {/* Progressive Disclosure - Expandable Details */}
      {hasSubScores && (
        <>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 pt-2 border-t border-indigo-500/20 text-xs text-indigo-400 hover:text-indigo-300 flex items-center justify-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 rounded"
            aria-expanded={isExpanded}
            aria-controls="parse-health-details"
          >
            {isExpanded ? 'Less' : 'Details'}
            <ChevronDown
              className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                id="parse-health-details"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-3 space-y-2 text-xs">
                  {layoutScore !== undefined && (
                    <div className="flex justify-between text-indigo-300">
                      <span>Layout Score</span>
                      <span className="font-bold text-white">{layoutScore}%</span>
                    </div>
                  )}
                  {contactScore !== undefined && (
                    <div className="flex justify-between text-indigo-300">
                      <span>Contact Detection</span>
                      <span className="font-bold text-white">{contactScore}%</span>
                    </div>
                  )}
                  {sectionScore !== undefined && (
                    <div className="flex justify-between text-indigo-300">
                      <span>Section Headers</span>
                      <span className="font-bold text-white">{sectionScore}%</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}

function getScoreStyle(score: number): { color: string; bgColor: string; label: string; textColor: string } {
  if (score >= 80) {
    return { color: '#22c55e', bgColor: 'bg-emerald-500/20', label: 'Excellent', textColor: 'text-emerald-300' };
  }
  if (score >= 60) {
    return { color: '#eab308', bgColor: 'bg-yellow-500/20', label: 'Good', textColor: 'text-yellow-300' };
  }
  if (score >= 40) {
    return { color: '#f97316', bgColor: 'bg-orange-500/20', label: 'Fair', textColor: 'text-orange-300' };
  }
  return { color: '#ef4444', bgColor: 'bg-red-500/20', label: 'Poor', textColor: 'text-red-300' };
}
