import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, STRIPE_PRICES } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';
import {
  identifyAtsCheckoutSession,
  identifyAtsSubscription,
  type AtsStripeIdentity,
} from '@/lib/billing/stripeObjectScope';
import {
  processStripeEvent,
  type StripeEventEnvelope,
  type WebhookDependencies,
} from '@/lib/billing/webhookService';

type AdminClient = ReturnType<typeof createServiceRoleClient>;

function stripeId(
  value:
    | string
    | { id: string }
    | null
    | undefined
): string | null {
  if (typeof value === 'string') return value;
  return value?.id ?? null;
}

function isoFromSeconds(
  seconds: number | null | undefined,
  fallback: string
): string {
  return typeof seconds === 'number'
    ? new Date(seconds * 1000).toISOString()
    : fallback;
}

async function getAtsBillingPermission(
  supabase: AdminClient,
  userId: string
): Promise<'apply' | 'retry' | 'ignore'> {
  const { data, error } = await supabase
    .from('ats_memberships')
    .select('status, billing_canceled_at')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new Error('membership_lookup_failed');
  if (!data || data.status === 'active') return 'apply';
  if (data.status === 'deleting') return 'retry';
  if (
    data.status === 'deletion_failed' &&
    !data.billing_canceled_at
  ) {
    return 'apply';
  }
  return 'ignore';
}

async function shouldApplyBilling(
  supabase: AdminClient,
  userId: string
): Promise<boolean> {
  const permission = await getAtsBillingPermission(supabase, userId);
  if (permission === 'retry') {
    throw new Error('membership_deletion_in_progress');
  }
  return permission === 'apply';
}

async function resolveUserIdForCustomer(
  supabase: AdminClient,
  customerId: string,
  metadataUserId: string | null
): Promise<string> {
  const { data: customer, error: customerError } = await supabase
    .from('stripe_customers')
    .select('user_id')
    .eq('customer_id', customerId)
    .maybeSingle();

  if (customerError) {
    throw new Error('customer_owner_lookup_failed');
  }

  const mappedUserId = customer?.user_id ?? null;
  if (mappedUserId && metadataUserId && mappedUserId !== metadataUserId) {
    throw new Error('customer_owner_mismatch');
  }

  if (!mappedUserId || !metadataUserId) {
    throw new Error('customer_owner_missing');
  }
  return mappedUserId;
}

async function hasDurableAtsAttempt(
  supabase: AdminClient,
  identity: AtsStripeIdentity,
  customerId: string,
  checkoutSessionId?: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('stripe_checkout_attempts')
    .select('id, stripe_session_id')
    .eq('id', identity.attemptId)
    .eq('user_id', identity.userId)
    .eq('plan_type', identity.planType)
    .eq('stripe_customer_id', customerId)
    .maybeSingle();

  if (error) throw new Error('checkout_attempt_scope_lookup_failed');
  if (!data) return false;
  return (
    !checkoutSessionId ||
    data.stripe_session_id === null ||
    data.stripe_session_id === checkoutSessionId
  );
}

async function reconcileCustomer(
  supabase: AdminClient,
  userId: string,
  customerId: string,
  sourceEventCreatedAt: string
): Promise<void> {
  const { error } = await supabase.rpc('reconcile_stripe_customer_mapping', {
    p_user_id: userId,
    p_customer_id: customerId,
    p_source_event_created_at: sourceEventCreatedAt,
  });

  if (error) throw new Error('customer_reconciliation_failed');
}

async function localPriceId(
  supabase: AdminClient,
  stripePriceId: string | null
): Promise<string | null> {
  if (!stripePriceId) return null;

  const { data, error } = await supabase
    .from('prices')
    .select('id')
    .eq('id', stripePriceId)
    .maybeSingle();

  if (error) throw new Error('price_lookup_failed');
  return data?.id ?? null;
}

async function persistSubscriptionRecord(
  supabase: AdminClient,
  record: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.rpc('reconcile_stripe_subscription', {
    p_record: record,
  });
  if (error) throw new Error('subscription_reconciliation_failed');
}

async function updateCheckoutAttempt(
  supabase: AdminClient,
  input: {
    attemptId: string;
    sessionId: string;
    userId: string;
    customerId: string;
    status: 'session_created' | 'completed' | 'failed' | 'expired';
    paymentStatus: Stripe.Checkout.Session.PaymentStatus;
    createdAt: string;
    expiresAt: string | null;
    reconciledAt: string;
    errorCode?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.rpc('reconcile_stripe_checkout_attempt', {
    p_record: {
      id: input.attemptId,
      user_id: input.userId,
      status: input.status,
      stripe_session_id: input.sessionId,
      stripe_customer_id: input.customerId,
      stripe_session_created_at: input.createdAt,
      payment_status: input.paymentStatus,
      last_error_code: input.errorCode ?? null,
      expires_at: input.expiresAt,
      session_created_at: input.createdAt,
      completed_at:
        input.status === 'completed' ? input.reconciledAt : null,
      stripe_reconciled_at: input.reconciledAt,
    },
  });
  if (error) throw new Error('checkout_attempt_reconciliation_failed');
}

async function reconcileLifetimeSession(
  supabase: AdminClient,
  session: Stripe.Checkout.Session,
  userId: string,
  eventId: string,
  eventCreatedAt: string,
  reconciledAt: string
): Promise<void> {
  const isPaid = session.payment_status === 'paid';
  const createdAt = isoFromSeconds(session.created, reconciledAt);
  const priceId = session.metadata?.price_id ?? null;

  await persistSubscriptionRecord(supabase, {
    id: session.id,
    user_id: userId,
    status: isPaid ? 'active' : 'canceled',
    payment_status: session.payment_status,
    price_id: null,
    quantity: 1,
    cancel_at_period_end: false,
    created: createdAt,
    current_period_start: createdAt,
    current_period_end: isPaid ? '9999-12-31T23:59:59.999Z' : createdAt,
    ended_at: isPaid ? null : reconciledAt,
    cancel_at: null,
    canceled_at: isPaid ? null : reconciledAt,
    trial_start: null,
    trial_end: null,
    is_lifetime: true,
    metadata: {
      checkout_session_id: session.id,
      payment_intent: stripeId(session.payment_intent),
      ...(priceId ? { stripe_price_id: priceId } : {}),
    },
    stripe_last_event_created_at: eventCreatedAt,
    stripe_reconciled_at: reconciledAt,
    source_event_id: eventId,
  });
}

async function reconcileCurrentCheckoutSession(
  supabase: AdminClient,
  stripe: Stripe,
  sessionId: string,
  eventId: string,
  eventCreatedAt: string
): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  });
  const reconciledAt = new Date().toISOString();
  const lineItem = session.line_items?.data[0];
  const actualPriceId = stripeId(lineItem?.price);
  const expandedPrice =
    lineItem?.price && typeof lineItem.price !== 'string'
      ? lineItem.price
      : null;
  const identity = identifyAtsCheckoutSession({
    metadata: session.metadata,
    mode: session.mode,
    actualPriceId,
    actualCurrency: expandedPrice?.currency ?? session.currency ?? null,
    actualUnitAmount: expandedPrice?.unit_amount ?? session.amount_total,
    actualQuantity: lineItem?.quantity ?? null,
    expectedLifetimePriceId: STRIPE_PRICES.LIFETIME,
    expectedMonthlyPriceId: STRIPE_PRICES.MONTHLY,
  });
  if (!identity) return;

  const clientUserId = session.client_reference_id?.trim() || null;
  if (clientUserId !== identity.userId) {
    throw new Error('checkout_owner_mismatch');
  }

  const customerId = stripeId(session.customer);
  if (!customerId) throw new Error('checkout_customer_missing');
  if (
    !(await hasDurableAtsAttempt(
      supabase,
      identity,
      customerId,
      session.id
    ))
  ) {
    return;
  }

  const userId = await resolveUserIdForCustomer(
    supabase,
    customerId,
    identity.userId
  );

  if (!(await shouldApplyBilling(supabase, userId))) return;
  await reconcileCustomer(supabase, userId, customerId, eventCreatedAt);

  const paymentSettled =
    session.payment_status === 'paid' ||
    session.payment_status === 'no_payment_required';
  const attemptStatus =
    session.status === 'complete' && paymentSettled
      ? 'completed'
      : 'session_created';

  await updateCheckoutAttempt(supabase, {
    attemptId: identity.attemptId,
    sessionId: session.id,
    userId,
    customerId,
    status: attemptStatus,
    paymentStatus: session.payment_status,
    createdAt: isoFromSeconds(session.created, reconciledAt),
    expiresAt: session.expires_at
      ? isoFromSeconds(session.expires_at, reconciledAt)
      : null,
    reconciledAt,
  });

  if (session.mode === 'payment') {
    // Active lifetime access is impossible unless payment_status is exactly paid.
    await reconcileLifetimeSession(
      supabase,
      session,
      userId,
      eventId,
      eventCreatedAt,
      reconciledAt
    );
  }
}

async function reconcileFailedCheckoutSession(
  supabase: AdminClient,
  stripe: Stripe,
  sessionId: string,
  eventId: string,
  reason: 'async_payment_failed' | 'expired',
  eventCreatedAt: string
): Promise<void> {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items.data.price'],
  });
  const lineItem = session.line_items?.data[0];
  const actualPriceId = stripeId(lineItem?.price);
  const expandedPrice =
    lineItem?.price && typeof lineItem.price !== 'string'
      ? lineItem.price
      : null;
  const identity = identifyAtsCheckoutSession({
    metadata: session.metadata,
    mode: session.mode,
    actualPriceId,
    actualCurrency: expandedPrice?.currency ?? session.currency ?? null,
    actualUnitAmount: expandedPrice?.unit_amount ?? session.amount_total,
    actualQuantity: lineItem?.quantity ?? null,
    expectedLifetimePriceId: STRIPE_PRICES.LIFETIME,
    expectedMonthlyPriceId: STRIPE_PRICES.MONTHLY,
  });
  if (!identity) return;

  // A delayed failure/expiry delivery cannot reverse a session that Stripe now
  // reports as paid.
  if (session.payment_status === 'paid') {
    await reconcileCurrentCheckoutSession(
      supabase,
      stripe,
      sessionId,
      eventId,
      eventCreatedAt
    );
    return;
  }

  const customerId = stripeId(session.customer);
  if (
    !customerId ||
    session.client_reference_id?.trim() !== identity.userId
  ) {
    throw new Error('failed_checkout_owner_missing');
  }
  if (
    !(await hasDurableAtsAttempt(
      supabase,
      identity,
      customerId,
      session.id
    ))
  ) {
    return;
  }

  const userId = await resolveUserIdForCustomer(
    supabase,
    customerId,
    identity.userId
  );
  if (!(await shouldApplyBilling(supabase, userId))) return;

  const reconciledAt = new Date().toISOString();
  await updateCheckoutAttempt(supabase, {
    attemptId: identity.attemptId,
    sessionId: session.id,
    userId,
    customerId,
    status: reason === 'expired' ? 'expired' : 'failed',
    paymentStatus: session.payment_status,
    createdAt: isoFromSeconds(session.created, reconciledAt),
    expiresAt: session.expires_at
      ? isoFromSeconds(session.expires_at, reconciledAt)
      : null,
    reconciledAt,
    errorCode: reason,
  });

  if (session.mode === 'payment') {
    await reconcileLifetimeSession(
      supabase,
      session,
      userId,
      eventId,
      eventCreatedAt,
      reconciledAt
    );
  }
}

async function reconcileCurrentSubscription(
  supabase: AdminClient,
  stripe: Stripe,
  subscriptionId: string,
  eventId: string,
  eventCreatedAt: string,
  fallbackObject?: Record<string, unknown>
): Promise<void> {
  let subscription: Stripe.Subscription;

  try {
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
  } catch {
    if (fallbackObject?.status !== 'canceled') throw new Error('subscription_retrieve_failed');
    subscription = fallbackObject as unknown as Stripe.Subscription;
  }
  const reconciledAt = new Date().toISOString();

  const customerId = stripeId(subscription.customer);
  if (!customerId) throw new Error('subscription_customer_missing');

  const item = subscription.items?.data?.[0];
  const stripePriceId = stripeId(item?.price);
  const identity = identifyAtsSubscription({
    metadata: subscription.metadata,
    actualPriceId: stripePriceId,
    actualCurrency: item?.price?.currency ?? null,
    actualUnitAmount: item?.price?.unit_amount ?? null,
    actualQuantity: item?.quantity ?? null,
    expectedMonthlyPriceId: STRIPE_PRICES.MONTHLY,
  });
  if (!identity) return;
  if (!(await hasDurableAtsAttempt(supabase, identity, customerId))) {
    return;
  }

  const userId = await resolveUserIdForCustomer(
    supabase,
    customerId,
    identity.userId
  );
  if (!(await shouldApplyBilling(supabase, userId))) return;

  await reconcileCustomer(supabase, userId, customerId, eventCreatedAt);

  const createdAt = isoFromSeconds(subscription.created, reconciledAt);
  const periodStart = isoFromSeconds(
    item?.current_period_start,
    createdAt
  );
  const periodEnd = isoFromSeconds(
    item?.current_period_end,
    periodStart
  );
  await persistSubscriptionRecord(supabase, {
    id: subscription.id,
    user_id: userId,
    status: subscription.status,
    payment_status: null,
    price_id: await localPriceId(supabase, stripePriceId),
    quantity: item?.quantity ?? 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    created: createdAt,
    current_period_start: periodStart,
    current_period_end: periodEnd,
    ended_at: subscription.ended_at
      ? isoFromSeconds(subscription.ended_at, reconciledAt)
      : null,
    cancel_at: subscription.cancel_at
      ? isoFromSeconds(subscription.cancel_at, reconciledAt)
      : null,
    canceled_at: subscription.canceled_at
      ? isoFromSeconds(subscription.canceled_at, reconciledAt)
      : null,
    trial_start: subscription.trial_start
      ? isoFromSeconds(subscription.trial_start, reconciledAt)
      : null,
    trial_end: subscription.trial_end
      ? isoFromSeconds(subscription.trial_end, reconciledAt)
      : null,
    is_lifetime: false,
    metadata: {
      ...(subscription.metadata ?? {}),
      ...(stripePriceId ? { stripe_price_id: stripePriceId } : {}),
    },
    stripe_last_event_created_at: eventCreatedAt,
    stripe_reconciled_at: reconciledAt,
    source_event_id: eventId,
  });
}

function createWebhookDependencies(
  supabase: AdminClient,
  stripe: Stripe
): WebhookDependencies {
  return {
    async claimEvent(input) {
      const { data, error } = await supabase.rpc('claim_stripe_webhook_event', {
        p_event_id: input.eventId,
        p_event_type: input.eventType,
        p_stripe_object_id: input.objectId,
        p_event_created_at: input.eventCreatedAt,
      });
      if (error) throw new Error('webhook_claim_failed');

      const result = Array.isArray(data) ? data[0] : data;
      return {
        claimed: result?.claimed === true,
        status: String(result?.event_status ?? ''),
      };
    },

    async finishEvent(input) {
      const { data, error } = await supabase.rpc('finish_stripe_webhook_event', {
        p_event_id: input.eventId,
        p_status: input.status,
        p_last_error_code: input.errorCode,
        p_next_retry_at: input.retryAt,
      });
      if (error || data !== true) throw new Error('webhook_finish_failed');
    },

    reconcileCheckoutSession(sessionId, eventId, eventCreatedAt) {
      return reconcileCurrentCheckoutSession(
        supabase,
        stripe,
        sessionId,
        eventId,
        eventCreatedAt
      );
    },

    failCheckoutSession(sessionId, eventId, reason, eventCreatedAt) {
      return reconcileFailedCheckoutSession(
        supabase,
        stripe,
        sessionId,
        eventId,
        reason,
        eventCreatedAt
      );
    },

    reconcileSubscription(
      subscriptionId,
      eventId,
      eventCreatedAt,
      fallbackObject
    ) {
      return reconcileCurrentSubscription(
        supabase,
        stripe,
        subscriptionId,
        eventId,
        eventCreatedAt,
        fallbackObject
      );
    },
  };
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { error: 'Webhook authentication is unavailable' },
      { status: 400 }
    );
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      webhookSecret
    );
  } catch {
    console.error('Stripe webhook signature verification failed');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    const result = await processStripeEvent(
      event as unknown as StripeEventEnvelope,
      createWebhookDependencies(createServiceRoleClient(), stripe)
    );

    return NextResponse.json({ received: true, result });
  } catch {
    console.error('Stripe webhook reconciliation failed');
    return NextResponse.json(
      { error: 'Webhook reconciliation failed' },
      { status: 500 }
    );
  }
}
