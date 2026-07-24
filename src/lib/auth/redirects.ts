const REDIRECT_BASE = 'https://jalanea-ats.invalid';

function decodeRedirectCandidate(value: string): string | null {
  let decoded = value;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return null;
    }
  }

  return decoded;
}

/**
 * Returns a same-origin application path or the supplied fallback.
 *
 * The decoded checks intentionally reject backslashes and protocol-relative
 * paths because browsers normalize those values differently across navigation
 * APIs. Returning only pathname/search/hash also prevents credentials or an
 * origin from ever reaching router.push or a redirect response.
 */
export function getSafeRedirectPath(
  value: string | null | undefined,
  fallback = '/account'
): string {
  if (!value) return fallback;

  const candidate = value.trim();
  const decoded = decodeRedirectCandidate(candidate);

  if (
    !decoded ||
    !decoded.startsWith('/') ||
    decoded.startsWith('//') ||
    decoded.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(decoded)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(decoded, REDIRECT_BASE);
    if (
      parsed.origin !== REDIRECT_BASE ||
      parsed.username ||
      parsed.password ||
      !parsed.pathname.startsWith('/')
    ) {
      return fallback;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function buildAuthCallbackUrl(
  origin: string,
  redirectPath: string
): string {
  const callback = new URL('/api/auth/callback', origin);
  callback.searchParams.set(
    'redirect_to',
    getSafeRedirectPath(redirectPath, '/account')
  );
  return callback.toString();
}
