/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events and updates Supabase accordingly.
 *
 * [EXTERNAL - Gemini Research]:
 * - Uses raw body for signature verification (App Router requirement)
 * - Uses service role key to bypass RLS
 * - Handles both one-time (lifetime) and recurring subscriptions
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';

// Stripe webhook secret
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // Get raw body for signature verification
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Get Supabase admin client
  const supabase = createServiceRoleClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, subscription);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}

/**
 * Handle successful checkout
 * Links Stripe customer to Supabase user and creates subscription record
 */
async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createServiceRoleClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.client_reference_id;
  const customerId = session.customer as string;
  const isLifetime = session.mode === 'payment';

  console.log('Checkout completed:', { userId, customerId, isLifetime });

  // Update profile with Stripe customer ID
  if (userId) {
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ stripe_customer_id: customerId })
      .eq('id', userId);

    if (profileError) {
      console.error('Failed to update profile:', profileError);
    }
  }

  // For one-time payments (lifetime), create subscription record manually
  if (isLifetime && userId) {
    // Idempotency check: skip if subscription already exists
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('id', session.id)
      .single();

    if (existing) {
      console.log('Lifetime subscription already exists, skipping:', session.id);
      return;
    }

    const { error: subError } = await supabase.from('subscriptions').upsert({
      id: session.id, // Use session ID as subscription ID for lifetime
      user_id: userId,
      status: 'active',
      price_id: null, // Set to null to avoid FK constraint issues
      quantity: 1,
      cancel_at_period_end: false,
      current_period_start: new Date().toISOString(),
      current_period_end: '9999-12-31T23:59:59.999Z', // Never expires
      is_lifetime: true,
      metadata: {
        checkout_session_id: session.id,
        payment_intent: session.payment_intent,
        price_id: session.metadata?.price_id || null, // Store in metadata instead
      },
    });

    if (subError) {
      console.error('Failed to create lifetime subscription:', subError);
      throw subError;
    }

    console.log('Lifetime subscription created for user:', userId);
  }
}

/**
 * Handle subscription create/update
 * Syncs subscription state from Stripe to Supabase
 */
async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  // Get user ID from subscription metadata or customer
  const customerId = subscription.customer as string;

  // Look up user by stripe_customer_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', customerId)
    .single();

  if (!profile) {
    console.error('No profile found for customer:', customerId);
    return;
  }

  // Cast to any for compatibility with different Stripe SDK versions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;
  const stripePriceId = subscription.items.data[0]?.price.id || null;
  let persistedPriceId: string | null = null;

  // `subscriptions.price_id` has an FK to public.prices.
  // Checkout can use inline price_data, so Stripe price IDs may not exist locally.
  // In that case we store the Stripe ID in metadata and keep price_id null.
  if (stripePriceId) {
    const { data: localPrice, error: localPriceError } = await supabase
      .from('prices')
      .select('id')
      .eq('id', stripePriceId)
      .maybeSingle();

    if (localPriceError) {
      console.error('Failed to verify local price record:', localPriceError);
    } else if (localPrice) {
      persistedPriceId = stripePriceId;
    }
  }

  const metadata = {
    ...(subscription.metadata || {}),
    ...(stripePriceId && !persistedPriceId ? { stripe_price_id: stripePriceId } : {}),
  };

  const { error } = await supabase.from('subscriptions').upsert({
    id: subscription.id,
    user_id: profile.id,
    status: subscription.status as 'active' | 'canceled' | 'past_due' | 'unpaid' | 'trialing' | 'incomplete' | 'incomplete_expired',
    price_id: persistedPriceId,
    quantity: subscription.items.data[0]?.quantity || 1,
    cancel_at_period_end: subscription.cancel_at_period_end,
    current_period_start: sub.current_period_start
      ? new Date(sub.current_period_start * 1000).toISOString()
      : new Date().toISOString(),
    current_period_end: sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : new Date().toISOString(),
    canceled_at: sub.canceled_at
      ? new Date(sub.canceled_at * 1000).toISOString()
      : null,
    cancel_at: sub.cancel_at
      ? new Date(sub.cancel_at * 1000).toISOString()
      : null,
    ended_at: sub.ended_at
      ? new Date(sub.ended_at * 1000).toISOString()
      : null,
    trial_start: sub.trial_start
      ? new Date(sub.trial_start * 1000).toISOString()
      : null,
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
    is_lifetime: false,
    metadata,
  });

  if (error) {
    console.error('Failed to upsert subscription:', error);
    throw error;
  }

  console.log('Subscription updated:', subscription.id, subscription.status);
}

/**
 * Handle subscription deletion
 * Marks subscription as canceled in Supabase
 */
async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createServiceRoleClient>,
  subscription: Stripe.Subscription
) {
  // Idempotency check: skip if already canceled
  const { data: existing } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('id', subscription.id)
    .single();

  if (existing?.status === 'canceled') {
    console.log('Subscription already canceled, skipping:', subscription.id);
    return;
  }

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      ended_at: new Date().toISOString(),
    })
    .eq('id', subscription.id);

  if (error) {
    console.error('Failed to mark subscription as canceled:', error);
    throw error;
  }

  console.log('Subscription canceled:', subscription.id);
}
