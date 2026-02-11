'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, Settings, Gift, User, CreditCard, Lightbulb, FileText, Lock, Zap, Cloud } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { UploadDropzone } from '@/components/UploadDropzone';
import { OnboardingModal } from '@/components/OnboardingModal';
import { ContinuePrompt } from '@/components/ContinuePrompt';
import { useProgress } from '@/hooks/useProgress';
import { parsePdf, PdfParseError } from '@/lib/parsers/pdf';
import { parseDocx, DocxParseError } from '@/lib/parsers/docx';
import { parseTxt, TxtParseError } from '@/lib/parsers/txt';
import { createSession, ResumeArtifact } from '@/lib/types/session';
import { sessionStore } from '@/lib/storage/sessionStore';
import { useLlmConfig } from '@/hooks/useLlmConfig';
import { useFreeTier } from '@/hooks/useFreeTier';
import { ByokKeyModal } from '@/components/ByokKeyModal';
import { ConsentModal } from '@/components/ConsentModal';

/**
 * Home Page - Main entry point for Jalanea ATS
 *
 * Handles file upload, PDF/DOCX parsing, and navigation to results.
 * All processing happens locally in the browser.
 */
export default function HomePage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  // API key configuration
  const { config: llmConfig, updateConfig, setConsent } = useLlmConfig();
  const hasApiKey = !!(llmConfig?.apiKey && llmConfig?.hasConsented);

  // Free tier status
  const freeTier = useFreeTier();

  // Auth status
  const { user, hasAccess } = useAuth();

  // Progress tracking for "continue where you left off"
  const {
    progress: userProgress,
    isLoaded: isProgressLoaded,
    saveSession,
    hasRecentSession,
    getTimeSinceLastSession,
  } = useProgress();
  const [showContinuePrompt, setShowContinuePrompt] = useState(true);

  // Handle saving API key
  const handleSaveLlmConfig = useCallback(async (newConfig: Parameters<typeof updateConfig>[0]) => {
    await updateConfig(newConfig);
    setShowKeyModal(false);
    if (newConfig.apiKey && !newConfig.hasConsented) {
      setShowConsentModal(true);
    }
  }, [updateConfig]);

  // Handle consent
  const handleConsent = useCallback(async () => {
    await setConsent(true);
    setShowConsentModal(false);
  }, [setConsent]);

  /**
   * Handles file selection and parsing.
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      setError(null);
      setIsProcessing(true);
      setProgress(null);

      try {
        let resumeArtifact: ResumeArtifact;

        // Determine file type and parse accordingly
        const fileName = file.name.toLowerCase();
        const isPdf = fileName.endsWith('.pdf') || file.type === 'application/pdf';
        const isDocx =
          fileName.endsWith('.docx') ||
          fileName.endsWith('.doc') ||
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
        const isTxt = fileName.endsWith('.txt') || file.type === 'text/plain';

        if (isPdf) {
          // Parse PDF
          resumeArtifact = await parsePdf(file, {
            onProgress: (current, total) => {
              setProgress({ current, total });
            },
          });
        } else if (isDocx) {
          // Parse DOCX
          resumeArtifact = await parseDocx(file);
        } else if (isTxt) {
          // Parse TXT
          resumeArtifact = await parseTxt(file);
        } else {
          throw new Error('Unsupported file type. Please upload a PDF, DOCX, or TXT file.');
        }

        // Create a session
        const session = createSession(resumeArtifact);

        // Save to store
        await sessionStore.save(session);

        // Save progress for "continue where you left off"
        saveSession(session.id, file.name, false);

        // Navigate to results
        router.push(`/results/${session.id}`);
      } catch (err) {
        console.error('Error parsing file:', err);

        if (err instanceof PdfParseError || err instanceof DocxParseError || err instanceof TxtParseError) {
          setError(err.message);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unexpected error occurred. Please try again.');
        }

        setIsProcessing(false);
      }
    },
    [router]
  );

  return (
    <div className="min-h-screen text-indigo-100 overflow-x-hidden">
      {/* Background layers */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-5%] w-[50%] h-[50%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.2) 0%, transparent 60%)' }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 60%)' }}
        />
        <div className="absolute inset-0 bg-grid opacity-[0.03]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <Link href="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform glow-orange">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
            </div>
            <span className="text-2xl font-black tracking-tight">
              <span className="text-white">Jalanea</span>
              <span className="text-orange-400"> ATS</span>
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 sm:gap-3"
        >
          {/* AI Settings - unified indigo style */}
          <button
            onClick={() => setShowKeyModal(true)}
            aria-label={hasApiKey ? 'AI settings configured' : 'Configure AI settings'}
            className={`flex items-center justify-center gap-2 text-sm h-9 px-3 sm:px-4 rounded-full border transition-colors shrink-0 ${
              hasApiKey
                ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-900/30 border-emerald-700/30 hover:border-emerald-500/50'
                : 'text-indigo-300 hover:text-indigo-200 bg-indigo-900/30 border-indigo-500/30 hover:border-indigo-400/50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">
              {hasApiKey ? 'AI Settings ✓' : 'AI Settings'}
            </span>
          </button>
          {/* Pricing link - consistent with other nav items */}
          {!hasAccess && (
            <Link
              href="/pricing"
              className="flex items-center justify-center gap-2 text-sm h-9 px-3 sm:px-4 rounded-full border border-indigo-500/30 bg-indigo-900/30 text-indigo-200 hover:text-white hover:border-indigo-400/50 transition-colors shrink-0"
            >
              <CreditCard className="w-4 h-4" />
              <span className="hidden sm:inline">Pricing</span>
            </Link>
          )}
          {/* Account/Login - unified indigo style */}
          <Link
            href={user ? '/account' : '/login'}
            aria-label={user ? 'View account' : 'Log in'}
            className="flex items-center justify-center gap-2 text-sm h-9 px-3 sm:px-4 rounded-full border border-indigo-500/30 bg-indigo-900/30 text-indigo-200 hover:text-white hover:border-indigo-400/50 transition-colors shrink-0"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">{user ? 'Account' : 'Login'}</span>
          </Link>
        </motion.div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pb-24 pt-6">
        {/* Floating decorations */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Clouds - animated background decoration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 0.5, x: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute top-6 left-4 md:left-12 animate-float-slow"
          >
            <Cloud className="w-14 h-14 text-indigo-800/60" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.4, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-16 right-4 md:right-8 animate-float"
            style={{ animationDelay: '1s' }}
          >
            <Cloud className="w-20 h-20 text-pink-900/40" strokeWidth={1} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 0.35, y: 0 }}
            transition={{ delay: 0.6 }}
            className="absolute top-32 left-8 md:left-24 animate-float"
            style={{ animationDelay: '0.5s' }}
          >
            <Cloud className="w-12 h-12 text-indigo-700/40" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 0.3, y: 0 }}
            transition={{ delay: 0.8 }}
            className="absolute top-28 right-16 md:right-32 animate-float-slow"
            style={{ animationDelay: '1.5s' }}
          >
            <Cloud className="w-16 h-16 text-purple-900/30" strokeWidth={1} />
          </motion.div>

          {/* Stars - reduced to 4 for less clutter */}
          <span className="absolute top-12 left-1/4 text-amber-400 text-xs animate-twinkle" style={{ animationDelay: '0s' }}>✦</span>
          <span className="absolute top-24 right-1/4 text-cyan-400 text-xs animate-twinkle-slow" style={{ animationDelay: '0.5s' }}>✦</span>
          <span className="absolute top-16 right-1/3 text-amber-300 text-sm animate-twinkle-slow" style={{ animationDelay: '1s' }}>✦</span>
          <span className="absolute top-32 left-[20%] text-pink-400 text-xs animate-twinkle" style={{ animationDelay: '1.5s' }}>✦</span>
        </div>

        {/* Header */}
        <div className="text-center mb-12 relative">
          {/* PDF & DOCX Support badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-cyan-500/40 bg-cyan-500/10 px-5 py-2 text-sm font-bold text-cyan-300 mb-6 backdrop-blur-sm"
          >
            <FileText className="w-4 h-4" />
            <span>PDF & DOCX Support</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] mb-6"
          >
            <span className="text-white text-glow">Will your resume</span>{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 via-pink-500 to-cyan-400">
              beat the bots?
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-indigo-300 max-w-xl mx-auto"
          >
            See exactly how ATS software reads your resume. All processing happens{' '}
            <span className="text-orange-400 font-medium">locally in your browser</span>.
          </motion.p>
          {/* Feature badges row - visible on all screen sizes */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap items-center justify-center gap-2 mt-5"
          >
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-300 text-xs font-medium">
              <Lock className="w-3 h-3" />
              Private
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/20 border border-pink-500/30 text-pink-300 text-xs font-medium">
              <Zap className="w-3 h-3" />
              Fast
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <Gift className="w-3 h-3" />
              3 free/day
            </span>
          </motion.div>
        </div>

        {/* Continue where you left off prompt */}
        {isProgressLoaded && hasRecentSession() && userProgress.lastSessionId && userProgress.lastFileName && (
          <ContinuePrompt
            isVisible={showContinuePrompt}
            sessionId={userProgress.lastSessionId}
            fileName={userProgress.lastFileName}
            timeSince={getTimeSinceLastSession() || ''}
            hadJobDescription={userProgress.hadJobDescription}
            onDismiss={() => setShowContinuePrompt(false)}
          />
        )}

        {/* Upload Card */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="glass-card rounded-3xl p-2 mb-12 relative"
        >
          <div className="bg-gradient-to-br from-indigo-950/80 to-purple-950/80 rounded-2xl p-6 md:p-8">
            <UploadDropzone
              onFileSelect={handleFileSelect}
              isProcessing={isProcessing}
              error={error}
              acceptedTypes={[
                '.pdf',
                'application/pdf',
                '.docx',
                '.doc',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/msword',
                '.txt',
                'text/plain',
              ]}
            />

            {/* Progress indicator */}
            {progress && isProcessing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-4 text-center text-sm text-cyan-400"
              >
                Processing page {progress.current} of {progress.total}...
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* How it Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-12"
        >
          <h2 className="text-xl font-bold text-white mb-5 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">1</div>
              <h3 className="text-base font-bold text-white mb-1">Upload your resume</h3>
              <p className="text-sm text-indigo-300">PDF, DOCX, or TXT. Everything stays in your browser.</p>
            </div>
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">2</div>
              <h3 className="text-base font-bold text-white mb-1">See what bots see</h3>
              <p className="text-sm text-indigo-300">View the plain text that ATS software extracts.</p>
            </div>
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border border-indigo-500/20 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">3</div>
              <h3 className="text-base font-bold text-white mb-1">Fix issues</h3>
              <p className="text-sm text-indigo-300">Get tips to improve formatting and keywords.</p>
            </div>
          </div>
        </motion.div>

        {/* Tips section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-orange-500/10 border border-orange-500/30 rounded-2xl p-5"
        >
          <h3 className="text-base font-bold text-orange-400 mb-3 flex items-center gap-2">
            <Lightbulb className="w-4 h-4" />
            Tips for best results
          </h3>
          <ul className="text-sm text-orange-200/80 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Use a single-column layout for best parsing compatibility
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Avoid tables, text boxes, and graphics with embedded text
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Save as PDF from the original document (not a scanned image)
            </li>
            <li className="flex items-start gap-2">
              <span className="text-orange-400">•</span>
              Keep contact information in the main body, not just the header
            </li>
          </ul>
        </motion.div>

        {/* Footer */}
        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-20 pt-8 border-t border-indigo-800/30"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-indigo-500">
            <span className="font-medium">Jalanea ATS</span>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-indigo-300 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-indigo-300 transition-colors">
                Terms
              </Link>
              <Link href="/help" className="hover:text-indigo-300 transition-colors">
                Help
              </Link>
            </div>
          </div>
        </motion.footer>
      </main>

      {/* API Key Modal */}
      <ByokKeyModal
        isOpen={showKeyModal}
        onClose={() => setShowKeyModal(false)}
        onSave={handleSaveLlmConfig}
        currentConfig={llmConfig || undefined}
      />

      {/* Consent Modal */}
      <ConsentModal
        isOpen={showConsentModal}
        onClose={() => setShowConsentModal(false)}
        onConsent={handleConsent}
        providerName="Google Gemini"
      />

      {/* First-time user onboarding */}
      <OnboardingModal />
    </div>
  );
}
