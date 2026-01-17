/**
 * BYOK (Bring Your Own Key) LLM Provider Types
 *
 * This module defines the type system for optional LLM integration.
 * All LLM features are opt-in and require user consent.
 */

// ============================================================================
// Input Types
// ============================================================================

/**
 * Structured input for LLM requests
 * Contains resume data, job description, and analysis context
 */
export interface LlmInput {
  /** User's resume text (parsed) */
  resumeText: string;

  /** Job description text */
  jobDescriptionText: string;

  /** Keywords extracted from job description */
  keywords: {
    critical: string[];
    optional: string[];
  };

  /** Keywords found in resume */
  matchedKeywords: string[];

  /** Keywords missing from resume */
  missingKeywords: string[];

  /** Specific bullet point to rewrite (for rewrite suggestions) */
  bulletToRewrite?: string;

  /** Section context for the bullet (e.g., "Experience", "Skills") */
  bulletSection?: string;
}

// ============================================================================
// Output Types
// ============================================================================

/**
 * Semantic match suggestion from LLM
 */
export interface SemanticMatch {
  /** Keyword from JD that was semantically matched */
  jdKeyword: string;

  /** Text from resume that semantically matches */
  resumeMatch: string;

  /** Confidence score (0-1) */
  confidence: number;

  /** Explanation of why this is a semantic match */
  explanation: string;
}

/**
 * Bullet rewrite suggestion from LLM
 */
export interface RewriteSuggestion {
  /** Original bullet text */
  original: string;

  /** Suggested rewrite incorporating missing keywords */
  rewritten: string;

  /** Keywords incorporated in the rewrite */
  keywordsIncorporated: string[];

  /** Brief explanation of changes */
  rationale: string;
}

/**
 * Bias review notice from LLM
 */
export interface BiasNotice {
  /** Type of potential bias detected */
  type: 'gendered_language' | 'age_indicator' | 'cultural_assumption' | 'other';

  /** The problematic text */
  text: string;

  /** Suggested neutral alternative */
  suggestion: string;

  /** Brief explanation */
  explanation: string;
}

/**
 * Structured output from LLM requests
 */
export interface LlmOutput {
  /** Whether the request was successful */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Semantic matches found (for semantic matching requests) */
  semanticMatches?: SemanticMatch[];

  /** Rewrite suggestions (for rewrite requests) */
  rewriteSuggestions?: RewriteSuggestion[];

  /** Bias notices (included in all responses when detected) */
  biasNotices?: BiasNotice[];

  /** Raw response for debugging (only in dev mode) */
  rawResponse?: string;

  /** Token usage for transparency */
  usage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

// ============================================================================
// Provider Interface
// ============================================================================

/**
 * Request type for LLM operations
 */
export type LlmRequestType = 'semantic_match' | 'rewrite_suggestion' | 'bias_review';

/**
 * LLM Provider interface
 * All providers must implement this interface
 */
export interface LlmProvider {
  /** Provider name (e.g., "gemini", "openai") */
  name: string;

  /** Whether the provider is currently configured with a valid key */
  isConfigured(): boolean;

  /** Validate an API key (returns true if valid) */
  validateKey(apiKey: string): Promise<boolean>;

  /** Execute a request */
  execute(input: LlmInput, requestType: LlmRequestType): Promise<LlmOutput>;

  /** Get estimated cost for a request (in USD) */
  estimateCost(input: LlmInput, requestType: LlmRequestType): number;
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Supported LLM providers
 */
export type SupportedProvider = 'gemini' | 'openai' | 'anthropic';

/**
 * LLM Configuration stored in IndexedDB
 */
export interface LlmConfig {
  /** Selected provider */
  provider: SupportedProvider;

  /** API key (encrypted at rest) */
  apiKey: string;

  /** Whether user has consented to BYOK features */
  hasConsented: boolean;

  /** Timestamp of consent */
  consentTimestamp?: number;

  /** User preferences */
  preferences: {
    /** Enable semantic matching */
    enableSemanticMatching: boolean;

    /** Enable rewrite suggestions */
    enableRewriteSuggestions: boolean;

    /** Enable bias review */
    enableBiasReview: boolean;

    /** Show cost estimates before requests */
    showCostEstimates: boolean;
  };
}

/**
 * Default configuration for new users
 */
export const DEFAULT_LLM_CONFIG: LlmConfig = {
  provider: 'gemini',
  apiKey: '',
  hasConsented: false,
  preferences: {
    enableSemanticMatching: true,
    enableRewriteSuggestions: true,
    enableBiasReview: true,
    showCostEstimates: true,
  },
};

// ============================================================================
// Consent Types
// ============================================================================

/**
 * Consent acknowledgments user must accept
 */
export interface ConsentAcknowledgments {
  /** User understands data will be sent to third-party API */
  dataSharing: boolean;

  /** User understands API costs are their responsibility */
  apiCosts: boolean;

  /** User understands LLM suggestions should be reviewed */
  reviewRequired: boolean;

  /** User understands their API key is stored locally only */
  localStorageOnly: boolean;
}

/**
 * All acknowledgments that must be true for valid consent
 */
export const REQUIRED_ACKNOWLEDGMENTS: (keyof ConsentAcknowledgments)[] = [
  'dataSharing',
  'apiCosts',
  'reviewRequired',
  'localStorageOnly',
];

// ============================================================================
// Error Types
// ============================================================================

/**
 * LLM-specific error codes
 */
export type LlmErrorCode =
  | 'INVALID_API_KEY'
  | 'RATE_LIMITED'
  | 'QUOTA_EXCEEDED'
  | 'NETWORK_ERROR'
  | 'PARSE_ERROR'
  | 'CONSENT_REQUIRED'
  | 'PROVIDER_ERROR'
  | 'INJECTION_DETECTED';

/**
 * Structured LLM error
 */
export interface LlmError {
  code: LlmErrorCode;
  message: string;
  recoverable: boolean;
  suggestion?: string;
}

/**
 * Create a structured LLM error
 */
export function createLlmError(
  code: LlmErrorCode,
  message: string,
  recoverable = false,
  suggestion?: string
): LlmError {
  return { code, message, recoverable, suggestion };
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * Prompt injection detection result
 */
export interface InjectionCheckResult {
  /** Whether potential injection was detected */
  detected: boolean;

  /** Type of injection pattern found */
  pattern?: string;

  /** The suspicious text */
  suspiciousText?: string;
}

/**
 * Patterns that may indicate prompt injection attempts
 * Used to sanitize inputs before sending to LLM
 */
export const INJECTION_PATTERNS = [
  /ignore\s+(previous|above|all)\s+(instructions?|prompts?)/i,
  /disregard\s+(previous|above|all)/i,
  /forget\s+(everything|all|previous)/i,
  /new\s+instructions?:/i,
  /system\s*:/i,
  /assistant\s*:/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /```\s*(system|assistant)/i,
];
