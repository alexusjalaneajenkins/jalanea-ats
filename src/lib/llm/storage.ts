/**
 * LLM Config Storage
 *
 * Handles storage and retrieval of LLM configuration from IndexedDB.
 * API keys are stored locally only - never sent to any server.
 */

import { LlmConfig, DEFAULT_LLM_CONFIG } from './types';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'jalanea-ats';
const STORE_NAME = 'llm-config';
const CONFIG_KEY = 'config';
const DB_VERSION = 2; // Bumped to add llm-config store

// ============================================================================
// IndexedDB Helpers
// ============================================================================

/**
 * Open the IndexedDB database
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create llm-config store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }

      // Ensure other stores exist (for compatibility)
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
    };
  });
}

// ============================================================================
// Storage Functions
// ============================================================================

/**
 * Save LLM configuration to IndexedDB
 */
export async function saveLlmConfig(config: LlmConfig): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Store with a fixed key so we can easily retrieve it
    const configWithId = { ...config, id: CONFIG_KEY };

    return new Promise((resolve, reject) => {
      const request = store.put(configWithId);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to save LLM config:', error);
    throw error;
  }
}

/**
 * Load LLM configuration from IndexedDB
 */
export async function loadLlmConfig(): Promise<LlmConfig | null> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get(CONFIG_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        const result = request.result;
        if (result) {
          // Remove the id field we added for storage
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...config } = result;
          resolve(config as LlmConfig);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('Failed to load LLM config:', error);
    return null;
  }
}

/**
 * Delete LLM configuration from IndexedDB
 */
export async function deleteLlmConfig(): Promise<void> {
  try {
    const db = await openDatabase();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(CONFIG_KEY);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        db.close();
        resolve();
      };
    });
  } catch (error) {
    console.error('Failed to delete LLM config:', error);
    throw error;
  }
}

/**
 * Check if LLM is configured
 */
export async function isLlmConfigured(): Promise<boolean> {
  const config = await loadLlmConfig();
  return config !== null && config.apiKey.length > 0;
}

/**
 * Check if user has consented to LLM features
 */
export async function hasUserConsented(): Promise<boolean> {
  const config = await loadLlmConfig();
  return config !== null && config.hasConsented;
}

/**
 * Update consent status
 */
export async function updateConsent(consented: boolean): Promise<void> {
  let config = await loadLlmConfig();

  if (!config) {
    config = { ...DEFAULT_LLM_CONFIG };
  }

  config.hasConsented = consented;
  config.consentTimestamp = consented ? Date.now() : undefined;

  await saveLlmConfig(config);
}

/**
 * Get or create default config
 */
export async function getOrCreateConfig(): Promise<LlmConfig> {
  let config = await loadLlmConfig();

  if (!config) {
    config = { ...DEFAULT_LLM_CONFIG };
    await saveLlmConfig(config);
  }

  return config;
}
