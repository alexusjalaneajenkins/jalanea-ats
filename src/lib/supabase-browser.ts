/**
 * Supabase Browser Client
 *
 * Client-side Supabase client with auth support.
 * Uses @supabase/ssr for proper cookie handling in Next.js.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient, User, Session } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

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
      redirectTo: `${window.location.origin}/api/auth/callback${redirectTo ? `?redirect_to=${encodeURIComponent(redirectTo)}` : ''}`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

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
 * Delete user account
 * This calls a server-side function that handles:
 * - Canceling any active Stripe subscriptions
 * - Deleting user data
 * - Deleting the auth user
 */
export async function deleteAccount(): Promise<{ error: string | null }> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { error: 'Auth not configured' };
  }

  // Call server-side deletion endpoint
  const response = await fetch('/api/account/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    return { error: data.error || 'Failed to delete account' };
  }

  // Sign out after deletion
  await supabase.auth.signOut();
  return { error: null };
}

/**
 * Check if user has active subscription
 */
export async function checkSubscriptionStatus(): Promise<{
  hasAccess: boolean;
  isLifetime: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  error: string | null;
}> {
  const supabase = getSupabaseBrowser();
  if (!supabase) {
    return { hasAccess: false, isLifetime: false, subscription: null, error: 'Auth not configured' };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { hasAccess: false, isLifetime: false, subscription: null, error: 'Not authenticated' };
  }

  // Query subscriptions table
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('status, is_lifetime, current_period_end')
    .eq('user_id', user.id)
    .in('status', ['active', 'trialing'])
    .order('created', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
    return { hasAccess: false, isLifetime: false, subscription: null, error: error.message };
  }

  if (!subscription) {
    return { hasAccess: false, isLifetime: false, subscription: null, error: null };
  }

  return {
    hasAccess: true,
    isLifetime: subscription.is_lifetime || false,
    subscription: {
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    },
    error: null,
  };
}
