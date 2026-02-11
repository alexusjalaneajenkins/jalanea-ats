'use client';

import type { ReactNode } from 'react';
import { AlertTriangle, ClipboardCheck, Sparkles, Target, ArrowRight } from 'lucide-react';
import type { Finding } from '@/lib/analysis/findings';
import type { CoverageResult } from '@/lib/analysis/coverage';

interface ResultsActionPlanProps {
  findings: Finding[];
  coverage?: CoverageResult | null;
  hasJobDescription: boolean;
  hasAi: boolean;
  freeTierRemaining?: number | null;
  onViewFindings: () => void;
  onAddJobDescription: () => void;
  onGoToJobMatch: () => void;
  onOpenAi: () => void;
  onOpenAiSettings: () => void;
}

type PlanSeverity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_ORDER: Record<PlanSeverity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function ResultsActionPlan({
  findings,
  coverage,
  hasJobDescription,
  hasAi,
  freeTierRemaining,
  onViewFindings,
  onAddJobDescription,
  onGoToJobMatch,
  onOpenAi,
  onOpenAiSettings,
}: ResultsActionPlanProps) {
  const issues = findings.filter((f) => f.severity !== 'info');
  const blockers = issues.filter((f) => f.severity === 'critical' || f.severity === 'high');
  const prioritized = [...issues].sort((a, b) => {
    const aSeverity = a.severity as PlanSeverity;
    const bSeverity = b.severity as PlanSeverity;
    return (SEVERITY_ORDER[aSeverity] ?? 99) - (SEVERITY_ORDER[bSeverity] ?? 99);
  });
  const topFixes = prioritized.slice(0, 3);

  const coverageScore = coverage?.score ?? null;
  const missingKeywords = coverage?.missingKeywords?.length ?? 0;
  const hasCoverage = hasJobDescription && !!coverage;

  const demoLabel =
    freeTierRemaining !== null && freeTierRemaining !== undefined
      ? `${freeTierRemaining} demo left today`
      : 'Demo available';

  return (
    <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl border border-indigo-500/30 p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
        <div>
          <h2 className="text-lg font-bold text-white">Action Plan</h2>
          <p className="text-sm text-indigo-300">
            Focus on the highest-impact fixes first. This turns your scores into a clear to-do list.
          </p>
        </div>
        <button
          onClick={onViewFindings}
          className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
        >
          View findings
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ActionCard
          icon={<AlertTriangle className="w-5 h-5 text-amber-300" />}
          title={blockers.length > 0 ? 'Fix ATS blockers' : 'Structure looks solid'}
          badge={blockers.length > 0 ? `${blockers.length} blockers` : 'No critical issues'}
          description={
            blockers.length > 0
              ? 'Resolve these first to avoid parsing failures or auto-rejection.'
              : 'No major blockers detected. Keep this structure and move to matching.'
          }
          ctaLabel="Review issues"
          onCta={onViewFindings}
        />

        <ActionCard
          icon={<Target className="w-5 h-5 text-cyan-300" />}
          title={hasCoverage ? 'Align to the job' : 'Add a job description'}
          badge={
            hasCoverage && coverageScore !== null
              ? `${coverageScore}% match`
              : 'Unlock match score'
          }
          description={
            hasCoverage
              ? `${missingKeywords} missing keyword${missingKeywords === 1 ? '' : 's'} to consider.`
              : 'Paste a job description to see keyword gaps and disqualifiers.'
          }
          ctaLabel={hasCoverage ? 'Go to job match' : 'Add job description'}
          onCta={hasCoverage ? onGoToJobMatch : onAddJobDescription}
        />

        <ActionCard
          icon={<Sparkles className="w-5 h-5 text-emerald-300" />}
          title={hasAi ? 'Improve bullet points' : 'Enable AI tools'}
          badge={hasAi ? 'Ready to use' : demoLabel}
          description={
            hasAi
              ? 'Use AI suggestions to rewrite bullets and add missing keywords.'
              : 'Use the free demo (3/day) or add your Gemini key for unlimited AI tools.'
          }
          ctaLabel={hasAi ? 'Open AI tools' : 'AI settings'}
          onCta={hasAi ? onOpenAi : onOpenAiSettings}
        />
      </div>

      <div className="mt-5 rounded-xl border border-indigo-500/20 bg-indigo-950/60 p-4">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardCheck className="w-4 h-4 text-indigo-300" />
          <h3 className="text-sm font-bold text-white">Top fixes to tackle now</h3>
        </div>

        {topFixes.length === 0 ? (
          <p className="text-sm text-indigo-300">
            No major issues found. You can move straight to job matching and fine-tuning.
          </p>
        ) : (
          <div className="space-y-3">
            {topFixes.map((finding) => (
              <div
                key={finding.id}
                className="flex items-start gap-3 p-3 rounded-xl bg-indigo-900/40 border border-indigo-500/20"
              >
                <div className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.6)]" />
                <div>
                  <p className="text-sm font-semibold text-white">{finding.title}</p>
                  <p className="text-xs text-indigo-300 mt-1">
                    {finding.suggestion || finding.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionCard({
  icon,
  title,
  badge,
  description,
  ctaLabel,
  onCta,
}: {
  icon: ReactNode;
  title: string;
  badge: string;
  description: string;
  ctaLabel: string;
  onCta: () => void;
}) {
  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/70 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center">
            {icon}
          </div>
          <div>
            <p className="text-sm font-bold text-white">{title}</p>
            <span className="text-xs text-indigo-400">{badge}</span>
          </div>
        </div>
      </div>
      <p className="text-xs text-indigo-300">{description}</p>
      <button
        onClick={onCta}
        className="mt-auto inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-orange-500 to-pink-500 hover:opacity-90 transition-opacity"
      >
        {ctaLabel}
        <ArrowRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default ResultsActionPlan;
