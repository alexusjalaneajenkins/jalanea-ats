'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, CheckCircle, PartyPopper, ArrowRight, Loader2, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

type VerificationState = 'verifying' | 'verified' | 'delayed';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [showConfetti, setShowConfetti] = useState(false);
  const [verificationState, setVerificationState] = useState<VerificationState>('verifying');
  const { hasAccess, refreshAccess } = useAuth();
  const pollCountRef = useRef(0);
  const maxPolls = 8; // 8 polls * 2 seconds = 16 seconds max

  // Poll for subscription verification
  useEffect(() => {
    // If already has access, skip polling
    if (hasAccess) {
      setVerificationState('verified');
      setShowConfetti(true);
      return;
    }

    const pollInterval = setInterval(async () => {
      pollCountRef.current += 1;
      await refreshAccess();

      // Check will be evaluated on next render via hasAccess
    }, 2000);

    // Timeout after max polls
    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (!hasAccess) {
        setVerificationState('delayed');
      }
    }, maxPolls * 2000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [refreshAccess, hasAccess]);

  // React to hasAccess changes
  useEffect(() => {
    if (hasAccess && verificationState === 'verifying') {
      setVerificationState('verified');
      setShowConfetti(true);
    }
  }, [hasAccess, verificationState]);

  // Hide confetti after animation
  useEffect(() => {
    if (showConfetti) {
      const timer = setTimeout(() => setShowConfetti(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showConfetti]);

  return (
    <>
      {/* Confetti animation */}
      {showConfetti && (
        <div className="fixed inset-0 z-20 pointer-events-none overflow-hidden">
          {Array.from({ length: 50 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-3 h-3 rounded-sm"
              style={{
                left: `${Math.random() * 100}%`,
                backgroundColor: ['#f97316', '#ec4899', '#06b6d4', '#10b981', '#8b5cf6'][Math.floor(Math.random() * 5)],
              }}
              initial={{ y: -20, opacity: 1, rotate: 0 }}
              animate={{
                y: '100vh',
                opacity: [1, 1, 0],
                rotate: Math.random() * 720 - 360,
              }}
              transition={{
                duration: Math.random() * 2 + 2,
                delay: Math.random() * 0.5,
                ease: 'linear',
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">Jalanea</span>
            <span className="text-orange-400"> ATS</span>
          </span>
        </Link>

        {/* Success card */}
        <div className="glass-card rounded-3xl p-2">
          <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl p-8">
            {/* Verifying State */}
            {verificationState === 'verifying' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-2xl font-bold text-white mb-2">Confirming your purchase...</h1>
                  <p className="text-indigo-300 mb-8">
                    Please wait while we verify your payment.
                  </p>
                </motion.div>
              </>
            )}

            {/* Verified State */}
            {verificationState === 'verified' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <CheckCircle className="w-10 h-10 text-emerald-400" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <PartyPopper className="w-6 h-6 text-orange-400" />
                    <h1 className="text-2xl font-bold text-white">Payment Successful!</h1>
                    <PartyPopper className="w-6 h-6 text-pink-400 scale-x-[-1]" />
                  </div>
                  <p className="text-indigo-300 mb-8">
                    Thank you for your purchase! You now have unlimited access to all AI features.
                  </p>
                </motion.div>
              </>
            )}

            {/* Delayed State */}
            {verificationState === 'delayed' && (
              <>
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-6"
                >
                  <Clock className="w-10 h-10 text-amber-400" />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h1 className="text-2xl font-bold text-white mb-2">Payment Received!</h1>
                  <p className="text-indigo-300 mb-8">
                    Your payment was successful. It may take a moment for your access to activate.
                    You can check your account page for status updates.
                  </p>
                </motion.div>
              </>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-3"
            >
              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold hover:from-orange-600 hover:to-pink-600 transition-all"
              >
                <span>Start analyzing resumes</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/account"
                className="block w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors"
              >
                View my account
              </Link>
            </motion.div>

            {sessionId && (
              <p className="mt-6 text-xs text-indigo-400">
                Order ID: {sessionId.slice(0, 20)}...
              </p>
            )}
          </div>
        </div>

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 text-sm text-indigo-400"
        >
          Questions? Contact us at support@jalanea.com
        </motion.p>
      </motion.div>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.3) 0%, rgba(6,182,212,0.1) 40%, transparent 70%)' }}
        />
        <motion.div
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)' }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      </div>

      <Suspense fallback={<div className="text-center text-indigo-300">Loading...</div>}>
        <SuccessContent />
      </Suspense>
    </div>
  );
}
