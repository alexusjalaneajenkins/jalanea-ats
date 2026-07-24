/**
 * Serializes asynchronous mutations for the same key while allowing unrelated
 * keys to proceed independently.
 */
export function createKeyedWriteQueue() {
  const tails = new Map<string, Promise<void>>();

  return function enqueueKeyedWrite<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const previous = tails.get(key) ?? Promise.resolve();
    const result = previous.catch(() => undefined).then(operation);
    const tail = result.then(
      () => undefined,
      () => undefined
    );

    tails.set(key, tail);
    void tail.then(() => {
      if (tails.get(key) === tail) {
        tails.delete(key);
      }
    });

    return result;
  };
}
