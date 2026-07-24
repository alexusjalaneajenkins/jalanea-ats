export class StorageMutationInvalidatedError extends Error {
  constructor() {
    super('Local data changed while this storage operation was pending.');
    this.name = 'StorageMutationInvalidatedError';
  }
}

export interface StorageMutationBarrier {
  captureGeneration(): number;
  runMutation<T>(
    operation: () => Promise<T>,
    expectedGeneration?: number
  ): Promise<T>;
  runClear<T>(operation: () => Promise<T>): Promise<T>;
  runErasure<T>(operation: () => Promise<T>): Promise<T>;
}

/**
 * Coordinates every browser-local mutation around privacy erasure.
 *
 * Starting an erasure immediately advances the generation, invalidating
 * mutations that are queued but have not started. An already-running mutation
 * is allowed to settle, then the erasure runs last and clears its result.
 * Mutations attempted while erasure is active fail closed.
 */
export function createStorageMutationBarrier(): StorageMutationBarrier {
  let generation = 0;
  let activeErasureGeneration: number | null = null;
  let tail: Promise<void> = Promise.resolve();

  const setTail = (result: Promise<unknown>) => {
    const settled = result.then(
      () => undefined,
      () => undefined
    );
    tail = settled;
  };

  const captureGeneration = () => generation;

  const runMutation = <T>(
    operation: () => Promise<T>,
    expectedGeneration = generation
  ): Promise<T> => {
    if (
      activeErasureGeneration !== null ||
      expectedGeneration !== generation
    ) {
      return Promise.reject(new StorageMutationInvalidatedError());
    }

    const previous = tail;
    const result = previous.catch(() => undefined).then(() => {
      if (
        activeErasureGeneration !== null ||
        expectedGeneration !== generation
      ) {
        throw new StorageMutationInvalidatedError();
      }
      return operation();
    });
    setTail(result);
    return result;
  };

  const runErasure = <T>(operation: () => Promise<T>): Promise<T> => {
    const erasureGeneration = generation + 1;
    generation = erasureGeneration;
    activeErasureGeneration = erasureGeneration;

    const previous = tail;
    const result = previous.catch(() => undefined).then(operation);
    setTail(result);

    return result.finally(() => {
      if (activeErasureGeneration === erasureGeneration) {
        activeErasureGeneration = null;
      }
    });
  };

  const runClear = <T>(operation: () => Promise<T>): Promise<T> => {
    if (activeErasureGeneration !== null) {
      return operation();
    }
    return runErasure(operation);
  };

  return {
    captureGeneration,
    runMutation,
    runClear,
    runErasure,
  };
}

const localDataMutationBarrier = createStorageMutationBarrier();

export const captureLocalDataGeneration = () =>
  localDataMutationBarrier.captureGeneration();

export const runLocalDataMutation = <T>(
  operation: () => Promise<T>,
  expectedGeneration?: number
) =>
  localDataMutationBarrier.runMutation(operation, expectedGeneration);

export const runLocalDataClear = <T>(operation: () => Promise<T>) =>
  localDataMutationBarrier.runClear(operation);

export const runLocalDataErasure = <T>(operation: () => Promise<T>) =>
  localDataMutationBarrier.runErasure(operation);
