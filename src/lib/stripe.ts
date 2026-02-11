/**
 * Stripe Client Configuration
 *
 * Server-side: Use stripe (Node SDK) for API operations
 * Client-side: Use @stripe/stripe-js for redirects only
 */

import Stripe from 'stripe';

// Server-side Stripe instance
// Only use in API routes, server actions, or server components
// Initialized lazily to avoid build-time errors when env vars aren't set
let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured. Add it to .env.local');
    }
    _stripe = new Stripe(secretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    });
  }
  return _stripe;
}

// Price IDs - set these after creating products in Stripe Dashboard
export const STRIPE_PRICES = {
  LIFETIME: process.env.STRIPE_PRICE_LIFETIME || '', // $15 one-time
  MONTHLY: process.env.STRIPE_PRICE_MONTHLY || '',   // $5/month
} as const;

// Product metadata
export const PRODUCTS = {
  LIFETIME: {
    name: 'Jalanea ATS Lifetime',
    description: 'Unlimited AI-powered resume analysis forever',
    price: 1500, // $15.00 in cents
    type: 'one_time' as const,
  },
  MONTHLY: {
    name: 'Jalanea ATS Monthly',
    description: 'Unlimited AI-powered resume analysis',
    price: 500, // $5.00 in cents
    type: 'recurring' as const,
    interval: 'month' as const,
  },
} as const;
