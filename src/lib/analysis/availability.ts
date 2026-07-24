export type AnalysisAccessMode =
  | 'checking'
  | 'paid'
  | 'free'
  | 'unavailable';

export interface AnalysisAvailabilityInput {
  isSignedIn: boolean;
  hasPaidAccess: boolean;
  isEntitlementLoading: boolean;
  hasEntitlementError: boolean;
  isFreeTierLoading: boolean;
  freeTierEnabled: boolean;
  freeTierRemaining: number | null;
}

export interface VerifiedPaidAccessInput {
  hasAccess: boolean;
  isEntitlementLoading: boolean;
  accessError: string | null;
}

export function hasVerifiedPaidAccess({
  hasAccess,
  isEntitlementLoading,
  accessError,
}: VerifiedPaidAccessInput): boolean {
  return hasAccess && !isEntitlementLoading && !accessError;
}

export function getAnalysisAccessMode({
  isSignedIn,
  hasPaidAccess,
  isEntitlementLoading,
  hasEntitlementError,
  isFreeTierLoading,
  freeTierEnabled,
  freeTierRemaining,
}: AnalysisAvailabilityInput): AnalysisAccessMode {
  if (isSignedIn && isEntitlementLoading) return 'checking';
  if (isSignedIn && hasEntitlementError) return 'unavailable';
  if (
    isSignedIn &&
    hasVerifiedPaidAccess({
      hasAccess: hasPaidAccess,
      isEntitlementLoading,
      accessError: hasEntitlementError
        ? 'Entitlement verification failed'
        : null,
    })
  ) {
    return 'paid';
  }
  if (isFreeTierLoading) return 'checking';
  if (freeTierEnabled && (freeTierRemaining ?? 0) > 0) return 'free';
  return 'unavailable';
}
