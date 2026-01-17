'use client';

import { useState, useCallback } from 'react';

interface JobDescriptionInputProps {
  /** Current job description text */
  jobText: string;
  /** Callback when text changes */
  onJobTextChange: (text: string) => void;
  /** Callback to trigger analysis */
  onAnalyze: () => Promise<void>;
  /** Whether analysis is in progress */
  isLoading: boolean;
  /** Whether the resume has been uploaded */
  hasResume: boolean;
}

/**
 * Job Description Input Component
 *
 * Large textarea for pasting job descriptions with analysis trigger.
 */
export function JobDescriptionInput({
  jobText,
  onJobTextChange,
  onAnalyze,
  isLoading,
  hasResume,
}: JobDescriptionInputProps) {
  const [isFocused, setIsFocused] = useState(false);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">
              Job Description
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Paste the job posting to analyze keyword match
            </p>
          </div>
          <button
            onClick={loadSampleJD}
            className="text-xs text-blue-600 hover:text-blue-700 hover:underline"
          >
            Load sample JD
          </button>
        </div>
      </div>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={jobText}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Paste the full job description here, including requirements section..."
          className={`
            w-full min-h-[200px] p-4 text-sm text-gray-700
            placeholder-gray-400 resize-y
            border-0 focus:ring-0 focus:outline-none
            ${isFocused ? 'bg-blue-50/30' : 'bg-white'}
            transition-colors duration-200
          `}
          aria-label="Job description text"
        />

        {/* Character count */}
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {charCount.toLocaleString()} characters
        </div>
      </div>

      {/* Footer with analyze button */}
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {!hasResume ? (
              <span className="text-amber-600">
                Upload a resume first to enable analysis
              </span>
            ) : charCount < 50 ? (
              <span>Paste at least 50 characters to analyze</span>
            ) : (
              <span className="text-green-600">
                Ready to analyze keyword match
              </span>
            )}
          </p>

          <button
            onClick={handleAnalyze}
            disabled={!canAnalyze}
            className={`
              px-4 py-2 text-sm font-medium rounded-lg
              transition-all duration-200
              ${
                canAnalyze
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
