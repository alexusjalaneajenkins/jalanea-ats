/**
 * LLM Config Storage
 *
 * Handles storage and retrieval of LLM configuration from IndexedDB.
 * API keys are stored locally only - never sent to any server.
 */

import { DEFAULT_LLM_CONFIG } from './types';
import type { LlmConfig } from './types';
import { getLlmConfigStorageKey } from './storageKey';
import { runWithStorageFallback } from '@/lib/storage/capability';
import {
  captureLocalDataGeneration,
  runLocalDataClear,
  runLocalDataMutation,
} from '../storage/mutationBarrier';
export {
  getLlmConfigStorageKey,
  LEGACY_LLM_CONFIG_STORAGE_KEY,
} from './storageKey';

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'jalanea-ats';
const STORE_NAME = 'llm-config';
const DB_VERSION = 2; // Bumped to add llm-config store
const ephemeralConfigs = new Map<string, LlmConfig>();

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
export async function saveLlmConfig(
  config: LlmConfig,
  userId: string,
  expectedGeneration?: number
): Promise<void> {
  const storageKey = getLlmConfigStorageKey(userId);
  await runLocalDataMutation(
    () =>
      runWithStorageFallback(
        async () => {
          const db = await openDatabase();
          const transaction = db.transaction(STORE_NAME, 'readwrite');
          const store = transaction.objectStore(STORE_NAME);
          const configWithId = { ...config, id: storageKey };

          await new Promise<void>((resolve, reject) => {
            const request = store.put(configWithId);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve();
          });
          db.close();
          ephemeralConfigs.set(storageKey, { ...config });
        },
        async () => {
          ephemeralConfigs.set(storageKey, { ...config });
        }
      ),
    expectedGeneration
  );
}

/**
 * Load LLM configuration from IndexedDB
 */
export async function loadLlmConfig(
  userId: string,
  expectedGeneration?: number
): Promise<LlmConfig | null> {
  const storageKey = getLlmConfigStorageKey(userId);
  return runLocalDataMutation(
    () =>
      runWithStorageFallback(
        async () => {
          const db = await openDatabase();
          const transaction = db.transaction(STORE_NAME, 'readonly');
          const store = transaction.objectStore(STORE_NAME);

          return new Promise<LlmConfig | null>((resolve, reject) => {
            const request = store.get(storageKey);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
              db.close();
              const result = request.result;
              if (result) {
                const { id: _id, ...config } = result;
                void _id;
                ephemeralConfigs.set(storageKey, { ...config } as LlmConfig);
                resolve(config as LlmConfig);
              } else {
                resolve(null);
              }
            };
          });
        },
        async () => {
          const config = ephemeralConfigs.get(storageKey);
          return config ? { ...config } : null;
        }
      ),
    expectedGeneration
  );
}

/**
 * Delete LLM configuration from IndexedDB
 */
export async function deleteLlmConfig(userId?: string): Promise<void> {
  const storageKey = userId ? getLlmConfigStorageKey(userId) : null;
  const deleteOperation = () =>
    runWithStorageFallback(
      async () => {
        const db = await openDatabase();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        await new Promise<void>((resolve, reject) => {
          const request = storageKey
            ? store.delete(storageKey)
            : store.clear();
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve();
        });
        db.close();
        if (storageKey) {
          ephemeralConfigs.delete(storageKey);
        } else {
          ephemeralConfigs.clear();
        }
      },
      async () => {
        if (storageKey) {
          ephemeralConfigs.delete(storageKey);
        } else {
          ephemeralConfigs.clear();
        }
      }
    );

  if (storageKey) {
    await runLocalDataMutation(deleteOperation);
  } else {
    await runLocalDataClear(deleteOperation);
  }
}

/**
 * Check if LLM is configured
 */
export async function isLlmConfigured(userId: string): Promise<boolean> {
  const config = await loadLlmConfig(userId);
  return config !== null && config.apiKey.length > 0;
}

/**
 * Check if user has consented to LLM features
 */
export async function hasUserConsented(userId: string): Promise<boolean> {
  const config = await loadLlmConfig(userId);
  return config !== null && config.hasConsented;
}

/**
 * Update consent status
 */
export async function updateConsent(
  consented: boolean,
  userId: string
): Promise<void> {
  const storageGeneration = captureLocalDataGeneration();
  let config = await loadLlmConfig(userId, storageGeneration);

  if (!config) {
    config = { ...DEFAULT_LLM_CONFIG };
  }

  config.hasConsented = consented;
  config.consentTimestamp = consented ? Date.now() : undefined;

  await saveLlmConfig(config, userId, storageGeneration);
}

/**
 * Get or create default config
 */
export async function getOrCreateConfig(userId: string): Promise<LlmConfig> {
  const storageGeneration = captureLocalDataGeneration();
  let config = await loadLlmConfig(userId, storageGeneration);

  if (!config) {
    config = { ...DEFAULT_LLM_CONFIG };
    await saveLlmConfig(config, userId, storageGeneration);
  }

  return config;
}

/**
 * Legacy browser-wide records are deliberately never returned for a signed-in
 * user because they cannot be attributed safely. This key is exported only for
 * regression tests and complete local-data erasure.
 */
