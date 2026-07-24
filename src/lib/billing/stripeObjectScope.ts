export type AtsPlanType = 'lifetime' | 'monthly';

export interface AtsStripeIdentity {
  attemptId: string;
  planType: AtsPlanType;
  userId: string;
}

type StripeMetadata = Record<string, string | undefined> | null | undefined;

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function scopedIdentity(metadata: StripeMetadata): AtsStripeIdentity | null {
  const attemptId = metadata?.checkout_attempt_id?.trim() ?? '';
  const planType = metadata?.price_type?.trim() ?? '';
  const userId = metadata?.user_id?.trim() ?? '';

  if (
    metadata?.product !== 'jalanea_ats' ||
    !UUID.test(attemptId) ||
    (planType !== 'lifetime' && planType !== 'monthly') ||
    !UUID.test(userId)
  ) {
    return null;
  }

  return {
    attemptId,
    planType,
    userId,
  };
}

function expectedPriceMatches(
  expectedPriceId: string | undefined,
  actualPriceId: string | null
): boolean {
  return !expectedPriceId || actualPriceId === expectedPriceId;
}

export function identifyAtsCheckoutSession(input: {
  metadata: StripeMetadata;
  mode: 'payment' | 'subscription' | 'setup' | null;
  actualPriceId: string | null;
  actualCurrency: string | null;
  actualUnitAmount: number | null;
  actualQuantity: number | null;
  expectedLifetimePriceId?: string;
  expectedMonthlyPriceId?: string;
}): AtsStripeIdentity | null {
  const identity = scopedIdentity(input.metadata);
  if (!identity) return null;
  if (
    input.actualCurrency !== 'usd' ||
    input.actualQuantity !== 1
  ) {
    return null;
  }

  if (identity.planType === 'lifetime') {
    return input.mode === 'payment' &&
      input.actualUnitAmount === 1500 &&
      expectedPriceMatches(
        input.expectedLifetimePriceId,
        input.actualPriceId
      )
      ? identity
      : null;
  }

  return input.mode === 'subscription' &&
    input.actualUnitAmount === 500 &&
    expectedPriceMatches(
      input.expectedMonthlyPriceId,
      input.actualPriceId
    )
    ? identity
    : null;
}

export function identifyAtsSubscription(input: {
  metadata: StripeMetadata;
  actualPriceId: string | null;
  actualCurrency: string | null;
  actualUnitAmount: number | null;
  actualQuantity: number | null;
  expectedMonthlyPriceId?: string;
}): AtsStripeIdentity | null {
  const identity = scopedIdentity(input.metadata);
  if (
    !identity ||
    identity.planType !== 'monthly' ||
    input.actualCurrency !== 'usd' ||
    input.actualUnitAmount !== 500 ||
    input.actualQuantity !== 1 ||
    !expectedPriceMatches(
      input.expectedMonthlyPriceId,
      input.actualPriceId
    )
  ) {
    return null;
  }

  return identity;
}

export function isAtsDedicatedCustomer(input: {
  metadata: StripeMetadata;
  authenticatedUserId: string;
}): boolean {
  return (
    input.metadata?.product === 'jalanea_ats' &&
    input.metadata.user_id === input.authenticatedUserId
  );
}
