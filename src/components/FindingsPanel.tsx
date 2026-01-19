'use client';

import { useState } from 'react';
import {
  Finding,
  FindingSeverity,
  getSeverityLabel,
  getCategoryLabel,
  countFindingsBySeverity,
} from '@/lib/analysis/findings';

interface FindingsPanelProps {
  findings: Finding[];
}

/**
 * Findings Panel Component
 *
 * Displays analysis findings with filtering and expandable details.
 */
export function FindingsPanel({ findings }: FindingsPanelProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | 'all'>('all');

  const counts = countFindingsBySeverity(findings);

  // Filter out info findings from "issues" - they're positive
  const issues = findings.filter((f) => f.severity !== 'info');
  const positives = findings.filter((f) => f.severity === 'info');

  const filteredFindings =
    severityFilter === 'all'
      ? issues
      : issues.filter((f) => f.severity === severityFilter);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const hasIssues = issues.length > 0;

  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-indigo-500/20">
        <h2 className="text-lg font-bold text-white">Analysis Findings</h2>
        <p className="text-sm text-indigo-300 mt-1">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} found
          {positives.length > 0 && ` • ${positives.length} positive`}
        </p>
      </div>

      {/* Severity filter tabs */}
      {hasIssues && (
        <div className="px-6 py-3 border-b border-indigo-500/20 flex gap-2 flex-wrap">
          <FilterButton
            label="All"
            count={issues.length}
            isActive={severityFilter === 'all'}
            onClick={() => setSeverityFilter('all')}
          />
          {counts.critical > 0 && (
            <FilterButton
              label="Critical"
              count={counts.critical}
              isActive={severityFilter === 'critical'}
              onClick={() => setSeverityFilter('critical')}
              color="red"
            />
          )}
          {counts.high > 0 && (
            <FilterButton
              label="High"
              count={counts.high}
              isActive={severityFilter === 'high'}
              onClick={() => setSeverityFilter('high')}
              color="orange"
            />
          )}
          {counts.medium > 0 && (
            <FilterButton
              label="Medium"
              count={counts.medium}
              isActive={severityFilter === 'medium'}
              onClick={() => setSeverityFilter('medium')}
              color="yellow"
            />
          )}
          {counts.low > 0 && (
            <FilterButton
              label="Low"
              count={counts.low}
              isActive={severityFilter === 'low'}
              onClick={() => setSeverityFilter('low')}
              color="blue"
            />
          )}
        </div>
      )}

      {/* Findings list */}
      <div className="divide-y divide-indigo-500/20">
        {filteredFindings.length === 0 && hasIssues && (
          <div className="px-6 py-8 text-center text-indigo-300">
            No {severityFilter} issues found.
          </div>
        )}

        {!hasIssues && (
          <div className="px-6 py-5 flex items-center gap-4">
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <p className="text-white font-bold">No issues found</p>
              <p className="text-indigo-300 text-sm">
                Your resume structure is optimized for ATS parsing
              </p>
            </div>
          </div>
        )}

        {filteredFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isExpanded={expandedIds.has(finding.id)}
            onToggle={() => toggleExpand(finding.id)}
          />
        ))}
      </div>

      {/* Positive findings section */}
      {positives.length > 0 && (
        <div className="border-t border-indigo-500/20 bg-emerald-500/10">
          <div className="px-6 py-3 border-b border-emerald-500/20">
            <h3 className="text-sm font-bold text-emerald-400">
              What&apos;s Working Well
            </h3>
          </div>
          <div className="px-6 py-4 space-y-3">
            {positives.map((finding) => (
              <div
                key={finding.id}
                className="flex items-start gap-3 text-sm text-emerald-300"
              >
                <svg
                  className="w-5 h-5 mt-0.5 flex-shrink-0 text-emerald-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{finding.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual finding card
 */
function FindingCard({
  finding,
  isExpanded,
  onToggle,
}: {
  finding: Finding;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="px-6 py-4">
      <button
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:ring-offset-2 focus:ring-offset-indigo-900 rounded-lg"
      >
        <div className="flex items-start gap-3">
          {/* Severity indicator */}
          <div
            className={`flex-shrink-0 w-2.5 h-2.5 mt-2 rounded-full ${
              finding.severity === 'critical'
                ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                : finding.severity === 'high'
                  ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]'
                  : finding.severity === 'medium'
                    ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.5)]'
                    : 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]'
            }`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-white">{finding.title}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${getSeverityColorClasses(finding.severity)}`}
              >
                {getSeverityLabel(finding.severity)}
              </span>
              <span className="text-xs text-indigo-400">
                {getCategoryLabel(finding.category)}
              </span>
            </div>
            <p className="text-sm text-indigo-300 mt-1">{finding.description}</p>
          </div>

          {/* Expand icon */}
          <svg
            className={`w-5 h-5 text-indigo-400 flex-shrink-0 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 ml-5 pl-4 border-l-2 border-indigo-500/30 space-y-4">
          <div>
            <h4 className="text-xs font-bold uppercase text-indigo-400 mb-1">
              Impact
            </h4>
            <p className="text-sm text-indigo-200">{finding.impact}</p>
          </div>

          {finding.suggestion && (
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <h4 className="text-xs font-bold uppercase text-cyan-400 mb-1">
                How to Fix
              </h4>
              <p className="text-sm text-cyan-200">{finding.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Get severity color classes
 */
function getSeverityColorClasses(severity: FindingSeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-500/20 text-red-400';
    case 'high':
      return 'bg-orange-500/20 text-orange-400';
    case 'medium':
      return 'bg-yellow-500/20 text-yellow-400';
    case 'low':
      return 'bg-cyan-500/20 text-cyan-400';
    default:
      return 'bg-indigo-500/20 text-indigo-400';
  }
}

/**
 * Filter button component
 */
function FilterButton({
  label,
  count,
  isActive,
  onClick,
  color = 'gray',
}: {
  label: string;
  count: number;
  isActive: boolean;
  onClick: () => void;
  color?: 'gray' | 'red' | 'orange' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    gray: isActive
      ? 'bg-indigo-500/30 text-white border-indigo-400/50'
      : 'bg-indigo-900/50 text-indigo-300 border-indigo-500/30 hover:bg-indigo-800/50',
    red: isActive
      ? 'bg-red-500/30 text-red-300 border-red-400/50'
      : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
    orange: isActive
      ? 'bg-orange-500/30 text-orange-300 border-orange-400/50'
      : 'bg-orange-500/10 text-orange-400 border-orange-500/30 hover:bg-orange-500/20',
    yellow: isActive
      ? 'bg-yellow-500/30 text-yellow-300 border-yellow-400/50'
      : 'bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20',
    blue: isActive
      ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/50'
      : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold border transition-colors ${colorClasses[color]}`}
    >
      {label}
      <span className="opacity-75">({count})</span>
    </button>
  );
}
