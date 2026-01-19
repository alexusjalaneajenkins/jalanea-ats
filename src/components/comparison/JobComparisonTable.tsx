'use client';

import { useState } from 'react';
import {
  Star,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Bot,
  Search,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  ComparisonJob,
  getMatchBadge,
  MatchBadge,
  sortJobsByMatch,
} from '@/lib/types/comparison';

interface JobComparisonTableProps {
  jobs: ComparisonJob[];
  onDeleteJob?: (id: string) => void;
  highlightBestMatch?: boolean;
}

/**
 * Job Comparison Table
 *
 * Displays multiple jobs in a comparison table with scores and badges.
 */
export function JobComparisonTable({
  jobs,
  onDeleteJob,
  highlightBestMatch = true,
}: JobComparisonTableProps) {
  const [sortBy, setSortBy] = useState<'match' | 'date'>('match');
  const [expandedJob, setExpandedJob] = useState<string | null>(null);

  const sortedJobs = sortBy === 'match' ? sortJobsByMatch(jobs) : jobs;
  const bestMatchId = highlightBestMatch && jobs.length > 1
    ? sortJobsByMatch(jobs)[0]?.id
    : null;

  const getScoreColor = (score: number | undefined) => {
    if (score === undefined) return 'text-indigo-500';
    if (score >= 70) return 'text-emerald-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  const getRiskColor = (risk: string) => {
    if (risk === 'low') return 'text-emerald-400 bg-emerald-500/20';
    if (risk === 'medium') return 'text-amber-400 bg-amber-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getBadgeConfig = (badge: MatchBadge) => {
    switch (badge) {
      case 'best-match':
        return {
          icon: <Star className="w-3.5 h-3.5" />,
          text: 'Best Match',
          bg: 'bg-emerald-500/20',
          border: 'border-emerald-500/30',
          textColor: 'text-emerald-300',
        };
      case 'good-match':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5" />,
          text: 'Good Match',
          bg: 'bg-blue-500/20',
          border: 'border-blue-500/30',
          textColor: 'text-blue-300',
        };
      case 'weak-match':
        return {
          icon: <TrendingDown className="w-3.5 h-3.5" />,
          text: 'Weak Match',
          bg: 'bg-amber-500/20',
          border: 'border-amber-500/30',
          textColor: 'text-amber-300',
        };
      case 'field-mismatch':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5" />,
          text: 'Field Mismatch',
          bg: 'bg-red-500/20',
          border: 'border-red-500/30',
          textColor: 'text-red-300',
        };
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-indigo-400">No jobs added yet. Add job descriptions to compare.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Sort Controls */}
      {jobs.length > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-indigo-400">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} compared
          </span>
          <div className="flex items-center gap-1 bg-indigo-950/80 rounded-lg p-1">
            <button
              onClick={() => setSortBy('match')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'match'
                  ? 'bg-indigo-700/50 text-white'
                  : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              By Match
            </button>
            <button
              onClick={() => setSortBy('date')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                sortBy === 'date'
                  ? 'bg-indigo-700/50 text-white'
                  : 'text-indigo-400 hover:text-indigo-300'
              }`}
            >
              By Date
            </button>
          </div>
        </div>
      )}

      {/* Jobs List */}
      <div className="space-y-2">
        {sortedJobs.map((job) => {
          const badge = getMatchBadge(job);
          const badgeConfig = getBadgeConfig(badge);
          const isBestMatch = job.id === bestMatchId;
          const isExpanded = expandedJob === job.id;

          return (
            <div
              key={job.id}
              className={`
                rounded-xl border overflow-hidden transition-all
                ${isBestMatch
                  ? 'bg-emerald-500/5 border-emerald-500/30 ring-1 ring-emerald-500/20'
                  : 'bg-indigo-900/30 border-indigo-500/20 hover:border-indigo-500/40'
                }
              `}
            >
              {/* Main Row */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Job Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Match Badge */}
                      <span
                        className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
                          ${badgeConfig.bg} ${badgeConfig.border} ${badgeConfig.textColor} border
                        `}
                      >
                        {badgeConfig.icon}
                        {badgeConfig.text}
                      </span>

                      {/* ATS Vendor */}
                      {job.atsVendor && (
                        <span
                          className={`
                            inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs
                            ${job.atsVendor.type === 'sorter'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-cyan-500/20 text-cyan-300'
                            }
                          `}
                        >
                          <span>{job.atsVendor.icon}</span>
                          {job.atsVendor.type === 'sorter' ? (
                            <Bot className="w-3 h-3" />
                          ) : (
                            <Search className="w-3 h-3" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Title & Company */}
                    <h4 className="text-sm font-bold text-white truncate">
                      {job.title}
                    </h4>
                    {job.company && (
                      <p className="text-xs text-indigo-400">@ {job.company}</p>
                    )}
                  </div>

                  {/* Right: Scores */}
                  <div className="flex items-center gap-4">
                    {/* Semantic Match */}
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getScoreColor(job.scores.semanticMatch)}`}>
                        {job.scores.semanticMatch !== undefined ? `${job.scores.semanticMatch}%` : '-'}
                      </div>
                      <div className="text-xs text-indigo-500">Semantic</div>
                    </div>

                    {/* Recruiter Search */}
                    <div className="text-center">
                      <div className={`text-lg font-bold ${getScoreColor(job.scores.recruiterSearch)}`}>
                        {job.scores.recruiterSearch !== undefined ? `${job.scores.recruiterSearch}%` : '-'}
                      </div>
                      <div className="text-xs text-indigo-500">Search</div>
                    </div>

                    {/* Knockout Risk */}
                    <div
                      className={`
                        px-2 py-1 rounded-lg text-xs font-medium capitalize
                        ${getRiskColor(job.scores.knockoutRisk)}
                      `}
                    >
                      {job.scores.knockoutRisk}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                        className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-800/50 transition-colors"
                        title="Show details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      {job.url && (
                        <a
                          href={job.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-800/50 transition-colors"
                          title="Open job posting"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {onDeleteJob && (
                        <button
                          onClick={() => onDeleteJob(job.id)}
                          className="p-1.5 rounded-lg text-indigo-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Remove job"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-2 border-t border-indigo-500/20 space-y-3">
                  {/* Keywords */}
                  <div className="grid md:grid-cols-2 gap-3">
                    {/* Matched Keywords */}
                    <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                      <h5 className="text-xs font-bold text-emerald-300 mb-2 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Matched ({job.matchedKeywords.length})
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {job.matchedKeywords.slice(0, 10).map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-200 rounded-full"
                          >
                            {kw}
                          </span>
                        ))}
                        {job.matchedKeywords.length > 10 && (
                          <span className="text-xs text-emerald-400">
                            +{job.matchedKeywords.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Missing Keywords */}
                    <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                      <h5 className="text-xs font-bold text-red-300 mb-2 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Missing ({job.missingKeywords.length})
                      </h5>
                      <div className="flex flex-wrap gap-1">
                        {job.missingKeywords.slice(0, 10).map((kw, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 text-xs bg-red-500/20 text-red-200 rounded-full"
                          >
                            {kw}
                          </span>
                        ))}
                        {job.missingKeywords.length > 10 && (
                          <span className="text-xs text-red-400">
                            +{job.missingKeywords.length - 10} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
