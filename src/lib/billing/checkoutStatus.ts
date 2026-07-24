export type CheckoutStatusState =
  | 'paid'
  | 'active'
  | 'pending'
  | 'failed'
  | 'invalid';

export interface CheckoutStatusInput {
  authenticatedUserId: string;
  clientReferenceId: string | null;
  metadataUserId: string | null;
  atsSessionVerified: boolean;
  sessionStatus: 'open' | 'complete' | 'expired' | null;
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
  hasEntitlement: boolean;
}

function belongsToUser(input: CheckoutStatusInput): boolean {
  const identifiers = [
    input.clientReferenceId,
    input.metadataUserId,
  ].filter((value): value is string => Boolean(value));

  return (
    identifiers.length > 0 &&
    identifiers.every((value) => value === input.authenticatedUserId)
  );
}

/**
 * Classifies a server-retrieved Checkout Session. Redirect query parameters
 * and elapsed time are never evidence that payment succeeded.
 */
export function classifyCheckoutStatus(
  input: CheckoutStatusInput
): CheckoutStatusState {
  if (!input.atsSessionVerified) return 'invalid';
  if (!belongsToUser(input)) return 'invalid';
  if (input.sessionStatus === 'expired') return 'failed';

  if (input.hasEntitlement) {
    return input.paymentStatus === 'paid' ? 'paid' : 'active';
  }

  if (input.paymentStatus === 'paid') {
    // Stripe has settled, but the durable entitlement webhook is still pending.
    return 'pending';
  }

  if (
    input.sessionStatus === 'open' ||
    input.sessionStatus === 'complete'
  ) {
    return 'pending';
  }

  return 'failed';
}
