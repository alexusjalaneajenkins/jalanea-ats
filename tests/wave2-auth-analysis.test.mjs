import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildAuthCallbackUrl,
  getSafeRedirectPath,
} from '../src/lib/auth/redirects.ts';
import {
  getAnalysisAccessMode,
  hasVerifiedPaidAccess,
} from '../src/lib/analysis/availability.ts';
import {
  createAnalysisInputRevision,
} from '../src/lib/analysis/inputRevision.ts';
import {
  getLlmConfigStorageKey,
  LEGACY_LLM_CONFIG_STORAGE_KEY,
} from '../src/lib/llm/storageKey.ts';
import {
  isCurrentLlmOwnerOperation,
} from '../src/lib/llm/ownerOperation.ts';

test('redirect validation only returns same-origin application paths', () => {
  assert.equal(getSafeRedirectPath('/results/abc?tab=job#score'), '/results/abc?tab=job#score');
  assert.equal(getSafeRedirectPath('https://evil.example'), '/account');
  assert.equal(getSafeRedirectPath('//evil.example'), '/account');
  assert.equal(getSafeRedirectPath('/\\evil.example'), '/account');
  assert.equal(getSafeRedirectPath('/%5cevil.example'), '/account');
  assert.equal(getSafeRedirectPath('/%25255cevil.example'), '/account');
  assert.equal(getSafeRedirectPath('javascript:alert(1)'), '/account');
  assert.equal(getSafeRedirectPath('/safe\u0000path'), '/account');
});

test('OAuth callbacks use the current origin and a validated return path', () => {
  const callback = new URL(
    buildAuthCallbackUrl('https://ats.jalanea.dev', '//evil.example')
  );

  assert.equal(callback.origin, 'https://ats.jalanea.dev');
  assert.equal(callback.pathname, '/api/auth/callback');
  assert.equal(callback.searchParams.get('redirect_to'), '/account');
});

test('AI configuration keys are scoped to one authenticated identity', () => {
  const userA = getLlmConfigStorageKey('user-a');
  const userB = getLlmConfigStorageKey('user-b');

  assert.notEqual(userA, userB);
  assert.notEqual(userA, LEGACY_LLM_CONFIG_STORAGE_KEY);
  assert.throws(() => getLlmConfigStorageKey('  '));
});

test('an async BYOK operation cannot update a different signed-in account', () => {
  assert.equal(
    isCurrentLlmOwnerOperation({
      activeOwnerId: 'user-b',
      requestedOwnerId: 'user-a',
      activeVersion: 4,
      requestedVersion: 3,
    }),
    false
  );
  assert.equal(
    isCurrentLlmOwnerOperation({
      activeOwnerId: 'user-a',
      requestedOwnerId: 'user-a',
      activeVersion: 3,
      requestedVersion: 3,
    }),
    true
  );
  assert.equal(
    isCurrentLlmOwnerOperation({
      activeOwnerId: 'user-a',
      requestedOwnerId: 'user-a',
      activeVersion: 4,
      requestedVersion: 3,
    }),
    false
  );
});

test('BYOK feature gates fail closed while entitlement is stale or unavailable', async () => {
  assert.equal(
    hasVerifiedPaidAccess({
      hasAccess: true,
      isEntitlementLoading: false,
      accessError: null,
    }),
    true
  );
  assert.equal(
    hasVerifiedPaidAccess({
      hasAccess: true,
      isEntitlementLoading: true,
      accessError: null,
    }),
    false
  );
  assert.equal(
    hasVerifiedPaidAccess({
      hasAccess: true,
      isEntitlementLoading: false,
      accessError: 'lookup failed',
    }),
    false
  );
  assert.equal(
    hasVerifiedPaidAccess({
      hasAccess: false,
      isEntitlementLoading: false,
      accessError: null,
    }),
    false
  );

  const homeSource = await readFile(
    fileURLToPath(new URL('../src/app/page.tsx', import.meta.url)),
    'utf8'
  );
  const resultsSource = await readFile(
    fileURLToPath(
      new URL('../src/app/results/[sessionId]/page.tsx', import.meta.url)
    ),
    'utf8'
  );

  for (const source of [homeSource, resultsSource]) {
    assert.match(source, /hasVerifiedPaidAccess\(\{/);
    assert.match(source, /canUseByok\s*=\s*!!user\s*&&\s*hasVerifiedAccess/);
  }
});

test('paid analysis is independent of exhausted anonymous quota', () => {
  assert.equal(
    getAnalysisAccessMode({
      isSignedIn: true,
      hasPaidAccess: true,
      isEntitlementLoading: false,
      hasEntitlementError: false,
      isFreeTierLoading: false,
      freeTierEnabled: true,
      freeTierRemaining: 0,
    }),
    'paid'
  );
});

test('signed-in analysis waits for entitlement and fails closed on lookup errors', () => {
  const base = {
    isSignedIn: true,
    hasPaidAccess: false,
    isFreeTierLoading: false,
    freeTierEnabled: true,
    freeTierRemaining: 3,
  };

  assert.equal(
    getAnalysisAccessMode({
      ...base,
      isEntitlementLoading: true,
      hasEntitlementError: false,
    }),
    'checking'
  );
  assert.equal(
    getAnalysisAccessMode({
      ...base,
      isEntitlementLoading: false,
      hasEntitlementError: true,
    }),
    'unavailable'
  );
});

test('analysis input revisions are stable and change with either exact input', async () => {
  const first = await createAnalysisInputRevision('resume', 'job A');
  const same = await createAnalysisInputRevision('resume', 'job A');
  const changedJob = await createAnalysisInputRevision('resume', 'job B');
  const changedResume = await createAnalysisInputRevision('resume!', 'job A');

  assert.equal(first, same);
  assert.match(first, /^sha256:[a-f0-9]{64}$/);
  assert.notEqual(first, changedJob);
  assert.notEqual(first, changedResume);
});

test('Next 16 proxy refreshes sessions and deprecated middleware is removed', async () => {
  const proxyPath = fileURLToPath(new URL('../src/proxy.ts', import.meta.url));
  const middlewarePath = fileURLToPath(
    new URL('../src/middleware.ts', import.meta.url)
  );
  const source = await readFile(proxyPath, 'utf8');

  assert.match(source, /export async function proxy/);
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /setAll/);
  assert.match(source, /matcher/);
  await assert.rejects(access(middlewarePath), (error) => error?.code === 'ENOENT');
});

test('signup configures a callback for confirmed PKCE sessions', async () => {
  const source = await readFile(
    fileURLToPath(new URL('../src/lib/supabase-browser.ts', import.meta.url)),
    'utf8'
  );

  assert.match(source, /emailRedirectTo:\s*buildAuthCallbackUrl/);
  assert.match(source, /resetPasswordForEmail/);
  assert.match(source, /updateUser\(\{ password \}\)/);
});
