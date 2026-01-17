'use client';

import { useState, useCallback } from 'react';

/**
 * Props for the PlainTextPreview component.
 */
interface PlainTextPreviewProps {
  /** The extracted plain text to display */
  text: string;
  /** Title for the preview section */
  title?: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Maximum height in pixels (scrollable) */
  maxHeight?: number;
}

/**
 * Displays extracted resume text in a readable, copyable format.
 * Shows users exactly what the ATS software sees.
 */
export function PlainTextPreview({
  text,
  title = 'Plain Text Preview',
  subtitle = "This is what the ATS typically sees after parsing your resume",
  maxHeight = 400,
}: PlainTextPreviewProps) {
  const [copied, setCopied] = useState(false);

  /**
   * Copies the text to clipboard.
   */
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  }, [text]);

  const charCount = text.length;
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const lineCount = text.split('\n').length;

  const isEmpty = text.trim().length === 0;

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <button
          onClick={handleCopy}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
            transition-colors duration-150
            ${
              copied
                ? 'bg-green-100 text-green-700'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-300'
            }
          `}
          aria-label={copied ? 'Copied to clipboard' : 'Copy text to clipboard'}
        >
          {copied ? (
            <>
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copy
            </>
          )}
        </button>
      </div>

      {/* Text content */}
      <div
        className="overflow-auto bg-gray-50"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <svg
              className="w-12 h-12 text-gray-300 mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-gray-500 font-medium">No text extracted</p>
            <p className="text-gray-400 text-sm mt-1">
              This PDF may be image-based or contain no readable text.
            </p>
          </div>
        ) : (
          <pre className="p-4 text-sm text-gray-700 font-mono whitespace-pre-wrap break-words leading-relaxed">
            {text}
          </pre>
        )}
      </div>

      {/* Footer with stats */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 bg-white rounded-b-lg">
        <div className="flex gap-4 text-xs text-gray-500">
          <span>{charCount.toLocaleString()} characters</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>{lineCount.toLocaleString()} lines</span>
        </div>
        <div className="flex items-center text-xs text-gray-400">
          <svg className="w-3.5 h-3.5 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          Robot view
        </div>
      </div>
    </div>
  );
}
