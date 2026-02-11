'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Send, Mail, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

type FormState = 'idle' | 'submitting' | 'success' | 'error';

export default function ContactPage() {
  const [formState, setFormState] = useState<FormState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState('submitting');
    setErrorMessage('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      setFormState('success');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (error) {
      setFormState('error');
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong');
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 flex flex-col">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f1a] to-[#1a1333]" />
        <motion.div
          className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.4) 0%, transparent 70%)' }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.25, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <div className="relative z-10 max-w-lg mx-auto flex-1 w-full">
        {/* Header */}
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

          <Link
            href="/help"
            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Help Center</span>
          </Link>
        </div>

        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="text-2xl font-bold text-white mb-1">Contact Us</h1>
          <p className="text-sm text-indigo-300">We&apos;d love to hear from you</p>
        </motion.div>

        {/* Success State */}
        {formState === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center"
          >
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-2">Message Sent!</h2>
            <p className="text-sm text-indigo-300 mb-6">
              Thanks for reaching out. We&apos;ll get back to you as soon as possible.
            </p>
            <button
              onClick={() => setFormState('idle')}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Send another message
            </button>
          </motion.div>
        )}

        {/* Form */}
        {formState !== 'success' && (
          <motion.form
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            onSubmit={handleSubmit}
            className="bg-[#1a1a2e]/90 border border-indigo-500/10 rounded-2xl p-6 backdrop-blur-sm space-y-5"
          >
            {/* Error message */}
            {formState === 'error' && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">{errorMessage}</p>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-indigo-300 mb-1.5">
                Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={formState === 'submitting'}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f1a]/50 border border-indigo-500/20 text-white placeholder-indigo-500 focus:outline-none focus:border-indigo-400 transition-colors disabled:opacity-50"
                placeholder="Your name"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-indigo-300 mb-1.5">
                Email <span className="text-red-400">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={formState === 'submitting'}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f1a]/50 border border-indigo-500/20 text-white placeholder-indigo-500 focus:outline-none focus:border-indigo-400 transition-colors disabled:opacity-50"
                placeholder="you@example.com"
              />
            </div>

            {/* Subject */}
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-indigo-300 mb-1.5">
                Subject
              </label>
              <select
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                disabled={formState === 'submitting'}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f1a]/50 border border-indigo-500/20 text-white focus:outline-none focus:border-indigo-400 transition-colors disabled:opacity-50"
              >
                <option value="">Select a topic (optional)</option>
                <option value="General Question">General Question</option>
                <option value="Technical Issue">Technical Issue</option>
                <option value="Billing Question">Billing Question</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Message */}
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-indigo-300 mb-1.5">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                disabled={formState === 'submitting'}
                rows={5}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0f0f1a]/50 border border-indigo-500/20 text-white placeholder-indigo-500 focus:outline-none focus:border-indigo-400 transition-colors resize-none disabled:opacity-50"
                placeholder="How can we help you?"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={formState === 'submitting'}
              className="w-full flex items-center justify-center gap-2 py-3 px-5 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {formState === 'submitting' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Message</span>
                </>
              )}
            </button>
          </motion.form>
        )}

        {/* Alternative contact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-6 text-center"
        >
          <p className="text-sm text-indigo-400">
            You can also email us directly at{' '}
            <a
              href="mailto:support-ats@jalanea.dev"
              className="text-indigo-300 hover:text-white transition-colors underline underline-offset-2"
            >
              support-ats@jalanea.dev
            </a>
          </p>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="relative z-10 flex justify-center gap-4 py-4 mt-8 text-xs text-indigo-600"
      >
        <Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link>
        <Link href="/help" className="hover:text-indigo-400 transition-colors">Help</Link>
        <Link href="/terms" className="hover:text-indigo-400 transition-colors">Terms</Link>
      </motion.div>
    </div>
  );
}
