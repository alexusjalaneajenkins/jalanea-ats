'use client';

import type { KnockoutItem } from '@/lib/types/session';
import { getCategoryLabel } from '@/lib/analysis/knockouts';
import {
  getRiskColor,
  getRiskBgColor,
  getRiskBorderColor,
  getRiskLabel,
  RiskLevel,
} from '@/lib/analysis/knockoutRisk';

interface KnockoutChecklistProps {
  /** List of knockout items */
  knockouts: KnockoutItem[];
  /** Callback when user confirms/denies a knockout */
  onKnockoutChange: (id: string, confirmed: boolean | undefined) => void;
  /** Current risk level */
  riskLevel: RiskLevel;
  /** Risk explanation */
  riskExplanation: string;
}

/**
 * Knockout Checklist Component
 *
 * Displays detected knockout requirements with checkboxes for user confirmation.
 */
export function KnockoutChecklist({
  knockouts,
  onKnockoutChange,
  riskLevel,
  riskExplanation,
}: KnockoutChecklistProps) {
  if (knockouts.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-5 h-5 text-green-600"
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
            <h3 className="text-sm font-semibold text-green-800">
              No Disqualifiers Detected
            </h3>
            <p className="text-sm text-green-700 mt-1">
              This job posting doesn't appear to have hard requirements like
              specific work authorization, certifications, or location
              restrictions.
            </p>
          </div>
        </div>
      </div>
    );
  }

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
    {} as Record<string, KnockoutItem[]>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with risk level */}
      <div
        className={`px-4 py-3 border-b ${getRiskBgColor(riskLevel)} ${getRiskBorderColor(riskLevel)}`}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">
              Potential Disqualifiers
            </h3>
            <p className="text-xs text-gray-600 mt-0.5">
              Confirm if you meet these requirements
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskBgColor(riskLevel)} ${getRiskColor(riskLevel)} border ${getRiskBorderColor(riskLevel)}`}
          >
            {getRiskLabel(riskLevel)}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">{riskExplanation}</p>
      </div>

      {/* Knockout items grouped by category */}
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedKnockouts).map(([category, items]) => (
          <div key={category} className="p-4">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {getCategoryLabel(category as KnockoutItem['category'])}
            </h4>
            <div className="space-y-3">
              {items.map((knockout) => (
                <KnockoutItemRow
                  key={knockout.id}
                  knockout={knockout}
                  onChange={onKnockoutChange}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>You qualify</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>You don't qualify</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span>Not confirmed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual knockout item with toggle
 */
function KnockoutItemRow({
  knockout,
  onChange,
}: {
  knockout: KnockoutItem;
  onChange: (id: string, confirmed: boolean | undefined) => void;
}) {
  const { id, label, evidence, userConfirmed } = knockout;

  const handleYes = () => {
    onChange(id, userConfirmed === true ? undefined : true);
  };

  const handleNo = () => {
    onChange(id, userConfirmed === false ? undefined : false);
  };

  return (
    <div
      className={`
        p-3 rounded-lg border transition-colors
        ${
          userConfirmed === true
            ? 'bg-green-50 border-green-200'
            : userConfirmed === false
              ? 'bg-red-50 border-red-200'
              : 'bg-gray-50 border-gray-200'
        }
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-800">{label}</p>
          <p className="text-xs text-gray-500 mt-1 italic">"{evidence}"</p>
        </div>

        {/* Yes/No toggle buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleYes}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-l-lg border transition-colors
              ${
                userConfirmed === true
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-green-50 hover:border-green-300'
              }
            `}
            title="I meet this requirement"
          >
            Yes
          </button>
          <button
            onClick={handleNo}
            className={`
              px-3 py-1.5 text-xs font-medium rounded-r-lg border-t border-b border-r transition-colors
              ${
                userConfirmed === false
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-red-50 hover:border-red-300'
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
