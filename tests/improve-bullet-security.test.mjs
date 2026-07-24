import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  handleImproveBulletRequest,
} from '../src/lib/ai/improveBulletRequest.ts';
import {
  buildAiJsonHeaders,
} from '../src/lib/llm/consentHeaders.ts';

const validBody = {
  bullet: 'Improved customer retention by redesigning the onboarding flow.',
  jobDescription: 'Lead product improvements for a growing customer platform.',
  missingKeywords: ['retention'],
  gaps: [],
  recommendations: ['Add measurable outcomes'],
};

function makeDependencies() {
  const calls = {
    providerConfig: 0,
    access: 0,
    quota: 0,
    provider: 0,
  };

  return {
    calls,
    dependencies: {
      isProviderConfigured() {
        calls.providerConfig += 1;
        return true;
      },
      async resolvePaidIdentity() {
        calls.access += 1;
        return null;
      },
      async consumeQuota() {
        calls.quota += 1;
        return {
          allowed: true,
          currentCount: 1,
          limit: 3,
          resetAt: '2026-07-24T00:00:00.000Z',
        };
      },
      async generate(input) {
        calls.provider += 1;
        return {
          original: input.bullet,
          variations: [
            {
              id: 'variation-1',
              strategy: 'concise',
              label: 'Concise',
              text: 'Redesigned onboarding to improve customer retention.',
              highlights: [],
            },
          ],
        };
      },
    },
  };
}

test('no-consent requests fail before access, quota, or provider work', async () => {
  const { calls, dependencies } = makeDependencies();
  const request = new Request('http://localhost/api/improve-bullet', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validBody),
  });

  const response = await handleImproveBulletRequest(request, dependencies);

  assert.equal(response.status, 428);
  assert.deepEqual(calls, {
    providerConfig: 0,
    access: 0,
    quota: 0,
    provider: 0,
  });
});

test('invalid requests do not consume quota or call the provider', async () => {
  const { calls, dependencies } = makeDependencies();
  const request = new Request('http://localhost/api/improve-bullet', {
    method: 'POST',
    headers: buildAiJsonHeaders(true),
    body: JSON.stringify({ ...validBody, bullet: 'short' }),
  });

  const response = await handleImproveBulletRequest(request, dependencies);

  assert.equal(response.status, 400);
  assert.deepEqual(calls, {
    providerConfig: 0,
    access: 0,
    quota: 0,
    provider: 0,
  });
});

test('quota failures fail closed before the provider is called', async () => {
  const { calls, dependencies } = makeDependencies();
  dependencies.consumeQuota = async () => {
    calls.quota += 1;
    throw new Error('database unavailable');
  };
  const request = new Request('http://localhost/api/improve-bullet', {
    method: 'POST',
    headers: buildAiJsonHeaders(true),
    body: JSON.stringify(validBody),
  });

  const response = await handleImproveBulletRequest(request, dependencies);

  assert.equal(response.status, 503);
  assert.equal(calls.quota, 1);
  assert.equal(calls.provider, 0);
});

test('valid consented calls carry acknowledgment and reach quota then provider', async () => {
  const { calls, dependencies } = makeDependencies();
  const headers = buildAiJsonHeaders(true);
  const request = new Request('http://localhost/api/improve-bullet', {
    method: 'POST',
    headers,
    body: JSON.stringify(validBody),
  });

  const response = await handleImproveBulletRequest(request, dependencies);

  assert.equal(headers['X-AI-Consent'], 'acknowledged');
  assert.equal(response.status, 200);
  assert.equal(calls.quota, 1);
  assert.equal(calls.provider, 1);
});

test('client headers never claim consent when stored consent is false', () => {
  assert.equal(buildAiJsonHeaders(false)['X-AI-Consent'], undefined);
});

test('the unused legacy analyze route is removed', async () => {
  const routePath = fileURLToPath(
    new URL('../src/app/api/analyze/route.ts', import.meta.url)
  );

  await assert.rejects(
    access(routePath),
    (error) => error?.code === 'ENOENT'
  );
});
