'use client';

import { useState } from 'react';
import { downloadAsJSON, downloadAsMarkdown, ExportableSession } from '@/lib/export/report';

interface ExportButtonsProps {
  session: ExportableSession;
  /** Optional callback when export completes */
  onExportComplete?: (format: 'json' | 'markdown') => void;
  /** Show as compact inline buttons */
  compact?: boolean;
}

/**
 * Export Buttons Component
 *
 * Provides buttons to export the analysis session as JSON or Markdown.
 */
export function ExportButtons({
  session,
  onExportComplete,
  compact = false,
}: ExportButtonsProps) {
  const [isExportingJSON, setIsExportingJSON] = useState(false);
  const [isExportingMarkdown, setIsExportingMarkdown] = useState(false);
  const [lastExported, setLastExported] = useState<'json' | 'markdown' | null>(null);

  const handleExportJSON = async () => {
    setIsExportingJSON(true);
    setLastExported(null);

    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 300));
      downloadAsJSON(session);
      setLastExported('json');
      onExportComplete?.('json');
    } catch (error) {
      console.error('Failed to export JSON:', error);
    } finally {
      setIsExportingJSON(false);
    }
  };

  const handleExportMarkdown = async () => {
    setIsExportingMarkdown(true);
    setLastExported(null);

    try {
      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 300));
      downloadAsMarkdown(session);
      setLastExported('markdown');
      onExportComplete?.('markdown');
    } catch (error) {
      console.error('Failed to export Markdown:', error);
    } finally {
      setIsExportingMarkdown(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleExportJSON}
          disabled={isExportingJSON}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export as JSON (full data)"
        >
          {isExportingJSON ? (
            <LoadingSpinner />
          ) : (
            <JSONIcon />
          )}
          <span>JSON</span>
        </button>

        <button
          onClick={handleExportMarkdown}
          disabled={isExportingMarkdown}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Export as Markdown (readable report)"
        >
          {isExportingMarkdown ? (
            <LoadingSpinner />
          ) : (
            <MarkdownIcon />
          )}
          <span>Markdown</span>
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-900">Export Report</h3>
        <p className="text-xs text-gray-500 mt-1">
          Download your analysis for reference or sharing
        </p>
      </div>

      <div className="p-4 space-y-3">
        {/* JSON Export */}
        <button
          onClick={handleExportJSON}
          disabled={isExportingJSON}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200 transition-colors">
              {isExportingJSON ? (
                <LoadingSpinner className="text-amber-600" />
              ) : (
                <JSONIcon className="w-5 h-5 text-amber-600" />
              )}
            </div>
            <div className="text-left">
              <span className="block text-sm font-medium text-gray-900">
                Export as JSON
              </span>
              <span className="block text-xs text-gray-500">
                Full data for programmatic use
              </span>
            </div>
          </div>
          <DownloadIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </button>

        {/* Markdown Export */}
        <button
          onClick={handleExportMarkdown}
          disabled={isExportingMarkdown}
          className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
              {isExportingMarkdown ? (
                <LoadingSpinner className="text-purple-600" />
              ) : (
                <MarkdownIcon className="w-5 h-5 text-purple-600" />
              )}
            </div>
            <div className="text-left">
              <span className="block text-sm font-medium text-gray-900">
                Export as Markdown
              </span>
              <span className="block text-xs text-gray-500">
                Human-readable summary report
              </span>
            </div>
          </div>
          <DownloadIcon className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
        </button>

        {/* Success feedback */}
        {lastExported && (
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm">
            <CheckIcon className="w-4 h-4" />
            <span>
              {lastExported === 'json' ? 'JSON' : 'Markdown'} exported successfully!
            </span>
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <p className="text-xs text-gray-400 text-center">
          Your data stays local — exports are generated in your browser
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Icons
// =============================================================================

function JSONIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 4v16M7 4L3 8m4-4l4 4" />
    </svg>
  );
}

function MarkdownIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function DownloadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function LoadingSpinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default ExportButtons;
