/**
 * Session Store
 *
 * Provides persistent storage for analysis sessions using IndexedDB.
 * Includes graceful fallback for SSR and unsupported browsers.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { AnalysisSession } from '../types/session';

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
 * Check if IndexedDB is available (browser environment)
 */
function isIndexedDBAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

/**
 * Get or create the database connection
 */
function getDB(): Promise<IDBPDatabase<JalaneaATSDB>> {
  if (!dbPromise) {
    dbPromise = openDB<JalaneaATSDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion, newVersion, transaction) {
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
    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.id, { ...session });
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
      return null;
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
      return [];
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
      return false;
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
      return null;
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
      return 0;
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

/**
 * Gets the appropriate store based on environment.
 * Returns IndexedDB store in browser, in-memory store for SSR.
 */
function getStore(): IndexedDBStore | InMemoryStore {
  if (isIndexedDBAvailable()) {
    if (!indexedDBStore) {
      indexedDBStore = new IndexedDBStore();
    }
    return indexedDBStore;
  }

  // Fallback for SSR or unsupported browsers
  if (!inMemoryStore) {
    inMemoryStore = new InMemoryStore();
  }
  return inMemoryStore;
}

/**
 * Convenience functions for common operations.
 * These maintain the same API as before for backward compatibility.
 */
export const sessionStore = {
  /**
   * Saves a session to persistent storage.
   */
  save: (session: AnalysisSession) => getStore().save(session),

  /**
   * Retrieves a session by ID.
   */
  get: (id: string) => getStore().get(id),

  /**
   * Returns all sessions, sorted by most recent first.
   */
  getAll: () => getStore().getAll(),

  /**
   * Returns recent sessions (limited for performance).
   */
  getRecent: (limit?: number) => {
    const store = getStore();
    if (store instanceof IndexedDBStore) {
      return store.getRecent(limit);
    }
    return store.getAll().then(sessions => sessions.slice(0, limit ?? 10));
  },

  /**
   * Deletes a session by ID.
   */
  delete: (id: string) => getStore().delete(id),

  /**
   * Deletes all sessions (privacy feature).
   */
  deleteAll: () => getStore().deleteAll(),

  /**
   * Updates a session with partial data.
   */
  update: (id: string, updates: Partial<AnalysisSession>) =>
    getStore().update(id, updates),

  /**
   * Returns the number of stored sessions.
   */
  getCount: async () => {
    const store = getStore();
    if (store instanceof IndexedDBStore) {
      return store.getCount();
    }
    return (store as InMemoryStore).count;
  },

  /**
   * Checks if IndexedDB is being used (vs fallback).
   */
  isUsingIndexedDB: () => isIndexedDBAvailable(),
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
  };
}
