/**
 * Embeddings Module
 *
 * Generates text embeddings using the configured LLM provider
 * and calculates cosine similarity between vectors.
 *
 * Supports:
 * - Google Gemini embedding-001 model
 * - OpenAI text-embedding-3-small
 */

import { LlmConfig, SupportedProvider, fetchWithRetry } from './types';

// ============================================================================
// Types
// ============================================================================

export interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  error?: string;
  usage?: {
    tokens: number;
  };
}

export interface SimilarityResult {
  success: boolean;
  similarity?: number;
  error?: string;
}

// ============================================================================
// Provider-specific API URLs and Models
// ============================================================================

const EMBEDDING_CONFIG: Record<SupportedProvider, {
  url: string;
  model: string;
  dimensions: number;
}> = {
  gemini: {
    url: 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    model: 'text-embedding-004',
    dimensions: 768,
  },
  openai: {
    url: 'https://api.openai.com/v1/embeddings',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  anthropic: {
    // Anthropic doesn't have embeddings API, use Gemini as fallback
    url: 'https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent',
    model: 'text-embedding-004',
    dimensions: 768,
  },
};

// ============================================================================
// Embedding Generation
// ============================================================================

/**
 * Generate an embedding for the given text using the configured provider
 */
export async function generateEmbedding(
  text: string,
  config: LlmConfig
): Promise<EmbeddingResult> {
  if (!config.apiKey) {
    return { success: false, error: 'API key not configured' };
  }

  // Truncate text if too long (embeddings have token limits)
  const maxChars = 8000; // Safe limit for most embedding models
  const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text;

  try {
    switch (config.provider) {
      case 'gemini':
        return await generateGeminiEmbedding(truncatedText, config.apiKey);
      case 'openai':
        return await generateOpenAIEmbedding(truncatedText, config.apiKey);
      case 'anthropic':
        // Anthropic doesn't have embeddings, fall back to Gemini if key works
        return { success: false, error: 'Anthropic does not support embeddings. Please use Gemini or OpenAI.' };
      default:
        return { success: false, error: `Unsupported provider: ${config.provider}` };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error generating embedding',
    };
  }
}

/**
 * Generate embedding using Google Gemini API
 */
async function generateGeminiEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const response = await fetchWithRetry(
    `${EMBEDDING_CONFIG.gemini.url}?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `models/${EMBEDDING_CONFIG.gemini.model}`,
        content: {
          parts: [{ text }],
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData.error as { message?: string })?.message || `HTTP ${response.status}`;

    // Provide specific error messages based on status code
    switch (response.status) {
      case 401:
        return { success: false, error: 'Invalid API key. Please check your API key in settings.' };
      case 403:
        return { success: false, error: 'Your API key doesn\'t have access to the embedding model.' };
      case 404:
        return { success: false, error: 'Embedding model not found. It may have been deprecated.' };
      case 429:
        return { success: false, error: 'Rate limit exceeded. You\'ve hit your daily/minute limit. Try again later.' };
      case 503:
        return { success: false, error: 'The embedding model is currently overloaded. Please try again in a few moments.' };
      default:
        return { success: false, error: `Gemini API error (${response.status}): ${errorMessage}` };
    }
  }

  const data = await response.json();
  const embedding = data.embedding?.values;

  if (!embedding || !Array.isArray(embedding)) {
    return { success: false, error: 'Invalid embedding response from Gemini' };
  }

  return {
    success: true,
    embedding,
    usage: {
      tokens: Math.ceil(text.length / 4), // Rough estimate
    },
  };
}

/**
 * Generate embedding using OpenAI API
 */
async function generateOpenAIEmbedding(
  text: string,
  apiKey: string
): Promise<EmbeddingResult> {
  const response = await fetch(EMBEDDING_CONFIG.openai.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_CONFIG.openai.model,
      input: text,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const errorMessage = (errorData.error as { message?: string })?.message || `HTTP ${response.status}`;
    return { success: false, error: `OpenAI API error: ${errorMessage}` };
  }

  const data = await response.json();
  const embedding = data.data?.[0]?.embedding;

  if (!embedding || !Array.isArray(embedding)) {
    return { success: false, error: 'Invalid embedding response from OpenAI' };
  }

  return {
    success: true,
    embedding,
    usage: {
      tokens: data.usage?.total_tokens || Math.ceil(text.length / 4),
    },
  };
}

// ============================================================================
// Cosine Similarity
// ============================================================================

/**
 * Calculate cosine similarity between two vectors
 * Returns a value between -1 and 1 (higher = more similar)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Calculate semantic similarity between two texts using embeddings
 */
export async function calculateSemanticSimilarity(
  text1: string,
  text2: string,
  config: LlmConfig
): Promise<SimilarityResult> {
  // Generate embeddings in parallel
  const [embedding1, embedding2] = await Promise.all([
    generateEmbedding(text1, config),
    generateEmbedding(text2, config),
  ]);

  if (!embedding1.success || !embedding1.embedding) {
    return { success: false, error: embedding1.error || 'Failed to generate first embedding' };
  }

  if (!embedding2.success || !embedding2.embedding) {
    return { success: false, error: embedding2.error || 'Failed to generate second embedding' };
  }

  try {
    const similarity = cosineSimilarity(embedding1.embedding, embedding2.embedding);
    // Convert from [-1, 1] to [0, 1] for easier interpretation
    const normalizedSimilarity = (similarity + 1) / 2;
    return { success: true, similarity: normalizedSimilarity };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error calculating similarity',
    };
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Calculate similarity between a resume and multiple JD sections
 */
export async function calculateSectionSimilarities(
  resumeText: string,
  sections: Record<string, string>,
  config: LlmConfig
): Promise<Record<string, SimilarityResult>> {
  // Generate resume embedding once
  const resumeEmbedding = await generateEmbedding(resumeText, config);
  if (!resumeEmbedding.success || !resumeEmbedding.embedding) {
    const errorResult = { success: false, error: resumeEmbedding.error || 'Failed to generate resume embedding' };
    return Object.keys(sections).reduce((acc, key) => {
      acc[key] = errorResult;
      return acc;
    }, {} as Record<string, SimilarityResult>);
  }

  // Generate section embeddings in parallel
  const sectionKeys = Object.keys(sections);
  const sectionEmbeddings = await Promise.all(
    sectionKeys.map(key => generateEmbedding(sections[key], config))
  );

  // Calculate similarities
  const results: Record<string, SimilarityResult> = {};
  for (let i = 0; i < sectionKeys.length; i++) {
    const key = sectionKeys[i];
    const sectionEmbed = sectionEmbeddings[i];

    if (!sectionEmbed.success || !sectionEmbed.embedding) {
      results[key] = { success: false, error: sectionEmbed.error || 'Failed to generate section embedding' };
      continue;
    }

    try {
      const similarity = cosineSimilarity(resumeEmbedding.embedding, sectionEmbed.embedding);
      const normalizedSimilarity = (similarity + 1) / 2;
      results[key] = { success: true, similarity: normalizedSimilarity };
    } catch (error) {
      results[key] = {
        success: false,
        error: error instanceof Error ? error.message : 'Error calculating similarity',
      };
    }
  }

  return results;
}
