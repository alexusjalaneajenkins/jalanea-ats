'use client';

import { useState } from 'react';
import {
  Sparkles,
  Target,
  Briefcase,
  Building2,
  Users,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { SemanticMatchResult, getSemanticMatchLabel } from '@/lib/analysis';

interface SemanticMatchPanelProps {
  result: SemanticMatchResult;
}

type AnalysisTab = 'strengths' | 'gaps' | 'recommendations';

/**
 * Semantic Match Panel - Redesigned for better scannability
 *
 * Shows AI analysis in a compact, visual format:
 * - Visual sub-score bars shown by default
 * - Tabbed sections for Strengths/Gaps/Recommendations
 * - Quick verdict instead of dense paragraph
 */
export function SemanticMatchPanel({ result }: SemanticMatchPanelProps) {
  const [activeTab, setActiveTab] = useState<AnalysisTab>('strengths');
  const [showDetails, setShowDetails] = useState(false);
  const { score, subScores, analysis } = result;

  // Calculate quick verdict
  const strengthCount = analysis.strengths.length;
  const gapCount = analysis.gaps.length;
  const verdict = getVerdict(score, strengthCount, gapCount);

  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 overflow-hidden">
      {/* Header with Score */}
      <div className="px-5 py-4 border-b border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Semantic Match Score
              </h3>
              <p className="text-xs text-indigo-300">
                AI-powered conceptual alignment
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-black ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="text-xs text-indigo-400">
              {getSemanticMatchLabel(score)}
            </div>
          </div>
        </div>
      </div>

      {/* Visual Sub-Scores - Always visible */}
      <div className="px-5 py-4 border-b border-indigo-500/20">
        <div className="grid grid-cols-2 gap-3">
          <CompactScoreBar
            icon={<Target className="w-3.5 h-3.5" />}
            label="Skills"
            score={subScores.skillsMatch.score}
          />
          <CompactScoreBar
            icon={<Briefcase className="w-3.5 h-3.5" />}
            label="Experience"
            score={subScores.experienceFit.score}
          />
          <CompactScoreBar
            icon={<Building2 className="w-3.5 h-3.5" />}
            label="Domain"
            score={subScores.domainRelevance.score}
          />
          <CompactScoreBar
            icon={<Users className="w-3.5 h-3.5" />}
            label="Role Fit"
            score={subScores.roleAlignment.score}
          />
        </div>
      </div>

      {/* Quick Verdict */}
      <div className="px-5 py-3 border-b border-indigo-500/20 bg-indigo-950/30">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${verdict.bgColor}`}>
            {verdict.icon}
          </div>
          <div className="flex-1">
            <p className={`text-sm font-semibold ${verdict.textColor}`}>{verdict.title}</p>
            <p className="text-xs text-indigo-400">{verdict.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Tabbed Analysis */}
      <div className="border-b border-indigo-500/20">
        {/* Tab Headers */}
        <div className="flex border-b border-indigo-500/20">
          <TabButton
            active={activeTab === 'strengths'}
            onClick={() => setActiveTab('strengths')}
            icon={<CheckCircle2 className="w-3.5 h-3.5" />}
            label="Strengths"
            count={strengthCount}
            color="emerald"
          />
          <TabButton
            active={activeTab === 'gaps'}
            onClick={() => setActiveTab('gaps')}
            icon={<AlertCircle className="w-3.5 h-3.5" />}
            label="Gaps"
            count={gapCount}
            color="amber"
          />
          <TabButton
            active={activeTab === 'recommendations'}
            onClick={() => setActiveTab('recommendations')}
            icon={<Lightbulb className="w-3.5 h-3.5" />}
            label="Tips"
            count={analysis.recommendations.length}
            color="cyan"
          />
        </div>

        {/* Tab Content */}
        <div className="px-5 py-4 min-h-[120px]">
          {activeTab === 'strengths' && (
            <ul className="space-y-2">
              {analysis.strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-indigo-200">{strength}</span>
                </li>
              ))}
              {analysis.strengths.length === 0 && (
                <p className="text-sm text-indigo-400 italic">No specific strengths identified</p>
              )}
            </ul>
          )}

          {activeTab === 'gaps' && (
            <ul className="space-y-2">
              {analysis.gaps.map((gap, index) => (
                <li key={index} className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-indigo-200">{gap}</span>
                </li>
              ))}
              {analysis.gaps.length === 0 && (
                <p className="text-sm text-indigo-400 italic">No significant gaps detected</p>
              )}
            </ul>
          )}

          {activeTab === 'recommendations' && (
            <ul className="space-y-2">
              {analysis.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-sm text-indigo-200">{rec}</span>
                </li>
              ))}
              {analysis.recommendations.length === 0 && (
                <p className="text-sm text-indigo-400 italic">No recommendations at this time</p>
              )}
            </ul>
          )}
        </div>
      </div>

      {/* Expandable Full Summary */}
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-indigo-900/30 transition-colors text-left"
      >
        <span className="text-xs text-indigo-400">Full AI Summary</span>
        {showDetails ? (
          <ChevronUp className="w-4 h-4 text-indigo-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-indigo-400" />
        )}
      </button>
      {showDetails && (
        <div className="px-5 pb-4">
          <p className="text-sm text-indigo-300 leading-relaxed">{analysis.summary}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact score bar for visual sub-scores
 */
function CompactScoreBar({
  icon,
  label,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-indigo-400">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-indigo-300 truncate">{label}</span>
          <span className={`text-xs font-bold ${getScoreColor(score)}`}>{Math.round(score)}</span>
        </div>
        <div className="h-1.5 bg-indigo-950/50 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${score}%`,
              backgroundColor: getScoreHex(score),
            }}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Tab button component
 */
function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
  color,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
  color: 'emerald' | 'amber' | 'cyan';
}) {
  const colorClasses = {
    emerald: active ? 'text-emerald-400 border-emerald-400' : 'text-indigo-400 border-transparent hover:text-emerald-300',
    amber: active ? 'text-amber-400 border-amber-400' : 'text-indigo-400 border-transparent hover:text-amber-300',
    cyan: active ? 'text-cyan-400 border-cyan-400' : 'text-indigo-400 border-transparent hover:text-cyan-300',
  };

  return (
    <button
      onClick={onClick}
      className={`flex-1 px-3 py-2.5 flex items-center justify-center gap-1.5 border-b-2 transition-colors ${colorClasses[color]}`}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
      <span className={`text-xs px-1.5 py-0.5 rounded-full ${active ? `bg-${color}-500/20` : 'bg-indigo-800/50'}`}>
        {count}
      </span>
    </button>
  );
}

/**
 * Get verdict based on score and analysis
 */
function getVerdict(score: number, strengths: number, gaps: number): {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
} {
  if (score >= 80) {
    return {
      title: 'Excellent Fit',
      subtitle: `${strengths} strengths align with role requirements`,
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      bgColor: 'bg-emerald-500/20',
      textColor: 'text-emerald-400',
    };
  }
  if (score >= 65) {
    return {
      title: 'Strong Candidate',
      subtitle: gaps > 0 ? `${gaps} areas to address` : 'Good overall alignment',
      icon: <TrendingUp className="w-4 h-4 text-cyan-400" />,
      bgColor: 'bg-cyan-500/20',
      textColor: 'text-cyan-400',
    };
  }
  if (score >= 50) {
    return {
      title: 'Moderate Match',
      subtitle: `${gaps} gaps may need attention`,
      icon: <AlertCircle className="w-4 h-4 text-amber-400" />,
      bgColor: 'bg-amber-500/20',
      textColor: 'text-amber-400',
    };
  }
  return {
    title: 'Significant Gaps',
    subtitle: `${gaps} areas require improvement`,
    icon: <TrendingDown className="w-4 h-4 text-red-400" />,
    bgColor: 'bg-red-500/20',
    textColor: 'text-red-400',
  };
}

/**
 * Sub-score row component
 */
function SubScoreRow({
  icon,
  label,
  score,
  weight,
  explanation,
  highlights,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
  weight: number;
  explanation: string;
  highlights: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  const weightPercent = Math.round(weight * 100);

  return (
    <div className="space-y-2">
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 text-indigo-300">
          {icon}
          <span className="text-sm">{label}</span>
          <span className="text-xs text-indigo-500">({weightPercent}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${getScoreColor(score)}`}>
            {Math.round(score)}
          </span>
          {highlights.length > 0 && (
            expanded ? (
              <ChevronUp className="w-3 h-3 text-indigo-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-indigo-500" />
            )
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-indigo-950/50 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${score}%`,
            backgroundColor: getScoreHex(score),
            boxShadow: `0 0 8px ${getScoreHex(score)}60`,
          }}
        />
      </div>

      {/* Explanation */}
      <p className="text-xs text-indigo-500">{explanation}</p>

      {/* Highlights (expandable) */}
      {expanded && highlights.length > 0 && (
        <div className="mt-2 pl-6 space-y-1">
          {highlights.map((highlight, index) => (
            <p key={index} className="text-xs text-indigo-400">
              • {highlight}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Get color class based on score
 */
function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-400';
  if (score >= 65) return 'text-cyan-400';
  if (score >= 50) return 'text-blue-400';
  if (score >= 35) return 'text-amber-400';
  return 'text-red-400';
}

/**
 * Get hex color based on score
 */
function getScoreHex(score: number): string {
  if (score >= 80) return '#34d399';
  if (score >= 65) return '#22d3ee';
  if (score >= 50) return '#3b82f6';
  if (score >= 35) return '#fbbf24';
  return '#f87171';
}
