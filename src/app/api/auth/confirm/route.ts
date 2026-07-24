import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSafeRedirectPath } from '@/lib/auth/redirects';

const EMAIL_OTP_TYPES = new Set<EmailOtpType>([
  'email',
  'email_change',
  'invite',
  'magiclink',
  'recovery',
  'signup',
]);

function errorRedirect(request: NextRequest, code: string) {
  const target = new URL('/auth/error', request.nextUrl.origin);
  target.searchParams.set('code', code);
  return NextResponse.redirect(target);
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const requestedType = request.nextUrl.searchParams.get('type');
  const nextPath = getSafeRedirectPath(
    request.nextUrl.searchParams.get('next'),
    '/account'
  );

  if (
    !tokenHash ||
    !requestedType ||
    !EMAIL_OTP_TYPES.has(requestedType as EmailOtpType)
  ) {
    return errorRedirect(request, 'invalid_confirmation');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return errorRedirect(request, 'auth_unavailable');
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: requestedType as EmailOtpType,
    });

    if (error) {
      return errorRedirect(request, 'confirmation_failed');
    }
  } catch {
    return errorRedirect(request, 'confirmation_failed');
  }

  return NextResponse.redirect(new URL(nextPath, request.nextUrl.origin));
}
