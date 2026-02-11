'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, Check, Zap, Crown, ArrowRight, AlertCircle, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { redirectToCheckout } from '@/lib/stripe-client';

function PricingContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canceled = searchParams.get('canceled');
  const { user, session, hasAccess, isLifetime, isLoading } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<'lifetime' | 'monthly' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = useCallback(async (priceType: 'lifetime' | 'monthly') => {
    setError(null);

    // Require login before checkout
    if (!user) {
      sessionStorage.setItem('jalanea_checkout_intent', priceType);
      router.push('/login?redirect=/pricing&reason=checkout');
      return;
    }

    setLoadingPlan(priceType);

    try {
      if (!session?.access_token) {
        throw new Error('Your session expired. Please log in again.');
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          priceType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      if (data.url) {
        redirectToCheckout(data.url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setLoadingPlan(null);
    }
  }, [user, session, router]);

  // Resume checkout after login redirect
  useEffect(() => {
    if (user && !isLoading) {
      const intent = sessionStorage.getItem('jalanea_checkout_intent');
      if (intent && ['lifetime', 'monthly'].includes(intent)) {
        sessionStorage.removeItem('jalanea_checkout_intent');
        handleCheckout(intent as 'lifetime' | 'monthly');
      }
    }
  }, [user, isLoading, handleCheckout]);

  const features = [
    'Unlimited resume analyses',
    'AI-powered keyword matching',
    'Semantic job matching',
    'Resume improvement suggestions',
    'ATS compatibility scoring',
    'Export analysis reports',
  ];

  return (
    <>
      {/* Header */}
      <div className="text-center mb-12">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold text-white mb-4"
        >
          Simple, fair pricing
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-lg text-indigo-300 max-w-xl mx-auto"
        >
          Get unlimited access to AI-powered resume analysis. No hidden fees, no usage limits.
        </motion.p>
      </div>

      {/* Canceled notice */}
      {canceled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mb-8 flex items-center gap-2 p-3 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Checkout was canceled. Feel free to try again when you&apos;re ready.</span>
        </motion.div>
      )}

      {/* Error notice */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mb-8 flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </motion.div>
      )}

      {/* Already subscribed notice */}
      {hasAccess && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md mx-auto mb-8 flex items-center gap-2 p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
        >
          <Check className="w-5 h-5 shrink-0" />
          <span>
            You have {isLifetime ? 'lifetime' : 'active'} access!{' '}
            <Link href="/account" className="underline hover:text-emerald-200">
              View your account
            </Link>
          </span>
        </motion.div>
      )}

      {/* Tier comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="grid grid-cols-3 gap-3 max-w-3xl mx-auto mb-10"
      >
        <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4 text-center">
          <Gift className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Free</h3>
          <p className="text-xs text-indigo-300">3 AI analyses/day</p>
          <p className="text-xs text-indigo-400 mt-1">No account needed</p>
        </div>
        <div className="bg-indigo-900/30 rounded-xl border border-indigo-500/20 p-4 text-center">
          <Zap className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Monthly</h3>
          <p className="text-xs text-indigo-300">Unlimited, cancel anytime</p>
          <p className="text-xs text-indigo-400 mt-1">$5/month</p>
        </div>
        <div className="bg-indigo-900/30 rounded-xl border border-orange-500/30 p-4 text-center">
          <Crown className="w-6 h-6 text-orange-400 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-white mb-1">Lifetime</h3>
          <p className="text-xs text-indigo-300">Pay once, own forever</p>
          <p className="text-xs text-indigo-400 mt-1">$15 one-time</p>
        </div>
      </motion.div>

      {/* Pricing cards */}
      <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
        {/* Monthly */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card rounded-3xl p-2"
        >
          <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl p-6 h-full flex flex-col">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <Zap className="w-5 h-5 text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Monthly</h2>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-black text-white">$5</span>
              <span className="text-indigo-300">/month</span>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-indigo-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loadingPlan !== null || hasAccess || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === 'monthly' ? (
                <span>Loading...</span>
              ) : hasAccess ? (
                <span>Already subscribed</span>
              ) : (
                <>
                  <span>Subscribe monthly</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>

        {/* Lifetime */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card rounded-3xl p-2 ring-2 ring-orange-500/50"
        >
          <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
            {/* Best value badge */}
            <div className="absolute top-4 right-4">
              <span className="px-3 py-1 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold uppercase">
                Best Value
              </span>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <Crown className="w-5 h-5 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Lifetime</h2>
            </div>

            <div className="mb-6">
              <span className="text-4xl font-black text-white">$15</span>
              <span className="text-indigo-300"> one-time</span>
              <p className="text-sm text-emerald-400 mt-1">Pay once, use forever</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-indigo-200">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-sm text-orange-300 font-medium">
                <Check className="w-4 h-4 text-orange-400 shrink-0" />
                <span>All future updates included</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('lifetime')}
              disabled={loadingPlan !== null || hasAccess || isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingPlan === 'lifetime' ? (
                <span>Loading...</span>
              ) : hasAccess ? (
                <span>Already subscribed</span>
              ) : (
                <>
                  <span>Get lifetime access</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Free tier note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm text-indigo-400 mt-8"
      >
        Try 3 free analyses daily — no account needed.
      </motion.p>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-4 mt-12"
      >
        <Link
          href="/"
          className="px-5 py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/50 hover:text-white transition-all text-sm font-medium"
        >
          Back to home
        </Link>
        {user && (
          <Link
            href="/account"
            className="px-5 py-2 rounded-xl bg-indigo-600/30 border border-indigo-500/30 text-indigo-200 hover:bg-indigo-600/50 hover:text-white transition-all text-sm font-medium"
          >
            My account
          </Link>
        )}
      </motion.div>
    </>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen px-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)' }}
        />
        <motion.div
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)' }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-12">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">Jalanea</span>
            <span className="text-orange-400"> ATS</span>
          </span>
        </Link>

        <Suspense fallback={<div className="text-center text-indigo-300">Loading...</div>}>
          <PricingContent />
        </Suspense>
      </div>
    </div>
  );
}
