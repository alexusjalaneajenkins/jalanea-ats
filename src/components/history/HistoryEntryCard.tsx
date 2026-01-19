'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Bot,
  Search,
  Briefcase,
} from 'lucide-react';
import { HistoryEntry, ResumeGroup } from '@/lib/types/history';

interface HistoryEntryCardProps {
  entry: HistoryEntry;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

/**
 * Single history entry card
 */
export function HistoryEntryCard({
  entry,
  onDelete,
  compact = false,
}: HistoryEntryCardProps) {
  const formattedDate = new Date(entry.timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const formattedTime = new Date(entry.timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const getRiskColor = (risk: string) => {
    if (risk === 'low') return 'text-emerald-400 bg-emerald-500/20';
    if (risk === 'medium') return 'text-amber-400 bg-amber-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div
      className={`
        bg-indigo-900/30 rounded-xl border border-indigo-500/20 overflow-hidden
        hover:border-indigo-500/40 transition-colors
        ${compact ? 'p-3' : 'p-4'}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side - Date and Job Info */}
        <div className="flex items-start gap-3 min-w-0">
          {/* Date */}
          <div className="flex-shrink-0 text-center">
            <div className="text-sm font-bold text-white">{formattedDate}</div>
            <div className="text-xs text-indigo-400">{formattedTime}</div>
          </div>

          {/* Job Info */}
          <div className="min-w-0">
            {entry.job?.title ? (
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="text-sm font-medium text-white truncate">
                  {entry.job.title}
                </span>
                {entry.job.company && (
                  <span className="text-xs text-indigo-400">@ {entry.job.company}</span>
                )}
              </div>
            ) : (
              <div className="text-sm text-indigo-400 italic">Parse only (no JD)</div>
            )}

            {/* ATS Vendor Badge */}
            {entry.job?.atsVendor && (
              <div
                className={`
                  inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs
                  ${entry.job.atsVendor.type === 'sorter'
                    ? 'bg-purple-500/20 text-purple-300'
                    : 'bg-cyan-500/20 text-cyan-300'
                  }
                `}
              >
                <span>{entry.job.atsVendor.icon}</span>
                <span>{entry.job.atsVendor.name}</span>
                {entry.job.atsVendor.type === 'sorter' ? (
                  <Bot className="w-3 h-3" />
                ) : (
                  <Search className="w-3 h-3" />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right side - Scores */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Parse Health */}
          <div className="text-center">
            <div className={`text-lg font-bold ${getScoreColor(entry.scores.parseHealth)}`}>
              {entry.scores.parseHealth}%
            </div>
            <div className="text-xs text-indigo-500">Parse</div>
          </div>

          {/* Semantic Match (if available) */}
          {entry.scores.semanticMatch !== undefined && (
            <div className="text-center">
              <div className={`text-lg font-bold ${getScoreColor(entry.scores.semanticMatch)}`}>
                {entry.scores.semanticMatch}%
              </div>
              <div className="text-xs text-indigo-500">Semantic</div>
            </div>
          )}

          {/* Recruiter Search (if available) */}
          {entry.scores.recruiterSearch !== undefined && (
            <div className="text-center">
              <div className={`text-lg font-bold ${getScoreColor(entry.scores.recruiterSearch)}`}>
                {entry.scores.recruiterSearch}%
              </div>
              <div className="text-xs text-indigo-500">Search</div>
            </div>
          )}

          {/* Knockout Risk */}
          <div
            className={`
              px-2 py-1 rounded-lg text-xs font-medium capitalize
              ${getRiskColor(entry.scores.knockoutRisk)}
            `}
          >
            {entry.scores.knockoutRisk}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Link
              href={`/results/${entry.sessionId}`}
              className="p-1.5 rounded-lg text-indigo-400 hover:text-indigo-300 hover:bg-indigo-800/50 transition-colors"
              title="View analysis"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
            {onDelete && (
              <button
                onClick={() => onDelete(entry.id)}
                className="p-1.5 rounded-lg text-indigo-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Delete entry"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface ResumeGroupCardProps {
  group: ResumeGroup;
  onDeleteEntry?: (id: string) => void;
  defaultExpanded?: boolean;
}

/**
 * Resume group card - shows a resume with all its analysis history
 */
export function ResumeGroupCard({
  group,
  onDeleteEntry,
  defaultExpanded = false,
}: ResumeGroupCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const getImprovementIcon = () => {
    if (!group.improvement) return null;
    if (group.improvement.direction === 'improved') {
      return <TrendingUp className="w-4 h-4 text-emerald-400" />;
    }
    if (group.improvement.direction === 'declined') {
      return <TrendingDown className="w-4 h-4 text-red-400" />;
    }
    return <Minus className="w-4 h-4 text-indigo-400" />;
  };

  const getImprovementText = () => {
    if (!group.improvement) return null;
    const change = group.improvement.parseHealth;
    if (change > 0) return `+${change}%`;
    if (change < 0) return `${change}%`;
    return 'No change';
  };

  return (
    <div className="bg-indigo-900/30 rounded-2xl border border-indigo-500/20 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-indigo-900/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* File Icon */}
          <div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center border
              ${group.latestEntry.resumeFileType === 'pdf'
                ? 'bg-red-500/20 border-red-500/30'
                : 'bg-blue-500/20 border-blue-500/30'
              }
            `}
          >
            <FileText
              className={`w-5 h-5 ${
                group.latestEntry.resumeFileType === 'pdf' ? 'text-red-400' : 'text-blue-400'
              }`}
            />
          </div>

          {/* Resume Info */}
          <div className="text-left">
            <div className="text-sm font-bold text-white truncate max-w-[200px]">
              {group.resumeFileName}
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-400">
              <Calendar className="w-3 h-3" />
              <span>{group.entries.length} {group.entries.length === 1 ? 'analysis' : 'analyses'}</span>
              {group.improvement && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    {getImprovementIcon()}
                    <span
                      className={
                        group.improvement.direction === 'improved'
                          ? 'text-emerald-400'
                          : group.improvement.direction === 'declined'
                            ? 'text-red-400'
                            : 'text-indigo-400'
                      }
                    >
                      {getImprovementText()}
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Latest Score */}
          <div className="text-right">
            <div
              className={`text-lg font-bold ${
                group.latestEntry.scores.parseHealth >= 80
                  ? 'text-emerald-400'
                  : group.latestEntry.scores.parseHealth >= 60
                    ? 'text-amber-400'
                    : 'text-red-400'
              }`}
            >
              {group.latestEntry.scores.parseHealth}%
            </div>
            <div className="text-xs text-indigo-500">Latest</div>
          </div>

          {/* Expand Icon */}
          <div className="w-8 h-8 rounded-lg bg-indigo-800/50 flex items-center justify-center">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-indigo-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-indigo-400" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-5 pb-4 pt-2 border-t border-indigo-500/20 space-y-2">
          {group.entries.map((entry) => (
            <HistoryEntryCard
              key={entry.id}
              entry={entry}
              onDelete={onDeleteEntry}
              compact
            />
          ))}
        </div>
      )}
    </div>
  );
}
