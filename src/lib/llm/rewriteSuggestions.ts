/**
 * Rewrite Suggestions Service
 *
 * Uses LLM to suggest bullet point rewrites that incorporate
 * missing keywords while maintaining truthfulness.
 */

import { LlmInput, LlmOutput, RewriteSuggestion, BiasNotice, LlmConfig } from './types';
import { geminiProvider } from './gemini';

// ============================================================================
// Types
// ============================================================================

export interface RewriteRequest {
  resumeText: string;
  jobDescriptionText: string;
  criticalKeywords: string[];
  optionalKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
  bulletToRewrite: string;
  bulletSection: string;
}

export interface RewriteResult {
  success: boolean;
  suggestions: RewriteSuggestion[];
  biasNotices?: BiasNotice[];
  error?: string;
  estimatedCost?: number;
  actualCost?: {
    inputTokens: number;
    outputTokens: number;
    totalUsd: number;
  };
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get rewrite suggestions for a bullet point
 */
export async function getRewriteSuggestions(
  request: RewriteRequest,
  config: LlmConfig
): Promise<RewriteResult> {
  // Validate config
  if (!config.hasConsented) {
    return {
      success: false,
      suggestions: [],
      error: 'User consent required for AI features',
    };
  }

  if (!config.apiKey) {
    return {
      success: false,
      suggestions: [],
      error: 'API key not configured',
    };
  }

  if (!config.preferences.enableRewriteSuggestions) {
    return {
      success: false,
      suggestions: [],
      error: 'Rewrite suggestions are disabled in preferences',
    };
  }

  // Build LLM input
  const input: LlmInput = {
    resumeText: request.resumeText,
    jobDescriptionText: request.jobDescriptionText,
    keywords: {
      critical: request.criticalKeywords,
      optional: request.optionalKeywords,
    },
    matchedKeywords: request.matchedKeywords,
    missingKeywords: request.missingKeywords,
    bulletToRewrite: request.bulletToRewrite,
    bulletSection: request.bulletSection,
  };

  // Set up provider
  geminiProvider.setApiKey(config.apiKey);

  // Get cost estimate if enabled
  let estimatedCost: number | undefined;
  if (config.preferences.showCostEstimates) {
    estimatedCost = geminiProvider.estimateCost(input, 'rewrite_suggestion');
  }

  // Execute request
  const output: LlmOutput = await geminiProvider.execute(input, 'rewrite_suggestion');

  if (!output.success) {
    return {
      success: false,
      suggestions: [],
      error: output.error,
      estimatedCost,
    };
  }

  // Calculate actual cost if usage data available
  let actualCost: RewriteResult['actualCost'];
  if (output.usage) {
    const inputCostPerM = 0.075;
    const outputCostPerM = 0.30;
    const inputCost = (output.usage.inputTokens / 1_000_000) * inputCostPerM;
    const outputCost = (output.usage.outputTokens / 1_000_000) * outputCostPerM;
    actualCost = {
      inputTokens: output.usage.inputTokens,
      outputTokens: output.usage.outputTokens,
      totalUsd: inputCost + outputCost,
    };
  }

  return {
    success: true,
    suggestions: output.rewriteSuggestions || [],
    biasNotices: output.biasNotices,
    estimatedCost,
    actualCost,
  };
}

/**
 * Get cost estimate without executing
 */
export function estimateRewriteCost(
  request: RewriteRequest,
  config: LlmConfig
): number {
  const input: LlmInput = {
    resumeText: request.resumeText,
    jobDescriptionText: request.jobDescriptionText,
    keywords: {
      critical: request.criticalKeywords,
      optional: request.optionalKeywords,
    },
    matchedKeywords: request.matchedKeywords,
    missingKeywords: request.missingKeywords,
    bulletToRewrite: request.bulletToRewrite,
    bulletSection: request.bulletSection,
  };

  geminiProvider.setApiKey(config.apiKey);
  return geminiProvider.estimateCost(input, 'rewrite_suggestion');
}

// ============================================================================
// Bias Review Service
// ============================================================================

export interface BiasReviewRequest {
  resumeText: string;
  jobDescriptionText: string;
}

export interface BiasReviewResult {
  success: boolean;
  notices: BiasNotice[];
  error?: string;
  estimatedCost?: number;
  actualCost?: {
    inputTokens: number;
    outputTokens: number;
    totalUsd: number;
  };
}

/**
 * Get bias review for resume
 */
export async function getBiasReview(
  request: BiasReviewRequest,
  config: LlmConfig
): Promise<BiasReviewResult> {
  // Validate config
  if (!config.hasConsented) {
    return {
      success: false,
      notices: [],
      error: 'User consent required for AI features',
    };
  }

  if (!config.apiKey) {
    return {
      success: false,
      notices: [],
      error: 'API key not configured',
    };
  }

  if (!config.preferences.enableBiasReview) {
    return {
      success: false,
      notices: [],
      error: 'Bias review is disabled in preferences',
    };
  }

  // Build LLM input
  const input: LlmInput = {
    resumeText: request.resumeText,
    jobDescriptionText: request.jobDescriptionText,
    keywords: { critical: [], optional: [] },
    matchedKeywords: [],
    missingKeywords: [],
  };

  // Set up provider
  geminiProvider.setApiKey(config.apiKey);

  // Get cost estimate if enabled
  let estimatedCost: number | undefined;
  if (config.preferences.showCostEstimates) {
    estimatedCost = geminiProvider.estimateCost(input, 'bias_review');
  }

  // Execute request
  const output: LlmOutput = await geminiProvider.execute(input, 'bias_review');

  if (!output.success) {
    return {
      success: false,
      notices: [],
      error: output.error,
      estimatedCost,
    };
  }

  // Calculate actual cost if usage data available
  let actualCost: BiasReviewResult['actualCost'];
  if (output.usage) {
    const inputCostPerM = 0.075;
    const outputCostPerM = 0.30;
    const inputCost = (output.usage.inputTokens / 1_000_000) * inputCostPerM;
    const outputCost = (output.usage.outputTokens / 1_000_000) * outputCostPerM;
    actualCost = {
      inputTokens: output.usage.inputTokens,
      outputTokens: output.usage.outputTokens,
      totalUsd: inputCost + outputCost,
    };
  }

  return {
    success: true,
    notices: output.biasNotices || [],
    estimatedCost,
    actualCost,
  };
}

// ============================================================================
// Check if features are available
// ============================================================================

/**
 * Check if rewrite suggestions are available
 */
export function isRewriteAvailable(config: LlmConfig | null): boolean {
  if (!config) return false;
  return (
    config.hasConsented &&
    !!config.apiKey &&
    config.preferences.enableRewriteSuggestions
  );
}

/**
 * Check if bias review is available
 */
export function isBiasReviewAvailable(config: LlmConfig | null): boolean {
  if (!config) return false;
  return (
    config.hasConsented &&
    !!config.apiKey &&
    config.preferences.enableBiasReview
  );
}
