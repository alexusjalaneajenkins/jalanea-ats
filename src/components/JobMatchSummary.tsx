'use client';

import { TrendingUp, TrendingDown, Minus, Target, Zap, AlertTriangle, CheckCircle } from 'lucide-react';
import { SemanticMatchResult, RecruiterSearchResult, CoverageResult, KnockoutRiskResult } from '@/lib/analysis';

interface JobMatchSummaryProps {
  semanticMatch?: SemanticMatchResult;
  recruiterSearch?: RecruiterSearchResult;
  coverage: CoverageResult;
  knockoutRisk?: KnockoutRiskResult;
  onScrollToSection: (section: 'semantic' | 'recruiter' | 'keywords' | 'knockouts') => void;
}

/**
 * Job Match Summary Card
 *
 * Shows a quick overview of job match quality with:
 * - Overall match assessment
 * - Key metrics at a glance
 * - Quick action buttons to improve scores
 */
export function JobMatchSummary({
  semanticMatch,
  recruiterSearch,
  coverage,
  knockoutRisk,
  onScrollToSection,
}: JobMatchSummaryProps) {
  // Calculate overall match quality
  const overallScore = calculateOverallScore(semanticMatch, recruiterSearch, coverage);
  const { label, color, bgColor, icon: Icon } = getMatchAssessment(overallScore, knockoutRisk?.risk);

  // Get improvement potential
  const improvementPotential = Math.min(100, Math.round((100 - overallScore) * 0.7));

  // Get top priority action
  const priorityAction = getPriorityAction(semanticMatch, recruiterSearch, coverage, knockoutRisk, onScrollToSection);

  return (
    <div className={`relative overflow-hidden rounded-2xl border-2 ${bgColor} backdrop-blur-sm`}>
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

      <div className="relative p-5">
        {/* Header with overall score */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`w-14 h-14 rounded-2xl ${color.replace('text-', 'bg-')}/20 border ${color.replace('text-', 'border-')}/30 flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${color}`} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{label}</h2>
              <p className="text-sm text-indigo-300">
                {overallScore >= 70
                  ? 'Strong candidate for this role'
                  : overallScore >= 50
                    ? 'Good potential with some gaps'
                    : 'Significant improvements needed'}
              </p>
            </div>
          </div>

          {/* Overall score */}
          <div className="text-right">
            <div className={`text-4xl font-black ${color}`}>{overallScore}%</div>
            <div className="text-xs text-indigo-400">Overall Match</div>
          </div>
        </div>

        {/* Quick metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <MetricCard
            label="AI Match"
            value={semanticMatch?.success ? `${semanticMatch.score}%` : 'N/A'}
            trend={semanticMatch?.success && semanticMatch.score >= 70 ? 'up' : semanticMatch?.success ? 'down' : undefined}
            onClick={() => onScrollToSection('semantic')}
            highlight={semanticMatch?.success && semanticMatch.score >= 75}
          />
          <MetricCard
            label="Search Score"
            value={recruiterSearch ? `${recruiterSearch.score}%` : 'N/A'}
            trend={recruiterSearch && recruiterSearch.score >= 65 ? 'up' : recruiterSearch ? 'down' : undefined}
            onClick={() => onScrollToSection('recruiter')}
          />
          <MetricCard
            label="Keywords"
            value={`${coverage.foundKeywords.length}/${coverage.foundKeywords.length + coverage.missingKeywords.length}`}
            trend={coverage.score >= 70 ? 'up' : 'down'}
            onClick={() => onScrollToSection('keywords')}
          />
          <MetricCard
            label="Risk Level"
            value={knockoutRisk?.risk ? capitalize(knockoutRisk.risk) : 'Low'}
            trend={knockoutRisk?.risk === 'low' ? 'up' : knockoutRisk?.risk === 'high' ? 'down' : 'neutral'}
            onClick={() => onScrollToSection('knockouts')}
            alert={knockoutRisk?.risk === 'high'}
          />
        </div>

        {/* Improvement potential bar */}
        {improvementPotential > 10 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-indigo-300">Improvement Potential</span>
              <span className="text-emerald-400 font-bold">+{improvementPotential}% possible</span>
            </div>
            <div className="h-2 bg-indigo-950/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-full"
                style={{ width: `${improvementPotential}%` }}
              />
            </div>
          </div>
        )}

        {/* Priority action */}
        {priorityAction && (
          <div className="flex items-center gap-3 p-3 bg-indigo-950/50 rounded-xl border border-indigo-500/20">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center flex-shrink-0">
              <Zap className="w-4 h-4 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-orange-300 uppercase tracking-wide">Top Priority</p>
              <p className="text-sm text-indigo-200 truncate">{priorityAction.message}</p>
            </div>
            <button
              onClick={priorityAction.action}
              className="px-3 py-1.5 text-xs font-bold text-orange-300 bg-orange-500/20 hover:bg-orange-500/30 rounded-lg transition-colors whitespace-nowrap"
            >
              {priorityAction.actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Metric card sub-component
 */
function MetricCard({
  label,
  value,
  trend,
  onClick,
  highlight,
  alert,
}: {
  label: string;
  value: string;
  trend?: 'up' | 'down' | 'neutral';
  onClick: () => void;
  highlight?: boolean;
  alert?: boolean;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-amber-400' : 'text-indigo-400';

  return (
    <button
      onClick={onClick}
      className={`
        p-3 rounded-xl text-left transition-all duration-200
        ${highlight
          ? 'bg-emerald-500/10 border border-emerald-500/30 hover:border-emerald-500/50'
          : alert
            ? 'bg-red-500/10 border border-red-500/30 hover:border-red-500/50'
            : 'bg-indigo-950/50 border border-indigo-500/20 hover:border-indigo-500/40'
        }
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-indigo-400">{label}</span>
        {trend && <TrendIcon className={`w-3 h-3 ${trendColor}`} />}
      </div>
      <div className={`text-lg font-bold ${highlight ? 'text-emerald-400' : alert ? 'text-red-400' : 'text-white'}`}>
        {value}
      </div>
    </button>
  );
}

/**
 * Calculate overall match score
 */
function calculateOverallScore(
  semanticMatch?: SemanticMatchResult,
  recruiterSearch?: RecruiterSearchResult,
  coverage?: CoverageResult
): number {
  const scores: number[] = [];
  const weights: number[] = [];

  if (semanticMatch?.success) {
    scores.push(semanticMatch.score);
    weights.push(0.4); // 40% weight for semantic
  }

  if (recruiterSearch) {
    scores.push(recruiterSearch.score);
    weights.push(0.35); // 35% weight for recruiter search
  }

  if (coverage) {
    scores.push(coverage.score);
    weights.push(0.25); // 25% weight for keyword coverage
  }

  if (scores.length === 0) return 0;

  const totalWeight = weights.reduce((a, b) => a + b, 0);
  const weightedSum = scores.reduce((sum, score, i) => sum + score * weights[i], 0);

  return Math.round(weightedSum / totalWeight);
}

/**
 * Get match assessment based on score and risk
 */
function getMatchAssessment(score: number, risk?: 'low' | 'medium' | 'high'): {
  label: string;
  color: string;
  bgColor: string;
  icon: typeof Target;
} {
  if (risk === 'high') {
    return {
      label: 'At Risk',
      color: 'text-red-400',
      bgColor: 'bg-red-900/20 border-red-500/30',
      icon: AlertTriangle,
    };
  }

  if (score >= 80) {
    return {
      label: 'Excellent Match',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-900/20 border-emerald-500/30',
      icon: CheckCircle,
    };
  }

  if (score >= 65) {
    return {
      label: 'Strong Match',
      color: 'text-cyan-400',
      bgColor: 'bg-cyan-900/20 border-cyan-500/30',
      icon: Target,
    };
  }

  if (score >= 50) {
    return {
      label: 'Fair Match',
      color: 'text-amber-400',
      bgColor: 'bg-amber-900/20 border-amber-500/30',
      icon: Target,
    };
  }

  return {
    label: 'Needs Improvement',
    color: 'text-red-400',
    bgColor: 'bg-red-900/20 border-red-500/30',
    icon: AlertTriangle,
  };
}

/**
 * Get priority action for improvement
 */
function getPriorityAction(
  semanticMatch?: SemanticMatchResult,
  recruiterSearch?: RecruiterSearchResult,
  coverage?: CoverageResult,
  knockoutRisk?: KnockoutRiskResult,
  onScrollToSection?: (section: 'semantic' | 'recruiter' | 'keywords' | 'knockouts') => void
): { message: string; actionLabel: string; action: () => void } | null {
  // Check knockout risk first
  if (knockoutRisk?.risk === 'high') {
    return {
      message: 'Confirm eligibility requirements to reduce disqualification risk',
      actionLabel: 'Review',
      action: () => onScrollToSection?.('knockouts'),
    };
  }

  // Check missing critical keywords
  if (coverage && coverage.missingKeywords.length > 3) {
    return {
      message: `Add ${coverage.missingKeywords.length} missing keywords to boost match score`,
      actionLabel: 'View Keywords',
      action: () => onScrollToSection?.('keywords'),
    };
  }

  // Check semantic score
  if (semanticMatch?.success && semanticMatch.score < 70) {
    return {
      message: 'Review AI suggestions to improve conceptual alignment',
      actionLabel: 'View Tips',
      action: () => onScrollToSection?.('semantic'),
    };
  }

  // Check recruiter search score
  if (recruiterSearch && recruiterSearch.score < 60) {
    return {
      message: 'Improve keyword density for better recruiter visibility',
      actionLabel: 'Optimize',
      action: () => onScrollToSection?.('recruiter'),
    };
  }

  return null;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
