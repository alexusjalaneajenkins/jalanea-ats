/**
 * Client-side Stripe Configuration
 *
 * Uses @stripe/stripe-js for browser-side operations.
 * Only for redirecting to Checkout, never for API calls.
 */

import { loadStripe, Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export function getStripe() {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.warn('Stripe publishable key not configured');
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

/**
 * Redirect to Stripe Checkout
 *
 * @param checkoutUrl - Checkout URL from /api/checkout response
 */
export function redirectToCheckout(checkoutUrl: string) {
  // Modern Stripe Checkout uses direct URL redirect instead of JS SDK method
  window.location.href = checkoutUrl;
}
