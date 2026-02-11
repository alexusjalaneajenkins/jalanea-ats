'use client';

/**
 * Free Tier Prompt Component
 *
 * Displays the free tier option for AI analysis when user
 * doesn't have their own API key configured.
 */

import { Sparkles, Gift, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { FreeTierStatus } from '@/hooks/useFreeTier';

interface FreeTierPromptProps {
  /** Free tier status from useFreeTier hook */
  status: FreeTierStatus | null;
  /** Whether status is loading */
  isLoading: boolean;
  /** Whether analysis is in progress */
  isAnalyzing: boolean;
  /** Callback to trigger analysis */
  onAnalyze: () => void;
  /** Callback to configure own API key */
  onConfigureClick: () => void;
  /** Error message if any */
  error: string | null;
}

export function FreeTierPrompt({
  status,
  isLoading,
  isAnalyzing,
  onAnalyze,
  onConfigureClick,
  error,
}: FreeTierPromptProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-6 text-center">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
        <p className="text-indigo-300 text-sm">Checking free tier availability...</p>
      </div>
    );
  }

  // Free tier not available
  if (!status?.enabled) {
    return (
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <h3 className="text-lg font-semibold text-white">AI Analysis</h3>
        </div>
        <p className="text-indigo-300 text-sm mb-4">
          The free demo is not available right now. Add your Gemini API key to unlock AI analysis.
        </p>
        <button
          onClick={onConfigureClick}
          className="w-full px-4 py-3 bg-gradient-to-r from-orange-500/20 to-pink-500/20 hover:from-orange-500/30 hover:to-pink-500/30 border border-orange-500/30 text-orange-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Sparkles className="w-4 h-4" />
          <span className="font-medium">Add Gemini Key</span>
        </button>
      </div>
    );
  }

  // Free tier exhausted
  if (status.remaining === 0) {
    const resetTime = new Date(status.resetAt);
    const now = new Date();
    const hoursUntilReset = Math.max(0, Math.ceil((resetTime.getTime() - now.getTime()) / (1000 * 60 * 60)));

    return (
      <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-amber-500/30 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-amber-500/20 rounded-lg">
            <Gift className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Daily Limit Reached</h3>
            <p className="text-xs text-amber-300">Resets in ~{hoursUntilReset} hours</p>
          </div>
        </div>
        <p className="text-indigo-300 text-sm mb-4">
          You&apos;ve used all {status.dailyLimit} free analyses for today. Here are your options:
        </p>
        <div className="space-y-2">
          <button
            onClick={onConfigureClick}
            className="w-full px-4 py-3 bg-gradient-to-r from-orange-500/20 to-pink-500/20 hover:from-orange-500/30 hover:to-pink-500/30 border border-orange-500/30 text-orange-300 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span className="font-medium">Add Gemini Key (free from Google)</span>
          </button>
          <Link
            href="/pricing"
            className="w-full px-4 py-3 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
          >
            <span>Or subscribe for $5/mo for unlimited AI</span>
          </Link>
        </div>
      </div>
    );
  }

  // Free tier available
  return (
    <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-emerald-500/30 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-emerald-500/20 rounded-lg">
          <Gift className="w-5 h-5 text-emerald-400" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white">Free AI Analysis</h3>
          <p className="text-xs text-emerald-300">
            {status.remaining} of {status.dailyLimit} uses remaining today
          </p>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: status.dailyLimit }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-6 rounded-full ${
                i < status.remaining ? 'bg-emerald-500' : 'bg-indigo-700'
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 mb-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <p className="text-indigo-300 text-sm mb-4">
        No account needed. This demo uses a shared Gemini key and includes semantic matching and detailed feedback.
      </p>

      <button
        onClick={onAnalyze}
        disabled={isAnalyzing}
        className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white rounded-xl flex items-center justify-center gap-2 transition-colors font-medium disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Analyzing...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" />
            <span>Run Demo Analysis</span>
          </>
        )}
      </button>

      <div className="mt-4 pt-4 border-t border-indigo-500/20">
        <button
          onClick={onConfigureClick}
          className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          Want unlimited? Add your Gemini API key
        </button>
      </div>
    </div>
  );
}

export default FreeTierPrompt;
