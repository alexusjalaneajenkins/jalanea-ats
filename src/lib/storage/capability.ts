export type StoragePersistenceMode =
  | 'checking'
  | 'persistent'
  | 'ephemeral';

export interface StorageCapabilitySnapshot {
  mode: StoragePersistenceMode;
  reason: string | null;
}

type Listener = () => void;

const PROBE_DB_NAME = 'jalanea-ats-storage-probe';
const PROBE_STORE_NAME = 'capability';
const PROBE_TIMEOUT_MS = 2_500;

let snapshot: StorageCapabilitySnapshot = {
  mode: 'checking',
  reason: null,
};
const SERVER_SNAPSHOT: StorageCapabilitySnapshot = Object.freeze({
  mode: 'checking',
  reason: null,
});
let persistentStorageDisabled = false;
let probePromise: Promise<boolean> | null = null;
const listeners = new Set<Listener>();

function publish(next: StorageCapabilitySnapshot) {
  if (snapshot.mode === next.mode && snapshot.reason === next.reason) return;
  snapshot = next;
  listeners.forEach((listener) => listener());
}

function errorReason(error: unknown): string {
  if (error instanceof DOMException && error.name) return error.name;
  if (error instanceof Error && error.name) return error.name;
  return 'StorageUnavailable';
}

export function getStorageCapabilitySnapshot(): StorageCapabilitySnapshot {
  return snapshot;
}

export function getServerStorageCapabilitySnapshot(): StorageCapabilitySnapshot {
  return SERVER_SNAPSHOT;
}

export function subscribeToStorageCapability(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function markStorageEphemeral(error: unknown): void {
  persistentStorageDisabled = true;
  publish({
    mode: 'ephemeral',
    reason: errorReason(error),
  });
}

function probeIndexedDB(indexedDB: IDBFactory): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      reject(new DOMException('IndexedDB probe timed out', 'TimeoutError'));
    }, PROBE_TIMEOUT_MS);
    const request = indexedDB.open(PROBE_DB_NAME, 1);

    const finish = (callback: () => void) => {
      window.clearTimeout(timeout);
      callback();
    };

    request.onerror = () =>
      finish(() =>
        reject(request.error ?? new DOMException('IndexedDB open failed'))
      );
    request.onblocked = () =>
      finish(() =>
        reject(new DOMException('IndexedDB probe was blocked', 'BlockedError'))
      );
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(PROBE_STORE_NAME)) {
        request.result.createObjectStore(PROBE_STORE_NAME);
      }
    };
    request.onsuccess = () => {
      const database = request.result;
      try {
        const transaction = database.transaction(
          PROBE_STORE_NAME,
          'readwrite'
        );
        const store = transaction.objectStore(PROBE_STORE_NAME);
        store.put('ok', 'sentinel');
        store.delete('sentinel');
        transaction.oncomplete = () =>
          finish(() => {
            database.close();
            resolve();
          });
        transaction.onerror = () =>
          finish(() => {
            database.close();
            reject(
              transaction.error
              ?? new DOMException('IndexedDB write probe failed')
            );
          });
        transaction.onabort = () =>
          finish(() => {
            database.close();
            reject(
              transaction.error
              ?? new DOMException('IndexedDB write probe aborted', 'AbortError')
            );
          });
      } catch (error) {
        finish(() => {
          database.close();
          reject(error);
        });
      }
    };
  });
}

export function ensurePersistentStorageCapability(): Promise<boolean> {
  if (persistentStorageDisabled) return Promise.resolve(false);
  if (typeof window === 'undefined') {
    return Promise.resolve(false);
  }

  let indexedDB: IDBFactory | undefined;
  try {
    indexedDB = window.indexedDB;
  } catch (error) {
    markStorageEphemeral(error);
    return Promise.resolve(false);
  }

  if (!indexedDB) {
    markStorageEphemeral(
      new DOMException('IndexedDB is unavailable', 'NotSupportedError')
    );
    return Promise.resolve(false);
  }

  if (probePromise) return probePromise;

  probePromise = probeIndexedDB(indexedDB)
    .then(() => {
      if (!persistentStorageDisabled) {
        publish({ mode: 'persistent', reason: null });
        return true;
      }
      return false;
    })
    .catch((error) => {
      markStorageEphemeral(error);
      return false;
    });

  return probePromise;
}

export async function runWithStorageFallback<T>(
  persistentOperation: () => Promise<T>,
  ephemeralOperation: () => Promise<T>
): Promise<T> {
  if (!(await ensurePersistentStorageCapability())) {
    return ephemeralOperation();
  }

  try {
    return await persistentOperation();
  } catch (error) {
    markStorageEphemeral(error);
    return ephemeralOperation();
  }
}

export function isPersistentStorageActive(): boolean {
  return snapshot.mode === 'persistent' && !persistentStorageDisabled;
}

export function resetStorageCapabilityForTests(): void {
  snapshot = { mode: 'checking', reason: null };
  persistentStorageDisabled = false;
  probePromise = null;
  listeners.clear();
}
