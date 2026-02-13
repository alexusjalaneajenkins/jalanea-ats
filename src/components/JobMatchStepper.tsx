'use client';

import { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Target,
  Search,
  Key,
  AlertTriangle,
  Sparkles,
  LayoutDashboard,
} from 'lucide-react';
import { SemanticMatchResult, RecruiterSearchResult, CoverageResult, KnockoutRiskResult, EnhancedKnockoutItem } from '@/lib/analysis';
import { KnockoutItem } from '@/lib/types/session';
import { GeminiModel, LlmConfig } from '@/lib/llm/types';
import { FreeTierStatus, FreeTierAnalysisResult } from '@/hooks/useFreeTier';
import { JobMatchSummary } from './JobMatchSummary';
import { SemanticMatchPanel } from './SemanticMatchPanel';
import { RecruiterSearchPanel } from './RecruiterSearchPanel';
import { KeywordCoveragePanel } from './KeywordCoveragePanel';
import { KnockoutChecklist } from './KnockoutChecklist';
import { AiFeaturesPanel } from './AiFeaturesPanel';
import { FreeTierPrompt } from './FreeTierPrompt';
import { ResumeImprover } from './ResumeImprover';

interface Step {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

const STEPS: Step[] = [
  {
    id: 'overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: <LayoutDashboard className="w-4 h-4" />,
    description: 'Your overall match summary',
  },
  {
    id: 'semantic',
    label: 'AI Analysis',
    shortLabel: 'AI',
    icon: <Target className="w-4 h-4" />,
    description: 'Conceptual alignment with the job',
  },
  {
    id: 'keywords',
    label: 'Keywords',
    shortLabel: 'Keywords',
    icon: <Key className="w-4 h-4" />,
    description: 'Keyword matches and gaps',
  },
  {
    id: 'recruiter',
    label: 'Search Score',
    shortLabel: 'Search',
    icon: <Search className="w-4 h-4" />,
    description: 'Recruiter search visibility',
  },
  {
    id: 'disqualifiers',
    label: 'Disqualifiers',
    shortLabel: 'Risk',
    icon: <AlertTriangle className="w-4 h-4" />,
    description: 'Potential knockout requirements',
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    shortLabel: 'AI Tools',
    icon: <Sparkles className="w-4 h-4" />,
    description: 'AI-powered enhancements',
  },
];

interface JobMatchStepperProps {
  // Data
  semanticMatch?: SemanticMatchResult;
  recruiterSearch?: RecruiterSearchResult;
  coverage: CoverageResult;
  knockoutRisk?: KnockoutRiskResult;
  knockouts: (KnockoutItem | EnhancedKnockoutItem)[];
  keywords: { critical: string[]; optional: string[] } | null;
  // AI Features
  llmConfig: LlmConfig | null;
  geminiModel?: GeminiModel;
  resumeText: string;
  jobDescriptionText: string;
  // Callbacks
  onKnockoutChange: (id: string, confirmed: boolean | undefined) => void;
  onConfigureClick: () => void;
  onConsentClick: () => void;
  // Loading state
  isAnalyzingSemantic?: boolean;
  // Free tier props
  freeTierStatus?: FreeTierStatus | null;
  freeTierLoading?: boolean;
  freeTierResult?: FreeTierAnalysisResult | null;
  isFreeTierAnalyzing?: boolean;
  freeTierError?: string | null;
  onFreeTierAnalyze?: () => void;
}

/**
 * Job Match Stepper Component
 *
 * Provides a wizard-like flow through Job Match analysis sections.
 * Users navigate step by step through Overview, AI Analysis, Keywords,
 * Search Score, Disqualifiers, and AI Assistant.
 */
export function JobMatchStepper({
  semanticMatch,
  recruiterSearch,
  coverage,
  knockoutRisk,
  knockouts,
  keywords,
  llmConfig,
  geminiModel,
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
}: JobMatchStepperProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));

  // Auto-navigate to AI Analysis step when free tier result arrives
  useEffect(() => {
    if (freeTierResult && currentStepIndex === 0) {
      // Navigate to AI Analysis (step 1) to show the results
      setCurrentStepIndex(1);
      setVisitedSteps(prev => new Set([...prev, 1]));
    }
  }, [freeTierResult, currentStepIndex]);

  const currentStep = STEPS[currentStepIndex];
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const goToStep = (index: number) => {
    setCurrentStepIndex(index);
    setVisitedSteps((prev) => new Set([...prev, index]));
  };

  const goNext = () => {
    if (!isLastStep) {
      goToStep(currentStepIndex + 1);
    }
  };

  const goPrev = () => {
    if (!isFirstStep) {
      goToStep(currentStepIndex - 1);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'overview':
        return (
          <JobMatchSummary
            semanticMatch={semanticMatch}
            recruiterSearch={recruiterSearch}
            coverage={coverage}
            knockoutRisk={knockoutRisk}
            onScrollToSection={(section) => {
              const sectionToStep: Record<string, number> = {
                semantic: 1,
                recruiter: 3,
                keywords: 2,
                knockouts: 4,
              };
              goToStep(sectionToStep[section] ?? 0);
            }}
          />
        );

      case 'semantic':
        // Show loading for BYOK semantic analysis
        if (isAnalyzingSemantic) {
          return (
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-purple-500/30 p-8 text-center">
              <div className="w-12 h-12 border-3 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white font-medium">Analyzing Semantic Match...</p>
              <p className="text-indigo-300 text-sm mt-1">Using AI to evaluate conceptual alignment</p>
            </div>
          );
        }

        // Show BYOK semantic match result if available
        if (semanticMatch?.success) {
          return <SemanticMatchPanel result={semanticMatch} />;
        }

        // Show free tier result if available
        if (freeTierResult) {
          return (
            <div className="space-y-4">
              {/* Free tier ATS score */}
              <div className="bg-gradient-to-br from-emerald-900/30 to-cyan-900/30 backdrop-blur-sm rounded-2xl border-2 border-emerald-500/30 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">AI Analysis</h3>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded-full">
                      Demo
                    </span>
                    <span className={`text-2xl font-bold ${
                      freeTierResult.score >= 80 ? 'text-emerald-400' :
                      freeTierResult.score >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {freeTierResult.score}%
                    </span>
                  </div>
                </div>
                <p className="text-indigo-200 text-sm mb-4">{freeTierResult.summary}</p>

                {/* Keyword matches */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-indigo-950/50 rounded-xl p-3">
                    <div className="text-xs text-indigo-400 mb-1">Matched Keywords</div>
                    <div className="text-lg font-bold text-emerald-400">{freeTierResult.keywordMatches.found.length}</div>
                  </div>
                  <div className="bg-indigo-950/50 rounded-xl p-3">
                    <div className="text-xs text-indigo-400 mb-1">Missing Keywords</div>
                    <div className="text-lg font-bold text-amber-400">{freeTierResult.keywordMatches.missing.length}</div>
                  </div>
                </div>

                {/* Suggestions */}
                {freeTierResult.overallSuggestions.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold text-white mb-2">Suggestions</h4>
                    <ul className="space-y-2">
                      {freeTierResult.overallSuggestions.slice(0, 3).map((suggestion, i) => (
                        <li key={i} className="text-sm text-indigo-300 flex items-start gap-2">
                          <span className="text-cyan-400 mt-1">•</span>
                          <span>{suggestion}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Remaining uses notice */}
              {freeTierResult._freeTier && (
                <div className="text-center text-xs text-indigo-400">
                  {freeTierResult._freeTier.remaining} free {freeTierResult._freeTier.remaining === 1 ? 'analysis' : 'analyses'} remaining today
                </div>
              )}
            </div>
          );
        }

        // Check if user has BYOK configured
        const hasApiKey = !!(llmConfig?.apiKey && llmConfig?.hasConsented);

        // Show free tier prompt if available and no BYOK
        if (!hasApiKey && onFreeTierAnalyze) {
          return (
            <FreeTierPrompt
              status={freeTierStatus ?? null}
              isLoading={freeTierLoading ?? false}
              isAnalyzing={isFreeTierAnalyzing ?? false}
              onAnalyze={onFreeTierAnalyze}
              onConfigureClick={onConfigureClick}
              error={freeTierError ?? null}
            />
          );
        }

        // Default: show configure AI button
        return (
          <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-8 text-center">
            <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-purple-500/30">
              <Target className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">AI Analysis Not Available</h3>
            <p className="text-indigo-300 text-sm max-w-md mx-auto mb-4">
              Use the free demo (3/day) or add your Gemini key to enable AI-powered semantic matching and get deeper insights into how your resume aligns with this role.
            </p>
            <button
              onClick={onConfigureClick}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors text-sm font-medium"
            >
              AI Settings
            </button>
          </div>
        );

      case 'keywords':
        return <KeywordCoveragePanel coverage={coverage} />;

      case 'recruiter':
        if (recruiterSearch) {
          return <RecruiterSearchPanel result={recruiterSearch} />;
        }
        return (
          <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-8 text-center">
            <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
              <Search className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Search Score Unavailable</h3>
            <p className="text-indigo-300 text-sm max-w-md mx-auto">
              Search score analysis is not available for this job description.
            </p>
          </div>
        );

      case 'disqualifiers':
        return (
          <KnockoutChecklist
            knockouts={knockouts}
            onKnockoutChange={onKnockoutChange}
            riskLevel={knockoutRisk?.risk || 'low'}
            riskExplanation={knockoutRisk?.explanation || 'No disqualifier requirements detected.'}
          />
        );

      case 'ai-assistant':
        // Check if AI is available (either BYOK or free tier)
        const isAiAvailable = !!(llmConfig?.apiKey && llmConfig?.hasConsented) ||
          !!(freeTierStatus?.enabled && (freeTierStatus?.remaining ?? 0) > 0);

        return (
          <div className="space-y-6">
            {/* Resume Improver - Main feature */}
            <ResumeImprover
              resumeText={resumeText}
              jobDescription={jobDescriptionText}
              missingKeywords={coverage?.missingKeywords || []}
              isAiAvailable={isAiAvailable}
              geminiModel={geminiModel}
              onConfigureClick={onConfigureClick}
            />

            {/* AI Features Panel - Semantic matching etc. */}
            <AiFeaturesPanel
              config={llmConfig}
              resumeText={resumeText}
              jobDescriptionText={jobDescriptionText}
              criticalKeywords={keywords?.critical || []}
              optionalKeywords={keywords?.optional || []}
              matchedKeywords={coverage?.foundKeywords || []}
              missingKeywords={coverage?.missingKeywords || []}
              onConfigureClick={onConfigureClick}
              onConsentClick={onConsentClick}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Step indicator - horizontal on desktop, compact on mobile */}
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-3">
        {/* Desktop step indicator */}
        <div className="hidden sm:flex items-center justify-between">
          {STEPS.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isVisited = visitedSteps.has(index);
            const isCompleted = index < currentStepIndex;

            return (
              <button
                key={step.id}
                onClick={() => goToStep(index)}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200
                  ${isActive
                    ? 'bg-gradient-to-r from-orange-500/20 to-pink-500/20 border border-orange-500/30'
                    : isVisited
                      ? 'hover:bg-indigo-800/50'
                      : 'opacity-50 hover:opacity-75'
                  }
                `}
              >
                <div
                  className={`
                    w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold
                    ${isActive
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                      : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-indigo-800/50 text-indigo-400 border border-indigo-500/30'
                    }
                  `}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : index + 1}
                </div>
                <span
                  className={`text-sm font-medium ${isActive ? 'text-white' : 'text-indigo-300'}`}
                >
                  {step.shortLabel}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile step indicator */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-indigo-400">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-sm font-bold text-white">{currentStep.label}</span>
          </div>
          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center">
            {STEPS.map((_, index) => (
              <button
                key={index}
                onClick={() => goToStep(index)}
                className={`
                  w-2 h-2 rounded-full transition-all duration-200
                  ${index === currentStepIndex
                    ? 'bg-orange-500 w-6'
                    : visitedSteps.has(index)
                      ? 'bg-indigo-400'
                      : 'bg-indigo-700'
                  }
                `}
                aria-label={`Go to step ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Step header */}
      <div className="flex items-center gap-3 px-1">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/20 to-pink-500/20 border border-orange-500/30 flex items-center justify-center">
          {currentStep.icon}
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{currentStep.label}</h3>
          <p className="text-sm text-indigo-400">{currentStep.description}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[300px]">{renderStepContent()}</div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={goPrev}
          disabled={isFirstStep}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200
            ${isFirstStep
              ? 'opacity-30 cursor-not-allowed text-indigo-500'
              : 'text-indigo-300 hover:text-white hover:bg-indigo-800/50'
            }
          `}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back</span>
        </button>

        <div className="text-xs text-indigo-500">
          {currentStepIndex + 1} / {STEPS.length}
        </div>

        <button
          onClick={goNext}
          disabled={isLastStep}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200
            ${isLastStep
              ? 'opacity-30 cursor-not-allowed text-indigo-500'
              : 'bg-gradient-to-r from-orange-500 to-pink-500 text-white hover:opacity-90'
            }
          `}
        >
          <span>Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
