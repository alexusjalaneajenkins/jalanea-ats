/**
 * Session Store
 *
 * Provides persistent storage for analysis sessions using IndexedDB.
 * Includes graceful fallback for SSR and unsupported browsers.
 */

import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';
import type { AnalysisSession } from '../types/session';
import {
  isPersistentStorageActive,
  runWithStorageFallback,
} from './capability';
import { createKeyedWriteQueue } from './writeQueue';
import {
  runLocalDataClear,
  runLocalDataMutation,
} from './mutationBarrier';

// =============================================================================
// Database Schema
// =============================================================================

const DB_NAME = 'jalanea-ats-sessions';
const DB_VERSION = 1;
const STORE_NAME = 'sessions';

/**
 * IndexedDB schema definition for type safety
 */
interface JalaneaATSDB extends DBSchema {
  sessions: {
    key: string;
    value: AnalysisSession;
    indexes: {
      'by-createdAt': string;
      'by-parseHealth': number;
    };
  };
}

// =============================================================================
// Database Initialization
// =============================================================================

let dbPromise: Promise<IDBPDatabase<JalaneaATSDB>> | null = null;

/**
 * Get or create the database connection
 */
function getDB(): Promise<IDBPDatabase<JalaneaATSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JalaneaATSDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        // Version 1: Initial schema
        if (oldVersion < 1) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Index for sorting by creation date
          store.createIndex('by-createdAt', 'createdAt');

          // Index for filtering/sorting by parse health score
          store.createIndex('by-parseHealth', 'scores.parseHealth');
        }

        // Future migrations would go here:
        // if (oldVersion < 2) { ... }
      },
      blocked() {
        console.warn('[SessionStore] Database upgrade blocked by another tab');
      },
      blocking() {
        console.warn('[SessionStore] This tab is blocking a database upgrade');
      },
      terminated() {
        console.error('[SessionStore] Database connection terminated unexpectedly');
        dbPromise = null; // Allow reconnection
      },
    });
  }
  return dbPromise;
}

// =============================================================================
// In-Memory Fallback Store
// =============================================================================

/**
 * In-memory fallback for SSR or when IndexedDB is unavailable
 */
class InMemoryStore {
  private sessions: Map<string, AnalysisSession> = new Map();

  async save(session: AnalysisSession): Promise<void> {
    this.sessions.set(session.id, {
      ...session,
      updatedAt: new Date().toISOString(),
    });
  }

  async get(id: string): Promise<AnalysisSession | null> {
    const session = this.sessions.get(id);
    return session ? { ...session } : null;
  }

  async getAll(): Promise<AnalysisSession[]> {
    return Array.from(this.sessions.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async delete(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  async deleteAll(): Promise<void> {
    this.sessions.clear();
  }

  async update(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    const updated = {
      ...session,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(id, updated);
    return { ...updated };
  }

  async updateIf(
    id: string,
    predicate: (session: AnalysisSession) => boolean,
    updates: Partial<AnalysisSession>
  ): Promise<AnalysisSession | null> {
    const session = this.sessions.get(id);
    if (!session || !predicate(session)) return null;
    return this.update(id, updates);
  }

  get count(): number {
    return this.sessions.size;
  }
}

// =============================================================================
// IndexedDB Session Store
// =============================================================================

/**
 * IndexedDB-backed session storage
 */
class IndexedDBStore {
  /**
   * Saves a session to IndexedDB.
   */
  async save(session: AnalysisSession): Promise<void> {
    try {
      const db = await getDB();
      const updatedSession = {
        ...session,
        updatedAt: new Date().toISOString(),
      };
      await db.put(STORE_NAME, updatedSession);
    } catch (error) {
      console.error('[SessionStore] Failed to save session:', error);
      throw new Error('Failed to save session. Storage may be full or unavailable.');
    }
  }

  /**
   * Retrieves a session by ID.
   */
  async get(id: string): Promise<AnalysisSession | null> {
    try {
      const db = await getDB();
      const session = await db.get(STORE_NAME, id);
      return session ?? null;
    } catch (error) {
      console.error('[SessionStore] Failed to get session:', error);
      throw error;
    }
  }

  /**
   * Applies an update only if the latest stored session still matches the
   * caller's expected input.
   */
  async updateIf(
    id: string,
    predicate: (session: AnalysisSession) => boolean,
    updates: Partial<AnalysisSession>
  ): Promise<AnalysisSession | null> {
    try {
      const db = await getDB();
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const existing = await transaction.store.get(id);
      if (!existing || !predicate(existing)) {
        await transaction.done;
        return null;
      }

      const updated: AnalysisSession = {
        ...existing,
        ...updates,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };

      await transaction.store.put(updated);
      await transaction.done;
      return updated;
    } catch (error) {
      console.error('[SessionStore] Failed to conditionally update session:', error);
      throw error;
    }
  }

  /**
   * Returns all sessions, sorted by most recent first.
   */
  async getAll(): Promise<AnalysisSession[]> {
    try {
      const db = await getDB();
      const sessions = await db.getAll(STORE_NAME);

      // Sort by createdAt descending (most recent first)
      return sessions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } catch (error) {
      console.error('[SessionStore] Failed to get all sessions:', error);
      throw error;
    }
  }

  /**
   * Returns recent sessions (limited count for performance).
   */
  async getRecent(limit: number = 10): Promise<AnalysisSession[]> {
    const all = await this.getAll();
    return all.slice(0, limit);
  }

  /**
   * Deletes a session by ID.
   */
  async delete(id: string): Promise<boolean> {
    try {
      const db = await getDB();
      const existing = await db.get(STORE_NAME, id);
      if (!existing) return false;

      await db.delete(STORE_NAME, id);
      return true;
    } catch (error) {
      console.error('[SessionStore] Failed to delete session:', error);
      throw error;
    }
  }

  /**
   * Deletes all sessions (privacy feature).
   */
  async deleteAll(): Promise<void> {
    try {
      const db = await getDB();
      await db.clear(STORE_NAME);
    } catch (error) {
      console.error('[SessionStore] Failed to delete all sessions:', error);
      throw new Error('Failed to clear session history.');
    }
  }

  /**
   * Updates a session with partial data.
   */
  async update(id: string, updates: Partial<AnalysisSession>): Promise<AnalysisSession | null> {
    try {
      const db = await getDB();
      const existing = await db.get(STORE_NAME, id);
      if (!existing) return null;

      const updated: AnalysisSession = {
        ...existing,
        ...updates,
        id: existing.id, // Ensure ID cannot be changed
        createdAt: existing.createdAt, // Preserve original creation time
        updatedAt: new Date().toISOString(),
      };

      await db.put(STORE_NAME, updated);
      return updated;
    } catch (error) {
      console.error('[SessionStore] Failed to update session:', error);
      throw error;
    }
  }

  /**
   * Returns the number of stored sessions.
   */
  async getCount(): Promise<number> {
    try {
      const db = await getDB();
      return await db.count(STORE_NAME);
    } catch (error) {
      console.error('[SessionStore] Failed to count sessions:', error);
      throw error;
    }
  }

  /**
   * Checks if a session exists.
   */
  async exists(id: string): Promise<boolean> {
    const session = await this.get(id);
    return session !== null;
  }
}

// =============================================================================
// Store Factory & Exports
// =============================================================================

// Singleton instances
let indexedDBStore: IndexedDBStore | null = null;
let inMemoryStore: InMemoryStore | null = null;
const enqueueSessionWrite = createKeyedWriteQueue();

/**
 * Gets the appropriate store based on environment.
 * Returns IndexedDB store in browser, in-memory store for SSR.
 */
function getIndexedDBStore(): IndexedDBStore {
  if (!indexedDBStore) {
    indexedDBStore = new IndexedDBStore();
  }
  return indexedDBStore;
}

function getInMemoryStore(): InMemoryStore {
  if (!inMemoryStore) {
    inMemoryStore = new InMemoryStore();
  }
  return inMemoryStore;
}

function withSessionStorage<T>(
  persistentOperation: (store: IndexedDBStore) => Promise<T>,
  ephemeralOperation: (store: InMemoryStore) => Promise<T>
): Promise<T> {
  return runWithStorageFallback(
    () => persistentOperation(getIndexedDBStore()),
    () => ephemeralOperation(getInMemoryStore())
  );
}

/**
 * Convenience functions for common operations.
 * These maintain the same API as before for backward compatibility.
 */
export const sessionStore = {
  /**
   * Saves a session to persistent storage.
   */
  save: (session: AnalysisSession) =>
    runLocalDataMutation(() =>
      enqueueSessionWrite(session.id, () =>
        withSessionStorage(
          async (store) => {
            await store.save(session);
            await getInMemoryStore().save(session);
          },
          (store) => store.save(session)
        )
      )
    ),

  /**
   * Retrieves a session by ID.
   */
  get: (id: string) =>
    runLocalDataMutation(() =>
      withSessionStorage(
        async (store) => {
          const session = await store.get(id);
          if (session) await getInMemoryStore().save(session);
          return session;
        },
        (store) => store.get(id)
      )
    ),

  /**
   * Returns all sessions, sorted by most recent first.
   */
  getAll: () =>
    runLocalDataMutation(() =>
      withSessionStorage(
        async (store) => {
          const sessions = await store.getAll();
          await Promise.all(
            sessions.map((session) => getInMemoryStore().save(session))
          );
          return sessions;
        },
        (store) => store.getAll()
      )
    ),

  /**
   * Returns recent sessions (limited for performance).
   */
  getRecent: (limit?: number) =>
    runLocalDataMutation(() =>
      withSessionStorage(
        async (store) => {
          const sessions = await store.getRecent(limit);
          await Promise.all(
            sessions.map((session) => getInMemoryStore().save(session))
          );
          return sessions;
        },
        (store) =>
          store.getAll().then((sessions) => sessions.slice(0, limit ?? 10))
      )
    ),

  /**
   * Deletes a session by ID.
   */
  delete: (id: string) =>
    runLocalDataMutation(() =>
      enqueueSessionWrite(id, () =>
        withSessionStorage(
          async (store) => {
            const deleted = await store.delete(id);
            await getInMemoryStore().delete(id);
            return deleted;
          },
          (store) => store.delete(id)
        )
      )
    ),

  /**
   * Deletes all sessions (privacy feature).
   */
  deleteAll: () =>
    runLocalDataClear(() =>
      withSessionStorage(
        async (store) => {
          await store.deleteAll();
          await getInMemoryStore().deleteAll();
        },
        (store) => store.deleteAll()
      )
    ),

  /**
   * Updates a session with partial data.
   */
  update: (id: string, updates: Partial<AnalysisSession>) =>
    runLocalDataMutation(() =>
      enqueueSessionWrite(id, () =>
        withSessionStorage(
          async (store) => {
            const session = await store.update(id, updates);
            if (session) await getInMemoryStore().save(session);
            return session;
          },
          (store) => store.update(id, updates)
        )
      )
    ),

  /**
   * Updates only when the latest stored session still represents the input
   * that asynchronous work was started for.
   */
  updateIf: (
    id: string,
    predicate: (session: AnalysisSession) => boolean,
    updates: Partial<AnalysisSession>
  ) =>
    runLocalDataMutation(() =>
      enqueueSessionWrite(id, () =>
        withSessionStorage(
          async (store) => {
            const session = await store.updateIf(id, predicate, updates);
            if (session) await getInMemoryStore().save(session);
            return session;
          },
          (store) => store.updateIf(id, predicate, updates)
        )
      )
    ),

  /**
   * Returns the number of stored sessions.
   */
  getCount: () =>
    withSessionStorage(
      (store) => store.getCount(),
      async (store) => store.count
    ),

  /**
   * Checks if IndexedDB is being used (vs fallback).
   */
  isUsingIndexedDB: () => isPersistentStorageActive(),
};

// Legacy export for backward compatibility
export function getSessionStore() {
  return {
    save: sessionStore.save,
    get: sessionStore.get,
    getAll: sessionStore.getAll,
    delete: sessionStore.delete,
    deleteAll: sessionStore.deleteAll,
    update: sessionStore.update,
    updateIf: sessionStore.updateIf,
  };
}
