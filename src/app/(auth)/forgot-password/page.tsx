'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Mail, Sparkles } from 'lucide-react';
import { requestPasswordReset } from '@/lib/supabase-browser';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await requestPasswordReset(email.trim());
      if (result.error) {
        setError(result.error);
        return;
      }
      setSubmitted(true);
    } catch {
      setError('Unable to send the reset email. Check your connection and try again.');
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
          <h1 className="text-2xl font-bold text-white">Reset your password</h1>
          <p className="mt-2 text-sm text-indigo-300">
            Enter your account email and we&apos;ll send a secure reset link.
          </p>

          {submitted ? (
            <div className="mt-6">
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>
                  If an account exists for that email, a reset link is on its way.
                  Check spam if it does not arrive shortly.
                </p>
              </div>
              <Link
                href="/login"
                className="mt-6 inline-flex text-sm font-semibold text-orange-400 hover:text-orange-300"
              >
                Back to sign in
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

              <div>
                <label htmlFor="recovery-email" className="mb-2 block text-sm font-medium text-indigo-200">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-indigo-400" />
                  <input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="w-full rounded-xl border border-indigo-500/30 bg-indigo-900/50 py-3 pl-11 pr-4 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? 'Sending reset link...' : 'Send reset link'}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
