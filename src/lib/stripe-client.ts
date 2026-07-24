/**
 * Client-side Stripe Configuration
 *
 * Checkout sessions are created on the server. The browser only follows the
 * provider-hosted URL returned by that trusted endpoint.
 */

/**
 * Redirect to Stripe Checkout
 *
 * @param checkoutUrl - Checkout URL from /api/checkout response
 */
export function redirectToCheckout(checkoutUrl: string) {
  // Modern Stripe Checkout uses direct URL redirect instead of JS SDK method
  window.location.href = checkoutUrl;
}
