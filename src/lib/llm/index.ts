/**
 * LLM Module Index
 *
 * Re-exports all LLM-related types, providers, and services.
 */

// Types
export type {
  LlmInput,
  LlmOutput,
  LlmProvider,
  LlmConfig,
  LlmRequestType,
  LlmErrorCode,
  LlmError,
  SupportedProvider,
  SemanticMatch,
  RewriteSuggestion,
  BiasNotice,
  ConsentAcknowledgments,
  InjectionCheckResult,
} from './types';

export {
  DEFAULT_LLM_CONFIG,
  REQUIRED_ACKNOWLEDGMENTS,
  INJECTION_PATTERNS,
  createLlmError,
} from './types';

// Provider
export { GeminiProvider, geminiProvider } from './gemini';

// Services
export {
  findSemanticMatches,
  estimateSemanticMatchCost,
  findLocalSemanticMatches,
  isSemanticMatchingAvailable,
} from './semanticMatcher';

export type { SemanticMatchRequest, SemanticMatchResult } from './semanticMatcher';

export {
  getRewriteSuggestions,
  estimateRewriteCost,
  getBiasReview,
  isRewriteAvailable,
  isBiasReviewAvailable,
} from './rewriteSuggestions';

export type {
  RewriteRequest,
  RewriteResult,
  BiasReviewRequest,
  BiasReviewResult,
} from './rewriteSuggestions';

// Storage
export {
  saveLlmConfig,
  loadLlmConfig,
  deleteLlmConfig,
  isLlmConfigured,
  hasUserConsented,
  updateConsent,
  getOrCreateConfig,
} from './storage';

// Embeddings
export {
  generateEmbedding,
  cosineSimilarity,
  calculateSemanticSimilarity,
  calculateSectionSimilarities,
} from './embeddings';

export type { EmbeddingResult, SimilarityResult } from './embeddings';
