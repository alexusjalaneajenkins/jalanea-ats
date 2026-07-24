import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function buildContentSecurityPolicy(nonce: string): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const directives = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    // The current UI uses React style attributes and Framer Motion. Script
    // execution remains nonce-protected while styles stay compatible.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data: https:",
    "font-src 'self' data:",
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com${isDevelopment ? ' ws: http:' : ''}`,
    "worker-src 'self' blob:",
    "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
    "manifest-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

/**
 * Refreshes Supabase auth cookies for App Router requests.
 *
 * Authorization still happens inside protected pages and route handlers. The
 * proxy only keeps the short-lived browser session synchronized.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = buildContentSecurityPolicy(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);

  if (!supabaseUrl || !supabaseAnonKey) {
    const unavailableResponse = NextResponse.next({
      request: { headers: requestHeaders },
    });
    unavailableResponse.headers.set(
      'Content-Security-Policy',
      contentSecurityPolicy
    );
    return unavailableResponse;
  }

  let response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request: { headers: requestHeaders },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // getUser validates and refreshes the session when needed. Do not remove it
  // even though the return value is unused.
  try {
    await supabase.auth.getUser();
  } catch {
    // A transient auth-provider outage should not turn public pages into 500s.
    console.warn('Supabase session refresh failed');
  }

  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mjs)$).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
