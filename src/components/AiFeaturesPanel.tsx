'use client';

/**
 * AI Features Panel Component
 *
 * Displays AI-powered features:
 * - Semantic matching results
 * - Rewrite suggestions
 * - Bias review notices
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Search,
  PenTool,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Loader2,
  Key,
  Settings,
} from 'lucide-react';
import {
  SemanticMatch,
  RewriteSuggestion,
  BiasNotice,
  LlmConfig,
} from '@/lib/llm/types';
import {
  findSemanticMatches,
  SemanticMatchRequest,
} from '@/lib/llm/semanticMatcher';

// ============================================================================
// Types
// ============================================================================

interface AiFeaturesPanelProps {
  config: LlmConfig | null;
  resumeText: string;
  jobDescriptionText: string;
  criticalKeywords: string[];
  optionalKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  onConfigureClick: () => void;
  onConsentClick: () => void;
}

// ============================================================================
// Component
// ============================================================================

export function AiFeaturesPanel({
  config,
  resumeText,
  jobDescriptionText,
  criticalKeywords,
  optionalKeywords,
  matchedKeywords,
  missingKeywords,
  onConfigureClick,
  onConsentClick,
}: AiFeaturesPanelProps) {
  // State
  const [isExpanded, setIsExpanded] = useState(true);
  const [semanticMatches, setSemanticMatches] = useState<SemanticMatch[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [matchError, setMatchError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Derived state
  const isConfigured = !!config?.apiKey;
  const hasConsented = !!config?.hasConsented;
  const canUseAi = isConfigured && hasConsented;

  // Handle semantic matching
  const handleFindMatches = async () => {
    if (!config || !canUseAi) return;

    setIsLoadingMatches(true);
    setMatchError(null);

    try {
      const request: SemanticMatchRequest = {
        resumeText,
        jobDescriptionText,
        criticalKeywords,
        optionalKeywords,
        matchedKeywords,
        missingKeywords,
      };

      const result = await findSemanticMatches(request, config);

      if (result.success) {
        setSemanticMatches(result.matches);
      } else {
        setMatchError(result.error || 'Failed to find matches');
      }
    } catch (error) {
      setMatchError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingMatches(false);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  // Render unconfigured state
  if (!isConfigured) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-300 rounded-full">
              Optional
            </span>
          </div>

          <p className="text-slate-300 text-sm mb-4">
            Enable AI-powered features to find semantic matches and get rewrite
            suggestions. Bring your own API key - we never store it on our servers.
          </p>

          <button
            onClick={onConfigureClick}
            className="w-full px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Key className="w-4 h-4" />
            <span className="font-medium">Configure API Key</span>
          </button>

          <p className="text-xs text-slate-500 mt-4 text-center">
            Your API key stays in your browser. Works with Google Gemini.
          </p>
        </div>
      </div>
    );
  }

  // Render needs consent state
  if (!hasConsented) {
    return (
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
            <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 rounded-full">
              Key Configured
            </span>
          </div>

          <p className="text-slate-300 text-sm mb-4">
            Before using AI features, please review and accept our terms about
            data sharing and API usage.
          </p>

          <button
            onClick={onConsentClick}
            className="w-full px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span className="font-medium">Review & Enable</span>
          </button>
        </div>
      </div>
    );
  }

  // Render active state
  return (
    <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header - using div with role="button" to avoid nested button issue */}
      <div className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
        <div
          className="flex items-center gap-3 cursor-pointer flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setIsExpanded(!isExpanded);
            }
          }}
        >
          <div className="p-2 bg-amber-500/10 rounded-lg">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">AI Assistant</h3>
          <span className="px-2 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-300 rounded-full">
            Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onConfigureClick}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            aria-label="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <div
            className="cursor-pointer p-1"
            onClick={() => setIsExpanded(!isExpanded)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setIsExpanded(!isExpanded);
              }
            }}
          >
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-4">
              {/* Semantic Matching Section */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-white">
                      Semantic Matching
                    </span>
                  </div>
                  <button
                    onClick={handleFindMatches}
                    disabled={isLoadingMatches || missingKeywords.length === 0}
                    className="px-3 py-1.5 text-xs font-medium bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                  >
                    {isLoadingMatches ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Find Matches</span>
                      </>
                    )}
                  </button>
                </div>

                <p className="text-xs text-slate-400 mb-3">
                  Find skills in your resume that match missing keywords using
                  different terminology.
                </p>

                {matchError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-300 mb-3">
                    {matchError}
                  </div>
                )}

                {semanticMatches.length > 0 ? (
                  <div className="space-y-2">
                    {semanticMatches.map((match, index) => (
                      <SemanticMatchCard
                        key={index}
                        match={match}
                        index={index}
                        copiedIndex={copiedIndex}
                        onCopy={handleCopy}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500 text-sm">
                    {missingKeywords.length === 0
                      ? 'No missing keywords to match!'
                      : 'Click "Find Matches" to discover semantic equivalents'}
                  </div>
                )}
              </div>

              {/* Rewrite Suggestions Section (Placeholder) */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <PenTool className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">
                    Rewrite Suggestions
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Get AI suggestions for incorporating missing keywords into your
                  existing bullet points.
                </p>
              </div>

              {/* Bias Review Section (Placeholder) */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-medium text-white">
                    Bias Review
                  </span>
                  <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded-full">
                    Coming Soon
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Identify potentially biased or exclusionary language in your
                  resume.
                </p>
              </div>

              {/* Cost Notice */}
              {config?.preferences.showCostEstimates && (
                <p className="text-xs text-slate-500 text-center">
                  AI features use your API key. Typical cost: &lt;$0.01 per analysis.
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface SemanticMatchCardProps {
  match: SemanticMatch;
  index: number;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
}

function SemanticMatchCard({
  match,
  index,
  copiedIndex,
  onCopy,
}: SemanticMatchCardProps) {
  const confidencePercent = Math.round(match.confidence * 100);

  return (
    <div className="p-3 bg-slate-700/30 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-400">JD:</span>
            <span className="text-sm font-medium text-amber-300">
              {match.jdKeyword}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-slate-400">Resume:</span>
            <span className="text-sm text-emerald-300">{match.resumeMatch}</span>
          </div>
          <p className="text-xs text-slate-400">{match.explanation}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              confidencePercent >= 90
                ? 'bg-emerald-500/20 text-emerald-300'
                : confidencePercent >= 75
                ? 'bg-amber-500/20 text-amber-300'
                : 'bg-slate-500/20 text-slate-300'
            }`}
          >
            {confidencePercent}%
          </span>
          <button
            onClick={() => onCopy(match.resumeMatch, index)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded transition-colors"
            title="Copy to clipboard"
          >
            {copiedIndex === index ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface RewriteSuggestionCardProps {
  suggestion: RewriteSuggestion;
  index: number;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function RewriteSuggestionCard({
  suggestion,
  index,
  copiedIndex,
  onCopy,
}: RewriteSuggestionCardProps) {
  return (
    <div className="p-3 bg-slate-700/30 rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 mb-2">
            <span className="font-medium">Original:</span> {suggestion.original}
          </p>
          <p className="text-sm text-white mb-2">{suggestion.rewritten}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {suggestion.keywordsIncorporated.map((kw, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded-full"
              >
                +{kw}
              </span>
            ))}
          </div>
        </div>
        <button
          onClick={() => onCopy(suggestion.rewritten, index + 100)}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded transition-colors flex-shrink-0"
          title="Copy to clipboard"
        >
          {copiedIndex === index + 100 ? (
            <Check className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
}

interface BiasNoticeCardProps {
  notice: BiasNotice;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function BiasNoticeCard({ notice }: BiasNoticeCardProps) {
  const typeLabels: Record<BiasNotice['type'], string> = {
    gendered_language: 'Gendered',
    age_indicator: 'Age',
    cultural_assumption: 'Cultural',
    other: 'Other',
  };

  const typeColors: Record<BiasNotice['type'], string> = {
    gendered_language: 'bg-pink-500/20 text-pink-300',
    age_indicator: 'bg-orange-500/20 text-orange-300',
    cultural_assumption: 'bg-blue-500/20 text-blue-300',
    other: 'bg-slate-500/20 text-slate-300',
  };

  return (
    <div className="p-3 bg-slate-700/30 rounded-lg">
      <div className="flex items-start gap-3">
        <span
          className={`px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[notice.type]}`}
        >
          {typeLabels[notice.type]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-slate-300 mb-1">
            <span className="line-through text-red-300/70">{notice.text}</span>
            {' → '}
            <span className="text-emerald-300">{notice.suggestion}</span>
          </p>
          <p className="text-xs text-slate-400">{notice.explanation}</p>
        </div>
      </div>
    </div>
  );
}

export default AiFeaturesPanel;
