export interface DeletionClaim {
  claimed: boolean;
  status: string;
  attemptCount: number;
}

export interface BillingSubscription {
  id: string;
  status: string;
}

export interface CheckoutSessionForDeletion {
  id: string;
  mode: 'payment' | 'subscription' | 'setup' | null;
  status: 'open' | 'complete' | 'expired' | null;
  paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
  subscriptionId: string | null;
}

export interface AccountDeletionDependencies {
  claimDeletion(userId: string): Promise<DeletionClaim>;
  getCustomerIds(userId: string): Promise<string[]>;
  listCheckoutSessions(
    customerId: string,
    userId: string
  ): Promise<CheckoutSessionForDeletion[]>;
  getCheckoutSession(sessionId: string): Promise<CheckoutSessionForDeletion>;
  expireCheckoutSession(sessionId: string): Promise<void>;
  listSubscriptions(
    customerId: string,
    userId: string
  ): Promise<BillingSubscription[]>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  markBillingCanceled(userId: string): Promise<void>;
  completeAtsDeletion(userId: string): Promise<Record<string, number>>;
  markDeletionFailed(
    userId: string,
    errorCode:
      | 'billing_cancellation_failed'
      | 'ats_data_cleanup_failed'
      | 'paid_checkout_requires_support'
      | 'checkout_payment_pending',
    retryAt: string
  ): Promise<void>;
}

export type AccountDeletionResult =
  | {
      ok: true;
      status: 200;
      body: {
        success: true;
        scope: 'jalanea-ats';
        sharedIdentityPreserved: true;
        deleted: Record<string, number>;
      };
    }
  | {
      ok: false;
      status: 409 | 500 | 502;
      body: {
        error: string;
        retryable: boolean;
      };
    };

const TERMINAL_SUBSCRIPTION_STATUSES = new Set([
  'canceled',
  'incomplete_expired',
]);

export function checkoutAttemptNeedsDeletionDiscovery(input: {
  planType: string;
  status: string;
  completedAt: string | null;
  deletionRequestedAt: number;
  lastErrorCode: string | null;
  hasReconciledSubscription: boolean;
}): boolean {
  const completedDuringDeletion =
    input.completedAt !== null &&
    new Date(input.completedAt).getTime() >= input.deletionRequestedAt;
  const wasOpenAtDeletion =
    input.status === 'pending' || input.status === 'session_created';
  const wasAbandonedProviderClaim =
    input.status === 'failed' &&
    input.lastErrorCode === 'checkout_claim_abandoned';
  const isUnreconciledCompletedMonthly =
    input.planType === 'monthly' &&
    input.status === 'completed' &&
    !input.hasReconciledSubscription;

  return (
    completedDuringDeletion ||
    wasOpenAtDeletion ||
    wasAbandonedProviderClaim ||
    isUnreconciledCompletedMonthly
  );
}

function retryAt(): string {
  return new Date(Date.now() + 5 * 60_000).toISOString();
}

/**
 * Removes only Jalanea ATS membership/data. The shared Supabase Auth user and
 * profile remain because the same identity is used by the tutoring product.
 *
 * Billing is completed first. If database cleanup then fails, the durable
 * deletion request remains retryable and billing is already safe.
 */
export async function deleteAtsAccount(
  userId: string,
  dependencies: AccountDeletionDependencies
): Promise<AccountDeletionResult> {
  const claim = await dependencies.claimDeletion(userId);

  if (!claim.claimed && claim.status === 'deleted') {
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        scope: 'jalanea-ats',
        sharedIdentityPreserved: true,
        deleted: {},
      },
    };
  }

  if (!claim.claimed) {
    return {
      ok: false,
      status: 409,
      body: {
        error: 'Jalanea ATS removal is already in progress. Please retry shortly.',
        retryable: true,
      },
    };
  }

  try {
    const customerIds = await dependencies.getCustomerIds(userId);
    const canceledSubscriptionIds = new Set<string>();

    for (const customerId of customerIds) {
      const checkoutSessions = await dependencies.listCheckoutSessions(
        customerId,
        userId
      );
      for (const session of checkoutSessions) {
        if (
          session.mode === 'payment' &&
          session.paymentStatus === 'paid'
        ) {
          await dependencies.markDeletionFailed(
            userId,
            'paid_checkout_requires_support',
            retryAt()
          );
          return {
            ok: false,
            status: 409,
            body: {
              error:
                'A lifetime checkout completed during removal. Deletion is blocked so paid access is not silently removed. Contact support to resolve the payment first.',
              retryable: false,
            },
          };
        }

        if (
          session.mode === 'subscription' &&
          session.status === 'complete' &&
          !session.subscriptionId
        ) {
          await dependencies.markDeletionFailed(
            userId,
            'checkout_payment_pending',
            retryAt()
          );
          return {
            ok: false,
            status: 409,
            body: {
              error:
                'A monthly checkout is still linking its subscription. Jalanea ATS removal is paused until Stripe reports the subscription.',
              retryable: true,
            },
          };
        }

        if (
          session.mode === 'subscription' &&
          session.subscriptionId &&
          !canceledSubscriptionIds.has(session.subscriptionId)
        ) {
          await dependencies.cancelSubscription(session.subscriptionId);
          canceledSubscriptionIds.add(session.subscriptionId);
        }

        if (
          session.status === 'complete' &&
          session.paymentStatus === 'unpaid'
        ) {
          await dependencies.markDeletionFailed(
            userId,
            'checkout_payment_pending',
            retryAt()
          );
          return {
            ok: false,
            status: 409,
            body: {
              error:
                'A checkout payment is still processing. Jalanea ATS removal is paused until Stripe reports a final state.',
              retryable: true,
            },
          };
        }

        if (session.status === 'open') {
          try {
            await dependencies.expireCheckoutSession(session.id);
          } catch {
            // Resolve the expire-vs-payment race from Stripe's current state.
            const current = await dependencies.getCheckoutSession(session.id);
            if (
              current.mode === 'payment' &&
              current.paymentStatus === 'paid'
            ) {
              await dependencies.markDeletionFailed(
                userId,
                'paid_checkout_requires_support',
                retryAt()
              );
              return {
                ok: false,
                status: 409,
                body: {
                  error:
                    'A lifetime checkout completed during removal. Deletion is blocked so paid access is not silently removed. Contact support to resolve the payment first.',
                  retryable: false,
                },
              };
            }
            if (
              current.status === 'complete' &&
              current.paymentStatus === 'unpaid'
            ) {
              await dependencies.markDeletionFailed(
                userId,
                'checkout_payment_pending',
                retryAt()
              );
              return {
                ok: false,
                status: 409,
                body: {
                  error:
                    'A checkout payment is still processing. Jalanea ATS removal is paused until Stripe reports a final state.',
                  retryable: true,
                },
              };
            }
            throw new Error('checkout_expiration_failed');
          }
        }
      }

      const subscriptions = await dependencies.listSubscriptions(
        customerId,
        userId
      );
      for (const subscription of subscriptions) {
        if (
          !TERMINAL_SUBSCRIPTION_STATUSES.has(subscription.status) &&
          !canceledSubscriptionIds.has(subscription.id)
        ) {
          await dependencies.cancelSubscription(subscription.id);
        }
      }
    }

    await dependencies.markBillingCanceled(userId);
  } catch {
    await dependencies.markDeletionFailed(
      userId,
      'billing_cancellation_failed',
      retryAt()
    );

    return {
      ok: false,
      status: 502,
      body: {
        error:
          'We could not confirm billing cancellation, so Jalanea ATS data was not removed. Please retry.',
        retryable: true,
      },
    };
  }

  try {
    const deleted = await dependencies.completeAtsDeletion(userId);
    return {
      ok: true,
      status: 200,
      body: {
        success: true,
        scope: 'jalanea-ats',
        sharedIdentityPreserved: true,
        deleted,
      },
    };
  } catch {
    await dependencies.markDeletionFailed(
      userId,
      'ats_data_cleanup_failed',
      retryAt()
    );

    return {
      ok: false,
      status: 500,
      body: {
        error:
          'Billing is canceled, but Jalanea ATS data cleanup is incomplete. Retrying is safe.',
        retryable: true,
      },
    };
  }
}
