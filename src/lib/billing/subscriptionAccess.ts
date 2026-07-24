export interface SubscriptionAccessRecord {
  status: string | null;
  is_lifetime: boolean | null;
  payment_status: string | null;
  current_period_end?: string | null;
}

/**
 * Deny by default. Recurring access is limited to Stripe's explicitly
 * provisionable states. Lifetime access additionally requires paid settlement.
 */
export function subscriptionGrantsAccess(
  subscription: SubscriptionAccessRecord
): boolean {
  if (subscription.is_lifetime === true) {
    return (
      subscription.status === 'active' &&
      subscription.payment_status === 'paid'
    );
  }

  return (
    (
      subscription.status === 'active' ||
      subscription.status === 'trialing'
    ) &&
    typeof subscription.current_period_end === 'string' &&
    new Date(subscription.current_period_end).getTime() > Date.now()
  );
}
