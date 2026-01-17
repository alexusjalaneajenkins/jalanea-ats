/**
 * Semantic Matcher Service
 *
 * Uses LLM to find semantic matches between missing keywords
 * and resume content that uses different terminology.
 */

import { LlmInput, LlmOutput, SemanticMatch, LlmConfig } from './types';
import { geminiProvider } from './gemini';

// ============================================================================
// Types
// ============================================================================

export interface SemanticMatchRequest {
  resumeText: string;
  jobDescriptionText: string;
  criticalKeywords: string[];
  optionalKeywords: string[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface SemanticMatchResult {
  success: boolean;
  matches: SemanticMatch[];
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
 * Find semantic matches between missing keywords and resume content
 */
export async function findSemanticMatches(
  request: SemanticMatchRequest,
  config: LlmConfig
): Promise<SemanticMatchResult> {
  // Validate config
  if (!config.hasConsented) {
    return {
      success: false,
      matches: [],
      error: 'User consent required for AI features',
    };
  }

  if (!config.apiKey) {
    return {
      success: false,
      matches: [],
      error: 'API key not configured',
    };
  }

  if (!config.preferences.enableSemanticMatching) {
    return {
      success: false,
      matches: [],
      error: 'Semantic matching is disabled in preferences',
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
  };

  // Set up provider
  geminiProvider.setApiKey(config.apiKey);

  // Get cost estimate if enabled
  let estimatedCost: number | undefined;
  if (config.preferences.showCostEstimates) {
    estimatedCost = geminiProvider.estimateCost(input, 'semantic_match');
  }

  // Execute request
  const output: LlmOutput = await geminiProvider.execute(input, 'semantic_match');

  if (!output.success) {
    return {
      success: false,
      matches: [],
      error: output.error,
      estimatedCost,
    };
  }

  // Calculate actual cost if usage data available
  let actualCost: SemanticMatchResult['actualCost'];
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
    matches: output.semanticMatches || [],
    estimatedCost,
    actualCost,
  };
}

/**
 * Get cost estimate without executing
 */
export function estimateSemanticMatchCost(
  request: SemanticMatchRequest,
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
  };

  geminiProvider.setApiKey(config.apiKey);
  return geminiProvider.estimateCost(input, 'semantic_match');
}

// ============================================================================
// Fallback: Local Semantic Matching
// ============================================================================

/**
 * Common skill synonyms for local matching when LLM is not available
 * This provides basic functionality without API calls
 */
const SKILL_SYNONYMS: Record<string, string[]> = {
  // CRM and Customer
  'crm': ['salesforce', 'hubspot', 'customer relationship management', 'zoho'],
  'customer success': ['client success', 'account management', 'customer satisfaction', 'customer experience'],
  'customer support': ['customer service', 'help desk', 'technical support', 'client support'],

  // Project Management
  'agile': ['scrum', 'sprint', 'kanban', 'iterative development'],
  'project management': ['pm', 'pmp', 'project coordination', 'project lead'],
  'jira': ['atlassian', 'issue tracking', 'ticket management'],

  // Communication
  'communication': ['interpersonal', 'verbal', 'written', 'presentation'],
  'collaboration': ['teamwork', 'cross-functional', 'partnership'],

  // Technical
  'javascript': ['js', 'ecmascript', 'es6', 'node.js', 'react', 'vue'],
  'python': ['py', 'django', 'flask', 'pandas'],
  'sql': ['mysql', 'postgresql', 'database', 'queries'],
  'api': ['rest', 'graphql', 'web services', 'endpoints'],

  // Analysis
  'data analysis': ['analytics', 'data-driven', 'metrics', 'reporting'],
  'excel': ['spreadsheets', 'google sheets', 'csv', 'pivot tables'],

  // Soft Skills
  'problem solving': ['troubleshooting', 'analytical', 'solution-oriented'],
  'leadership': ['management', 'team lead', 'mentoring', 'coaching'],
  'attention to detail': ['detail-oriented', 'meticulous', 'thorough'],
};

/**
 * Local fallback for semantic matching without LLM
 * Uses predefined synonym mappings
 */
export function findLocalSemanticMatches(
  resumeText: string,
  missingKeywords: string[]
): SemanticMatch[] {
  const normalizedResume = resumeText.toLowerCase();
  const matches: SemanticMatch[] = [];

  for (const keyword of missingKeywords) {
    const normalizedKeyword = keyword.toLowerCase();

    // Check if keyword has known synonyms
    const synonyms = SKILL_SYNONYMS[normalizedKeyword];
    if (synonyms) {
      for (const synonym of synonyms) {
        if (normalizedResume.includes(synonym.toLowerCase())) {
          matches.push({
            jdKeyword: keyword,
            resumeMatch: synonym,
            confidence: 0.75,
            explanation: `"${synonym}" is commonly used interchangeably with "${keyword}"`,
          });
          break; // Only one match per keyword
        }
      }
    }

    // Check reverse: if resume has keyword that maps to missing one
    for (const [baseSkill, synonymList] of Object.entries(SKILL_SYNONYMS)) {
      if (synonymList.includes(normalizedKeyword)) {
        if (normalizedResume.includes(baseSkill)) {
          matches.push({
            jdKeyword: keyword,
            resumeMatch: baseSkill,
            confidence: 0.75,
            explanation: `"${baseSkill}" is commonly used interchangeably with "${keyword}"`,
          });
          break;
        }
      }
    }
  }

  return matches;
}

/**
 * Check if LLM semantic matching is available
 */
export function isSemanticMatchingAvailable(config: LlmConfig | null): boolean {
  if (!config) return false;
  return (
    config.hasConsented &&
    !!config.apiKey &&
    config.preferences.enableSemanticMatching
  );
}
