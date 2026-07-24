import {
  DEFAULT_GEMINI_MODEL,
  DEFAULT_LLM_CONFIG,
  type GeminiModel,
  type LlmConfig,
} from './types.ts';

export interface ByokDraft {
  apiKey: string;
  geminiModel: GeminiModel;
  keyMode: 'demo' | 'byok';
  preferences: LlmConfig['preferences'];
}

export function createByokDraft(config?: LlmConfig): ByokDraft {
  return {
    apiKey: config?.apiKey || '',
    geminiModel: config?.geminiModel || DEFAULT_GEMINI_MODEL,
    keyMode: config?.apiKey ? 'byok' : 'demo',
    preferences: {
      ...(config?.preferences || DEFAULT_LLM_CONFIG.preferences),
    },
  };
}
