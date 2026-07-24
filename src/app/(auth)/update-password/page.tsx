'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Lock, Sparkles } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { updatePassword } from '@/lib/supabase-browser';

export default function UpdatePasswordPage() {
  const { user, isAuthLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updated, setUpdated] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Use at least 8 characters.');
      return;
    }
    if (password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setError(result.error);
        return;
      }
      setPassword('');
      setConfirmation('');
      setUpdated(true);
    } catch {
      setError('Unable to update your password. Check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600">
            <Sparkles className="h-6 w-6 text-white" />
          </span>
          <span className="text-2xl font-black text-white">
            Jalanea <span className="text-orange-400">ATS</span>
          </span>
        </Link>

        <section className="rounded-3xl border border-indigo-500/20 bg-indigo-950/80 p-8">
          <h1 className="text-2xl font-bold text-white">Choose a new password</h1>
          <p className="mt-2 text-sm text-indigo-300">
            Your reset link creates a short-lived secure session for this change.
          </p>

          {isAuthLoading ? (
            <p className="mt-6 text-sm text-indigo-300">Verifying your reset link...</p>
          ) : !user ? (
            <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              This reset link is invalid or expired.{' '}
              <Link href="/forgot-password" className="font-semibold underline">
                Request a new link
              </Link>
              .
            </div>
          ) : updated ? (
            <div className="mt-6">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>Your password has been updated.</p>
              </div>
              <Link
                href="/account"
                className="mt-6 inline-flex text-sm font-semibold text-orange-400 hover:text-orange-300"
              >
                Return to your account
              </Link>
            </div>
          ) : (
            <form className="mt-6 space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {[
                {
                  id: 'new-password',
                  label: 'New password',
                  value: password,
                  onChange: setPassword,
                  autoComplete: 'new-password',
                },
                {
                  id: 'confirm-password',
                  label: 'Confirm new password',
                  value: confirmation,
                  onChange: setConfirmation,
                  autoComplete: 'new-password',
                },
              ].map((field) => (
                <div key={field.id}>
                  <label htmlFor={field.id} className="mb-2 block text-sm font-medium text-indigo-200">
                    {field.label}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400" />
                    <input
                      id={field.id}
                      type="password"
                      autoComplete={field.autoComplete}
                      required
                      minLength={8}
                      value={field.value}
                      onChange={(event) => field.onChange(event.target.value)}
                      className="w-full rounded-xl border border-indigo-500/30 bg-indigo-900/50 py-3 pl-11 pr-4 text-white focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                </div>
              ))}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Updating password...' : 'Update password'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
