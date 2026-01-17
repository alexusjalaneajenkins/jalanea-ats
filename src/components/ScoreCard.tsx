'use client';

import { Scores, scoreToGrade } from '@/lib/types/session';

interface ScoreCardProps {
  scores: Scores;
}

/**
 * Score Card Component
 *
 * Displays the Parse Health score and sub-scores.
 */
export function ScoreCard({ scores }: ScoreCardProps) {
  const grade = scoreToGrade(scores.parseHealth);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Main score */}
      <div className="p-6 text-center border-b border-gray-100">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
          Parse Health Score
        </h2>

        <div className="relative inline-flex items-center justify-center">
          {/* Circular progress */}
          <svg className="w-32 h-32 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="64"
              cy="64"
              r="56"
              fill="none"
              stroke={getScoreColor(scores.parseHealth)}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(scores.parseHealth / 100) * 352} 352`}
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold text-gray-900">
              {scores.parseHealth}
            </span>
            <span
              className={`text-lg font-semibold ${getGradeColor(grade)}`}
            >
              {grade}
            </span>
          </div>
        </div>

        <p className="text-sm text-gray-500 mt-4">
          {getScoreDescription(scores.parseHealth)}
        </p>
      </div>

      {/* Sub-scores */}
      <div className="p-4 bg-gray-50">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Breakdown
        </h3>
        <div className="space-y-3">
          <SubScore
            label="Layout & Structure"
            score={scores.layoutScore}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
            }
          />
          <SubScore
            label="Contact Information"
            score={scores.contactScore}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
          <SubScore
            label="Section Headers"
            score={scores.sectionScore}
            icon={
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            }
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Sub-score component
 */
function SubScore({
  label,
  score,
  icon,
}: {
  label: string;
  score: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-400">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm mb-1">
          <span className="text-gray-700">{label}</span>
          <span className="font-medium text-gray-900">{score}</span>
        </div>
        <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: getScoreColor(score),
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Gets the appropriate color for a score.
 */
function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e'; // green-500
  if (score >= 60) return '#eab308'; // yellow-500
  if (score >= 40) return '#f97316'; // orange-500
  return '#ef4444'; // red-500
}

/**
 * Gets the color class for a grade.
 */
function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A':
      return 'text-green-600';
    case 'B':
      return 'text-green-500';
    case 'C':
      return 'text-yellow-600';
    case 'D':
      return 'text-orange-600';
    case 'F':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

/**
 * Gets a description for a score.
 */
function getScoreDescription(score: number): string {
  if (score >= 90) return 'Excellent! Your resume is highly ATS-compatible.';
  if (score >= 80) return 'Great job! Your resume should parse well in most systems.';
  if (score >= 70) return 'Good, but there is room for improvement.';
  if (score >= 60) return 'Some issues may affect ATS parsing.';
  if (score >= 50) return 'Multiple issues detected that could hurt your chances.';
  return 'Significant issues that likely prevent proper ATS parsing.';
}
