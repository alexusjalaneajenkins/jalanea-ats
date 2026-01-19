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
 * Available Gemini models
 * User can select which model to use (helpful when hitting rate limits)
 */
export type GeminiModel = 'gemini-2.5-flash' | 'gemini-2.5-flash-lite' | 'gemini-2.0-flash' | 'gemini-3-flash-preview';

/**
 * Gemini model information for UI display
 */
export interface GeminiModelInfo {
  id: GeminiModel;
  displayName: string;
  description: string;
  pricing: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
}

/**
 * Available Gemini models with their details
 */
export const GEMINI_MODELS: GeminiModelInfo[] = [
  {
    id: 'gemini-3-flash-preview',
    displayName: 'Gemini 3.0 Flash',
    description: 'Newest preview model. Experimental.',
    pricing: { input: 0.50, output: 3.00 },
  },
  {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: 'Stable and capable. Recommended.',
    pricing: { input: 0.15, output: 0.60 },
  },
  {
    id: 'gemini-2.5-flash-lite',
    displayName: 'Gemini 2.5 Flash Lite',
    description: 'Faster and cheaper. Good for high volume.',
    pricing: { input: 0.10, output: 0.40 },
  },
  {
    id: 'gemini-2.0-flash',
    displayName: 'Gemini 2.0 Flash',
    description: 'Previous generation. Fallback option.',
    pricing: { input: 0.10, output: 0.40 },
  },
];

/**
 * Default Gemini model
 */
export const DEFAULT_GEMINI_MODEL: GeminiModel = 'gemini-2.5-flash';

/**
 * LLM Configuration stored in IndexedDB
 */
export interface LlmConfig {
  /** Selected provider */
  provider: SupportedProvider;

  /** Selected Gemini model (only used when provider is 'gemini') */
  geminiModel?: GeminiModel;

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
  geminiModel: DEFAULT_GEMINI_MODEL,
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
  | 'INJECTION_DETECTED'
  | 'MODEL_OVERLOADED';

// ============================================================================
// Retry Configuration
// ============================================================================

/**
 * Configuration for retry with exponential backoff
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Initial delay in milliseconds */
  initialDelay: number;
  /** Maximum delay in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
}

/**
 * Default retry configuration for API calls
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified duration
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a fetch request with retry logic and exponential backoff
 * Handles 503 (model overloaded) and 429 (rate limit) errors
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<Response> {
  let lastError: Error | null = null;
  let delay = config.initialDelay;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // If successful or a non-retryable error, return immediately
      if (response.ok || (response.status !== 503 && response.status !== 429)) {
        return response;
      }

      // For 503 or 429, we should retry
      if (attempt < config.maxRetries) {
        console.log(
          `[API Retry] Attempt ${attempt + 1}/${config.maxRetries + 1} failed with ${response.status}. ` +
          `Retrying in ${delay}ms...`
        );
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      } else {
        // Last attempt failed, return the response so caller can handle the error
        return response;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < config.maxRetries) {
        console.log(
          `[API Retry] Attempt ${attempt + 1}/${config.maxRetries + 1} failed with network error. ` +
          `Retrying in ${delay}ms...`
        );
        await sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelay);
      }
    }
  }

  // If we exhausted all retries due to network errors, throw the last error
  throw lastError || new Error('All retry attempts failed');
}

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
