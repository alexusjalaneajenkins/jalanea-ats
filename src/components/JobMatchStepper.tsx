'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Brain,
  BriefcaseBusiness,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  Copy,
  Download,
  FileSearch,
  History,
  Lightbulb,
  Loader2,
  Lock,
  PenSquare,
  Radar,
  RefreshCcw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react';
import type {
  CoverageResult,
  EnhancedKnockoutItem,
  KnockoutRiskResult,
  RecruiterSearchResult,
  SemanticMatchResult,
} from '@/lib/analysis';
import {
  downloadTargetedDraftAsJSON,
  downloadTargetedDraftAsMarkdown,
  downloadTargetedDraftAsText,
} from '@/lib/export/report';
import type { GeminiModel, LlmConfig } from '@/lib/llm/types';
import { buildTargetingArtifact } from '@/lib/targeting/workflow';
import type {
  IterationSnapshot,
  MatchEvidence,
  TailoringSuggestion,
  TargetingArtifact,
} from '@/lib/types/targeting';
import type { KnockoutItem } from '@/lib/types/session';
import type { FreeTierAnalysisResult, FreeTierStatus } from '@/hooks/useFreeTier';
import { AiFeaturesPanel } from './AiFeaturesPanel';
import { JobMatchSummary } from './JobMatchSummary';
import { KeywordCoveragePanel } from './KeywordCoveragePanel';
import { KnockoutChecklist } from './KnockoutChecklist';
import { RecruiterSearchPanel } from './RecruiterSearchPanel';
import { ResumeImprover, type BulletChange } from './ResumeImprover';
import { SemanticMatchPanel } from './SemanticMatchPanel';

interface Step {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  icon: LucideIcon;
}

const STEPS: Step[] = [
  {
    id: 'job-input',
    label: 'Job Input',
    shortLabel: 'Job',
    description: 'Anchor the target role before you tailor anything.',
    icon: BriefcaseBusiness,
  },
  {
    id: 'role-breakdown',
    label: 'Role Breakdown',
    shortLabel: 'Role',
    description: 'Turn the posting into responsibilities, proof areas, and tools.',
    icon: ClipboardList,
  },
  {
    id: 'employer-intent',
    label: 'Employer Intent',
    shortLabel: 'Intent',
    description: 'Figure out what problem the employer is really trying to solve.',
    icon: Building2,
  },
  {
    id: 'match-analysis',
    label: 'Match Analysis',
    shortLabel: 'Match',
    description: 'Compare the job against the resume with proof-based guidance.',
    icon: Target,
  },
  {
    id: 'research-assistant',
    label: 'Research Assistant',
    shortLabel: 'Research',
    description: 'Collect the missing context before you change the resume.',
    icon: Search,
  },
  {
    id: 'tailoring-workspace',
    label: 'Resume Tailoring Workspace',
    shortLabel: 'Tailor',
    description: 'Rewrite only what you can defend with real proof.',
    icon: PenSquare,
  },
  {
    id: 'ats-review',
    label: 'ATS Review',
    shortLabel: 'ATS',
    description: 'Validate keyword fit, recruiter visibility, and blocker risk.',
    icon: ShieldCheck,
  },
  {
    id: 'final-output',
    label: 'Final Output',
    shortLabel: 'Output',
    description: 'Save the targeted version you want to use for this role.',
    icon: FileSearch,
  },
  {
    id: 'iteration-history',
    label: 'Iteration History',
    shortLabel: 'History',
    description: 'Keep version history so you can revisit targeted drafts later.',
    icon: History,
  },
];

const MATCH_ANALYSIS_INDEX = STEPS.findIndex((step) => step.id === 'match-analysis');
const ATS_REVIEW_INDEX = STEPS.findIndex((step) => step.id === 'ats-review');
const FINAL_OUTPUT_INDEX = STEPS.findIndex((step) => step.id === 'final-output');

interface JobMatchStepperProps {
  semanticMatch?: SemanticMatchResult;
  recruiterSearch?: RecruiterSearchResult;
  coverage: CoverageResult;
  knockoutRisk?: KnockoutRiskResult;
  knockouts: (KnockoutItem | EnhancedKnockoutItem)[];
  keywords: { critical: string[]; optional: string[] } | null;
  llmConfig: LlmConfig | null;
  geminiModel?: GeminiModel;
  resumeFileName: string;
  resumeText: string;
  jobDescriptionText: string;
  onKnockoutChange: (id: string, confirmed: boolean | undefined) => void;
  onConfigureClick: () => void;
  onConsentClick: () => void;
  isAnalyzingSemantic?: boolean;
  freeTierStatus?: FreeTierStatus | null;
  freeTierLoading?: boolean;
  freeTierResult?: FreeTierAnalysisResult | null;
  isFreeTierAnalyzing?: boolean;
  freeTierError?: string | null;
  onFreeTierAnalyze?: () => void;
  initialTargeting?: TargetingArtifact | null;
  onTargetingArtifactChange?: (artifact: TargetingArtifact) => void;
}

export function JobMatchStepper({
  semanticMatch,
  recruiterSearch,
  coverage,
  knockoutRisk,
  knockouts,
  keywords,
  llmConfig,
  geminiModel,
  resumeFileName,
  resumeText,
  jobDescriptionText,
  onKnockoutChange,
  onConfigureClick,
  onConsentClick,
  isAnalyzingSemantic,
  freeTierStatus,
  freeTierLoading,
  freeTierResult,
  isFreeTierAnalyzing,
  freeTierError,
  onFreeTierAnalyze,
  initialTargeting,
  onTargetingArtifactChange,
}: JobMatchStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [workingDraft, setWorkingDraft] = useState(initialTargeting?.tailoredDraft.draftText || resumeText);
  const [draftChanges, setDraftChanges] = useState<BulletChange[]>([]);
  const [finalDraftText, setFinalDraftText] = useState(initialTargeting?.tailoredDraft.draftText || resumeText);
  const [iterationHistory, setIterationHistory] = useState<IterationSnapshot[]>(
    initialTargeting?.iterationHistory || []
  );

  const aiAnalysis = useMemo(() => {
    if (semanticMatch?.success) {
      return {
        score: semanticMatch.score,
        summary: semanticMatch.analysis.summary,
        strengths: semanticMatch.analysis.strengths,
        gaps: semanticMatch.analysis.gaps,
        recommendations: semanticMatch.analysis.recommendations,
      };
    }

    if (freeTierResult) {
      return {
        score: freeTierResult.score,
        summary: freeTierResult.summary,
        strengths: freeTierResult.strengths,
        gaps: freeTierResult.gaps,
        recommendations:
          freeTierResult.recommendations.length > 0
            ? freeTierResult.recommendations
            : freeTierResult.overallSuggestions,
      };
    }

    return null;
  }, [freeTierResult, semanticMatch]);

  const targetingArtifact = useMemo(() => {
    const baseArtifact = buildTargetingArtifact({
      resumeText,
      jobDescriptionText,
      coverage,
      recruiterSearch,
      semanticMatch,
      knockoutRisk,
      aiAnalysis,
    });

    return {
      ...baseArtifact,
      tailoredDraft: {
        ...baseArtifact.tailoredDraft,
        draftText: finalDraftText,
      },
      iterationHistory,
    };
  }, [
    resumeText,
    jobDescriptionText,
    coverage,
    recruiterSearch,
    semanticMatch,
    knockoutRisk,
    aiAnalysis,
    finalDraftText,
    iterationHistory,
  ]);

  const hasAiAccess = Boolean(llmConfig?.apiKey && llmConfig?.hasConsented) || Boolean(freeTierStatus?.enabled);
  const currentStep = STEPS[currentStepIndex];
  const CurrentStepIcon = currentStep.icon;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const storageKey = useMemo(
    () => `jalanea-targeting-history:${simpleHash(`${resumeText.slice(0, 300)}::${jobDescriptionText.slice(0, 300)}`)}`,
    [resumeText, jobDescriptionText]
  );

  useEffect(() => {
    const hydratedDraft = initialTargeting?.tailoredDraft.draftText || resumeText;
    setWorkingDraft(hydratedDraft);
    setFinalDraftText(hydratedDraft);
    setDraftChanges([]);
  }, [initialTargeting?.tailoredDraft.draftText, resumeText, jobDescriptionText]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setIterationHistory(initialTargeting?.iterationHistory || []);
        return;
      }

      const parsed = JSON.parse(raw) as IterationSnapshot[];
      setIterationHistory(Array.isArray(parsed) ? parsed : []);
    } catch {
      setIterationHistory(initialTargeting?.iterationHistory || []);
    }
  }, [initialTargeting?.iterationHistory, storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(iterationHistory));
    } catch {
      // Ignore storage failures and keep the in-memory history available.
    }
  }, [iterationHistory, storageKey]);

  useEffect(() => {
    setFinalDraftText(workingDraft);
  }, [workingDraft]);

  useEffect(() => {
    onTargetingArtifactChange?.(targetingArtifact);
  }, [onTargetingArtifactChange, targetingArtifact]);

  useEffect(() => {
    if (isFreeTierAnalyzing || isAnalyzingSemantic || semanticMatch?.success || freeTierResult || freeTierError) {
      setCurrentStepIndex((prev) => Math.max(prev, MATCH_ANALYSIS_INDEX));
      setVisitedSteps((prev) => new Set([...prev, MATCH_ANALYSIS_INDEX]));
    }
  }, [freeTierError, freeTierResult, isAnalyzingSemantic, isFreeTierAnalyzing, semanticMatch?.success]);

  const goToStep = useCallback((index: number) => {
    setCurrentStepIndex(index);
    setVisitedSteps((prev) => new Set([...prev, index]));
  }, []);

  const goNext = useCallback(() => {
    if (!isLastStep) {
      goToStep(currentStepIndex + 1);
    }
  }, [currentStepIndex, goToStep, isLastStep]);

  const goPrev = useCallback(() => {
    if (!isFirstStep) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep, isFirstStep]);

  const copyText = useCallback(async (value: string, id: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedId(id);
    window.setTimeout(() => {
      setCopiedId((current) => (current === id ? null : current));
    }, 1800);
  }, []);

  const saveCurrentIteration = useCallback(() => {
    const snapshot: IterationSnapshot = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      label: `Targeted draft v${iterationHistory.length + 1}`,
      notes: targetingArtifact.tailoredDraft.focusAreas.slice(0, 3),
      draftText: finalDraftText,
      proofGuardrail: targetingArtifact.tailoredDraft.proofReminder,
      changeSummary:
        draftChanges.length > 0
          ? draftChanges
              .slice(-5)
              .map(
                (change) =>
                  `Line ${change.lineIndex + 1}: rewritten to better support the target role with a real proof point.`
              )
          : targetingArtifact.tailoredDraft.suggestions
              .slice(0, 4)
              .map((suggestion) => suggestion.instruction),
    };

    setIterationHistory((prev) => [snapshot, ...prev].slice(0, 12));
    goToStep(STEPS.length - 1);
  }, [draftChanges, finalDraftText, goToStep, iterationHistory.length, targetingArtifact]);

  const useSnapshotAsFinal = useCallback(
    (snapshot: IterationSnapshot) => {
      setFinalDraftText(snapshot.draftText);
      goToStep(FINAL_OUTPUT_INDEX);
    },
    [goToStep]
  );

  const deleteSnapshot = useCallback((snapshotId: string) => {
    setIterationHistory((prev) => prev.filter((snapshot) => snapshot.id !== snapshotId));
  }, []);

  const handleDraftChange = useCallback((payload: { draftText: string; changes: BulletChange[] }) => {
    setWorkingDraft(payload.draftText);
    setDraftChanges(payload.changes);
  }, []);

  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'job-input':
        return (
          <WizardSection
            eyebrow="Target Role"
            title={targetingArtifact.parsedJobData.titleHint || 'Targeted job description'}
            description="This is the source we are tailoring against. If the role changes, update the job description before you rewrite the resume."
            icon={BriefcaseBusiness}
          >
            <div className="grid gap-3 md:grid-cols-4">
              <InfoCard label="Company" value={targetingArtifact.parsedJobData.companyHint || 'Not clearly stated'} />
              <InfoCard label="Seniority" value={targetingArtifact.parsedJobData.seniorityHint || 'Not detected'} />
              <InfoCard label="Location" value={targetingArtifact.parsedJobData.locationHint || 'Not specified'} />
              <InfoCard label="Keyword coverage" value={`${coverage.score}%`} />
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-4">
              <p className="text-sm leading-7 text-indigo-100">{targetingArtifact.parsedJobData.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-indigo-300">
                {targetingArtifact.parsedJobData.toolsAndPlatforms.slice(0, 6).map((tool) => (
                  <span key={tool} className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
              Use the job description panel on the page to swap in a different role. This wizard assumes the job text above is the one you want to target.
            </div>
          </WizardSection>
        );

      case 'role-breakdown':
        return (
          <WizardSection
            eyebrow="What the job actually asks for"
            title="Role Breakdown"
            description="We translated the posting into concrete responsibilities, proof areas, and tools so you can tailor against something specific."
            icon={ClipboardList}
          >
            <ThreeColumnList
              columns={[
                {
                  title: 'Day-to-day focus',
                  items: targetingArtifact.roleBreakdown.dayToDayFocus,
                  accent: 'cyan',
                },
                {
                  title: 'Proof the employer wants',
                  items: targetingArtifact.roleBreakdown.proofAreas,
                  accent: 'amber',
                },
                {
                  title: 'Tools and platforms',
                  items: targetingArtifact.roleBreakdown.toolStack,
                  accent: 'emerald',
                },
              ]}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <DetailListCard title="Success measures" items={targetingArtifact.roleBreakdown.successMeasures} />
              <DetailListCard title="Hiring manager checklist" items={targetingArtifact.roleBreakdown.hiringManagerChecklist} />
            </div>
          </WizardSection>
        );

      case 'employer-intent':
        return (
          <WizardSection
            eyebrow="Why they are hiring"
            title="Employer Intent"
            description="This step turns the job post into the business problem you should echo in your resume language."
            icon={Building2}
          >
            <div className="rounded-2xl border border-pink-500/25 bg-pink-500/10 p-5">
              <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-pink-200">
                Primary need
              </div>
              <p className="text-base font-semibold text-white">{targetingArtifact.employerIntent.primaryNeed}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailListCard title="Why now" items={targetingArtifact.employerIntent.whyNow} />
              <DetailListCard title="Team context" items={targetingArtifact.employerIntent.teamContext} />
              <DetailListCard title="Pressure points" items={targetingArtifact.employerIntent.pressurePoints} />
              <DetailListCard title="Proof priorities" items={targetingArtifact.employerIntent.proofPriorities} />
            </div>
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-200">
                <AlertCircle className="h-4 w-4" />
                Guardrails
              </div>
              <ul className="space-y-2 text-sm text-red-100">
                {targetingArtifact.employerIntent.candidateWarnings.map((warning) => (
                  <li key={warning} className="flex gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-300" />
                    <span>{warning}</span>
                  </li>
                ))}
              </ul>
            </div>
          </WizardSection>
        );

      case 'match-analysis':
        return (
          <WizardSection
            eyebrow="Proof-based comparison"
            title="Match Analysis"
            description="This is where we compare the role against the resume and separate supported matches from risky claims."
            icon={Target}
          >
            <JobMatchSummary
              semanticMatch={semanticMatch}
              recruiterSearch={recruiterSearch}
              coverage={coverage}
              knockoutRisk={knockoutRisk}
              onScrollToSection={(section) => {
                if (section === 'semantic') {
                  goToStep(MATCH_ANALYSIS_INDEX);
                  return;
                }
                goToStep(ATS_REVIEW_INDEX);
              }}
            />
            {renderAiState({
              semanticMatch,
              freeTierResult,
              isAnalyzingSemantic,
              isFreeTierAnalyzing,
              freeTierError,
              freeTierLoading,
              hasAiAccess,
              onConfigureClick,
              onFreeTierAnalyze,
            })}
            <div className="grid gap-4 md:grid-cols-[1.2fr,0.8fr]">
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                  <Radar className="h-4 w-4 text-cyan-300" />
                  Overall assessment
                </div>
                <p className="text-sm leading-7 text-indigo-100">
                  {targetingArtifact.matchAnalysis.overallAssessment}
                </p>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <MiniListCard
                    title="Defensible wins"
                    items={targetingArtifact.matchAnalysis.defensibleWins}
                    tone="emerald"
                  />
                  <MiniListCard
                    title="Gaps to close"
                    items={targetingArtifact.matchAnalysis.gaps}
                    tone="amber"
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-red-500/20 bg-red-950/20 p-5">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-red-100">
                  <Lock className="h-4 w-4" />
                  Claims to avoid
                </div>
                <ul className="space-y-3 text-sm text-red-50/90">
                  {targetingArtifact.matchAnalysis.unsupportedClaimsToAvoid.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full bg-red-300" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-indigo-400">
                Proof map
              </div>
              <div className="grid gap-3">
                {targetingArtifact.matchAnalysis.proofMap.map((item) => (
                  <ProofMapCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </WizardSection>
        );

      case 'research-assistant':
        return (
          <WizardSection
            eyebrow="What to research before rewriting"
            title="Research Assistant"
            description="Use this step when the posting hints at something important but your resume does not prove it yet."
            icon={Search}
          >
            <div className="grid gap-4 lg:grid-cols-[1.1fr,0.9fr]">
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Lightbulb className="h-4 w-4 text-amber-300" />
                  Research checklist
                </div>
                <div className="space-y-3">
                  {targetingArtifact.researchAssistant.checklist.map((task) => (
                    <div key={task.id} className="rounded-xl border border-indigo-500/15 bg-slate-950/30 p-4">
                      <p className="text-sm font-semibold text-white">{task.question}</p>
                      <p className="mt-1 text-sm text-indigo-200">{task.whyItMatters}</p>
                      <div className="mt-3 grid gap-2 text-xs text-indigo-300 md:grid-cols-2">
                        <div>
                          <span className="font-semibold text-indigo-100">Where to look:</span>{' '}
                          {task.sourceHint}
                        </div>
                        <div>
                          <span className="font-semibold text-indigo-100">Capture:</span> {task.output}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5">
                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                    <Bot className="h-4 w-4 text-cyan-300" />
                    Quick prompts
                  </div>
                  <div className="space-y-3">
                    {targetingArtifact.researchAssistant.quickPrompts.map((prompt, index) => (
                      <button
                        key={prompt}
                        onClick={() => copyText(prompt, `prompt-${index}`)}
                        className="w-full rounded-xl border border-cyan-500/20 bg-slate-950/30 p-4 text-left transition hover:border-cyan-400/40 hover:bg-cyan-500/10"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
                            Prompt {index + 1}
                          </span>
                          <CopyState copied={copiedId === `prompt-${index}`} />
                        </div>
                        <p className="text-sm text-indigo-100">{prompt}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <DetailListCard
                  title="Resume proof requests"
                  items={targetingArtifact.researchAssistant.resumeProofRequests}
                />
              </div>
            </div>
          </WizardSection>
        );

      case 'tailoring-workspace':
        return (
          <WizardSection
            eyebrow="Tailor the resume"
            title="Resume Tailoring Workspace"
            description="Start with proof-based suggestions, then use the resume improver to rewrite bullets for this role."
            icon={PenSquare}
          >
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-50">
              <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Ground rule
              </div>
              {targetingArtifact.tailoredDraft.proofReminder}
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {targetingArtifact.tailoredDraft.suggestions.map((suggestion) => (
                <TailoringSuggestionCard key={suggestion.id} suggestion={suggestion} />
              ))}
            </div>
            <ResumeImprover
              resumeText={resumeText}
              jobDescription={jobDescriptionText}
              missingKeywords={coverage.missingKeywords}
              analysisGaps={targetingArtifact.matchAnalysis.gaps}
              analysisRecommendations={targetingArtifact.tailoredDraft.suggestions.map((suggestion) => suggestion.instruction)}
              isAiAvailable={hasAiAccess}
              geminiModel={geminiModel}
              onConfigureClick={onConfigureClick}
              onDraftChange={handleDraftChange}
            />
            <AiFeaturesPanel
              config={llmConfig}
              resumeText={resumeText}
              jobDescriptionText={jobDescriptionText}
              criticalKeywords={keywords?.critical || []}
              optionalKeywords={keywords?.optional || []}
              matchedKeywords={coverage.foundKeywords}
              missingKeywords={coverage.missingKeywords}
              onConfigureClick={onConfigureClick}
              onConsentClick={onConsentClick}
            />
          </WizardSection>
        );

      case 'ats-review':
        return (
          <WizardSection
            eyebrow="Validation pass"
            title="ATS Review"
            description="Use this as the last technical gut-check before you save a targeted version."
            icon={ShieldCheck}
          >
            <div className="grid gap-4 md:grid-cols-4">
              <InfoCard label="Readiness" value={formatReadiness(targetingArtifact.atsReview.readiness)} highlight="emerald" />
              <InfoCard label="Parse health" value={`${targetingArtifact.atsReview.parseHealth}%`} />
              <InfoCard label="Keyword coverage" value={`${targetingArtifact.atsReview.keywordCoverage}%`} />
              <InfoCard
                label="Recruiter search"
                value={
                  targetingArtifact.atsReview.recruiterSearch
                    ? `${targetingArtifact.atsReview.recruiterSearch}%`
                    : 'Pending'
                }
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <DetailListCard title="ATS checklist" items={targetingArtifact.atsReview.checklist} />
              <DetailListCard
                title="Blockers to clear"
                items={
                  targetingArtifact.atsReview.blockers.length > 0
                    ? targetingArtifact.atsReview.blockers
                    : ['No blockers are currently flagged.']
                }
              />
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
              <p className="text-sm leading-7 text-indigo-100">{targetingArtifact.atsReview.recommendation}</p>
            </div>
            <KeywordCoveragePanel coverage={coverage} />
            {recruiterSearch ? <RecruiterSearchPanel result={recruiterSearch} /> : null}
            <KnockoutChecklist
              knockouts={knockouts}
              onKnockoutChange={onKnockoutChange}
              riskLevel={knockoutRisk?.risk || 'low'}
              riskExplanation={knockoutRisk?.explanation || 'No disqualifier requirements detected.'}
            />
          </WizardSection>
        );

      case 'final-output':
        return (
          <WizardSection
            eyebrow="Save the targeted version"
            title="Final Output"
            description="This is the role-specific draft you can export, copy, or save into iteration history."
            icon={FileSearch}
          >
            <div className="grid gap-4 md:grid-cols-[1fr,0.95fr]">
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                      Target summary
                    </p>
                    <h3 className="text-lg font-semibold text-white">
                      {targetingArtifact.tailoredDraft.summaryLine}
                    </h3>
                  </div>
                  <button
                    onClick={() => copyText(finalDraftText, 'final-draft')}
                    className="rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-3 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
                  >
                    {copiedId === 'final-draft' ? 'Copied' : 'Copy draft'}
                  </button>
                </div>
                <textarea
                  value={finalDraftText}
                  onChange={(event) => setFinalDraftText(event.target.value)}
                  className="min-h-[360px] w-full rounded-2xl border border-indigo-500/20 bg-slate-950/40 p-4 font-mono text-sm leading-6 text-indigo-100 outline-none transition focus:border-cyan-400/40"
                  spellCheck={false}
                />
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    onClick={() =>
                      downloadTargetedDraftAsText({
                        resumeFileName,
                        artifact: targetingArtifact,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
                  >
                    <Download className="h-4 w-4" />
                    Export TXT
                  </button>
                  <button
                    onClick={() =>
                      downloadTargetedDraftAsMarkdown({
                        resumeFileName,
                        artifact: targetingArtifact,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
                  >
                    <Download className="h-4 w-4" />
                    Export Markdown
                  </button>
                  <button
                    onClick={() =>
                      downloadTargetedDraftAsJSON({
                        resumeFileName,
                        artifact: targetingArtifact,
                      })
                    }
                    className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
                  >
                    <Download className="h-4 w-4" />
                    Export JSON
                  </button>
                  <button
                    onClick={saveCurrentIteration}
                    className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
                  >
                    <Save className="h-4 w-4" />
                    Save to iteration history
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                <DetailListCard title="Focus areas" items={targetingArtifact.tailoredDraft.focusAreas} />
                <DetailListCard
                  title="Why this version is safer"
                  items={[
                    'It is built around explicit proof areas from the job post.',
                    'It avoids unsupported claims and keyword stuffing.',
                    'It keeps the wording ATS-friendly while staying truthful.',
                  ]}
                />
                <div className="rounded-2xl border border-cyan-500/20 bg-cyan-950/20 p-5 text-sm text-cyan-50">
                  <div className="mb-2 flex items-center gap-2 font-semibold text-cyan-200">
                    <Sparkles className="h-4 w-4" />
                    Final reminder
                  </div>
                  {targetingArtifact.tailoredDraft.proofReminder}
                </div>
              </div>
            </div>
          </WizardSection>
        );

      case 'iteration-history':
        return (
          <WizardSection
            eyebrow="Reusable versions"
            title="Iteration History"
            description="Save targeted versions for different applications so you can come back later without starting from scratch."
            icon={History}
          >
            {iterationHistory.length === 0 ? (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-8 text-center">
                <History className="mx-auto mb-3 h-10 w-10 text-indigo-400" />
                <h3 className="text-lg font-semibold text-white">No saved targeted drafts yet</h3>
                <p className="mt-2 text-sm text-indigo-300">
                  Save a version from Final Output once you have a draft you want to reuse for this role.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {iterationHistory.map((snapshot) => (
                  <div key={snapshot.id} className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-white">{snapshot.label}</h3>
                          <span className="rounded-full border border-indigo-500/20 bg-indigo-900/50 px-3 py-1 text-xs text-indigo-300">
                            {formatTimestamp(snapshot.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-indigo-200">{snapshot.proofGuardrail}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {snapshot.notes.map((note) => (
                            <span
                              key={note}
                              className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-200"
                            >
                              {note}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                          onClick={() => useSnapshotAsFinal(snapshot)}
                          className="rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-3 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
                        >
                          Use as final draft
                        </button>
                        <button
                          onClick={() => copyText(snapshot.draftText, snapshot.id)}
                          className="rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-3 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
                        >
                          {copiedId === snapshot.id ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={() => deleteSnapshot(snapshot.id)}
                          className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:border-red-400/40 hover:bg-red-500/20"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr,1.1fr]">
                      <DetailListCard title="Change summary" items={snapshot.changeSummary} />
                      <div className="rounded-2xl border border-indigo-500/15 bg-slate-950/35 p-4">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
                          Draft preview
                        </div>
                        <pre className="max-h-56 overflow-auto whitespace-pre-wrap break-words text-xs leading-6 text-indigo-100">
                          {snapshot.draftText}
                        </pre>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WizardSection>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-indigo-500/20 bg-indigo-900/30 p-4 backdrop-blur-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-indigo-400">
              Guided targeting flow
            </div>
            <h2 className="text-lg font-semibold text-white">Tailor this resume for one job at a time</h2>
          </div>
          <div className="rounded-full border border-indigo-500/20 bg-indigo-950/50 px-3 py-1 text-xs text-indigo-200">
            Step {currentStepIndex + 1} of {STEPS.length}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:hidden">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStepIndex;
            const isCompleted = index < currentStepIndex;
            const isVisited = visitedSteps.has(index);

            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`rounded-2xl border px-2 py-3 text-center transition ${
                  isActive
                    ? 'border-orange-400/40 bg-gradient-to-r from-orange-500/15 to-pink-500/15'
                    : isVisited
                      ? 'border-indigo-500/20 bg-indigo-950/40 hover:border-indigo-400/30'
                      : 'border-indigo-500/10 bg-indigo-950/20 text-indigo-400 hover:border-indigo-400/20'
                }`}
              >
                <div
                  className={`mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-xl border ${
                    isActive
                      ? 'border-orange-400/40 bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : isCompleted
                        ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-indigo-500/20 bg-indigo-900/40 text-indigo-300'
                  }`}
                >
                  {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </div>
                <div className="text-xs font-semibold text-white">{step.shortLabel}</div>
              </button>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto pb-1 sm:block">
          <div className="flex min-w-max gap-2">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStepIndex;
              const isCompleted = index < currentStepIndex;
              const isVisited = visitedSteps.has(index);

              return (
                <button
                  key={step.id}
                  onClick={() => goToStep(index)}
                  className={`flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition ${
                    isActive
                      ? 'border-orange-400/40 bg-gradient-to-r from-orange-500/15 to-pink-500/15'
                      : isVisited
                        ? 'border-indigo-500/20 bg-indigo-950/40 hover:border-indigo-400/30'
                        : 'border-indigo-500/10 bg-indigo-950/20 text-indigo-400 hover:border-indigo-400/20'
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl border ${
                      isActive
                        ? 'border-orange-400/40 bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                        : isCompleted
                          ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                          : 'border-indigo-500/20 bg-indigo-900/40 text-indigo-300'
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{step.label}</div>
                    <div className="text-xs text-indigo-300">{step.shortLabel}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/30 bg-gradient-to-br from-orange-500/20 to-pink-500/20">
          <CurrentStepIcon className="h-5 w-5 text-orange-200" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-white">{currentStep.label}</h3>
          <p className="text-sm text-indigo-300 sm:hidden">
            Step {currentStepIndex + 1} of {STEPS.length}
          </p>
          <p className="hidden text-sm text-indigo-300 sm:block">{currentStep.description}</p>
        </div>
      </div>

      {renderStepContent()}

      <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={goPrev}
          disabled={isFirstStep}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
            isFirstStep
              ? 'cursor-not-allowed text-indigo-500'
              : 'border border-indigo-500/20 bg-indigo-900/40 text-indigo-100 hover:border-indigo-400/40 hover:bg-indigo-800/60'
          }`}
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        <div className="order-first text-center text-xs text-indigo-400 sm:order-none">
          <div>{currentStep.shortLabel}</div>
          <div>
            {currentStepIndex + 1} / {STEPS.length}
          </div>
        </div>

        <button
          onClick={goNext}
          disabled={isLastStep}
          className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
            isLastStep
              ? 'cursor-not-allowed text-indigo-500'
              : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90'
          }`}
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function renderAiState({
  semanticMatch,
  freeTierResult,
  isAnalyzingSemantic,
  isFreeTierAnalyzing,
  freeTierError,
  freeTierLoading,
  hasAiAccess,
  onConfigureClick,
  onFreeTierAnalyze,
}: {
  semanticMatch?: SemanticMatchResult;
  freeTierResult?: FreeTierAnalysisResult | null;
  isAnalyzingSemantic?: boolean;
  isFreeTierAnalyzing?: boolean;
  freeTierError?: string | null;
  freeTierLoading?: boolean;
  hasAiAccess: boolean;
  onConfigureClick: () => void;
  onFreeTierAnalyze?: () => void;
}) {
  if (isAnalyzingSemantic || isFreeTierAnalyzing) {
    return (
      <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-6 text-center">
        <Loader2 className="mx-auto mb-3 h-10 w-10 animate-spin text-cyan-300" />
        <h3 className="text-lg font-semibold text-white">Analyzing job match</h3>
        <p className="mt-2 text-sm text-cyan-100">
          We’re mapping the role against your resume and looking for defensible proof.
        </p>
      </div>
    );
  }

  if (semanticMatch?.success) {
    return <SemanticMatchPanel result={semanticMatch} />;
  }

  if (freeTierResult) {
    return (
      <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">
              AI analysis
            </div>
            <h3 className="text-lg font-semibold text-white">{freeTierResult.score}% demo assessment</h3>
          </div>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-100">
            Demo
          </span>
        </div>
        <p className="text-sm leading-7 text-emerald-50/95">{freeTierResult.summary}</p>
      </div>
    );
  }

  if (freeTierError) {
    return (
      <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-100">
          <AlertCircle className="h-4 w-4" />
          AI analysis failed
        </div>
        <p className="text-sm text-red-50/95">{freeTierError}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {onFreeTierAnalyze ? (
            <button
              onClick={onFreeTierAnalyze}
              className="inline-flex items-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 px-4 py-2 text-sm text-red-100 transition hover:bg-red-500/20"
            >
              <RefreshCcw className="h-4 w-4" />
              Try again
            </button>
          ) : null}
          <button
            onClick={onConfigureClick}
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
          >
            <Brain className="h-4 w-4" />
            AI settings
          </button>
        </div>
      </div>
    );
  }

  if (freeTierLoading) {
    return (
      <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-6 text-center text-sm text-indigo-200">
        Checking whether demo AI analysis is available for this session.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
        <Brain className="h-4 w-4 text-purple-300" />
        AI analysis optional
      </div>
      <p className="text-sm text-indigo-200">
        {hasAiAccess
          ? 'Your AI tools are available. Run analysis if you want a deeper read on role fit.'
          : 'You can still use the proof-based workflow now, then enable AI later for deeper semantic guidance.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        {onFreeTierAnalyze ? (
          <button
            onClick={onFreeTierAnalyze}
            className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 transition hover:border-cyan-400/40 hover:bg-cyan-500/20"
          >
            <Sparkles className="h-4 w-4" />
            Run AI analysis
          </button>
        ) : null}
        <button
          onClick={onConfigureClick}
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-500/20 bg-indigo-900/40 px-4 py-2 text-sm text-indigo-100 transition hover:border-indigo-400/40 hover:bg-indigo-800/60"
        >
          <Brain className="h-4 w-4" />
          AI settings
        </button>
      </div>
    </div>
  );
}

function WizardSection({
  eyebrow,
  title,
  description,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-indigo-500/20 bg-indigo-900/30 p-5 backdrop-blur-sm md:p-6">
      <div className="mb-5 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-950/50 text-cyan-200">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-400">
            {eyebrow}
          </div>
          <h4 className="mt-1 text-2xl font-semibold text-white">{title}</h4>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-indigo-200">{description}</p>
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

function InfoCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: 'emerald' | 'amber' | 'cyan';
}) {
  const accent =
    highlight === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
      : highlight === 'amber'
        ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
        : highlight === 'cyan'
          ? 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100'
          : 'border-indigo-500/20 bg-indigo-950/50 text-white';

  return (
    <div className={`rounded-2xl border p-4 ${accent}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">{label}</div>
      <div className="mt-2 text-base font-semibold">{value}</div>
    </div>
  );
}

function DetailListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
      <div className="mb-3 text-sm font-semibold text-white">{title}</div>
      <ul className="space-y-3 text-sm text-indigo-100">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
            <span className="leading-7">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ThreeColumnList({
  columns,
}: {
  columns: Array<{ title: string; items: string[]; accent: 'cyan' | 'amber' | 'emerald' }>;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map((column) => (
        <MiniListCard key={column.title} title={column.title} items={column.items} tone={column.accent} />
      ))}
    </div>
  );
}

function MiniListCard({
  title,
  items,
  tone = 'cyan',
}: {
  title: string;
  items: string[];
  tone?: 'cyan' | 'amber' | 'emerald';
}) {
  const accentClass =
    tone === 'amber'
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
      : tone === 'emerald'
        ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
        : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100';

  return (
    <div className={`rounded-2xl border p-5 ${accentClass}`}>
      <div className="mb-3 text-sm font-semibold text-white">{title}</div>
      <ul className="space-y-3 text-sm text-current/95">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-current" />
            <span className="leading-7">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProofMapCard({ item }: { item: MatchEvidence }) {
  const tone =
    item.status === 'proven'
      ? 'border-emerald-500/20 bg-emerald-500/10'
      : item.status === 'partial'
        ? 'border-amber-500/20 bg-amber-500/10'
        : item.status === 'research'
          ? 'border-cyan-500/20 bg-cyan-500/10'
          : 'border-red-500/20 bg-red-500/10';

  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-white">{item.requirement}</div>
          <p className="mt-1 text-sm text-indigo-100">{item.rationale}</p>
        </div>
        <StatusChip status={item.status} />
      </div>
      <div className="grid gap-4 md:grid-cols-[1fr,1fr]">
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
            Resume evidence
          </div>
          {item.resumeEvidence.length > 0 ? (
            <ul className="space-y-2 text-sm text-indigo-100">
              {item.resumeEvidence.map((evidence) => (
                <li key={evidence} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-cyan-300" />
                  <span className="leading-6">{evidence}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-indigo-300">No supporting line is clearly visible yet.</p>
          )}
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-indigo-400">
            Next move
          </div>
          <p className="text-sm leading-7 text-indigo-100">{item.nextMove}</p>
          <p className="mt-3 text-xs leading-6 text-indigo-300">Job evidence: {item.jdEvidence}</p>
        </div>
      </div>
    </div>
  );
}

function TailoringSuggestionCard({ suggestion }: { suggestion: TailoringSuggestion }) {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-indigo-950/50 p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-white">{suggestion.section}</div>
        <span className="rounded-full border border-indigo-500/20 bg-indigo-900/50 px-3 py-1 text-xs text-indigo-200">
          {suggestion.action}
        </span>
      </div>
      <p className="text-sm leading-7 text-indigo-100">{suggestion.instruction}</p>
      <div className="mt-4 space-y-2 text-sm text-indigo-300">
        <p>
          <span className="font-semibold text-indigo-100">Why:</span> {suggestion.rationale}
        </p>
        <p>
          <span className="font-semibold text-indigo-100">Safe example:</span> {suggestion.safeExample}
        </p>
      </div>
      <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs leading-6 text-amber-100">
        <span className="font-semibold">Guardrail:</span> {suggestion.guardrail}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: MatchEvidence['status'] }) {
  const content =
    status === 'proven'
      ? { label: 'Proven', className: 'border-emerald-500/25 bg-emerald-500/15 text-emerald-100' }
      : status === 'partial'
        ? { label: 'Partial', className: 'border-amber-500/25 bg-amber-500/15 text-amber-100' }
        : status === 'research'
          ? { label: 'Research', className: 'border-cyan-500/25 bg-cyan-500/15 text-cyan-100' }
          : { label: 'Missing', className: 'border-red-500/25 bg-red-500/15 text-red-100' };

  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${content.className}`}>
      {content.label}
    </span>
  );
}

function CopyState({ copied }: { copied: boolean }) {
  return copied ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-200">
      <Check className="h-3.5 w-3.5" />
      Copied
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-200">
      <Copy className="h-3.5 w-3.5" />
      Copy
    </span>
  );
}

function formatReadiness(readiness: 'ready' | 'needs-work' | 'risky'): string {
  if (readiness === 'ready') return 'Ready';
  if (readiness === 'needs-work') return 'Needs work';
  return 'Risky';
}

function simpleHash(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}
