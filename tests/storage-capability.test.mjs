import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ensurePersistentStorageCapability,
  getServerStorageCapabilitySnapshot,
  getStorageCapabilitySnapshot,
  markStorageEphemeral,
  resetStorageCapabilityForTests,
  runWithStorageFallback,
  subscribeToStorageCapability,
} from '../src/lib/storage/capability.ts';

test('the server storage snapshot is referentially stable for React hydration', () => {
  assert.equal(
    getServerStorageCapabilitySnapshot(),
    getServerStorageCapabilitySnapshot()
  );
});

test('a browser without IndexedDB enters visible ephemeral mode', async () => {
  resetStorageCapabilityForTests();
  globalThis.window = {};

  try {
    assert.equal(await ensurePersistentStorageCapability(), false);
    assert.deepEqual(getStorageCapabilitySnapshot(), {
      mode: 'ephemeral',
      reason: 'NotSupportedError',
    });
  } finally {
    delete globalThis.window;
    resetStorageCapabilityForTests();
  }
});

test('a denied IndexedDB getter enters visible ephemeral mode', async () => {
  resetStorageCapabilityForTests();
  globalThis.window = {};
  Object.defineProperty(globalThis.window, 'indexedDB', {
    get() {
      throw new DOMException('denied', 'SecurityError');
    },
  });

  try {
    assert.equal(await ensurePersistentStorageCapability(), false);
    assert.deepEqual(getStorageCapabilitySnapshot(), {
      mode: 'ephemeral',
      reason: 'SecurityError',
    });
  } finally {
    delete globalThis.window;
    resetStorageCapabilityForTests();
  }
});

test('storage operations use the in-memory path when persistence is unavailable', async () => {
  resetStorageCapabilityForTests();
  let persistentCalls = 0;
  let ephemeralCalls = 0;

  const result = await runWithStorageFallback(
    async () => {
      persistentCalls += 1;
      return 'persistent';
    },
    async () => {
      ephemeralCalls += 1;
      return 'ephemeral';
    }
  );

  assert.equal(result, 'ephemeral');
  assert.equal(persistentCalls, 0);
  assert.equal(ephemeralCalls, 1);
});

for (const errorName of [
  'QuotaExceededError',
  'SecurityError',
  'AbortError',
  'InvalidStateError',
]) {
  test(`storage status fails to ephemeral mode on ${errorName}`, async () => {
    resetStorageCapabilityForTests();
    let notifications = 0;
    const unsubscribe = subscribeToStorageCapability(() => {
      notifications += 1;
    });

    markStorageEphemeral(new DOMException('denied', errorName));
    const result = await runWithStorageFallback(
      async () => 'persistent',
      async () => 'ephemeral'
    );

    assert.equal(result, 'ephemeral');
    assert.deepEqual(getStorageCapabilitySnapshot(), {
      mode: 'ephemeral',
      reason: errorName,
    });
    assert.equal(notifications, 1);
    unsubscribe();
  });
}

test('sessions, history, and BYOK settings all route through the capability layer', async () => {
  const paths = [
    'src/lib/storage/sessionStore.ts',
    'src/lib/storage/historyStore.ts',
    'src/lib/llm/storage.ts',
  ];
  const sources = await Promise.all(
    paths.map((path) =>
      readFile(
        fileURLToPath(new URL(`../${path}`, import.meta.url)),
        'utf8'
      )
    )
  );

  for (const source of sources) {
    assert.match(source, /runWithStorageFallback/);
  }
  assert.doesNotMatch(sources[0], /'indexedDB' in window/);
  assert.doesNotMatch(sources[1], /'indexedDB' in window/);
});
