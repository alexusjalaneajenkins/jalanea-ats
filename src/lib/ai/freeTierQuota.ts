import { createHmac } from 'node:crypto';

export const MIN_FREE_TIER_IDENTITY_SALT_CHARS = 32;

export class FreeTierQuotaUnavailableError extends Error {
  constructor() {
    super('Free-tier quota is unavailable');
    this.name = 'FreeTierQuotaUnavailableError';
  }
}

interface ConsumeDurableFreeTierQuotaInput {
  identitySeed: string;
  identitySalt?: string;
  limit: number;
  consume: (
    identityHash: string
  ) => Promise<{
    allowed: unknown;
    current_count: unknown;
  } | null>;
}

export function hasRequiredFreeTierIdentitySalt(
  value: string | undefined
): value is string {
  return Boolean(
    value
    && value.trim().length >= MIN_FREE_TIER_IDENTITY_SALT_CHARS
  );
}

export function createFreeTierIdentityHash(
  identitySeed: string,
  identitySalt: string
): string {
  if (!hasRequiredFreeTierIdentitySalt(identitySalt)) {
    throw new FreeTierQuotaUnavailableError();
  }

  return createHmac('sha256', identitySalt)
    .update(identitySeed)
    .digest('hex');
}

export async function consumeDurableFreeTierQuota({
  identitySeed,
  identitySalt,
  limit,
  consume,
}: ConsumeDurableFreeTierQuotaInput): Promise<{
  identityHash: string;
  allowed: boolean;
  currentCount: number;
}> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new FreeTierQuotaUnavailableError();
  }

  const identityHash = createFreeTierIdentityHash(
    identitySeed,
    identitySalt ?? ''
  );

  let result: Awaited<ReturnType<typeof consume>>;
  try {
    result = await consume(identityHash);
  } catch {
    throw new FreeTierQuotaUnavailableError();
  }

  if (
    !result
    || typeof result.allowed !== 'boolean'
    || typeof result.current_count !== 'number'
    || !Number.isInteger(result.current_count)
    || result.current_count < 0
  ) {
    throw new FreeTierQuotaUnavailableError();
  }

  return {
    identityHash,
    allowed: result.allowed,
    currentCount: result.current_count,
  };
}
