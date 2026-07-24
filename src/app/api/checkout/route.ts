import { NextRequest } from 'next/server';
import Stripe from 'stripe';
import { getStripe, STRIPE_PRICES, PRODUCTS } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  handleCheckoutRequest,
  CheckoutSessionLookupError,
  type CheckoutDependencies,
  type CheckoutPlan,
  type CheckoutSessionInput,
} from '@/lib/billing/checkoutService';
import {
  getBillingReturnUrls,
  getCanonicalAppOrigin,
} from '@/lib/billing/appUrl';

function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  return scheme === 'Bearer' && token ? token.trim() : null;
}

function getPlanConfiguration(plan: CheckoutPlan) {
  const isLifetime = plan === 'lifetime';

  return {
    isLifetime,
    priceId: isLifetime ? STRIPE_PRICES.LIFETIME : STRIPE_PRICES.MONTHLY,
    product: isLifetime ? PRODUCTS.LIFETIME : PRODUCTS.MONTHLY,
  };
}

function buildSessionParameters(
  input: CheckoutSessionInput
): Stripe.Checkout.SessionCreateParams {
  const { isLifetime, priceId, product } = getPlanConfiguration(input.plan);
  const metadata = {
    user_id: input.user.id,
    price_type: input.plan,
    checkout_attempt_id: input.attemptId,
    product: 'jalanea_ats',
    ...(priceId ? { price_id: priceId } : {}),
  };

  return {
    mode: isLifetime ? 'payment' : 'subscription',
    customer: input.customerId,
    client_reference_id: input.user.id,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata,
    ...(!isLifetime
      ? {
          subscription_data: {
            metadata,
          },
        }
      : {}),
    line_items: priceId
      ? [{ price: priceId, quantity: 1 }]
      : [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: product.name,
                description: product.description,
              },
              unit_amount: product.price,
              ...(isLifetime ? {} : { recurring: { interval: 'month' as const } }),
            },
            quantity: 1,
          },
        ],
  };
}

function createCheckoutDependencies(): CheckoutDependencies {
  const supabase = createServiceRoleClient();
  const stripe = getStripe();

  return {
    async authenticate(request) {
      const token = getBearerToken(request);
      if (!token) return null;

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (error || !user) return null;
      return { id: user.id, email: user.email ?? null };
    },

    async getMembershipStatus(userId) {
      const { data, error } = await supabase
        .from('ats_memberships')
        .select('status')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw new Error('membership_lookup_failed');
      return data && data.status !== 'active' ? 'removed' : 'active';
    },

    async hasCurrentEntitlement(userId) {
      const { data, error } = await supabase.rpc('has_active_access', {
        check_user_id: userId,
      });

      if (error) throw new Error('subscription_lookup_failed');
      return data === true;
    },

    async hasBillingRelationship(userId) {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, is_lifetime')
        .eq('user_id', userId);

      if (error) throw new Error('billing_relationship_lookup_failed');
      return (data ?? []).some(
        (record) =>
          record.is_lifetime !== true &&
          record.status !== 'canceled' &&
          record.status !== 'incomplete_expired'
      );
    },

    async getCustomerId(userId) {
      const { data: mapping, error: mappingError } = await supabase
        .from('stripe_customers')
        .select('customer_id')
        .eq('user_id', userId)
        .maybeSingle();

      if (mappingError) throw new Error('customer_mapping_lookup_failed');
      return mapping?.customer_id ?? null;
    },

    async createCustomer(user, idempotencyKey) {
      const customer = await stripe.customers.create(
        {
          email: user.email ?? undefined,
          metadata: {
            user_id: user.id,
            product: 'jalanea_ats',
          },
        },
        { idempotencyKey }
      );

      return customer.id;
    },

    async saveCustomerId(userId, customerId) {
      const { data, error } = await supabase.rpc(
        'reconcile_stripe_customer_mapping',
        {
          p_user_id: userId,
          p_customer_id: customerId,
          p_source_event_created_at: new Date().toISOString(),
        }
      );

      if (error || data !== true) {
        throw new Error('customer_mapping_reconciliation_failed');
      }
    },

    async claimAttempt({ userId, plan, customerId }) {
      const { data, error } = await supabase.rpc('claim_stripe_checkout_attempt', {
        p_user_id: userId,
        p_plan_type: plan,
        p_logical_key: crypto.randomUUID(),
        p_stripe_customer_id: customerId,
      });

      if (error) throw new Error('checkout_attempt_claim_failed');
      const result = Array.isArray(data) ? data[0] : data;
      if (!result?.attempt_id || !result?.stripe_idempotency_key) {
        throw new Error('checkout_attempt_claim_invalid');
      }

      return {
        id: result.attempt_id,
        status: result.attempt_status,
        stripeSessionId: result.stripe_session_id ?? null,
        idempotencyKey: result.stripe_idempotency_key,
      };
    },

    async getSession(sessionId) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const reconciledAt = new Date().toISOString();
        return {
          id: session.id,
          url: session.url,
          status: session.status,
          paymentStatus: session.payment_status,
          createdAt: new Date(session.created * 1000).toISOString(),
          expiresAt: session.expires_at
            ? new Date(session.expires_at * 1000).toISOString()
            : null,
          reconciledAt,
        };
      } catch (error) {
        const canReplace =
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.code === 'resource_missing';
        throw new CheckoutSessionLookupError(canReplace);
      }
    },

    async createSession(input, idempotencyKey) {
      const session = await stripe.checkout.sessions.create(
        buildSessionParameters(input),
        { idempotencyKey }
      );
      const reconciledAt = new Date().toISOString();

      return {
        id: session.id,
        url: session.url,
        status: session.status,
        paymentStatus: session.payment_status,
        createdAt: new Date(session.created * 1000).toISOString(),
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        reconciledAt,
      };
    },

    async markAttemptSession({ attemptId, userId, customerId, session }) {
      const isComplete =
        session.status === 'complete' &&
        (
          session.paymentStatus === 'paid' ||
          session.paymentStatus === 'no_payment_required'
        );
      const { error } = await supabase.rpc(
        'reconcile_stripe_checkout_attempt',
        {
          p_record: {
            id: attemptId,
            user_id: userId,
            status: isComplete ? 'completed' : 'session_created',
            stripe_session_id: session.id,
            stripe_customer_id: customerId,
            stripe_session_created_at: session.createdAt,
            payment_status: session.paymentStatus,
            last_error_code: null,
            expires_at: session.expiresAt,
            session_created_at: session.createdAt,
            completed_at: isComplete ? session.reconciledAt : null,
            stripe_reconciled_at: session.reconciledAt,
          },
        }
      );

      if (error) throw new Error('checkout_attempt_update_failed');
    },

    async markAttemptFailed({
      attemptId,
      userId,
      status,
      sessionId,
      errorCode,
      reconciledAt,
    }) {
      const { error } = await supabase.rpc(
        'reconcile_stripe_checkout_attempt',
        {
          p_record: {
            id: attemptId,
            user_id: userId,
            status,
            stripe_session_id: sessionId,
            last_error_code: errorCode,
            stripe_reconciled_at: reconciledAt,
          },
        }
      );

      if (error) throw new Error('checkout_attempt_failure_update_failed');
    },

    getReturnUrls() {
      return getBillingReturnUrls(getCanonicalAppOrigin());
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    return await handleCheckoutRequest(request, createCheckoutDependencies());
  } catch {
    console.error('Checkout request failed');
    return Response.json(
      { error: 'Checkout is temporarily unavailable. Please try again.' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      }
    );
  }
}
