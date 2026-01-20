'use client';

import { motion } from 'framer-motion';
import { ParseHealthCard } from './ParseHealthCard';
import { KnockoutRiskCard } from './KnockoutRiskCard';
import { SemanticMatchCard } from './SemanticMatchCard';
import { RecruiterSearchCard } from './RecruiterSearchCard';
import { Scores } from '@/lib/types/session';

interface ScoreCardGridProps {
  /** Parse health scores from resume analysis */
  scores: Scores;
  /** Knockout risk level */
  knockoutRisk?: 'low' | 'medium' | 'high';
  /** Number of knockout flags detected */
  knockoutCount?: number;
  /** Semantic match score (requires BYOK + JD) */
  semanticMatch?: number;
  /** Whether semantic match is loading */
  isSemanticLoading?: boolean;
  /** Recruiter search score (requires JD) */
  recruiterSearch?: number;
  /** Whether user has configured BYOK */
  hasByokConfigured?: boolean;
  /** Whether a job description has been provided */
  hasJobDescription?: boolean;
  /** Callback when user clicks to configure BYOK */
  onConfigureByok?: () => void;
  /** Callback when user clicks to add job description */
  onAddJobDescription?: () => void;
  /** Detected ATS vendor (optional) */
  atsVendor?: string;
}

/**
 * Score Card Grid Component
 *
 * Displays all 4 scores in a responsive grid layout.
 * Like credit reports, each score measures something different.
 */
export function ScoreCardGrid({
  scores,
  knockoutRisk = 'low',
  knockoutCount = 0,
  semanticMatch,
  isSemanticLoading = false,
  recruiterSearch,
  hasByokConfigured = false,
  hasJobDescription = false,
  onConfigureByok,
  onAddJobDescription,
  atsVendor,
}: ScoreCardGridProps) {
  // Determine which scores to highlight based on ATS vendor
  const highlightedScores = getHighlightedScores(atsVendor);

  return (
    <div className="space-y-4">
      {/* Header with explanation */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-white">Your Scores</h2>
        <span className="text-xs text-indigo-400">
          Like credit reports, each score measures something different
        </span>
      </div>

      {/* Score cards grid with groupings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Compliance Group */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-blue-400 to-indigo-500" />
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Technical Compliance
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <ParseHealthCard
                score={scores.parseHealth}
                isHighlighted={highlightedScores.includes('parse')}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <KnockoutRiskCard
                risk={knockoutRisk}
                flagCount={knockoutCount}
                isHighlighted={highlightedScores.includes('knockout')}
              />
            </motion.div>
          </div>
        </div>

        {/* Content Optimization Group */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-4 rounded-full bg-gradient-to-b from-orange-400 to-pink-500" />
            <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Content Optimization
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <SemanticMatchCard
                score={semanticMatch}
                isLocked={!hasByokConfigured}
                isLoading={isSemanticLoading}
                needsJobDescription={hasByokConfigured && !hasJobDescription}
                onConfigure={onConfigureByok}
                onAddJobDescription={onAddJobDescription}
                isHighlighted={highlightedScores.includes('semantic')}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <RecruiterSearchCard
                score={recruiterSearch}
                needsJobDescription={!hasJobDescription}
                onAddJobDescription={onAddJobDescription}
                isHighlighted={highlightedScores.includes('recruiter')}
              />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Determines which scores to highlight based on detected ATS vendor.
 */
function getHighlightedScores(atsVendor?: string): string[] {
  if (!atsVendor) return [];

  const vendor = atsVendor.toLowerCase();

  // Processors (no ranking) - highlight parse + recruiter search
  if (['greenhouse', 'lever'].includes(vendor)) {
    return ['parse', 'knockout', 'recruiter'];
  }

  // Sorters (AI ranking) - highlight semantic match
  if (['workday', 'icims', 'taleo'].includes(vendor)) {
    return ['parse', 'knockout', 'semantic'];
  }

  return ['parse', 'knockout'];
}
