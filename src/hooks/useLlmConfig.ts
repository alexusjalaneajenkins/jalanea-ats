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
      setConfig(loaded || DEFAULT_LLM_CONFIG);
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
