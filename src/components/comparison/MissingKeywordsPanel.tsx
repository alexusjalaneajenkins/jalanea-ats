'use client';

import { Lightbulb, AlertCircle, TrendingUp, Target } from 'lucide-react';
import {
  CommonMissingKeyword,
  ComparisonRecommendation,
} from '@/lib/types/comparison';

interface MissingKeywordsPanelProps {
  keywords: CommonMissingKeyword[];
  totalJobs: number;
  recommendations: ComparisonRecommendation[];
}

/**
 * Missing Keywords Panel
 *
 * Shows common missing keywords across multiple jobs and recommendations.
 */
export function MissingKeywordsPanel({
  keywords,
  totalJobs,
  recommendations,
}: MissingKeywordsPanelProps) {
  if (keywords.length === 0 && recommendations.length === 0) {
    return null;
  }

  // Group keywords by frequency
  const highPriority = keywords.filter(k => k.count >= Math.ceil(totalJobs * 0.75));
  const mediumPriority = keywords.filter(
    k => k.count >= Math.ceil(totalJobs * 0.5) && k.count < Math.ceil(totalJobs * 0.75)
  );
  const lowPriority = keywords.filter(k => k.count < Math.ceil(totalJobs * 0.5));

  return (
    <div className="space-y-4">
      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-r from-orange-500/10 to-pink-500/10 rounded-xl border border-orange-500/20 p-4">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-orange-400" />
            Recommendations
          </h4>
          <div className="space-y-2">
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                className={`
                  flex items-start gap-3 p-3 rounded-lg
                  ${rec.priority === 'high'
                    ? 'bg-orange-500/10'
                    : rec.priority === 'medium'
                      ? 'bg-amber-500/10'
                      : 'bg-indigo-500/10'
                  }
                `}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {rec.type === 'add-skill' && (
                    <TrendingUp className={`w-4 h-4 ${
                      rec.priority === 'high' ? 'text-orange-400' : 'text-amber-400'
                    }`} />
                  )}
                  {rec.type === 'focus-role' && (
                    <Target className="w-4 h-4 text-emerald-400" />
                  )}
                  {rec.type === 'avoid-role' && (
                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                  )}
                  {rec.type === 'general' && (
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                  )}
                </div>
                <p className="text-sm text-indigo-200">{rec.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Common Missing Keywords */}
      {keywords.length > 0 && (
        <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4">
          <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            Common Missing Keywords
          </h4>
          <p className="text-xs text-indigo-400 mb-4">
            Adding these skills could improve multiple applications at once.
          </p>

          <div className="space-y-4">
            {/* High Priority (75%+ of jobs) */}
            {highPriority.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-red-400 mb-2">
                  High Priority (needed in {Math.ceil(totalJobs * 0.75)}+ jobs)
                </h5>
                <div className="flex flex-wrap gap-2">
                  {highPriority.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-200 rounded-lg text-sm border border-red-500/30"
                    >
                      <span className="font-medium">{kw.keyword}</span>
                      <span className="text-xs text-red-400 bg-red-500/30 px-1.5 py-0.5 rounded">
                        {kw.count}/{totalJobs}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Medium Priority (50-75% of jobs) */}
            {mediumPriority.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-amber-400 mb-2">
                  Medium Priority (needed in {Math.ceil(totalJobs * 0.5)}+ jobs)
                </h5>
                <div className="flex flex-wrap gap-2">
                  {mediumPriority.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/20 text-amber-200 rounded-lg text-sm border border-amber-500/30"
                    >
                      <span className="font-medium">{kw.keyword}</span>
                      <span className="text-xs text-amber-400 bg-amber-500/30 px-1.5 py-0.5 rounded">
                        {kw.count}/{totalJobs}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Low Priority (less than 50% of jobs) */}
            {lowPriority.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-indigo-400 mb-2">
                  Other Missing Skills
                </h5>
                <div className="flex flex-wrap gap-1.5">
                  {lowPriority.slice(0, 15).map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-500/20 text-indigo-200 rounded text-xs"
                    >
                      <span>{kw.keyword}</span>
                      <span className="text-indigo-400">({kw.count})</span>
                    </span>
                  ))}
                  {lowPriority.length > 15 && (
                    <span className="text-xs text-indigo-400 py-1">
                      +{lowPriority.length - 15} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
