'use client';

import { ShieldCheck, ShieldAlert, ShieldX, Info } from 'lucide-react';
import { useState } from 'react';

interface KnockoutRiskCardProps {
  /** Risk level */
  risk: 'low' | 'medium' | 'high';
  /** Number of knockout flags detected */
  flagCount: number;
  /** Whether this score is highlighted for the detected ATS */
  isHighlighted?: boolean;
}

/**
 * Knockout Risk Score Card
 *
 * Measures the risk of being auto-rejected by knockout questions.
 * This is the ONLY true auto-reject mechanism in ATS systems.
 * Applies to ALL ATS systems.
 */
export function KnockoutRiskCard({
  risk,
  flagCount,
  isHighlighted = false,
}: KnockoutRiskCardProps) {
  const { icon: Icon, bgColor, textColor, label } = getRiskStyle(risk);
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`
        relative bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 p-4
        transition-all duration-300 card-hover-glow cursor-pointer
        hover:bg-indigo-900/40 hover:scale-[1.02] active:scale-[0.98]
        ${isHighlighted
          ? 'border-orange-500/50 shadow-lg shadow-orange-500/10 hover:shadow-orange-500/20'
          : 'border-indigo-500/30 hover:border-indigo-400/50 hover:shadow-indigo-500/10'
        }
      `}
      role="button"
      tabIndex={0}
      aria-label={`Knockout Risk: ${label}. ${flagCount === 0 ? 'No eligibility flags detected' : `${flagCount} potential flags detected`}`}
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
          Knockout Risk
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
              aria-label="More information about Knockout Risk"
              aria-describedby={showTooltip ? 'knockout-risk-tooltip' : undefined}
            >
              <Info className="w-4 h-4" />
            </button>
            {showTooltip && (
              <div
                id="knockout-risk-tooltip"
                role="tooltip"
                className="absolute z-50 bottom-full right-0 mb-2 px-3 py-2 text-xs text-white bg-indigo-900 border border-indigo-500/50 rounded-lg shadow-xl w-48 whitespace-normal"
              >
                <p className="font-medium mb-1">Knockout questions check:</p>
                <ul className="text-indigo-300 space-y-0.5">
                  <li>• Work authorization</li>
                  <li>• Years of experience</li>
                  <li>• Required certifications</li>
                  <li>• Education requirements</li>
                </ul>
                <p className="text-indigo-400 mt-2 text-[10px]">
                  This is the only true auto-reject in ATS.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Risk icon */}
      <div className="flex justify-center mb-3">
        <div
          className={`w-20 h-20 rounded-full ${bgColor} flex items-center justify-center`}
          aria-hidden="true"
        >
          <Icon className={`w-10 h-10 ${textColor}`} />
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <span className={`text-sm font-bold ${bgColor} ${textColor} px-3 py-1 rounded-full`}>
          {label}
        </span>
      </div>

      {/* Flag count */}
      <p className="text-[11px] text-indigo-400 text-center mt-3">
        {flagCount === 0
          ? 'No eligibility flags detected'
          : `${flagCount} potential flag${flagCount !== 1 ? 's' : ''} detected`
        }
      </p>
    </div>
  );
}

function getRiskStyle(risk: 'low' | 'medium' | 'high'): {
  icon: typeof ShieldCheck;
  color: string;
  bgColor: string;
  textColor: string;
  label: string;
} {
  switch (risk) {
    case 'low':
      return {
        icon: ShieldCheck,
        color: '#22c55e',
        bgColor: 'bg-emerald-500/20',
        textColor: 'text-emerald-400',
        label: 'Low Risk',
      };
    case 'medium':
      return {
        icon: ShieldAlert,
        color: '#eab308',
        bgColor: 'bg-yellow-500/20',
        textColor: 'text-yellow-400',
        label: 'Medium Risk',
      };
    case 'high':
      return {
        icon: ShieldX,
        color: '#ef4444',
        bgColor: 'bg-red-500/20',
        textColor: 'text-red-400',
        label: 'High Risk',
      };
  }
}
