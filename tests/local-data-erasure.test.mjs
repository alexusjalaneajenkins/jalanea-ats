import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ATS_LOCAL_STORAGE_KEYS,
  ATS_SESSION_STORAGE_KEYS,
  LocalDataErasureError,
  eraseLocalAtsData,
} from '../src/lib/storage/localDataErasure.ts';
import {
  deleteAccountWithDependencies,
} from '../src/lib/accountDeletion.ts';

class FakeStorage {
  constructor(entries, calls, failOnRemove = null) {
    this.values = new Map(entries);
    this.calls = calls;
    this.failOnRemove = failOnRemove;
  }

  get length() {
    return this.values.size;
  }

  key(index) {
    return [...this.values.keys()][index] ?? null;
  }

  removeItem(key) {
    this.calls.push(`remove:${key}`);
    if (key === this.failOnRemove) {
      throw new Error(`cannot remove ${key}`);
    }
    this.values.delete(key);
  }

  has(key) {
    return this.values.has(key);
  }
}

test('central erasure clears every ATS store in order without touching unrelated storage', async () => {
  const calls = [];
  const localStorage = new FakeStorage([
    ...ATS_LOCAL_STORAGE_KEYS.map((key) => [key, 'ats-data']),
    ['jalanea-targeting-history:resume-1', 'targeting-data'],
    ['jalanea-targeting-history:resume-2', 'targeting-data'],
    ['unrelated-product-preference', 'keep-me'],
  ], calls);
  const sessionStorage = new FakeStorage([
    ...ATS_SESSION_STORAGE_KEYS.map((key) => [key, 'ats-data']),
    ['unrelated-session-state', 'keep-me'],
  ], calls);

  await eraseLocalAtsData({
    async clearHistory() {
      calls.push('clear:history');
    },
    async clearSessions() {
      calls.push('clear:sessions');
    },
    async clearLlmConfig() {
      calls.push('clear:llm-config');
    },
    getLocalStorage() {
      calls.push('open:local-storage');
      return localStorage;
    },
    getSessionStorage() {
      calls.push('open:session-storage');
      return sessionStorage;
    },
  });

  assert.deepEqual(calls.slice(0, 4), [
    'clear:history',
    'clear:sessions',
    'clear:llm-config',
    'open:local-storage',
  ]);
  assert.equal(localStorage.has('unrelated-product-preference'), true);
  assert.equal(sessionStorage.has('unrelated-session-state'), true);
  for (const key of ATS_LOCAL_STORAGE_KEYS) {
    assert.equal(localStorage.has(key), false, `${key} should be removed`);
  }
  assert.equal(localStorage.has('jalanea-targeting-history:resume-1'), false);
  assert.equal(localStorage.has('jalanea-targeting-history:resume-2'), false);
  for (const key of ATS_SESSION_STORAGE_KEYS) {
    assert.equal(sessionStorage.has(key), false, `${key} should be removed`);
  }
});

test('central erasure continues after failures and reports every failed step', async () => {
  const calls = [];
  const localStorage = new FakeStorage([
    ['pwa-install-dismissed', 'true'],
    ['jalanea-user-progress', 'resume metadata'],
  ], calls, 'pwa-install-dismissed');
  const sessionStorage = new FakeStorage([
    ['jalanea_checkout_intent', 'monthly'],
  ], calls);

  await assert.rejects(
    eraseLocalAtsData({
      async clearHistory() {
        calls.push('clear:history');
        throw new Error('history database blocked');
      },
      async clearSessions() {
        calls.push('clear:sessions');
      },
      async clearLlmConfig() {
        calls.push('clear:llm-config');
        throw new Error('llm database blocked');
      },
      getLocalStorage() {
        calls.push('open:local-storage');
        return localStorage;
      },
      getSessionStorage() {
        calls.push('open:session-storage');
        return sessionStorage;
      },
    }),
    (error) => {
      assert.ok(error instanceof LocalDataErasureError);
      assert.deepEqual(
        error.failures.map(({ step }) => step),
        ['analysis history', 'saved AI configuration', 'local storage']
      );
      return true;
    }
  );

  assert.ok(calls.includes('clear:sessions'));
  assert.ok(calls.includes('remove:jalanea-user-progress'));
  assert.ok(calls.includes('open:session-storage'));
  assert.ok(calls.includes('remove:jalanea_checkout_intent'));
});

test('account deletion never erases local data before server confirmation', async () => {
  const calls = [];
  const result = await deleteAccountWithDependencies({
    async requestDeletion() {
      calls.push('request:deletion');
      return { ok: false, error: 'Server refused deletion' };
    },
    async eraseLocalData() {
      calls.push('erase:local');
    },
    async signOut() {
      calls.push('auth:sign-out');
      return { error: null };
    },
  });

  assert.deepEqual(calls, ['request:deletion']);
  assert.equal(result.error, 'Server refused deletion');
});

test('confirmed account deletion erases local data before signing out', async () => {
  const calls = [];
  const result = await deleteAccountWithDependencies({
    async requestDeletion() {
      calls.push('request:deletion');
      return { ok: true, error: null };
    },
    async eraseLocalData() {
      calls.push('erase:local');
    },
    async signOut() {
      calls.push('auth:sign-out');
      return { error: null };
    },
  });

  assert.deepEqual(calls, [
    'request:deletion',
    'erase:local',
    'auth:sign-out',
  ]);
  assert.equal(result.error, null);
});

test('account deletion signs out and reports an honest error when local erasure fails', async () => {
  const calls = [];
  const result = await deleteAccountWithDependencies({
    async requestDeletion() {
      calls.push('request:deletion');
      return { ok: true, error: null };
    },
    async eraseLocalData() {
      calls.push('erase:local');
      throw new Error('IndexedDB is blocked');
    },
    async signOut() {
      calls.push('auth:sign-out');
      return { error: null };
    },
  });

  assert.deepEqual(calls, [
    'request:deletion',
    'erase:local',
    'auth:sign-out',
  ]);
  assert.match(result.error, /account data was deleted/i);
  assert.match(result.error, /could not fully clear/i);
});
