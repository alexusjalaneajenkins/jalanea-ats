/**
 * Auth Callback Route
 *
 * Handles OAuth and magic link callbacks from Supabase Auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSafeRedirectPath } from '@/lib/auth/redirects';

function authErrorRedirect(request: NextRequest, code: string) {
  const errorUrl = new URL('/auth/error', request.nextUrl.origin);
  errorUrl.searchParams.set('code', code);
  return NextResponse.redirect(errorUrl);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const redirectTo = request.nextUrl.searchParams.get('redirect_to');
  const providerError =
    request.nextUrl.searchParams.get('error') ||
    request.nextUrl.searchParams.get('error_code');

  if (providerError) {
    return authErrorRedirect(request, 'provider_denied');
  }

  if (!code) {
    return authErrorRedirect(request, 'missing_code');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return authErrorRedirect(request, 'auth_unavailable');
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return authErrorRedirect(request, 'exchange_failed');
    }
  } catch {
    return authErrorRedirect(request, 'exchange_failed');
  }

  const safePath = getSafeRedirectPath(redirectTo, '/account');
  return NextResponse.redirect(new URL(safePath, request.nextUrl.origin));
}
