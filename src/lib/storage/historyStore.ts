/**
 * History Store
 *
 * Provides persistent storage for analysis history using IndexedDB.
 * Tracks analyses over time and allows comparison/improvement tracking.
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import {
  generateResumeHash,
} from '../types/history';
import type {
  HistoryEntry,
  ResumeGroup,
  HistoryStats,
  HistoryExport,
  ScoreSnapshot,
  JobMetadata,
  TargetingHistorySummary,
} from '../types/history';
import type { AnalysisSession } from '../types/session';
import {
  isPersistentStorageActive,
  runWithStorageFallback,
} from './capability';
import {
  captureLocalDataGeneration,
  runLocalDataClear,
  runLocalDataMutation,
} from './mutationBarrier';

// =============================================================================
// Database Schema
// =============================================================================

const DB_NAME = 'jalanea-ats-history';
const DB_VERSION = 1;
const STORE_NAME = 'history';

/**
 * IndexedDB schema definition for type safety
 */
interface HistoryDB extends DBSchema {
  history: {
    key: string;
    value: HistoryEntry;
    indexes: {
      'by-timestamp': string;
      'by-resumeHash': string;
      'by-sessionId': string;
    };
  };
}

// =============================================================================
// Database Initialization
// =============================================================================

let dbPromise: Promise<IDBPDatabase<HistoryDB>> | null = null;

/**
 * Get or create the database connection
 */
function getDB(): Promise<IDBPDatabase<HistoryDB>> {
  if (!dbPromise) {
    dbPromise = openDB<HistoryDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('by-timestamp', 'timestamp');
          store.createIndex('by-resumeHash', 'resumeHash');
          store.createIndex('by-sessionId', 'sessionId');
        }
      },
      blocked() {
        console.warn('[HistoryStore] Database upgrade blocked by another tab');
      },
      blocking() {
        console.warn('[HistoryStore] This tab is blocking a database upgrade');
      },
      terminated() {
        console.error('[HistoryStore] Database connection terminated unexpectedly');
        dbPromise = null;
      },
    });
  }
  return dbPromise;
}

// =============================================================================
// In-Memory Fallback Store
// =============================================================================

class InMemoryHistoryStore {
  private entries: Map<string, HistoryEntry> = new Map();

  async save(entry: HistoryEntry): Promise<void> {
    this.entries.set(entry.id, { ...entry });
  }

  async get(id: string): Promise<HistoryEntry | null> {
    const entry = this.entries.get(id);
    return entry ? { ...entry } : null;
  }

  async getAll(): Promise<HistoryEntry[]> {
    return Array.from(this.entries.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getByResumeHash(hash: string): Promise<HistoryEntry[]> {
    return Array.from(this.entries.values())
      .filter(e => e.resumeHash === hash)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async deleteAll(): Promise<void> {
    this.entries.clear();
  }

  async getCount(): Promise<number> {
    return this.entries.size;
  }
}

// =============================================================================
// IndexedDB History Store
// =============================================================================

class IndexedDBHistoryStore {
  /**
   * Saves a history entry
   */
  async save(entry: HistoryEntry): Promise<void> {
    try {
      const db = await getDB();
      await db.put(STORE_NAME, entry);
    } catch (error) {
      console.error('[HistoryStore] Failed to save entry:', error);
      throw new Error('Failed to save history entry.');
    }
  }

  /**
   * Gets a history entry by ID
   */
  async get(id: string): Promise<HistoryEntry | null> {
    try {
      const db = await getDB();
      const entry = await db.get(STORE_NAME, id);
      return entry ?? null;
    } catch (error) {
      console.error('[HistoryStore] Failed to get entry:', error);
      throw error;
    }
  }

  /**
   * Gets all history entries, sorted by most recent first
   */
  async getAll(): Promise<HistoryEntry[]> {
    try {
      const db = await getDB();
      const entries = await db.getAll(STORE_NAME);
      return entries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('[HistoryStore] Failed to get all entries:', error);
      throw error;
    }
  }

  /**
   * Gets entries for a specific resume (by hash)
   */
  async getByResumeHash(hash: string): Promise<HistoryEntry[]> {
    try {
      const db = await getDB();
      const entries = await db.getAllFromIndex(STORE_NAME, 'by-resumeHash', hash);
      return entries.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    } catch (error) {
      console.error('[HistoryStore] Failed to get entries by resume hash:', error);
      throw error;
    }
  }

  /**
   * Gets entry by session ID
   */
  async getBySessionId(sessionId: string): Promise<HistoryEntry | null> {
    try {
      const db = await getDB();
      const entries = await db.getAllFromIndex(STORE_NAME, 'by-sessionId', sessionId);
      return entries[0] ?? null;
    } catch (error) {
      console.error('[HistoryStore] Failed to get entry by session ID:', error);
      throw error;
    }
  }

  /**
   * Gets recent entries (limited)
   */
  async getRecent(limit: number = 20): Promise<HistoryEntry[]> {
    const all = await this.getAll();
    return all.slice(0, limit);
  }

  /**
   * Deletes a history entry
   */
  async delete(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      const existing = await db.get(STORE_NAME, id);
      if (!existing) return false;
      await db.delete(STORE_NAME, id);
      return true;
    } catch (error) {
      console.error('[HistoryStore] Failed to delete entry:', error);
      throw error;
    }
  }

  /**
   * Deletes all history entries
   */
  async deleteAll(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.error('[HistoryStore] Failed to clear history:', error);
      throw new Error('Failed to clear history.');
    }
  }

  /**
   * Gets entry count
   */
  async getCount(): Promise<number> {
    try {
      const db = await getDB();
      return await db.count(STORE_NAME);
    } catch (error) {
      console.error('[HistoryStore] Failed to count entries:', error);
      throw error;
    }
  }
}

// =============================================================================
// Store Factory
// =============================================================================

let indexedDBStore: IndexedDBHistoryStore | null = null;
let inMemoryStore: InMemoryHistoryStore | null = null;

function getIndexedDBStore(): IndexedDBHistoryStore {
  if (!indexedDBStore) {
    indexedDBStore = new IndexedDBHistoryStore();
  }
  return indexedDBStore;
}

function getInMemoryStore(): InMemoryHistoryStore {
  if (!inMemoryStore) {
    inMemoryStore = new InMemoryHistoryStore();
  }
  return inMemoryStore;
}

function withHistoryStorage<T>(
  persistentOperation: (store: IndexedDBHistoryStore) => Promise<T>,
  ephemeralOperation: (store: InMemoryHistoryStore) => Promise<T>
): Promise<T> {
  return runWithStorageFallback(
    () => persistentOperation(getIndexedDBStore()),
    () => ephemeralOperation(getInMemoryStore())
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a history entry from an analysis session
 */
export function createHistoryEntry(
  session: AnalysisSession,
  scores: ScoreSnapshot,
  job?: JobMetadata,
  existingId?: string
): HistoryEntry {
  const resumeHash = generateResumeHash(session.resume.extractedText);
  const targeting: TargetingHistorySummary | undefined = session.targeting
    ? {
        targetTitle: session.targeting.parsedJobData.titleHint || undefined,
        targetCompany: session.targeting.parsedJobData.companyHint || undefined,
        focusAreas: session.targeting.tailoredDraft.focusAreas.slice(0, 3),
        iterationCount: session.targeting.iterationHistory.length,
        readiness: session.targeting.atsReview.readiness,
      }
    : undefined;

  return {
    id: existingId || `history-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    timestamp: new Date().toISOString(),
    resumeFileName: session.resume.fileName,
    resumeFileSize: session.resume.fileSizeBytes,
    resumeFileType: session.resume.fileType,
    resumeHash,
    scores,
    job,
    targeting,
    sessionId: session.id,
  };
}

/**
 * Groups history entries by resume
 */
export function groupByResume(entries: HistoryEntry[]): ResumeGroup[] {
  const groups = new Map<string, HistoryEntry[]>();

  for (const entry of entries) {
    const existing = groups.get(entry.resumeHash) || [];
    existing.push(entry);
    groups.set(entry.resumeHash, existing);
  }

  const result: ResumeGroup[] = [];

  for (const [hash, groupEntries] of groups) {
    // Sort by timestamp descending
    const sorted = groupEntries.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const latest = sorted[0];
    const oldest = sorted[sorted.length - 1];

    let improvement: ResumeGroup['improvement'] = undefined;

    if (sorted.length > 1) {
      const change = latest.scores.parseHealth - oldest.scores.parseHealth;
      improvement = {
        parseHealth: change,
        direction: change > 0 ? 'improved' : change < 0 ? 'declined' : 'unchanged',
      };
    }

    result.push({
      resumeHash: hash,
      resumeFileName: latest.resumeFileName,
      entries: sorted,
      latestEntry: latest,
      improvement,
    });
  }

  // Sort by most recent activity
  return result.sort(
    (a, b) =>
      new Date(b.latestEntry.timestamp).getTime() -
      new Date(a.latestEntry.timestamp).getTime()
  );
}

/**
 * Calculates history statistics
 */
export function calculateStats(entries: HistoryEntry[]): HistoryStats {
  if (entries.length === 0) {
    return {
      totalAnalyses: 0,
      uniqueResumes: 0,
      averageParseHealth: 0,
      mostRecentAnalysis: null,
    };
  }

  const uniqueHashes = new Set(entries.map(e => e.resumeHash));
  const totalParseHealth = entries.reduce((sum, e) => sum + e.scores.parseHealth, 0);

  const sorted = [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return {
    totalAnalyses: entries.length,
    uniqueResumes: uniqueHashes.size,
    averageParseHealth: Math.round(totalParseHealth / entries.length),
    mostRecentAnalysis: sorted[0]?.timestamp || null,
  };
}

// =============================================================================
// Export/Import Functions
// =============================================================================

/**
 * Exports history to a JSON file
 */
export async function exportHistory(): Promise<HistoryExport> {
  const entries = await withHistoryStorage(
    (store) => store.getAll(),
    (store) => store.getAll()
  );
  return {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    entries,
  };
}

/**
 * Imports history from a JSON export
 */
export async function importHistory(data: HistoryExport): Promise<number> {
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error('Invalid history export format');
  }

  let imported = 0;
  const storageGeneration = captureLocalDataGeneration();
  for (const entry of data.entries) {
    // Validate entry has required fields
    if (entry.id && entry.timestamp && entry.resumeHash && entry.scores) {
      await historyStore.save(entry, storageGeneration);
      imported++;
    }
  }

  return imported;
}

// =============================================================================
// Public API
// =============================================================================

export const historyStore = {
  /**
   * Saves a history entry
   */
  save: (entry: HistoryEntry, expectedGeneration?: number) =>
    runLocalDataMutation(
      () =>
        withHistoryStorage(
          async (store) => {
            await store.save(entry);
            await getInMemoryStore().save(entry);
          },
          (store) => store.save(entry)
        ),
      expectedGeneration
    ),

  /**
   * Saves from an analysis session with scores
   */
  saveFromSession: async (
    session: AnalysisSession,
    scores: ScoreSnapshot,
    job?: JobMetadata
  ): Promise<HistoryEntry> => {
    const storageGeneration = captureLocalDataGeneration();
    const entry = createHistoryEntry(session, scores, job);
    await historyStore.save(entry, storageGeneration);
    return entry;
  },

  /**
   * Creates or updates the single history entry for a session.
   */
  upsertFromSession: async (
    session: AnalysisSession,
    scores: ScoreSnapshot,
    job?: JobMetadata
  ): Promise<HistoryEntry> => {
    const storageGeneration = captureLocalDataGeneration();
    const existing = await historyStore.getBySessionId(
      session.id,
      storageGeneration
    );
    const entry = createHistoryEntry(session, scores, job, existing?.id);
    await historyStore.save(entry, storageGeneration);
    return entry;
  },

  /**
   * Gets a history entry by ID
   */
  get: (id: string) =>
    runLocalDataMutation(() =>
      withHistoryStorage(
        async (store) => {
          const entry = await store.get(id);
          if (entry) await getInMemoryStore().save(entry);
          return entry;
        },
        (store) => store.get(id)
      )
    ),

  /**
   * Gets all history entries
   */
  getAll: () =>
    runLocalDataMutation(() =>
      withHistoryStorage(
        async (store) => {
          const entries = await store.getAll();
          await Promise.all(
            entries.map((entry) => getInMemoryStore().save(entry))
          );
          return entries;
        },
        (store) => store.getAll()
      )
    ),

  /**
   * Gets entries for a specific resume
   */
  getByResumeHash: (hash: string) =>
    runLocalDataMutation(() =>
      withHistoryStorage(
        async (store) => {
          const entries = await store.getByResumeHash(hash);
          await Promise.all(
            entries.map((entry) => getInMemoryStore().save(entry))
          );
          return entries;
        },
        (store) => store.getByResumeHash(hash)
      )
    ),

  /**
   * Gets entry by session ID
   */
  getBySessionId: (
    sessionId: string,
    expectedGeneration?: number
  ) =>
    runLocalDataMutation(
      () =>
        withHistoryStorage(
          async (store) => {
            const entry = await store.getBySessionId(sessionId);
            if (entry) await getInMemoryStore().save(entry);
            return entry;
          },
          (store) =>
            store
              .getAll()
              .then((entries) =>
                entries.find((entry) => entry.sessionId === sessionId) ?? null
              )
        ),
      expectedGeneration
    ),

  /**
   * Gets recent history entries
   */
  getRecent: (limit?: number) =>
    runLocalDataMutation(() =>
      withHistoryStorage(
        async (store) => {
          const entries = await store.getRecent(limit);
          await Promise.all(
            entries.map((entry) => getInMemoryStore().save(entry))
          );
          return entries;
        },
        (store) =>
          store.getAll().then((entries) => entries.slice(0, limit ?? 20))
      )
    ),

  /**
   * Gets history grouped by resume
   */
  getGrouped: async (): Promise<ResumeGroup[]> => {
    const entries = await historyStore.getAll();
    return groupByResume(entries);
  },

  /**
   * Gets history statistics
   */
  getStats: async (): Promise<HistoryStats> => {
    const entries = await historyStore.getAll();
    return calculateStats(entries);
  },

  /**
   * Deletes a history entry
   */
  delete: (id: string) =>
    runLocalDataMutation(() =>
      withHistoryStorage(
        async (store) => {
          const deleted = await store.delete(id);
          await getInMemoryStore().delete(id);
          return deleted;
        },
        (store) => store.delete(id)
      )
    ),

  /**
   * Deletes all history
   */
  deleteAll: () =>
    runLocalDataClear(() =>
      withHistoryStorage(
        async (store) => {
          await store.deleteAll();
          await getInMemoryStore().deleteAll();
        },
        (store) => store.deleteAll()
      )
    ),

  /**
   * Gets entry count
   */
  getCount: () =>
    withHistoryStorage(
      (store) => store.getCount(),
      (store) => store.getCount()
    ),

  /**
   * Exports history
   */
  export: exportHistory,

  /**
   * Imports history
   */
  import: importHistory,

  /**
   * Checks if IndexedDB is being used
   */
  isUsingIndexedDB: () => isPersistentStorageActive(),
};
