'use client';

import { CoverageResult, getCoverageGrade, getCoverageColor } from '@/lib/analysis';

interface KeywordCoveragePanelProps {
  /** Coverage calculation result */
  coverage: CoverageResult;
}

/**
 * Keyword Coverage Panel Component
 *
 * Displays keyword match score and lists found/missing keywords.
 */
export function KeywordCoveragePanel({ coverage }: KeywordCoveragePanelProps) {
  const { score, foundKeywords, missingKeywords, bonusKeywords } = coverage;
  const grade = getCoverageGrade(score);
  const colorClass = getCoverageColor(score);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header with score */}
      <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Keyword Coverage
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              How well your resume matches the job requirements
            </p>
          </div>

          {/* Score circle */}
          <div className="text-center">
            <div
              className={`text-3xl font-bold ${colorClass}`}
            >
              {score}%
            </div>
            <div className={`text-xs font-medium ${colorClass}`}>{grade}</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              score >= 80
                ? 'bg-green-500'
                : score >= 50
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Keywords sections */}
      <div className="divide-y divide-gray-100">
        {/* Found keywords */}
        {foundKeywords.length > 0 && (
          <div className="p-4">
            <h4 className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              Keywords Found ({foundKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {foundKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Missing keywords */}
        {missingKeywords.length > 0 && (
          <div className="p-4">
            <h4 className="text-xs font-semibold text-red-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              Missing Keywords ({missingKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {missingKeywords.map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800"
                >
                  {keyword}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              If you have these skills, consider adding the exact phrases to your
              resume.
            </p>
          </div>
        )}

        {/* Bonus keywords */}
        {bonusKeywords.length > 0 && (
          <div className="p-4 bg-blue-50/50">
            <h4 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Bonus: Nice-to-Have Keywords ({bonusKeywords.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {bonusKeywords.slice(0, 10).map((keyword, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {keyword}
                </span>
              ))}
              {bonusKeywords.length > 10 && (
                <span className="text-xs text-blue-600">
                  +{bonusKeywords.length - 10} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tips */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          <strong>Tip:</strong> ATS systems often filter resumes by exact keyword
          matches. Use the same terminology as the job posting.
        </p>
      </div>
    </div>
  );
}
