const CONFIG_KEY_PREFIX = 'config:user:';

export const LEGACY_LLM_CONFIG_STORAGE_KEY = 'config';

export function getLlmConfigStorageKey(userId: string): string {
  const normalized = userId.trim();
  if (!normalized) {
    throw new Error('A signed-in user is required to store AI configuration');
  }
  return `${CONFIG_KEY_PREFIX}${normalized}`;
}
