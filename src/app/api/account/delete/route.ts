import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type Stripe from 'stripe';
import { getStripe, STRIPE_PRICES } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';
import { identifyAtsCheckoutSession } from '@/lib/billing/stripeObjectScope';
import {
  checkoutAttemptNeedsDeletionDiscovery,
  deleteAtsAccount,
  type AccountDeletionDependencies,
} from '@/lib/billing/accountDeletionService';

async function getAuthenticatedUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return error || !user ? null : user.id;
}

function createDeletionDependencies(): AccountDeletionDependencies {
  const supabase = createServiceRoleClient();
  const stripe = getStripe();

  return {
    async claimDeletion(userId) {
      const { data, error } = await supabase.rpc('claim_ats_account_deletion', {
        p_user_id: userId,
      });
      if (error) throw new Error('deletion_claim_failed');

      const result = Array.isArray(data) ? data[0] : data;
      if (!result) throw new Error('deletion_claim_invalid');

      return {
        claimed: result.claimed === true,
        status: String(result.deletion_status ?? result.status ?? ''),
        attemptCount: Number(result.attempt_count ?? 0),
      };
    },

    async getCustomerIds(userId) {
      const mappingResult = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId);

      if (mappingResult.error) {
        throw new Error('customer_lookup_failed');
      }

      const customerIds = new Set<string>();
      for (const mapping of mappingResult.data ?? []) {
        if (mapping.customer_id) {
          customerIds.add(mapping.customer_id);
        }
      }

      return [...customerIds];
    },

    async listSubscriptions(customerId, userId) {
      const atsSubscriptionIds = new Set<string>();
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const result = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('is_lifetime', false)
          .range(from, from + pageSize - 1);
        if (result.error) {
          throw new Error('ats_subscription_lookup_failed');
        }
        for (const record of result.data ?? []) {
          atsSubscriptionIds.add(record.id);
        }
        if ((result.data?.length ?? 0) < pageSize) break;
      }

      const subscriptions = [];
      for await (const subscription of stripe.subscriptions.list({
        customer: customerId,
        status: 'all',
        limit: 100,
      })) {
        if (!atsSubscriptionIds.has(subscription.id)) continue;
        subscriptions.push({
          id: subscription.id,
          status: subscription.status,
        });
      }
      return subscriptions;
    },

    async listCheckoutSessions(customerId, userId) {
      const sessions = new Map<
        string,
        {
          id: string;
          mode: 'payment' | 'subscription' | 'setup' | null;
          status: 'open' | 'complete' | 'expired' | null;
          paymentStatus: 'paid' | 'unpaid' | 'no_payment_required';
          subscriptionId: string | null;
        }
      >();
      const relevantAttemptIds = new Set<string>();
      const addIfOwnedAtsSession = (
        session: Stripe.Checkout.Session,
        requireRelevantAttempt = false
      ) => {
        const sessionUserId =
          session.metadata?.user_id ?? session.client_reference_id;
        const checkoutAttemptId =
          session.metadata?.checkout_attempt_id ?? null;
        const lineItem = session.line_items?.data[0];
        const price = lineItem?.price;
        const expandedPrice =
          price && typeof price !== 'string' ? price : null;
        const identity = identifyAtsCheckoutSession({
          metadata: session.metadata,
          mode: session.mode,
          actualPriceId:
            typeof price === 'string' ? price : price?.id ?? null,
          actualCurrency:
            expandedPrice?.currency ?? session.currency ?? null,
          actualUnitAmount:
            expandedPrice?.unit_amount ?? session.amount_total,
          actualQuantity: lineItem?.quantity ?? null,
          expectedLifetimePriceId: STRIPE_PRICES.LIFETIME,
          expectedMonthlyPriceId: STRIPE_PRICES.MONTHLY,
        });
        const isRelevant =
          !requireRelevantAttempt ||
          session.status === 'open' ||
          (
            checkoutAttemptId !== null &&
            relevantAttemptIds.has(checkoutAttemptId)
          );
        if (
          sessionUserId === userId &&
          identity?.userId === userId &&
          isRelevant
        ) {
          sessions.set(session.id, {
            id: session.id,
            mode: session.mode,
            status: session.status,
            paymentStatus: session.payment_status,
            subscriptionId:
              typeof session.subscription === 'string'
                ? session.subscription
                : session.subscription?.id ?? null,
          });
        }
      };

      const attempts: Array<{
        id: string;
        plan_type: string;
        stripe_session_id: string | null;
        status: string;
        completed_at: string | null;
        last_error_code: string | null;
      }> = [];
      const pageSize = 1000;
      for (let from = 0; ; from += pageSize) {
        const result = await supabase
          .from('stripe_checkout_attempts')
          .select('id, plan_type, stripe_session_id, status, completed_at, last_error_code')
          .eq('user_id', userId)
          .eq('stripe_customer_id', customerId)
          .in('status', ['pending', 'session_created', 'completed', 'failed'])
          .order('created_at', { ascending: false })
          .range(from, from + pageSize - 1);
        if (result.error) throw new Error('checkout_attempt_lookup_failed');
        attempts.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < pageSize) break;
      }

      const subscriptionRecords: Array<{ metadata: unknown }> = [];
      for (let from = 0; ; from += pageSize) {
        const result = await supabase
          .from('subscriptions')
          .select('metadata')
          .eq('user_id', userId)
          .eq('is_lifetime', false)
          .range(from, from + pageSize - 1);
        if (result.error) throw new Error('ats_subscription_lookup_failed');
        subscriptionRecords.push(...(result.data ?? []));
        if ((result.data?.length ?? 0) < pageSize) break;
      }

      const membershipResult = await supabase
        .from('ats_memberships')
        .select('deletion_requested_at')
        .eq('user_id', userId)
        .single();
      if (membershipResult.error) {
        throw new Error('checkout_attempt_lookup_failed');
      }

      const reconciledAttemptIds = new Set(
        subscriptionRecords
          .map((record) => {
            const metadata = record.metadata;
            if (
              !metadata ||
              typeof metadata !== 'object' ||
              Array.isArray(metadata)
            ) {
              return null;
            }
            const attemptId = (
              metadata as Record<string, unknown>
            ).checkout_attempt_id;
            return typeof attemptId === 'string' ? attemptId : null;
          })
          .filter((attemptId): attemptId is string => attemptId !== null)
      );

      const deletionRequestedAtValue =
        membershipResult.data.deletion_requested_at;
      if (!deletionRequestedAtValue) {
        throw new Error('deletion_request_timestamp_missing');
      }
      const deletionRequestedAt = new Date(deletionRequestedAtValue).getTime();
      for (const attempt of attempts) {
        if (checkoutAttemptNeedsDeletionDiscovery({
          planType: attempt.plan_type,
          status: attempt.status,
          completedAt: attempt.completed_at,
          deletionRequestedAt,
          lastErrorCode: attempt.last_error_code,
          hasReconciledSubscription: reconciledAttemptIds.has(attempt.id),
        })) {
          relevantAttemptIds.add(attempt.id);
        }

        if (attempt.stripe_session_id && relevantAttemptIds.has(attempt.id)) {
          addIfOwnedAtsSession(
            await stripe.checkout.sessions.retrieve(
              attempt.stripe_session_id,
              { expand: ['line_items.data.price'] }
            )
          );
        }
      }

      for await (const session of stripe.checkout.sessions.list({
        customer: customerId,
        limit: 100,
        expand: ['data.line_items.data.price'],
      })) {
        // Include every currently open ATS session plus sessions connected to
        // a checkout claim that overlapped deletion, including an orphaned
        // provider response discovered after its durable lease expired.
        addIfOwnedAtsSession(session, true);
      }

      return [...sessions.values()];
    },

    async getCheckoutSession(sessionId) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      return {
        id: session.id,
        mode: session.mode,
        status: session.status,
        paymentStatus: session.payment_status,
        subscriptionId:
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null,
      };
    },

    async expireCheckoutSession(sessionId) {
      await stripe.checkout.sessions.expire(sessionId);
    },

    async cancelSubscription(subscriptionId) {
      await stripe.subscriptions.cancel(subscriptionId);
    },

    async markBillingCanceled(userId) {
      const { data, error } = await supabase.rpc('mark_ats_billing_canceled', {
        p_user_id: userId,
      });
      if (error || data !== true) {
        throw new Error('billing_state_update_failed');
      }
    },

    async completeAtsDeletion(userId) {
      const { data, error } = await supabase.rpc('complete_ats_account_deletion', {
        p_user_id: userId,
      });
      const result = Array.isArray(data) ? data[0] : data;
      if (error || !result || typeof result !== 'object') {
        throw new Error('ats_cleanup_failed');
      }

      return Object.fromEntries(
        Object.entries(result as Record<string, unknown>)
          .filter(([, value]) => typeof value === 'number')
          .map(([key, value]) => [key, Number(value)])
      );
    },

    async markDeletionFailed(userId, errorCode, nextRetryAt) {
      const { error } = await supabase.rpc('mark_ats_account_deletion_failed', {
        p_user_id: userId,
        p_error_code: errorCode,
        p_next_retry_at: nextRetryAt,
      });
      if (error) {
        console.error('Could not persist retryable ATS deletion state');
      }
    },
  };
}

export async function DELETE() {
  const userId = await getAuthenticatedUserId();
  if (!userId) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } }
    );
  }

  try {
    const result = await deleteAtsAccount(userId, createDeletionDependencies());
    return NextResponse.json(result.body, {
      status: result.status,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch {
    console.error('ATS account removal request failed');
    return NextResponse.json(
      {
        error: 'Jalanea ATS data could not be removed right now. Please retry.',
        retryable: true,
      },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
