/**
 * Stripe Checkout Session API
 *
 * Creates a Stripe Checkout session for either:
 * - Lifetime purchase ($15 one-time)
 * - Monthly subscription ($5/month)
 *
 * [EXTERNAL - Gemini Research]: Uses client_reference_id to link
 * Stripe customer to Supabase user, avoiding "shadow user" problem.
 */

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripe, STRIPE_PRICES, PRODUCTS } from '@/lib/stripe';
import { createServiceRoleClient } from '@/lib/supabase-server';

function getBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token.trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { priceType } = body;

    // Validate price type
    if (!['lifetime', 'monthly'].includes(priceType)) {
      return NextResponse.json(
        { error: 'Invalid price type. Must be "lifetime" or "monthly".' },
        { status: 400 }
      );
    }

    // Require authenticated user — prevents spoofed/anonymous purchases.
    // We verify the bearer token server-side and ignore client-supplied user IDs.
    const token = getBearerToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Please log in before purchasing. Your purchase must be linked to your account.' },
        { status: 401 }
      );
    }

    const supabase = createServiceRoleClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Your session is invalid or expired. Please log in again.' },
        { status: 401 }
      );
    }

    // Get the appropriate price ID
    const priceId = priceType === 'lifetime' ? STRIPE_PRICES.LIFETIME : STRIPE_PRICES.MONTHLY;

    // If no price IDs configured yet, create checkout with inline price
    const isLifetime = priceType === 'lifetime';
    const product = isLifetime ? PRODUCTS.LIFETIME : PRODUCTS.MONTHLY;
    const origin = request.headers.get('origin') || new URL(request.url).origin;

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: isLifetime ? 'payment' : 'subscription',
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing?canceled=true`,
      customer_email: user.email || undefined,
      client_reference_id: user.id, // Links to Supabase user
      metadata: {
        user_id: user.id,
        price_type: priceType,
        ...(priceId ? { price_id: priceId } : {}),
      },
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
                ...(isLifetime ? {} : { recurring: { interval: 'month' } }),
              },
              quantity: 1,
            },
          ],
    };

    // Create checkout session
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create(sessionParams);

    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('Checkout error:', error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
