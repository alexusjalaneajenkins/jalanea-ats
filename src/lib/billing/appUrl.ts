const PRODUCTION_APP_URL = 'https://ats.jalanea.dev';
const DEVELOPMENT_APP_URL = 'http://localhost:3000';

function normalizeHttpOrigin(value: string): string {
  const url = new URL(value);

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('The Jalanea ATS application URL must use HTTP or HTTPS');
  }

  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('The Jalanea ATS application URL must be an origin without credentials or a path');
  }

  return url.origin;
}

export interface AppUrlEnvironment {
  JALANEA_ATS_APP_URL?: string;
  NODE_ENV?: string;
}

/**
 * Returns the one server-owned origin that Stripe may redirect back to.
 *
 * Request headers are intentionally not accepted here. Production has a safe
 * default so a missing optional environment variable cannot turn a Host or
 * Origin header into a billing redirect.
 */
export function getCanonicalAppOrigin(
  environment: AppUrlEnvironment = process.env
): string {
  const configured = environment.JALANEA_ATS_APP_URL?.trim();
  if (configured) {
    return normalizeHttpOrigin(configured);
  }

  return environment.NODE_ENV === 'production'
    ? PRODUCTION_APP_URL
    : DEVELOPMENT_APP_URL;
}

export function getBillingReturnUrls(origin: string): {
  checkoutSuccess: string;
  checkoutCancel: string;
  portalReturn: string;
} {
  const canonicalOrigin = normalizeHttpOrigin(origin);

  return {
    checkoutSuccess: `${canonicalOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    checkoutCancel: `${canonicalOrigin}/pricing?canceled=true`,
    portalReturn: `${canonicalOrigin}/account`,
  };
}
