/**
 * Supabase Browser Client
 *
 * Client-side Supabase client with auth support.
 * Uses @supabase/ssr for proper cookie handling in Next.js.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';
import { deleteAccountWithDependencies } from './accountDeletion';
import { eraseLocalAtsData } from './storage/localDataErasure';
import { buildAuthCallbackUrl, getSafeRedirectPath } from './auth/redirects';

let supabaseInstance: SupabaseClient | null = null;

export type AtsAccessSource =
  | 'grant'
  | 'subscription'
  | 'lifetime'
  | null;

/**
 * Get or create a Supabase browser client.
 * Uses singleton pattern for consistent auth state.
 */
export function getSupabaseBrowser(): SupabaseClient | null {
  if (typeof window === 'undefined') return null;

  if (!supabaseInstance) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('Supabase not configured');
      return null;
    }

    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }

  return supabaseInstance;
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { user: null, error: 'Auth not configured' };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildAuthCallbackUrl(
        window.location.origin,
        '/account'
      ),
    },
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { user: null, error: 'Auth not configured' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { user: null, error: error.message };
  }

  return { user: data.user, error: null };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle(redirectTo?: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: buildAuthCallbackUrl(
        window.location.origin,
        getSafeRedirectPath(redirectTo, '/account')
      ),
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  return { error: error?.message || null };
}

/**
 * Sends a password-recovery email without revealing whether the account exists.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  const redirectTo = buildAuthCallbackUrl(
    window.location.origin,
    '/update-password'
  );
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  return { error: error?.message || null };
}

/**
 * Updates the password for the currently authenticated or recovery session.
 */
export async function updatePassword(
  password: string
): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  const { error } = await supabase.auth.updateUser({ password });
  return { error: error?.message || null };
}

/**
 * Sign out
 */
export async function signOut(): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  const { error } = await supabase.auth.signOut();
  return { error: error?.message || null };
}

/**
 * Get current session
 */
export async function getSession(): Promise<{ session: Session | null; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { session: null, error: 'Auth not configured' };
  }

  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error: error?.message || null };
}

/**
 * Get current user
 */
export async function getUser(): Promise<{ user: User | null; error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { user: null, error: 'Auth not configured' };
  }

  const { data, error } = await supabase.auth.getUser();
  return { user: data.user, error: error?.message || null };
}

/**
 * Update user email
 * Supabase will send a confirmation email to the new address
 */
export async function updateEmail(newEmail: string): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  return { error: error?.message || null };
}

/**
 * Delete the user's ATS account data, then erase ATS-owned browser data and
 * sign out. Local data is never erased until the server confirms success.
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  return deleteAccountWithDependencies({
    requestDeletion: async () => {
      const response = await fetch('/api/account/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        return {
          ok: false,
          error: typeof data.error === 'string' ? data.error : 'Failed to delete ATS account data',
        };
      }

      return { ok: true, error: null };
    },
    eraseLocalData: eraseLocalAtsData,
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      return { error: error?.message || null };
    },
  });
}

/**
 * Check if user has active subscription
 */
export async function checkSubscriptionStatus(): Promise<{
  hasAccess: boolean;
  accessSource: AtsAccessSource;
  isLifetime: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { hasAccess: false, accessSource: null, isLifetime: false, subscription: null, error: 'Auth not configured' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { hasAccess: false, accessSource: null, isLifetime: false, subscription: null, error: 'Not authenticated' };
  }

  try {
    const response = await fetch('/api/entitlement', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      const error =
        payload
        && typeof payload === 'object'
        && typeof payload.error === 'string'
          ? payload.error
          : 'Unable to verify access right now.';
      return {
        hasAccess: false,
        accessSource: null,
        isLifetime: false,
        subscription: null,
        error,
      };
    }

    if (
      !payload
      || typeof payload !== 'object'
      || typeof payload.hasAccess !== 'boolean'
      || typeof payload.isLifetime !== 'boolean'
      || !(
        payload.accessSource === null
        || payload.accessSource === 'grant'
        || payload.accessSource === 'subscription'
        || payload.accessSource === 'lifetime'
      )
      || (
        payload.subscription !== null
        && (
          typeof payload.subscription !== 'object'
          || typeof payload.subscription.status !== 'string'
          || (
            payload.subscription.currentPeriodEnd !== null
            && typeof payload.subscription.currentPeriodEnd !== 'string'
          )
        )
      )
    ) {
      return {
        hasAccess: false,
        accessSource: null,
        isLifetime: false,
        subscription: null,
        error: 'The access service returned an invalid response.',
      };
    }

    return {
      hasAccess: payload.hasAccess,
      accessSource: payload.accessSource,
      isLifetime: payload.isLifetime,
      subscription: payload.subscription,
      error: null,
    };
  } catch {
    return {
      hasAccess: false,
      accessSource: null,
      isLifetime: false,
      subscription: null,
      error: 'Unable to verify access right now.',
    };
  }
}
