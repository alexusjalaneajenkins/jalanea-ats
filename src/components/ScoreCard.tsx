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
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
      {/* Main score */}
      <div className="p-6 text-center border-b border-indigo-500/20">
        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-wide mb-4">
          Parse Health Score
        </h2>

        <div className="relative inline-flex items-center justify-center">
          {/* Circular progress */}
          <svg className="w-36 h-36 transform -rotate-90">
            {/* Background circle */}
            <circle
              cx="72"
              cy="72"
              r="60"
              fill="none"
              stroke="rgba(99, 102, 241, 0.2)"
              strokeWidth="12"
            />
            {/* Progress circle */}
            <circle
              cx="72"
              cy="72"
              r="60"
              fill="none"
              stroke={getScoreColor(scores.parseHealth)}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={`${(scores.parseHealth / 100) * 377} 377`}
              className="transition-all duration-1000 ease-out"
              style={{ filter: `drop-shadow(0 0 8px ${getScoreColor(scores.parseHealth)}40)` }}
            />
          </svg>

          {/* Score text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-white">
              {scores.parseHealth}
            </span>
            <span
              className={`text-sm font-bold ${getGradeColor(grade)}`}
            >
              {getStatusLabel(grade)}
            </span>
          </div>
        </div>

        <p className="text-sm text-indigo-300 mt-4">
          {getScoreDescription(scores.parseHealth)}
        </p>
      </div>

      {/* Sub-scores */}
      <div className="p-5 bg-indigo-950/30">
        <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wide mb-4">
          Breakdown
        </h3>
        <div className="space-y-4">
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
      <div className="text-indigo-400">{icon}</div>
      <div className="flex-1">
        <div className="flex items-center justify-between text-sm mb-1.5">
          <span className="text-indigo-200">{label}</span>
          <span className="font-bold text-white">{score}</span>
        </div>
        <div className="h-2 bg-indigo-950/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: getScoreColor(score),
              boxShadow: `0 0 8px ${getScoreColor(score)}60`,
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
 * Gets the status label for display.
 */
function getStatusLabel(grade: string): string {
  switch (grade) {
    case 'Excellent':
      return 'ATS Ready';
    case 'Good':
      return 'Almost There';
    case 'Fair':
      return 'Needs Work';
    case 'Poor':
      return 'Major Issues';
    default:
      return grade;
  }
}

/**
 * Gets the color class for a grade.
 */
function getGradeColor(grade: string): string {
  switch (grade) {
    case 'Excellent':
      return 'text-emerald-400';
    case 'Good':
      return 'text-cyan-400';
    case 'Fair':
      return 'text-yellow-400';
    case 'Poor':
      return 'text-red-400';
    default:
      return 'text-indigo-300';
  }
}

/**
 * Gets a description for a score.
 */
function getScoreDescription(score: number): string {
  if (score >= 90) return 'Your resume structure is perfect. Now optimize keywords with a job description.';
  if (score >= 75) return 'Great structure! A few tweaks could make it even better.';
  if (score >= 50) return 'Some formatting issues may affect how ATS reads your resume.';
  return 'Significant issues that likely prevent proper ATS parsing.';
}
