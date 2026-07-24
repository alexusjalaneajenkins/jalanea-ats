/**
 * Centralized erasure for data owned by the Jalanea ATS browser app.
 *
 * The dependencies are injectable so the orchestration can be verified in
 * Node without providing IndexedDB. Production callers can omit them to use
 * the real browser stores.
 */

export const ATS_LOCAL_STORAGE_KEYS = [
  'ats_device_id',
  'jalanea-user-progress',
  'jalanea-onboarding-seen',
  'jalanea-learn-read-sections',
  'pwa-install-dismissed',
] as const;

export const ATS_LOCAL_STORAGE_PREFIXES = [
  'jalanea-targeting-history:',
] as const;

export const ATS_SESSION_STORAGE_KEYS = [
  'jalanea_checkout_intent',
] as const;

export interface BrowserStorage {
  readonly length: number;
  key(index: number): string | null;
  removeItem(key: string): void;
}

export interface LocalDataErasureDependencies {
  clearHistory(): Promise<void>;
  clearSessions(): Promise<void>;
  clearLlmConfig(): Promise<void>;
  getLocalStorage(): BrowserStorage | null;
  getSessionStorage(): BrowserStorage | null;
  runErasure?<T>(operation: () => Promise<T>): Promise<T>;
}

export interface LocalDataErasureFailure {
  step: string;
  error: unknown;
}

export class LocalDataErasureError extends Error {
  readonly failures: LocalDataErasureFailure[];

  constructor(failures: LocalDataErasureFailure[]) {
    const failedSteps = failures.map(({ step }) => step).join(', ');
    super(`Could not fully clear local ATS data. Failed steps: ${failedSteps}`);
    this.name = 'LocalDataErasureError';
    this.failures = failures;
  }
}

function getMatchingKeys(
  storage: BrowserStorage,
  exactKeys: readonly string[],
  prefixes: readonly string[] = []
): string[] {
  const matches: string[] = [];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (
      key &&
      (exactKeys.includes(key) || prefixes.some((prefix) => key.startsWith(prefix)))
    ) {
      matches.push(key);
    }
  }

  return matches;
}

function clearMatchingKeys(
  storage: BrowserStorage | null,
  exactKeys: readonly string[],
  prefixes: readonly string[] = []
): void {
  if (!storage) return;

  const failures: unknown[] = [];
  for (const key of getMatchingKeys(storage, exactKeys, prefixes)) {
    try {
      storage.removeItem(key);
    } catch (error) {
      failures.push(error);
    }
  }

  if (failures.length > 0) {
    throw new AggregateError(failures, 'One or more ATS-owned storage keys could not be removed');
  }
}

async function createBrowserDependencies(): Promise<LocalDataErasureDependencies> {
  const [
    { historyStore },
    { sessionStore },
    { deleteLlmConfig },
    { runLocalDataErasure },
  ] = await Promise.all([
    import('./historyStore'),
    import('./sessionStore'),
    import('../llm/storage'),
    import('./mutationBarrier'),
  ]);

  return {
    clearHistory: () => historyStore.deleteAll(),
    clearSessions: () => sessionStore.deleteAll(),
    clearLlmConfig: () => deleteLlmConfig(),
    runErasure: runLocalDataErasure,
    getLocalStorage: () => (
      typeof window === 'undefined' ? null : window.localStorage
    ),
    getSessionStorage: () => (
      typeof window === 'undefined' ? null : window.sessionStorage
    ),
  };
}

/**
 * Clear all browser-local data owned by Jalanea ATS.
 *
 * Steps run in a deterministic order and continue after individual failures so
 * the routine clears as much data as possible. If any step fails, the returned
 * promise rejects with every failed step represented in `failures`.
 */
export async function eraseLocalAtsData(
  injectedDependencies?: LocalDataErasureDependencies
): Promise<void> {
  const dependencies = injectedDependencies ?? await createBrowserDependencies();
  const runErasure = dependencies.runErasure ?? (async (operation) => operation());

  await runErasure(async () => {
    const failures: LocalDataErasureFailure[] = [];

    const runStep = async (step: string, action: () => void | Promise<void>) => {
      try {
        await action();
      } catch (error) {
        failures.push({ step, error });
      }
    };

    await runStep('analysis history', dependencies.clearHistory);
    await runStep('analysis sessions', dependencies.clearSessions);
    await runStep('saved AI configuration', dependencies.clearLlmConfig);
    await runStep('local storage', () => {
      clearMatchingKeys(
        dependencies.getLocalStorage(),
        ATS_LOCAL_STORAGE_KEYS,
        ATS_LOCAL_STORAGE_PREFIXES
      );
    });
    await runStep('session storage', () => {
      clearMatchingKeys(
        dependencies.getSessionStorage(),
        ATS_SESSION_STORAGE_KEYS
      );
    });

    if (failures.length > 0) {
      throw new LocalDataErasureError(failures);
    }
  });
}
