'use client';

/**
 * useLlmConfig Hook
 *
 * React hook for managing LLM configuration state.
 * Handles loading, saving, and updating config from IndexedDB.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  LlmConfig,
  DEFAULT_LLM_CONFIG,
  loadLlmConfig,
  saveLlmConfig,
  updateConsent,
} from '@/lib/llm';
import { geminiProvider } from '@/lib/llm/gemini';
import {
  isCurrentLlmOwnerOperation,
  StaleLlmOwnerOperationError,
} from '@/lib/llm/ownerOperation';

export interface UseLlmConfigReturn {
  config: LlmConfig | null;
  isLoading: boolean;
  isConfigured: boolean;
  hasConsented: boolean;
  updateConfig: (newConfig: LlmConfig) => Promise<void>;
  setConsent: (consented: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useLlmConfig(userId: string | null): UseLlmConfigReturn {
  const [config, setConfig] = useState<LlmConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadVersionRef = useRef(0);
  const activeOwnerRef = useRef<string | null>(userId);
  activeOwnerRef.current = userId;

  const isCurrentOwnerOperation = useCallback((
    requestedOwnerId: string | null,
    requestedVersion: number
  ) => isCurrentLlmOwnerOperation({
    activeOwnerId: activeOwnerRef.current,
    requestedOwnerId,
    activeVersion: loadVersionRef.current,
    requestedVersion,
  }), []);

  const clearInMemoryProvider = useCallback(() => {
    geminiProvider.setApiKey('');
  }, []);

  const loadConfig = useCallback(async () => {
    const ownerId = userId;
    if (activeOwnerRef.current !== ownerId) return;

    const loadVersion = loadVersionRef.current + 1;
    loadVersionRef.current = loadVersion;
    clearInMemoryProvider();

    if (!ownerId) {
      if (!isCurrentOwnerOperation(ownerId, loadVersion)) return;
      setConfig({ ...DEFAULT_LLM_CONFIG });
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setConfig(null);
      const loaded = await loadLlmConfig(ownerId);
      if (!isCurrentOwnerOperation(ownerId, loadVersion)) return;
      const configToUse = loaded || { ...DEFAULT_LLM_CONFIG };
      setConfig(configToUse);

      if (configToUse.provider === 'gemini') {
        geminiProvider.setApiKey(configToUse.apiKey);
        if (configToUse.geminiModel) {
          geminiProvider.setModel(configToUse.geminiModel);
        }
      }
    } catch (error) {
      if (!isCurrentOwnerOperation(ownerId, loadVersion)) return;
      console.error('Failed to load LLM config:', error);
      setConfig({ ...DEFAULT_LLM_CONFIG });
    } finally {
      if (isCurrentOwnerOperation(ownerId, loadVersion)) {
        setIsLoading(false);
      }
    }
  }, [clearInMemoryProvider, isCurrentOwnerOperation, userId]);

  // Clear the previous account's in-memory provider key before loading the
  // next owner-scoped record.
  useEffect(() => {
    void loadConfig();
    return () => {
      loadVersionRef.current += 1;
      if (activeOwnerRef.current === userId) {
        clearInMemoryProvider();
      }
    };
  }, [clearInMemoryProvider, loadConfig, userId]);

  const updateConfig = useCallback(async (newConfig: LlmConfig) => {
    const requestedOwnerId = userId;
    if (activeOwnerRef.current !== requestedOwnerId) {
      throw new StaleLlmOwnerOperationError();
    }

    const operationVersion = loadVersionRef.current + 1;
    loadVersionRef.current = operationVersion;
    setIsLoading(true);

    try {
      if (requestedOwnerId) {
        await saveLlmConfig(newConfig, requestedOwnerId);
      } else if (newConfig.apiKey) {
        throw new Error('Sign in before saving an API key');
      }

      if (!isCurrentOwnerOperation(requestedOwnerId, operationVersion)) {
        throw new StaleLlmOwnerOperationError();
      }

      setConfig(newConfig);

      // Sync gemini provider with new config
      if (newConfig.provider === 'gemini') {
        geminiProvider.setApiKey(newConfig.apiKey);
        if (newConfig.geminiModel) {
          geminiProvider.setModel(newConfig.geminiModel);
        }
      }
    } catch (error) {
      if (!(error instanceof StaleLlmOwnerOperationError)) {
        console.error('Failed to save LLM config:', error);
      }
      throw error;
    } finally {
      if (isCurrentOwnerOperation(requestedOwnerId, operationVersion)) {
        setIsLoading(false);
      }
    }
  }, [isCurrentOwnerOperation, userId]);

  const setConsent = useCallback(async (consented: boolean) => {
    const requestedOwnerId = userId;
    if (activeOwnerRef.current !== requestedOwnerId) {
      throw new StaleLlmOwnerOperationError();
    }

    const operationVersion = loadVersionRef.current + 1;
    loadVersionRef.current = operationVersion;

    try {
      if (requestedOwnerId) {
        await updateConsent(consented, requestedOwnerId);
      }

      if (!isCurrentOwnerOperation(requestedOwnerId, operationVersion)) {
        throw new StaleLlmOwnerOperationError();
      }

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
      if (!(error instanceof StaleLlmOwnerOperationError)) {
        console.error('Failed to update consent:', error);
      }
      throw error;
    }
  }, [isCurrentOwnerOperation, userId]);

  const refresh = useCallback(async () => {
    await loadConfig();
  }, [loadConfig]);

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
