'use client';

import { CheckCircle2, XCircle, AlertCircle, Sparkles, FileSearch } from 'lucide-react';
import type { KnockoutItem } from '@/lib/types/session';
import { getCategoryLabel } from '@/lib/analysis/knockouts';
import {
  getRiskColor,
  getRiskBgColor,
  getRiskBorderColor,
  getRiskLabel,
  RiskLevel,
} from '@/lib/analysis/knockoutRisk';
import type { EnhancedKnockoutItem } from '@/lib/analysis/knockoutAnalysis';

interface KnockoutChecklistProps {
  /** List of knockout items (can be enhanced or basic) */
  knockouts: (KnockoutItem | EnhancedKnockoutItem)[];
  /** Callback when user confirms/denies a knockout */
  onKnockoutChange: (id: string, confirmed: boolean | undefined) => void;
  /** Current risk level */
  riskLevel: RiskLevel;
  /** Risk explanation */
  riskExplanation: string;
  /** Whether to show auto-assessment (when resume analysis is available) */
  showAutoAssessment?: boolean;
}

/**
 * Type guard to check if knockout is enhanced
 */
function isEnhanced(knockout: KnockoutItem | EnhancedKnockoutItem): knockout is EnhancedKnockoutItem {
  return 'autoAssessment' in knockout && knockout.autoAssessment !== undefined;
}

/**
 * Knockout Checklist Component
 *
 * Displays detected knockout requirements with checkboxes for user confirmation.
 * When enhanced with resume analysis, shows auto-assessment hints.
 */
export function KnockoutChecklist({
  knockouts,
  onKnockoutChange,
  riskLevel,
  riskExplanation,
  showAutoAssessment = true,
}: KnockoutChecklistProps) {
  if (knockouts.length === 0) {
    return (
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-emerald-500/30 p-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-300">
              No Disqualifiers Detected
            </h3>
            <p className="text-sm text-indigo-300 mt-1">
              This job posting doesn't appear to have hard requirements like
              specific work authorization, certifications, or location
              restrictions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Check if any knockouts have auto-assessment
  const hasAutoAssessment = knockouts.some(k => isEnhanced(k));

  // Group knockouts by category
  const groupedKnockouts = knockouts.reduce(
    (acc, knockout) => {
      const category = knockout.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(knockout);
      return acc;
    },
    {} as Record<string, (KnockoutItem | EnhancedKnockoutItem)[]>
  );

  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
      {/* Header with risk level */}
      <div className="px-5 py-4 border-b border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Potential Disqualifiers
              </h3>
              <p className="text-xs text-indigo-300">
                Confirm if you meet these requirements
              </p>
            </div>
          </div>
          <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${getRiskBgClass(riskLevel)} ${getRiskTextClass(riskLevel)}`}>
            {getRiskLabel(riskLevel)}
          </div>
        </div>
        <p className="text-xs text-indigo-400 mt-3">{riskExplanation}</p>

        {/* Auto-assessment notice */}
        {hasAutoAssessment && showAutoAssessment && (
          <div className="mt-3 flex items-center gap-2 text-xs text-purple-300 bg-purple-500/10 px-3 py-2 rounded-lg border border-purple-500/20">
            <Sparkles className="w-4 h-4" />
            <span>AI has analyzed your resume to suggest likely matches</span>
          </div>
        )}
      </div>

      {/* Knockout items grouped by category */}
      <div className="divide-y divide-indigo-500/20">
        {Object.entries(groupedKnockouts).map(([category, items]) => (
          <div key={category} className="p-5">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-3">
              {getCategoryLabel(category as KnockoutItem['category'])}
            </h4>
            <div className="space-y-3">
              {items.map((knockout) => (
                <KnockoutItemRow
                  key={knockout.id}
                  knockout={knockout}
                  onChange={onKnockoutChange}
                  showAutoAssessment={showAutoAssessment}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-5 py-3 bg-indigo-950/30 border-t border-indigo-500/20">
        <div className="flex flex-wrap items-center gap-4 text-xs text-indigo-400">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span>You qualify</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>You don't qualify</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-indigo-500" />
            <span>Not confirmed</span>
          </div>
          {hasAutoAssessment && (
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span>AI suggestion</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual knockout item with toggle and auto-assessment
 */
function KnockoutItemRow({
  knockout,
  onChange,
  showAutoAssessment,
}: {
  knockout: KnockoutItem | EnhancedKnockoutItem;
  onChange: (id: string, confirmed: boolean | undefined) => void;
  showAutoAssessment: boolean;
}) {
  const { id, label, evidence, userConfirmed } = knockout;
  const enhanced = isEnhanced(knockout) ? knockout : null;

  const handleYes = () => {
    onChange(id, userConfirmed === true ? undefined : true);
  };

  const handleNo = () => {
    onChange(id, userConfirmed === false ? undefined : false);
  };

  return (
    <div
      className={`
        p-4 rounded-xl border-2 transition-all duration-200
        ${
          userConfirmed === true
            ? 'bg-emerald-500/10 border-emerald-500/30'
            : userConfirmed === false
              ? 'bg-red-500/10 border-red-500/30'
              : 'bg-indigo-950/30 border-indigo-500/20'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="text-xs text-indigo-400 mt-1 italic truncate">"{evidence}"</p>

          {/* Auto-assessment hint */}
          {enhanced?.autoAssessment && showAutoAssessment && userConfirmed === undefined && (
            <div className={`mt-2 flex items-start gap-2 text-xs p-2 rounded-lg ${
              enhanced.autoAssessment.likely
                ? 'bg-emerald-500/10 text-emerald-300'
                : 'bg-amber-500/10 text-amber-300'
            }`}>
              {enhanced.autoAssessment.likely ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              )}
              <div>
                <span className="font-medium">
                  {enhanced.autoAssessment.likely ? 'Likely qualifies' : 'May not qualify'}
                </span>
                <span className="text-indigo-400 ml-1">
                  ({enhanced.autoAssessment.confidence} confidence)
                </span>
                <p className="text-indigo-300 mt-0.5">{enhanced.autoAssessment.reason}</p>
              </div>
            </div>
          )}

          {/* Resume evidence */}
          {enhanced?.resumeEvidence && showAutoAssessment && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-400">
              <FileSearch className="w-3.5 h-3.5" />
              <span>Found in resume: <span className="text-indigo-300">{enhanced.resumeEvidence}</span></span>
            </div>
          )}
        </div>

        {/* Yes/No toggle buttons */}
        <div className="flex items-center flex-shrink-0">
          <button
            onClick={handleYes}
            className={`
              px-3 py-2 text-xs font-bold rounded-l-lg border-2 transition-all duration-200
              ${
                userConfirmed === true
                  ? 'bg-emerald-500 text-white border-emerald-500'
                  : 'bg-indigo-950/50 text-indigo-300 border-indigo-500/30 hover:bg-emerald-500/20 hover:border-emerald-500/50 hover:text-emerald-300'
              }
            `}
            title="I meet this requirement"
          >
            Yes
          </button>
          <button
            onClick={handleNo}
            className={`
              px-3 py-2 text-xs font-bold rounded-r-lg border-2 border-l-0 transition-all duration-200
              ${
                userConfirmed === false
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-indigo-950/50 text-indigo-300 border-indigo-500/30 hover:bg-red-500/20 hover:border-red-500/50 hover:text-red-300'
              }
            `}
            title="I don't meet this requirement"
          >
            No
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Get background class for risk level (dark theme)
 */
function getRiskBgClass(risk: RiskLevel): string {
  switch (risk) {
    case 'low': return 'bg-emerald-500/20';
    case 'medium': return 'bg-amber-500/20';
    case 'high': return 'bg-red-500/20';
  }
}

/**
 * Get text class for risk level (dark theme)
 */
function getRiskTextClass(risk: RiskLevel): string {
  switch (risk) {
    case 'low': return 'text-emerald-300';
    case 'medium': return 'text-amber-300';
    case 'high': return 'text-red-300';
  }
}
