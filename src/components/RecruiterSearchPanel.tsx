'use client';

import { useState } from 'react';
import { Search, Target, Briefcase, Building2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';
import { RecruiterSearchResult } from '@/lib/analysis';

interface RecruiterSearchPanelProps {
  result: RecruiterSearchResult;
}

/**
 * Recruiter Search Panel
 *
 * Displays the detailed breakdown of the Recruiter Search Score,
 * showing how likely the resume is to appear in Boolean searches.
 */
export function RecruiterSearchPanel({ result }: RecruiterSearchPanelProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { score, breakdown, matchedKeywords, missingKeywords, suggestions } = result;

  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Search className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Recruiter Search Score
              </h3>
              <p className="text-xs text-indigo-300">
                Boolean search visibility simulation
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="text-xs text-indigo-400">
              {getScoreLabel(score)}
            </div>
          </div>
        </div>
      </div>

      {/* Score Breakdown - Collapsible */}
      <div className="border-b border-indigo-500/20">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="w-full px-5 py-3 flex items-center justify-between hover:bg-indigo-900/30 transition-colors"
        >
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide">
            Score Breakdown
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs text-indigo-500">
              {showBreakdown ? 'Hide details' : 'Show details'}
            </span>
            {showBreakdown ? (
              <ChevronUp className="w-4 h-4 text-indigo-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-400" />
            )}
          </div>
        </button>
        {showBreakdown && (
        <div className="px-5 pb-5 space-y-4">
          <BreakdownRow
            icon={<Target className="w-4 h-4" />}
            label="Keyword Match"
            score={breakdown.keywordMatch.score}
            weight={breakdown.keywordMatch.weight}
            details={breakdown.keywordMatch.details}
          />
          <BreakdownRow
            icon={<Briefcase className="w-4 h-4" />}
            label="Job Title Alignment"
            score={breakdown.titleAlignment.score}
            weight={breakdown.titleAlignment.weight}
            details={breakdown.titleAlignment.details}
          />
          <BreakdownRow
            icon={<Search className="w-4 h-4" />}
            label="Skills Coverage"
            score={breakdown.skillsCoverage.score}
            weight={breakdown.skillsCoverage.weight}
            details={breakdown.skillsCoverage.details}
          />
          <BreakdownRow
            icon={<Building2 className="w-4 h-4" />}
            label="Industry Terms"
            score={breakdown.industryTerms.score}
            weight={breakdown.industryTerms.weight}
            details={breakdown.industryTerms.details}
          />
        </div>
        )}
      </div>

      {/* Matched Keywords */}
      {matchedKeywords.length > 0 && (
        <div className="px-5 py-4 border-b border-indigo-500/20">
          <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-3">
            Matched Keywords ({matchedKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {matchedKeywords.slice(0, 15).map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30"
              >
                {keyword}
              </span>
            ))}
            {matchedKeywords.length > 15 && (
              <span className="px-2 py-1 text-xs text-indigo-400">
                +{matchedKeywords.length - 15} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {missingKeywords.length > 0 && (
        <div className="px-5 py-4 border-b border-indigo-500/20">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-3">
            Missing Critical Keywords ({missingKeywords.length})
          </h4>
          <div className="flex flex-wrap gap-2">
            {missingKeywords.slice(0, 10).map((keyword, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30"
              >
                {keyword}
              </span>
            ))}
            {missingKeywords.length > 10 && (
              <span className="px-2 py-1 text-xs text-indigo-400">
                +{missingKeywords.length - 10} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="px-5 py-4 bg-indigo-950/30">
          <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            Suggestions
          </h4>
          <ul className="space-y-2">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="text-sm text-indigo-200 flex items-start gap-2"
              >
                <span className="text-cyan-400 mt-1">•</span>
                {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BreakdownRow({
  icon,
  label,
  score,
  weight,
  details,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  weight: number;
  details: string;
}) {
  const weightPercent = Math.round(weight * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-indigo-300">
          {icon}
          <span className="text-sm">{label}</span>
          <span className="text-xs text-indigo-500">({weightPercent}%)</span>
        </div>
        <span className={`text-sm font-bold ${getScoreColor(score)}`}>
          {Math.round(score)}
        </span>
      </div>
      <div className="h-2 bg-indigo-950/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreHex(score),
            boxShadow: `0 0 8px ${getScoreHex(score)}60`,
          }}
        />
      </div>
      <p className="text-xs text-indigo-500">{details}</p>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-cyan-400';
  if (score >= 60) return 'text-cyan-500';
  if (score >= 40) return 'text-indigo-400';
  return 'text-slate-400';
}

function getScoreHex(score: number): string {
  if (score >= 80) return '#22d3ee';
  if (score >= 60) return '#06b6d4';
  if (score >= 40) return '#6366f1';
  return '#64748b';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'High Visibility';
  if (score >= 60) return 'Good Visibility';
  if (score >= 40) return 'Moderate';
  return 'Low Visibility';
}
