'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import type { CheckoutStatusState } from '@/lib/billing/checkoutStatus';

type DisplayState = 'verifying' | CheckoutStatusState;

interface StatusCopy {
  title: string;
  body: string;
}

const STATUS_COPY: Record<DisplayState, StatusCopy> = {
  verifying: {
    title: 'Verifying your checkout…',
    body: 'We are checking this session directly with Stripe.',
  },
  paid: {
    title: 'Payment confirmed',
    body: 'Stripe confirms your payment is settled and your Jalanea ATS access is active.',
  },
  active: {
    title: 'Access is active',
    body: 'This checkout is complete and your Jalanea ATS access is available.',
  },
  pending: {
    title: 'Payment is still processing',
    body: 'Stripe has not confirmed a final failed or settled state yet. You can safely check again.',
  },
  failed: {
    title: 'Payment was not completed',
    body: 'Stripe did not confirm payment for this checkout. No paid-access claim has been made.',
  },
  invalid: {
    title: 'Checkout could not be verified',
    body: 'This link is missing a valid session, belongs to another account, or is no longer available.',
  },
};

export function CheckoutStatusPanel() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id')?.trim() ?? '';
  const [state, setState] = useState<DisplayState>(
    sessionId ? 'verifying' : 'invalid'
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  const verify = useCallback(async (signal?: AbortSignal) => {
    if (!sessionId) {
      setState('invalid');
      return 'invalid' as const;
    }

    try {
      const response = await fetch(
        `/api/checkout/session-status?session_id=${encodeURIComponent(sessionId)}`,
        {
          signal,
          cache: 'no-store',
        }
      );
      const body = await response.json().catch(() => ({}));
      const nextState = body?.state as CheckoutStatusState | undefined;

      if (
        nextState === 'paid' ||
        nextState === 'active' ||
        nextState === 'pending' ||
        nextState === 'failed' ||
        nextState === 'invalid'
      ) {
        setState(nextState);
        return nextState;
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'pending' as const;
      }
    }

    setState('invalid');
    return 'invalid' as const;
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const controller = new AbortController();
    let pollCount = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const poll = async () => {
      pollCount += 1;
      const result = await verify(controller.signal);

      if (result === 'pending' && pollCount < 8 && !controller.signal.aborted) {
        timer = setTimeout(poll, 2_000);
      }
    };

    void poll();

    return () => {
      controller.abort();
      if (timer) clearTimeout(timer);
    };
  }, [sessionId, verify]);

  const refresh = async () => {
    setIsRefreshing(true);
    await verify();
    setIsRefreshing(false);
  };

  const copy = STATUS_COPY[state];
  const isSuccess = state === 'paid' || state === 'active';
  const isPending = state === 'verifying' || state === 'pending';

  return (
    <section className="relative z-10 w-full max-w-md text-center" aria-live="polite">
      <Link href="/" className="flex items-center justify-center gap-3 mb-8">
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Sparkles className="w-6 h-6 text-white" aria-hidden="true" />
        </span>
        <span className="text-2xl font-black tracking-tight">
          <span className="text-white">Jalanea</span>{' '}
          <span className="text-orange-400">ATS</span>
        </span>
      </Link>

      <div className="glass-card rounded-3xl p-2">
        <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl p-8">
          <div className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6">
            {state === 'verifying' && (
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" aria-hidden="true" />
            )}
            {isSuccess && (
              <CheckCircle className="w-10 h-10 text-emerald-400" aria-hidden="true" />
            )}
            {state === 'pending' && (
              <Clock className="w-10 h-10 text-amber-400" aria-hidden="true" />
            )}
            {(state === 'failed' || state === 'invalid') && (
              <AlertTriangle className="w-10 h-10 text-red-400" aria-hidden="true" />
            )}
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">{copy.title}</h1>
          <p className="text-indigo-300 mb-8">{copy.body}</p>

          <div className="space-y-3">
            {isSuccess && (
              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:from-orange-600 hover:to-pink-600 transition-all"
              >
                <span>Start analyzing resumes</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            )}

            {state === 'failed' && (
              <Link
                href="/pricing"
                className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors"
              >
                Return to pricing
              </Link>
            )}

            {(isPending || state === 'invalid') && (
              <button
                type="button"
                onClick={refresh}
                disabled={isRefreshing || state === 'verifying'}
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                Check again
              </button>
            )}

            <Link
              href="/account"
              className="block w-full py-3 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 font-bold transition-colors"
            >
              View my account
            </Link>
          </div>

          {sessionId && (
            <p className="mt-6 text-xs text-indigo-400">
              Checkout reference: {sessionId.slice(0, 20)}…
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
