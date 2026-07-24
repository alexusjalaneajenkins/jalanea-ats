export type AccountBillingState = 'active' | 'needs_attention' | 'available';

export function getAccountBillingState(
  hasAccess: boolean,
  subscriptionStatus: string | null | undefined
): AccountBillingState {
  if (hasAccess) return 'active';
  return subscriptionStatus ? 'needs_attention' : 'available';
}
