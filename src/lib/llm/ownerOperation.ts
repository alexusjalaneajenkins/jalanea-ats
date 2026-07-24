export interface LlmOwnerOperation {
  activeOwnerId: string | null;
  requestedOwnerId: string | null;
  activeVersion: number;
  requestedVersion: number;
}

export class StaleLlmOwnerOperationError extends Error {
  constructor() {
    super('The signed-in account changed before AI settings were saved.');
    this.name = 'StaleLlmOwnerOperationError';
  }
}

/**
 * Prevents an async IndexedDB operation started for one account from updating
 * the next account's React state or the shared in-memory Gemini provider.
 */
export function isCurrentLlmOwnerOperation({
  activeOwnerId,
  requestedOwnerId,
  activeVersion,
  requestedVersion,
}: LlmOwnerOperation): boolean {
  return (
    activeOwnerId === requestedOwnerId &&
    activeVersion === requestedVersion
  );
}
