/**
 * useAuth Hook
 *
 * Provides authentication state and methods for components.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  getSupabaseBrowser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  signInWithGoogle as authSignInWithGoogle,
  checkSubscriptionStatus,
} from '@/lib/supabase-browser';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  hasAccess: boolean;
  isLifetime: boolean;
  subscription: {
    status: string;
    currentPeriodEnd: string | null;
  } | null;
  accessError: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    hasAccess: false,
    isLifetime: false,
    subscription: null,
    accessError: null,
  });

  // Check subscription status with error handling
  const checkAccess = useCallback(async () => {
    try {
      const { hasAccess, isLifetime, subscription, error } = await checkSubscriptionStatus();
      setState(prev => ({
        ...prev,
        hasAccess,
        isLifetime,
        subscription,
        accessError: error,
      }));
    } catch (err) {
      // On failure, preserve previous hasAccess state but surface the error
      setState(prev => ({
        ...prev,
        accessError: err instanceof Error ? err.message : 'Failed to check subscription status',
      }));
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState(prev => ({
        ...prev,
        user: session?.user || null,
        session,
        isLoading: false,
      }));

      if (session?.user) {
        checkAccess();
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setState(prev => ({
          ...prev,
          user: session?.user || null,
          session,
        }));

        if (session?.user) {
          checkAccess();
        } else {
          setState(prev => ({
            ...prev,
            hasAccess: false,
            isLifetime: false,
            subscription: null,
            accessError: null,
          }));
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAccess]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authSignIn(email, password);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authSignUp(email, password);
    setState(prev => ({ ...prev, isLoading: false }));
    return result;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authSignOut();
    setState(prev => ({
      ...prev,
      isLoading: false,
      user: null,
      session: null,
      hasAccess: false,
      isLifetime: false,
      subscription: null,
      accessError: null,
    }));
    return result;
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    const result = await authSignInWithGoogle(redirectTo);
    // Note: Loading state will be reset by the auth state change listener
    // after Google OAuth redirect completes
    if (result.error) {
      setState(prev => ({ ...prev, isLoading: false }));
    }
    return result;
  }, []);

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshAccess: checkAccess,
  };
}
