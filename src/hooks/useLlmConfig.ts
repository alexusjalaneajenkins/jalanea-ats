'use client';

/**
 * useLlmConfig Hook
 *
 * React hook for managing LLM configuration state.
 * Handles loading, saving, and updating config from IndexedDB.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  LlmConfig,
  DEFAULT_LLM_CONFIG,
  loadLlmConfig,
  saveLlmConfig,
  updateConsent,
} from '@/lib/llm';
import { geminiProvider } from '@/lib/llm/gemini';

export interface UseLlmConfigReturn {
  config: LlmConfig | null;
  isLoading: boolean;
  isConfigured: boolean;
  hasConsented: boolean;
  updateConfig: (newConfig: LlmConfig) => Promise<void>;
  setConsent: (consented: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLlmConfig(): UseLlmConfigReturn {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const loaded = await loadLlmConfig();
      const configToUse = loaded || DEFAULT_LLM_CONFIG;
      setConfig(configToUse);

      // Sync gemini provider with loaded config
      if (configToUse.provider === 'gemini') {
        if (configToUse.apiKey) {
          geminiProvider.setApiKey(configToUse.apiKey);
        }
        if (configToUse.geminiModel) {
          geminiProvider.setModel(configToUse.geminiModel);
        }
      }
    } catch (error) {
      console.error('Failed to load LLM config:', error);
      setConfig(DEFAULT_LLM_CONFIG);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = useCallback(async (newConfig: LlmConfig) => {
    try {
      await saveLlmConfig(newConfig);
      setConfig(newConfig);

      // Sync gemini provider with new config
      if (newConfig.provider === 'gemini') {
        if (newConfig.apiKey) {
          geminiProvider.setApiKey(newConfig.apiKey);
        }
        if (newConfig.geminiModel) {
          geminiProvider.setModel(newConfig.geminiModel);
        }
      }
    } catch (error) {
      console.error('Failed to save LLM config:', error);
      throw error;
    }
  }, []);

  const setConsent = useCallback(async (consented: boolean) => {
    try {
      await updateConsent(consented);
      setConfig((prev) =>
        prev
          ? {
              ...prev,
              hasConsented: consented,
              consentTimestamp: consented ? Date.now() : undefined,
            }
          : null
      );
    } catch (error) {
      console.error('Failed to update consent:', error);
      throw error;
    }
  }, []);

  const refresh = useCallback(async () => {
    await loadConfig();
  }, []);

  return {
    config,
    isLoading,
    isConfigured: !!config?.apiKey,
    hasConsented: !!config?.hasConsented,
    updateConfig,
    setConsent,
    refresh,
  };
}

export default useLlmConfig;
