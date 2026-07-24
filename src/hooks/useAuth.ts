/**
 * useAuth Hook
 *
 * Provides authentication state and methods for components.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import {
  getSupabaseBrowser,
  signIn as authSignIn,
  signUp as authSignUp,
  signOut as authSignOut,
  signInWithGoogle as authSignInWithGoogle,
  checkSubscriptionStatus,
} from '@/lib/supabase-browser';
import type { AtsAccessSource } from '@/lib/supabase-browser';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthLoading: boolean;
  isEntitlementLoading: boolean;
  hasAccess: boolean;
  accessSource: AtsAccessSource;
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
    isAuthLoading: true,
    isEntitlementLoading: false,
    hasAccess: false,
    accessSource: null,
    isLifetime: false,
    subscription: null,
    accessError: null,
  });
  const activeUserIdRef = useRef<string | null>(null);
  const accessRequestRef = useRef(0);

  // Check subscription status with error handling
  const checkAccess = useCallback(async (requestedUserId?: string) => {
    const userId = requestedUserId ?? activeUserIdRef.current;
    if (!userId) return;

    const requestId = accessRequestRef.current + 1;
    accessRequestRef.current = requestId;
    setState(prev => ({
      ...prev,
      isEntitlementLoading: true,
      accessError: null,
    }));

    try {
      const {
        hasAccess,
        accessSource,
        isLifetime,
        subscription,
        error,
      } = await checkSubscriptionStatus();

      if (
        accessRequestRef.current !== requestId ||
        activeUserIdRef.current !== userId
      ) {
        return;
      }

      setState(prev => ({
        ...prev,
        // A failed entitlement lookup is not proof that access disappeared.
        // Preserve the last confirmed state until a successful lookup settles.
        hasAccess: error ? prev.hasAccess : hasAccess,
        accessSource: error ? prev.accessSource : accessSource,
        isLifetime: error ? prev.isLifetime : isLifetime,
        subscription: error ? prev.subscription : subscription,
        isEntitlementLoading: false,
        accessError: error,
      }));
    } catch (err) {
      if (
        accessRequestRef.current !== requestId ||
        activeUserIdRef.current !== userId
      ) {
        return;
      }

      setState(prev => ({
        ...prev,
        isEntitlementLoading: false,
        accessError: err instanceof Error ? err.message : 'Failed to check subscription status',
      }));
    }
  }, []);

  // Initialize auth state
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) {
      setState(prev => ({
        ...prev,
        isAuthLoading: false,
        isEntitlementLoading: false,
      }));
      return;
    }

    let isMounted = true;

    const applySession = (session: Session | null) => {
      if (!isMounted) return;

      const nextUserId = session?.user.id ?? null;
      const userChanged = activeUserIdRef.current !== nextUserId;
      activeUserIdRef.current = nextUserId;
      accessRequestRef.current += 1;

      setState(prev => ({
        ...prev,
        user: session?.user || null,
        session,
        isAuthLoading: false,
        isEntitlementLoading: Boolean(nextUserId),
        hasAccess: userChanged ? false : prev.hasAccess,
        accessSource: userChanged ? null : prev.accessSource,
        isLifetime: userChanged ? false : prev.isLifetime,
        subscription: userChanged ? null : prev.subscription,
        accessError: null,
      }));

      if (session?.user) {
        void checkAccess(session.user.id);
      } else {
        setState(prev => ({
          ...prev,
          isEntitlementLoading: false,
          hasAccess: false,
          accessSource: null,
          isLifetime: false,
          subscription: null,
          accessError: null,
        }));
      }
    };

    // Get initial session and always settle the identity loading state.
    void supabase.auth.getSession()
      .then(({ data: { session } }) => applySession(session))
      .catch(() => {
        if (!isMounted) return;
        activeUserIdRef.current = null;
        setState(prev => ({
          ...prev,
          isAuthLoading: false,
          isEntitlementLoading: false,
          accessError: 'Unable to restore your sign-in session',
        }));
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    return () => {
      isMounted = false;
      accessRequestRef.current += 1;
      subscription.unsubscribe();
    };
  }, [checkAccess]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isAuthLoading: true }));
    try {
      return await authSignIn(email, password);
    } catch {
      return { user: null, error: 'Unable to sign in. Check your connection and try again.' };
    } finally {
      setState(prev => ({ ...prev, isAuthLoading: false }));
    }
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isAuthLoading: true }));
    try {
      return await authSignUp(email, password);
    } catch {
      return { user: null, error: 'Unable to create your account. Check your connection and try again.' };
    } finally {
      setState(prev => ({ ...prev, isAuthLoading: false }));
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setState(prev => ({ ...prev, isAuthLoading: true }));
    try {
      const result = await authSignOut();
      if (!result.error) {
        activeUserIdRef.current = null;
        accessRequestRef.current += 1;
        setState(prev => ({
          ...prev,
          user: null,
          session: null,
          isEntitlementLoading: false,
          hasAccess: false,
          accessSource: null,
          isLifetime: false,
          subscription: null,
          accessError: null,
        }));
      }
      return result;
    } catch {
      return { error: 'Unable to sign out. Check your connection and try again.' };
    } finally {
      setState(prev => ({ ...prev, isAuthLoading: false }));
    }
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async (redirectTo?: string) => {
    setState(prev => ({ ...prev, isAuthLoading: true }));
    try {
      return await authSignInWithGoogle(redirectTo);
    } catch {
      return { error: 'Unable to connect to Google. Check your connection and try again.' };
    } finally {
      setState(prev => ({ ...prev, isAuthLoading: false }));
    }
  }, []);

  return {
    ...state,
    // Backward-compatible identity-loading alias. Entitlement loading is
    // intentionally separate so callers cannot interpret a transient lookup as
    // a signed-out or unpaid user.
    isLoading: state.isAuthLoading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle,
    refreshAccess: checkAccess,
  };
}
