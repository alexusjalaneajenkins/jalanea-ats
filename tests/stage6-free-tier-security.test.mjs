import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  consumeDurableFreeTierQuota,
  createFreeTierIdentityHash,
  FreeTierQuotaUnavailableError,
  hasRequiredFreeTierIdentitySalt,
} from '../src/lib/ai/freeTierQuota.ts';

async function read(relativePath) {
  return readFile(
    fileURLToPath(new URL(`../${relativePath}`, import.meta.url)),
    'utf8'
  );
}

async function runAttempt({ identitySalt, consume, calls }) {
  const quota = await consumeDurableFreeTierQuota({
    identitySeed: 'v3|203.0.113.22|test-browser',
    identitySalt,
    limit: 3,
    consume,
  });
  calls.provider += 1;
  return quota;
}

test('missing or weak free-tier identity salt fails before RPC or provider work', async () => {
  for (const identitySalt of [undefined, '', 'too-short']) {
    const calls = { rpc: 0, provider: 0 };
    await assert.rejects(
      runAttempt({
        identitySalt,
        calls,
        async consume() {
          calls.rpc += 1;
          return { allowed: true, current_count: 1 };
        },
      }),
      FreeTierQuotaUnavailableError
    );
    assert.deepEqual(calls, { rpc: 0, provider: 0 });
  }

  assert.equal(hasRequiredFreeTierIdentitySalt(undefined), false);
  assert.equal(hasRequiredFreeTierIdentitySalt('x'.repeat(31)), false);
  assert.equal(hasRequiredFreeTierIdentitySalt('x'.repeat(32)), true);
});

test('durable counter outage or invalid RPC response fails before provider work', async () => {
  for (const consumeRpc of [
    async () => {
      throw new Error('database unavailable');
    },
    async () => null,
    async () => ({ allowed: 'yes', current_count: 1 }),
    async () => ({ allowed: true, current_count: -1 }),
  ]) {
    const calls = { rpc: 0, provider: 0 };
    await assert.rejects(
      runAttempt({
        identitySalt: 's'.repeat(48),
        calls,
        async consume(identityHash) {
          calls.rpc += 1;
          return consumeRpc(identityHash);
        },
      }),
      FreeTierQuotaUnavailableError
    );
    assert.deepEqual(calls, { rpc: 1, provider: 0 });
  }
});

test('a valid durable quota decision precedes provider work and returns a keyed identifier', async () => {
  const calls = { rpc: 0, provider: 0 };
  const result = await runAttempt({
    identitySalt: 's'.repeat(48),
    calls,
    async consume(identityHash) {
      calls.rpc += 1;
      assert.match(identityHash, /^[a-f0-9]{64}$/);
      assert.equal(identityHash.includes('203.0.113.22'), false);
      return { allowed: true, current_count: 1 };
    },
  });

  assert.deepEqual(calls, { rpc: 1, provider: 1 });
  assert.equal(result.allowed, true);
  assert.equal(result.currentCount, 1);
  assert.equal(
    result.identityHash,
    createFreeTierIdentityHash(
      'v3|203.0.113.22|test-browser',
      's'.repeat(48)
    )
  );
});

test('the production free route has no literal salt or process-memory quota fallback', async () => {
  const route = await read('src/app/api/analyze-free/route.ts');
  const configurationGate = route.indexOf(
    'if (!hasDurableFreeTierQuotaConfig())',
    route.indexOf('export async function POST')
  );
  const durableQuota = route.indexOf(
    'checkAndIncrementUsage(getIdentitySeed(request))',
    configurationGate
  );
  const provider = route.indexOf('generateATSAnalysis(', durableQuota);

  assert.ok(configurationGate >= 0);
  assert.ok(durableQuota > configurationGate);
  assert.ok(provider > durableQuota);
  assert.match(route, /FREE_TIER_QUOTA_UNAVAILABLE/);
  assert.doesNotMatch(route, /_jalanea_salt/);
  assert.doesNotMatch(route, /fallbackMap|storageMode:\s*'memory'/);
  assert.doesNotMatch(route, /falling back to memory/i);
});
