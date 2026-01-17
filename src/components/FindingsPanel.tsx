'use client';

import { useState } from 'react';
import {
  Finding,
  FindingSeverity,
  getSeverityLabel,
  getSeverityColor,
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">Analysis Findings</h2>
        <p className="text-sm text-gray-500 mt-1">
          {issues.length} issue{issues.length !== 1 ? 's' : ''} found
          {positives.length > 0 && ` • ${positives.length} positive`}
        </p>
      </div>

      {/* Severity filter tabs */}
      {hasIssues && (
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
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
      <div className="divide-y divide-gray-100">
        {filteredFindings.length === 0 && hasIssues && (
          <div className="px-6 py-8 text-center text-gray-500">
            No {severityFilter} issues found.
          </div>
        )}

        {!hasIssues && (
          <div className="px-6 py-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <svg
                className="w-6 h-6 text-green-600"
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
            <p className="text-gray-700 font-medium">No issues found!</p>
            <p className="text-gray-500 text-sm mt-1">
              Your resume is well-structured for ATS parsing.
            </p>
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
        <div className="border-t border-gray-200 bg-green-50">
          <div className="px-6 py-3 border-b border-green-100">
            <h3 className="text-sm font-medium text-green-800">
              What's Working Well
            </h3>
          </div>
          <div className="px-6 py-4 space-y-2">
            {positives.map((finding) => (
              <div
                key={finding.id}
                className="flex items-start gap-2 text-sm text-green-700"
              >
                <svg
                  className="w-4 h-4 mt-0.5 flex-shrink-0"
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
  const colors = getSeverityColor(finding.severity);

  return (
    <div className="px-6 py-4">
      <button
        onClick={onToggle}
        className="w-full text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-lg"
      >
        <div className="flex items-start gap-3">
          {/* Severity indicator */}
          <div
            className={`flex-shrink-0 w-2 h-2 mt-2 rounded-full ${
              finding.severity === 'critical'
                ? 'bg-red-500'
                : finding.severity === 'high'
                  ? 'bg-orange-500'
                  : finding.severity === 'medium'
                    ? 'bg-yellow-500'
                    : 'bg-blue-500'
            }`}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-gray-900">{finding.title}</span>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
              >
                {getSeverityLabel(finding.severity)}
              </span>
              <span className="text-xs text-gray-500">
                {getCategoryLabel(finding.category)}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">{finding.description}</p>
          </div>

          {/* Expand icon */}
          <svg
            className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform ${
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
        <div className="mt-4 ml-5 pl-4 border-l-2 border-gray-200 space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase text-gray-500 mb-1">
              Impact
            </h4>
            <p className="text-sm text-gray-700">{finding.impact}</p>
          </div>

          {finding.suggestion && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h4 className="text-xs font-semibold uppercase text-blue-700 mb-1">
                How to Fix
              </h4>
              <p className="text-sm text-blue-800">{finding.suggestion}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    gray: isActive ? 'bg-gray-200 text-gray-800' : 'bg-gray-100 text-gray-600 hover:bg-gray-150',
    red: isActive ? 'bg-red-200 text-red-800' : 'bg-red-100 text-red-600 hover:bg-red-150',
    orange: isActive
      ? 'bg-orange-200 text-orange-800'
      : 'bg-orange-100 text-orange-600 hover:bg-orange-150',
    yellow: isActive
      ? 'bg-yellow-200 text-yellow-800'
      : 'bg-yellow-100 text-yellow-600 hover:bg-yellow-150',
    blue: isActive ? 'bg-blue-200 text-blue-800' : 'bg-blue-100 text-blue-600 hover:bg-blue-150',
  };

  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${colorClasses[color]}`}
    >
      {label}
      <span className="opacity-75">({count})</span>
    </button>
  );
}
