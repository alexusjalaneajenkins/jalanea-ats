'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Target, ClipboardPaste, Link2, CheckCircle2, Bot, Search, X } from 'lucide-react';
import { detectATSVendor, VendorDetectionResult } from '@/lib/ats';

interface JobDescriptionInputProps {
  /** Current job description text */
  jobText: string;
  /** Callback when text changes */
  onJobTextChange: (text: string) => void;
  /** Current job posting URL (optional) */
  jobUrl?: string;
  /** Callback when URL changes */
  onJobUrlChange?: (url: string) => void;
  /** Detected ATS vendor result */
  vendorResult?: VendorDetectionResult | null;
  /** Callback to trigger analysis */
  onAnalyze: () => Promise<void>;
  /** Whether analysis is in progress */
  isLoading: boolean;
  /** Whether the resume has been uploaded */
  hasResume: boolean;
  /** Parse health score (optional, for contextual messaging) */
  parseScore?: number;
}

/**
 * Job Description Input Component
 *
 * Large textarea for pasting job descriptions with analysis trigger.
 */
export function JobDescriptionInput({
  jobText,
  onJobTextChange,
  jobUrl = '',
  onJobUrlChange,
  vendorResult,
  onAnalyze,
  isLoading,
  hasResume,
  parseScore,
}: JobDescriptionInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showTextarea, setShowTextarea] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [localUrl, setLocalUrl] = useState(jobUrl);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Local vendor detection (used when parent doesn't provide vendorResult)
  const localVendorResult = useMemo(() => {
    if (vendorResult !== undefined) return vendorResult;
    if (!localUrl) return null;
    return detectATSVendor(localUrl);
  }, [localUrl, vendorResult]);

  // Sync local URL with parent
  useEffect(() => {
    setLocalUrl(jobUrl);
  }, [jobUrl]);

  const handleUrlChange = useCallback((url: string) => {
    setLocalUrl(url);
    onJobUrlChange?.(url);
  }, [onJobUrlChange]);

  const showEmptyState = hasResume && jobText.length === 0 && !showTextarea;

  // Auto-focus textarea when shown
  useEffect(() => {
    if (showTextarea && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [showTextarea]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onJobTextChange(e.target.value);
    },
    [onJobTextChange]
  );

  const handleAnalyze = useCallback(async () => {
    if (canAnalyze) {
      await onAnalyze();
    }
  }, [onAnalyze]);

  const charCount = jobText.length;
  const canAnalyze = hasResume && charCount > 50 && !isLoading;

  // Sample JD for demo
  const loadSampleJD = () => {
    const sampleJD = `Software Engineer - Full Stack

About the Role:
We are looking for a Full Stack Software Engineer to join our growing team. You will work on building and maintaining web applications using modern technologies.

Requirements:
- Bachelor's degree in Computer Science or related field
- 3+ years of experience with JavaScript/TypeScript
- Experience with React or Vue.js
- Proficiency in Node.js and Express
- Experience with SQL databases (PostgreSQL preferred)
- Familiarity with AWS or GCP cloud services
- Experience with Git version control
- Strong problem-solving skills
- Excellent communication skills

Nice to Have:
- Experience with Docker and Kubernetes
- Knowledge of CI/CD pipelines
- Experience with GraphQL
- Contributions to open source projects

Work Authorization:
Must be authorized to work in the United States. No sponsorship available.

Location:
Hybrid role - 3 days per week in our San Francisco office.

Benefits:
- Competitive salary
- Health, dental, and vision insurance
- 401(k) matching
- Unlimited PTO`;

    onJobTextChange(sampleJD);
  };

  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">
              Job Description
            </h3>
            <p className="text-xs text-indigo-300 mt-0.5">
              Paste the job posting to analyze keyword match
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUrlInput(!showUrlInput)}
              className={`
                flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors
                ${localVendorResult?.detected
                  ? localVendorResult.vendor?.type === 'sorter'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : showUrlInput
                    ? 'bg-indigo-700/50 text-indigo-200'
                    : 'text-indigo-400 hover:text-indigo-300 hover:bg-indigo-800/50'
                }
              `}
            >
              {localVendorResult?.detected ? (
                <>
                  <span>{localVendorResult.vendor?.icon}</span>
                  <span>{localVendorResult.vendor?.name}</span>
                  {localVendorResult.vendor?.type === 'sorter' ? (
                    <Bot className="w-3 h-3" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </>
              ) : (
                <>
                  <Link2 className="w-3 h-3" />
                  <span>Detect ATS</span>
                </>
              )}
            </button>
            <button
              onClick={loadSampleJD}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              Load sample
            </button>
          </div>
        </div>

        {/* URL Input (collapsible) */}
        {showUrlInput && (
          <div className="mt-3 pt-3 border-t border-indigo-500/20">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" />
                <input
                  type="url"
                  value={localUrl}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="Paste job posting URL (e.g., boards.greenhouse.io/...)"
                  className="w-full pl-9 pr-8 py-2 text-sm bg-indigo-950/50 border border-indigo-500/30 rounded-lg text-indigo-100 placeholder-indigo-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                />
                {localUrl && (
                  <button
                    onClick={() => handleUrlChange('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-indigo-500 hover:text-indigo-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Detection Result */}
            {localVendorResult?.detected && localVendorResult.vendor && (
              <div
                className={`
                  mt-2 p-3 rounded-lg flex items-start gap-3
                  ${localVendorResult.vendor.type === 'sorter'
                    ? 'bg-purple-500/10 border border-purple-500/20'
                    : 'bg-cyan-500/10 border border-cyan-500/20'
                  }
                `}
              >
                <span className="text-xl">{localVendorResult.vendor.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {localVendorResult.vendor.name}
                    </span>
                    <span
                      className={`
                        text-xs px-2 py-0.5 rounded-full flex items-center gap-1
                        ${localVendorResult.vendor.type === 'sorter'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-cyan-500/20 text-cyan-300'
                        }
                      `}
                    >
                      {localVendorResult.vendor.type === 'sorter' ? (
                        <Bot className="w-3 h-3" />
                      ) : (
                        <Search className="w-3 h-3" />
                      )}
                      <span className="capitalize">{localVendorResult.vendor.type}</span>
                    </span>
                    {localVendorResult.confidence === 'medium' && (
                      <span className="text-xs text-indigo-400">(likely)</span>
                    )}
                  </div>
                  <p className="text-xs text-indigo-300 mt-1">
                    {localVendorResult.vendor.guidance.explanation}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-indigo-400">Focus on:</span>
                    {localVendorResult.vendor.guidance.focus.map((area, idx) => (
                      <span
                        key={idx}
                        className={`
                          text-xs px-2 py-0.5 rounded-full
                          ${localVendorResult.vendor?.type === 'sorter'
                            ? 'bg-purple-500/20 text-purple-200'
                            : 'bg-cyan-500/20 text-cyan-200'
                          }
                        `}
                      >
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* No detection message */}
            {localUrl && !localVendorResult?.detected && (
              <p className="mt-2 text-xs text-indigo-400">
                Could not detect ATS vendor from this URL. Generic best practices apply.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Empty State or Textarea */}
      {showEmptyState ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="relative p-8 bg-indigo-950/30"
        >
          <div className="flex flex-col items-center text-center">
            {/* Icon with pulse effect */}
            <motion.div
              className="relative mb-4"
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border-2 border-orange-500/30 flex items-center justify-center">
                <Target className="w-8 h-8 text-orange-400" />
              </div>
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-orange-400/50"
                animate={{ scale: [1, 1.3], opacity: [0.5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </motion.div>

            {/* Message based on score */}
            <h4 className="text-lg font-bold text-white mb-2">
              {parseScore && parseScore >= 80
                ? "Your resume is ATS-ready!"
                : "Check your job match"}
            </h4>
            <p className="text-sm text-indigo-300 max-w-sm mb-5">
              {parseScore && parseScore >= 80
                ? "Now paste a job description to see if your keywords align with what recruiters are looking for."
                : "Paste a job description to analyze how well your resume matches the position."}
            </p>

            {/* Prominent paste button */}
            <motion.button
              onClick={async () => {
                // Try to read from clipboard, fallback to showing textarea
                try {
                  const text = await navigator.clipboard.readText();
                  if (text && text.trim().length > 0) {
                    onJobTextChange(text);
                  } else {
                    // No clipboard content, show textarea
                    setShowTextarea(true);
                  }
                } catch {
                  // Clipboard API not available or denied, show textarea
                  setShowTextarea(true);
                }
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold shadow-lg hover:shadow-orange-500/25 transition-shadow"
            >
              <ClipboardPaste className="w-4 h-4" />
              Paste Job Description
            </motion.button>

            <button
              onClick={() => setShowTextarea(true)}
              className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              or type/paste manually
            </button>

            <button
              onClick={loadSampleJD}
              className="mt-1 text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
            >
              or try a sample job posting
            </button>
          </div>
        </motion.div>
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            id="job-description-textarea"
            value={jobText}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Paste the full job description here, including requirements section..."
            className={`
              w-full min-h-[200px] p-4 text-sm text-indigo-100
              placeholder-indigo-500 resize-y
              border-0 focus:ring-0 focus:outline-none
              bg-indigo-950/30
              ${isFocused ? 'bg-indigo-950/50' : ''}
              transition-colors duration-200
            `}
            aria-label="Job description text"
          />

          {/* Character count */}
          <div className="absolute bottom-2 right-2 text-xs text-indigo-500">
            {charCount.toLocaleString()} characters
          </div>
        </div>
      )}

      {/* Footer with analyze button */}
      <div className="px-5 py-4 border-t border-indigo-500/20">
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs">
            {!hasResume ? (
              <span className="text-amber-400">
                Upload a resume first to enable analysis
              </span>
            ) : charCount < 50 ? (
              <span className="text-indigo-400">Paste at least 50 characters to analyze</span>
            ) : (
              <span className="text-emerald-400">
                Ready to analyze keyword match
              </span>
            )}
          </p>

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`
              px-5 py-2.5 text-sm font-bold rounded-xl
              transition-all duration-200
              ${
                canAnalyze
                  ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90 shadow-lg'
                  : 'bg-indigo-800/50 text-indigo-500 cursor-not-allowed border border-indigo-700/50'
              }
            `}
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Analyzing...
              </span>
            ) : (
              'Analyze Job Match'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
