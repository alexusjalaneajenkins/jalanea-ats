'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Crown, Zap, LogOut, CheckCircle, Calendar, Star, CreditCard, Mail, Trash2, AlertTriangle, X, HelpCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updateEmail, deleteAccount } from '@/lib/supabase-browser';

export default function AccountPage() {
  const router = useRouter();
  const { user, hasAccess, isLifetime, subscription, signOut, isLoading } = useAuth();

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleManageBilling = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });
      const data = await response.json();
      if (data.error) {
        setActionError(data.error);
      } else if (data.url) {
        window.location.href = data.url;
      }
    } catch {
      setActionError('Failed to open billing portal');
    }
    setActionLoading(false);
  };

  const handleEmailChange = async () => {
    if (!newEmail || newEmail === user?.email) return;
    setActionLoading(true);
    setActionError(null);
    const { error } = await updateEmail(newEmail);
    if (error) {
      setActionError(error);
    } else {
      setActionSuccess('Check your new email for a confirmation link');
      setShowEmailModal(false);
      setNewEmail('');
    }
    setActionLoading(false);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setActionLoading(true);
    setActionError(null);
    const { error } = await deleteAccount();
    if (error) {
      setActionError(error);
      setActionLoading(false);
    } else {
      router.push('/');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-indigo-300">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Generate initials from email
  const getInitials = (email: string) => {
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase();
  };

  // Get first name or username from email
  const getGreeting = (email: string) => {
    const name = email.split('@')[0];
    // Capitalize first letter
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col overflow-hidden">
      {/* Background with subtle personality */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f1a] to-[#1a1333]" />
        {/* Subtle glow - top left */}
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        {/* Subtle glow - bottom right */}
        <motion.div
          className="absolute bottom-[-15%] right-[-10%] w-[45%] h-[45%] rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, rgba(236,72,153,0.3) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.2, 0.15] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Floating stars for personality */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {[
          { top: '15%', left: '10%', delay: 0, size: 'w-1 h-1' },
          { top: '25%', right: '15%', delay: 0.5, size: 'w-1.5 h-1.5' },
          { top: '60%', left: '8%', delay: 1, size: 'w-1 h-1' },
          { top: '75%', right: '12%', delay: 1.5, size: 'w-1 h-1' },
        ].map((star, i) => (
          <motion.div
            key={i}
            className={`absolute ${star.size} rounded-full bg-white/60`}
            style={{ top: star.top, left: star.left, right: star.right }}
            animate={{ opacity: [0.3, 0.8, 0.3], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: "easeInOut", delay: star.delay }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-xl mx-auto flex-1 w-full">
        {/* Header with logo and sign out */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:shadow-pink-500/25 transition-shadow">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              <span className="text-white">Jalanea</span>
              <span className="text-orange-400"> ATS</span>
            </span>
          </Link>

          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </button>
        </div>

        {/* Greeting with personality */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">
            Hey, {getGreeting(user.email || 'there')}! <span className="inline-block animate-pulse">✨</span>
          </h1>
          <p className="text-sm text-indigo-300">Here&apos;s your account overview</p>
        </motion.div>

        {/* Combined Profile & Subscription card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-[#1a1a2e]/90 border border-indigo-500/10 rounded-2xl p-5 mb-5 backdrop-blur-sm"
        >
          {/* Profile section */}
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            {/* Gradient ring avatar */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 blur-sm opacity-50" />
              <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 p-[2px]">
                <div className="w-full h-full rounded-full bg-[#1a1a2e] flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{getInitials(user.email || '')}</span>
                </div>
              </div>
            </div>
            <div>
              <p className="text-white font-medium">{user.email}</p>
              <p className="text-xs text-gray-500">
                Member since {formatDate(user.created_at)}
              </p>
            </div>
          </div>

          {/* Subscription section */}
          <div className="pt-4">
            <h3 className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-3">Subscription</h3>

            {hasAccess ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    {isLifetime ? (
                      <Crown className="w-5 h-5 text-white" />
                    ) : (
                      <Zap className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">
                      {isLifetime ? 'Lifetime Access' : 'Monthly Subscription'}
                    </p>
                    <p className="text-xs text-emerald-400">
                      {isLifetime ? 'You\'re set for life! 🎉' : 'Active & ready to go'}
                    </p>
                  </div>
                </div>

                {!isLifetime && subscription?.currentPeriodEnd && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Calendar className="w-3 h-3" />
                    <span>Renews {formatDate(subscription.currentPeriodEnd)}</span>
                  </div>
                )}

                <div className="pt-3">
                  <p className="text-xs text-indigo-400 mb-2">Your superpowers</p>
                  <div className="flex flex-wrap gap-2">
                    {['Unlimited analyses', 'AI matching', 'Smart suggestions', 'Priority support'].map((benefit) => (
                      <span key={benefit} className="inline-flex items-center gap-1 text-xs text-indigo-200 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-indigo-200">
                  Unlock unlimited AI-powered resume analysis and land your dream job faster.
                </p>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                >
                  <Star className="w-4 h-4" />
                  View pricing
                </Link>
              </div>
            )}
          </div>
        </motion.div>

        {/* Account Settings */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-[#1a1a2e]/90 border border-indigo-500/10 rounded-2xl p-5 mb-5 backdrop-blur-sm"
        >
          <h3 className="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-3">Account Settings</h3>

          {/* Success/Error messages */}
          {actionSuccess && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-sm mb-4">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 text-sm mb-4">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          <div className="space-y-2">
            {/* Manage Billing - only show if user has subscription */}
            {hasAccess && !isLifetime && (
              <button
                onClick={handleManageBilling}
                disabled={actionLoading}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
              >
                <CreditCard className="w-4 h-4" />
                <span className="text-sm font-medium">Manage billing</span>
              </button>
            )}

            {/* Change Email */}
            <button
              onClick={() => setShowEmailModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20 transition-colors"
            >
              <Mail className="w-4 h-4" />
              <span className="text-sm font-medium">Change email</span>
            </button>

            {/* Get Help */}
            <Link
              href="/help"
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-200 hover:bg-indigo-500/20 transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Get help</span>
            </Link>

            {/* Delete Account */}
            <button
              onClick={() => setShowDeleteModal(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span className="text-sm font-medium">Delete account</span>
            </button>
          </div>
        </motion.div>
      </div>

      {/* Footer links */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 flex justify-center gap-4 py-4 text-xs text-indigo-600"
      >
        <Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link>
        <Link href="/pricing" className="hover:text-indigo-400 transition-colors">Pricing</Link>
        <Link href="/help" className="hover:text-indigo-400 transition-colors">Help</Link>
        <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms</Link>
      </motion.div>

      {/* Email Change Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a2e] border border-indigo-500/20 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Change email</h2>
                <button onClick={() => setShowEmailModal(false)} className="text-indigo-400 hover:text-indigo-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-indigo-300 mb-4">
                Enter your new email address. We&apos;ll send a confirmation link to verify it.
              </p>
              <input
                type="email"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                placeholder="new@email.com"
                className="w-full px-4 py-3 rounded-xl bg-indigo-900/50 border border-indigo-500/30 text-white placeholder-indigo-400 focus:outline-none focus:border-indigo-400 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-medium hover:bg-indigo-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEmailChange}
                  disabled={actionLoading || !newEmail || newEmail === user?.email}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Updating...' : 'Update email'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Account Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a2e] border border-red-500/20 rounded-2xl p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-white">Delete account</h2>
              </div>
              <p className="text-sm text-indigo-300 mb-2">
                This action is <strong className="text-red-400">permanent</strong> and cannot be undone.
              </p>
              <ul className="text-sm text-indigo-400 mb-4 space-y-1">
                <li>- Your account and all data will be deleted</li>
                <li>- Any active subscriptions will be canceled</li>
                <li>- You will lose access immediately</li>
              </ul>
              <p className="text-sm text-indigo-300 mb-2">
                Type <strong className="text-white">DELETE</strong> to confirm:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="Type DELETE"
                className="w-full px-4 py-3 rounded-xl bg-red-900/20 border border-red-500/30 text-white placeholder-red-400/50 focus:outline-none focus:border-red-400 mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-200 font-medium hover:bg-indigo-500/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={actionLoading || deleteConfirmText !== 'DELETE'}
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Deleting...' : 'Delete account'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
