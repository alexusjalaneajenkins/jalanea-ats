import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { saveAndCloseByok } from '../src/lib/llm/byokSave.ts';
import { createByokDraft } from '../src/lib/llm/byokDraft.ts';
import {
  fetchWithRetry,
  isAbortError,
} from '../src/lib/llm/types.ts';
import {
  isCurrentLlmOwnerOperation,
} from '../src/lib/llm/ownerOperation.ts';
import { createKeyedWriteQueue } from '../src/lib/storage/writeQueue.ts';
import { handleV2AnalysisRequest } from '../src/lib/v2/request.ts';

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function analysisRequest(signal) {
  const text = 'a'.repeat(80);
  return new Request('https://ats.example/api/analyze-v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-AI-Consent': 'acknowledged',
    },
    body: JSON.stringify({
      resume: text,
      jobDescription: text,
    }),
    signal,
  });
}

test('a paused owner operation cannot mutate a newer owner or generation', async () => {
  const pause = deferred();
  const requested = { ownerId: 'user-a', version: 1 };
  let active = { ownerId: 'user-a', version: 1 };
  let providerOwner = 'user-b';

  const staleOperation = (async () => {
    await pause.promise;
    if (
      isCurrentLlmOwnerOperation({
        activeOwnerId: active.ownerId,
        requestedOwnerId: requested.ownerId,
        activeVersion: active.version,
        requestedVersion: requested.version,
      })
    ) {
      providerOwner = requested.ownerId;
    }
  })();

  active = { ownerId: 'user-b', version: 2 };
  pause.resolve();
  await staleOperation;
  assert.equal(providerOwner, 'user-b');
});

test('BYOK save keeps the modal open on rejection and closes exactly once on success', async () => {
  let closeCount = 0;
  const failed = await saveAndCloseByok(
    { apiKey: 'secret' },
    async () => {
      throw new Error('Save failed');
    },
    () => {
      closeCount += 1;
    }
  );
  assert.equal(failed, 'Save failed');
  assert.equal(closeCount, 0);

  const succeeded = await saveAndCloseByok(
    { apiKey: 'secret' },
    async () => {},
    () => {
      closeCount += 1;
    }
  );
  assert.equal(succeeded, null);
  assert.equal(closeCount, 1);
});

test('a late owner config hydrates every BYOK draft field and preserves the key', async () => {
  const initialDraft = createByokDraft(undefined);
  assert.equal(initialDraft.keyMode, 'demo');
  assert.equal(initialDraft.apiKey, '');

  const storedConfig = {
    provider: 'gemini',
    apiKey: 'stored-owner-key',
    geminiModel: 'gemini-2.5-pro',
    hasConsented: true,
    consentTimestamp: 123,
    preferences: {
      useAiForSemantic: false,
      useAiForKnockout: true,
      useAiForSuggestions: false,
    },
  };
  const hydratedDraft = createByokDraft(storedConfig);

  assert.equal(hydratedDraft.keyMode, 'byok');
  assert.equal(hydratedDraft.apiKey, storedConfig.apiKey);
  assert.equal(hydratedDraft.geminiModel, storedConfig.geminiModel);
  assert.deepEqual(hydratedDraft.preferences, storedConfig.preferences);

  let savedConfig;
  await saveAndCloseByok(
    {
      ...storedConfig,
      apiKey: hydratedDraft.apiKey,
      geminiModel: hydratedDraft.geminiModel,
      preferences: hydratedDraft.preferences,
    },
    async (config) => {
      savedConfig = config;
    },
    () => {}
  );
  assert.equal(savedConfig.apiKey, storedConfig.apiKey);

  const modalSource = await readFile(
    fileURLToPath(
      new URL('../src/components/ByokKeyModal.tsx', import.meta.url)
    ),
    'utf8'
  );
  assert.match(modalSource, /if \(isConfigLoading \|\| isSavingRef\.current \|\| draftDirtyRef\.current\) return/);
  assert.match(modalSource, /const draft = createByokDraft\(currentConfig\)/);
});

test('session writes are serialized so a newer job clear wins over an older result', async () => {
  const enqueue = createKeyedWriteQueue();
  const oldWritePaused = deferred();
  const oldWriteStarted = deferred();
  let externalAnalysis;

  const oldWrite = enqueue('session-1', async () => {
    oldWriteStarted.resolve();
    await oldWritePaused.promise;
    externalAnalysis = 'old-result';
  });
  await oldWriteStarted.promise;

  const clear = enqueue('session-1', async () => {
    externalAnalysis = undefined;
  });
  oldWritePaused.resolve();
  await Promise.all([oldWrite, clear]);

  assert.equal(externalAnalysis, undefined);
});

test('aborting a retry delay prevents every later provider call', async () => {
  const originalFetch = globalThis.fetch;
  const controller = new AbortController();
  let fetchCalls = 0;
  globalThis.fetch = async () => {
    fetchCalls += 1;
    setTimeout(() => controller.abort(), 5);
    return new Response('{}', { status: 503 });
  };

  try {
    await assert.rejects(
      fetchWithRetry(
        'https://provider.example',
        { signal: controller.signal },
        {
          maxRetries: 3,
          initialDelay: 100,
          maxDelay: 100,
          backoffMultiplier: 1,
        }
      ),
      (error) => isAbortError(error, controller.signal)
    );
    assert.equal(fetchCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('an aborted V2 authorization starts no quota or analysis work', async () => {
  const authorization = deferred();
  const authorizationStarted = deferred();
  const calls = [];
  const controller = new AbortController();
  const responsePromise = handleV2AnalysisRequest(
    analysisRequest(controller.signal),
    {
      isProviderConfigured: () => true,
      authorize: async () => {
        calls.push('authorize');
        authorizationStarted.resolve();
        return authorization.promise;
      },
      consumeQuota: async () => {
        calls.push('quota');
        return true;
      },
      analyze: async () => {
        calls.push('analyze');
        return {};
      },
    }
  );

  await authorizationStarted.promise;
  controller.abort();
  authorization.resolve({ id: 'user-1' });
  const response = await responsePromise;

  assert.equal(response.status, 499);
  assert.deepEqual(calls, ['authorize']);
});

test('the V2 handler passes the request signal into analysis', async () => {
  const controller = new AbortController();
  let receivedSignal;
  const request = analysisRequest(controller.signal);
  const response = await handleV2AnalysisRequest(
    request,
    {
      isProviderConfigured: () => true,
      authorize: async () => ({ id: 'user-1' }),
      consumeQuota: async () => true,
      analyze: async (_resume, _jobDescription, signal) => {
        receivedSignal = signal;
        return { ok: true };
      },
    }
  );

  assert.equal(response.status, 200);
  assert.equal(receivedSignal, request.signal);
});

test('semantic, V2 parser, ranking, and result persistence source all carry cancellation guards', async () => {
  const root = new URL('../', import.meta.url);
  const paths = [
    'src/lib/analysis/semantic.ts',
    'src/lib/llm/embeddings.ts',
    'src/lib/v2/parseResume.ts',
    'src/lib/v2/parseJobDescription.ts',
    'src/lib/v2/engine.ts',
  ];
  for (const path of paths) {
    const source = await readFile(fileURLToPath(new URL(path, root)), 'utf8');
    assert.match(source, /signal/);
  }

  const resultsSource = await readFile(
    fileURLToPath(
      new URL('src/app/results/[sessionId]/page.tsx', root)
    ),
    'utf8'
  );
  assert.match(resultsSource, /sessionStore\.updateIf/);
  assert.match(
    resultsSource,
    /storedSession\.job\?\.rawText\s*===\s*analyzedJobText/
  );
  assert.match(resultsSource, /semanticController\.signal/);
});
