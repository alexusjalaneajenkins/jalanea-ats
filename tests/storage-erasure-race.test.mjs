import assert from 'node:assert/strict';
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { dirname, extname, join } from 'node:path';
import test from 'node:test';
import {
  fileURLToPath,
  pathToFileURL,
} from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));

function resolveTypeScriptFile(candidatePath) {
  const candidates = extname(candidatePath)
    ? [candidatePath]
    : [
        `${candidatePath}.ts`,
        `${candidatePath}.tsx`,
        join(candidatePath, 'index.ts'),
        join(candidatePath, 'index.tsx'),
      ];

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }
  return null;
}

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      const resolved = resolveTypeScriptFile(
        join(projectRoot, 'src', specifier.slice(2))
      );
      if (resolved) return { url: resolved, shortCircuit: true };
    }

    if (
      (specifier.startsWith('./') || specifier.startsWith('../')) &&
      context.parentURL?.startsWith('file:')
    ) {
      const parentPath = dirname(fileURLToPath(context.parentURL));
      const resolved = resolveTypeScriptFile(join(parentPath, specifier));
      if (resolved) return { url: resolved, shortCircuit: true };
    }

    return nextResolve(specifier, context);
  },
});

const [
  { eraseLocalAtsData },
  { historyStore },
  { saveLlmConfig, loadLlmConfig },
  {
    StorageMutationInvalidatedError,
    captureLocalDataGeneration,
    createStorageMutationBarrier,
    runLocalDataMutation,
  },
  { sessionStore },
] = await Promise.all([
  import('../src/lib/storage/localDataErasure.ts'),
  import('../src/lib/storage/historyStore.ts'),
  import('../src/lib/llm/storage.ts'),
  import('../src/lib/storage/mutationBarrier.ts'),
  import('../src/lib/storage/sessionStore.ts'),
]);

function deferred() {
  let resolve;
  const promise = new Promise((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function nextTurn() {
  return new Promise((resolve) => setImmediate(resolve));
}

test('real session, history, and BYOK stores cannot repopulate after erasure starts', async () => {
  await eraseLocalAtsData();

  const blockerStarted = deferred();
  const releaseBlocker = deferred();
  const blocker = runLocalDataMutation(async () => {
    blockerStarted.resolve();
    await releaseBlocker.promise;
  });
  await blockerStarted.promise;

  const now = new Date().toISOString();
  const sessionWrite = sessionStore.save({
    id: 'erasure-race-session',
    createdAt: now,
    updatedAt: now,
    resume: {
      fileName: 'private-resume.pdf',
      fileType: 'pdf',
      fileSizeBytes: 42,
      extractedText: 'private resume text',
      metadata: {},
    },
    findings: [],
    scores: {
      parseHealth: 90,
      formattingRisk: 10,
      keywordCoverage: 0,
      knockoutRisk: 'low',
      recruiterSearch: 0,
    },
  });
  const historyWrite = historyStore.save({
    id: 'erasure-race-history',
    timestamp: now,
    resumeFileName: 'private-resume.pdf',
    resumeFileSize: 42,
    resumeFileType: 'pdf',
    resumeHash: 'private-hash',
    scores: {
      parseHealth: 90,
      knockoutRisk: 'low',
    },
    sessionId: 'erasure-race-session',
  });
  const llmWrite = saveLlmConfig(
    {
      provider: 'gemini',
      apiKey: 'private-key',
      geminiModel: 'gemini-2.5-flash',
      hasConsented: true,
      consentTimestamp: Date.now(),
      preferences: {
        enableSemanticMatching: true,
        enableRewriteSuggestions: true,
        enableBiasReview: true,
      },
    },
    'erasure-race-user'
  );

  const generationBeforeErasure = captureLocalDataGeneration();
  const erasure = eraseLocalAtsData();
  while (captureLocalDataGeneration() === generationBeforeErasure) {
    await nextTurn();
  }

  const lateWriteRan = [];
  await assert.rejects(
    runLocalDataMutation(async () => {
      lateWriteRan.push('ran');
    }),
    StorageMutationInvalidatedError
  );

  releaseBlocker.resolve();
  await blocker;
  const staleWrites = await Promise.allSettled([
    sessionWrite,
    historyWrite,
    llmWrite,
  ]);
  await erasure;

  assert.deepEqual(lateWriteRan, []);
  for (const result of staleWrites) {
    assert.equal(result.status, 'rejected');
    assert.ok(result.reason instanceof StorageMutationInvalidatedError);
  }
  assert.deepEqual(await sessionStore.getAll(), []);
  assert.deepEqual(await historyStore.getAll(), []);
  assert.equal(await loadLlmConfig('erasure-race-user'), null);
});

test('an already-running mutation settles before the final clear', async () => {
  const barrier = createStorageMutationBarrier();
  const writeStarted = deferred();
  const releaseWrite = deferred();
  const values = new Map();

  const write = barrier.runMutation(async () => {
    writeStarted.resolve();
    await releaseWrite.promise;
    values.set('resume', 'private');
  });
  await writeStarted.promise;

  const erasure = barrier.runErasure(async () => {
    values.clear();
  });
  releaseWrite.resolve();

  await write;
  await erasure;
  assert.equal(values.size, 0);
});
