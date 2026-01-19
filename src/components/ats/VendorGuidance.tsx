'use client';

import { useState } from 'react';
import {
  Bot,
  Search,
  Target,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ATSVendor, getUnknownATSGuidance } from '@/lib/ats';

interface VendorGuidanceProps {
  vendor: ATSVendor | null;
  confidence?: 'high' | 'medium' | 'low';
  compact?: boolean;
}

/**
 * Vendor Guidance Panel
 *
 * Provides contextual guidance based on the detected ATS vendor.
 */
export function VendorGuidance({
  vendor,
  confidence = 'high',
  compact = false,
}: VendorGuidanceProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);

  const guidance = vendor ? vendor.guidance : getUnknownATSGuidance();
  const isSorter = vendor?.type === 'sorter';

  return (
    <div
      className={`
        rounded-xl border overflow-hidden
        ${isSorter
          ? 'bg-purple-500/5 border-purple-500/20'
          : vendor
            ? 'bg-cyan-500/5 border-cyan-500/20'
            : 'bg-indigo-500/5 border-indigo-500/20'
        }
      `}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div
            className={`
              w-10 h-10 rounded-xl flex items-center justify-center border
              ${isSorter
                ? 'bg-purple-500/20 border-purple-500/30'
                : vendor
                  ? 'bg-cyan-500/20 border-cyan-500/30'
                  : 'bg-indigo-500/20 border-indigo-500/30'
              }
            `}
          >
            {vendor ? (
              <span className="text-xl">{vendor.icon}</span>
            ) : (
              <Target className="w-5 h-5 text-indigo-400" />
            )}
          </div>

          {/* Title */}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {vendor ? vendor.name : 'ATS Not Detected'}
              </span>
              {vendor && (
                <span
                  className={`
                    text-xs px-2 py-0.5 rounded-full flex items-center gap-1
                    ${isSorter
                      ? 'bg-purple-500/20 text-purple-300'
                      : 'bg-cyan-500/20 text-cyan-300'
                    }
                  `}
                >
                  {isSorter ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                  <span className="capitalize">{vendor.type}</span>
                </span>
              )}
              {confidence === 'medium' && (
                <span className="text-xs text-indigo-400">(likely)</span>
              )}
            </div>
            <p className="text-xs text-indigo-400">
              {vendor ? vendor.description : 'Apply general best practices'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`
              w-6 h-6 rounded-lg flex items-center justify-center
              ${isExpanded ? 'bg-indigo-700/50' : 'bg-indigo-800/30'}
            `}
          >
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
        <div className="px-4 pb-4 pt-2 border-t border-white/5 space-y-4">
          {/* Focus Areas */}
          <div>
            <h4 className="text-xs font-bold text-indigo-400 mb-2">FOCUS ON</h4>
            <div className="flex flex-wrap gap-2">
              {guidance.focus.map((area, idx) => (
                <div
                  key={idx}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm
                    ${isSorter
                      ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                      : vendor
                        ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/30'
                        : 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30'
                    }
                  `}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{area}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Explanation */}
          <div
            className={`
              p-3 rounded-lg
              ${isSorter
                ? 'bg-purple-500/10'
                : vendor
                  ? 'bg-cyan-500/10'
                  : 'bg-indigo-500/10'
              }
            `}
          >
            <p className="text-sm text-indigo-200 leading-relaxed">
              {guidance.explanation}
            </p>
          </div>

          {/* AI Addon Info (if applicable) */}
          {vendor?.aiAddon && (
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-amber-200">
                  <span className="font-medium">AI Scoring: </span>
                  {vendor.name} uses <span className="font-medium">{vendor.aiAddon}</span> for
                  candidate ranking.
                </p>
              </div>
            </div>
          )}

          {/* Sorter vs Processor Explanation */}
          {vendor && (
            <div className="text-xs text-indigo-400 pt-2 border-t border-white/5">
              {isSorter ? (
                <p>
                  <span className="text-purple-400 font-medium">Sorter ATS: </span>
                  Uses AI to rank and score candidates. Your semantic match with the job
                  description directly affects your visibility.
                </p>
              ) : (
                <p>
                  <span className="text-cyan-400 font-medium">Processor ATS: </span>
                  No AI ranking—recruiters manually search and filter. Focus on exact
                  keyword matches and clean parsing.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact vendor indicator for use in headers or tight spaces
 */
interface VendorIndicatorProps {
  vendor: ATSVendor | null;
  onClick?: () => void;
}

export function VendorIndicator({ vendor, onClick }: VendorIndicatorProps) {
  const isSorter = vendor?.type === 'sorter';

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm
        transition-colors
        ${vendor
          ? isSorter
            ? 'bg-purple-500/10 border border-purple-500/30 text-purple-200 hover:bg-purple-500/20'
            : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/20'
          : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
        }
      `}
    >
      {vendor ? (
        <>
          <span>{vendor.icon}</span>
          <span className="font-medium">{vendor.name}</span>
          {isSorter ? (
            <Bot className="w-3.5 h-3.5 text-purple-400" />
          ) : (
            <Search className="w-3.5 h-3.5 text-cyan-400" />
          )}
        </>
      ) : (
        <>
          <Target className="w-4 h-4" />
          <span>Detect ATS</span>
        </>
      )}
    </button>
  );
}
