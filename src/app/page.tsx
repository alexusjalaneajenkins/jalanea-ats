'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Sparkles, FileText, Shield, Eye, CheckCircle, Star, Cloud, Moon, Settings } from 'lucide-react';
import Link from 'next/link';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
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
import { ByokKeyModal } from '@/components/ByokKeyModal';
import { ConsentModal } from '@/components/ConsentModal';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Floating Stars Background ---
const FloatingStars = () => {
  const [stars, setStars] = useState<Array<{ id: number; size: number; x: number; y: number; delay: number; duration: number }>>([]);

  useEffect(() => {
    setStars(Array.from({ length: 25 }, (_, i) => ({
      id: i,
      size: Math.random() * 4 + 2,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 3,
      duration: Math.random() * 3 + 2,
    })));
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{ left: `${s.x}%`, top: `${s.y}%` }}
          animate={{ opacity: [0.2, 0.8, 0.2], scale: [1, 1.3, 1] }}
          transition={{ duration: s.duration, delay: s.delay, repeat: Infinity, ease: "easeInOut" }}
        >
          <Star className="text-yellow-300" style={{ width: s.size, height: s.size }} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};

// --- Floating Cloud Elements ---
const FloatingClouds = () => (
  <>
    <motion.div
      className="absolute top-[15%] left-[5%] text-indigo-800/30"
      animate={{ x: [0, 20, 0], y: [0, -10, 0] }}
      transition={{ duration: 8, repeat: Infinity }}
    >
      <Cloud className="w-20 h-20" />
    </motion.div>
    <motion.div
      className="absolute top-[25%] right-[8%] text-purple-800/20"
      animate={{ x: [0, -15, 0], y: [0, 10, 0] }}
      transition={{ duration: 10, repeat: Infinity }}
    >
      <Cloud className="w-28 h-28" />
    </motion.div>
  </>
);

// --- Sticker Component ---
const Sticker = ({ children, rotate = 0, className = '' }: { children: React.ReactNode; rotate?: number; className?: string }) => (
  <motion.div
    initial={{ scale: 0, rotate: rotate - 20 }}
    animate={{ scale: 1, rotate }}
    transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.5 }}
    className={cn(
      "absolute px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide shadow-lg",
      className
    )}
  >
    {children}
  </motion.div>
);

// --- Feature Card ---
const FeatureCard = ({ icon: Icon, title, description, delay }: { icon: React.ElementType; title: string; description: string; delay: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5 hover:border-indigo-400/50 transition-all"
  >
    <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3">
      <Icon className="w-5 h-5 text-indigo-300" />
    </div>
    <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
    <p className="text-xs text-indigo-300">{description}</p>
  </motion.div>
);

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
  const { config: llmConfig, updateConfig, setConsent, isLoading: isLoadingConfig } = useLlmConfig();
  const hasApiKey = !!(llmConfig?.apiKey && llmConfig?.hasConsented);

  // Progress tracking for "continue where you left off"
  const {
    progress: userProgress,
    isLoaded: isProgressLoaded,
    saveSession,
    clearSession,
    hasRecentSession,
    getTimeSinceLastSession,
  } = useProgress();
  const [showContinuePrompt, setShowContinuePrompt] = useState(true);

  // Handle saving API key
  const handleSaveLlmConfig = useCallback(async (newConfig: Parameters<typeof updateConfig>[0]) => {
    await updateConfig({
      ...newConfig,
      hasConsented: false,
    });
    setShowKeyModal(false);
    setShowConsentModal(true);
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
        {/* Gradient orbs */}
        <motion.div
          className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-40"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.3) 0%, rgba(236,72,153,0.1) 40%, transparent 70%)' }}
          animate={{ x: [0, 50, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-[-30%] right-[-20%] w-[70%] h-[70%] rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.25) 0%, rgba(99,102,241,0.1) 40%, transparent 70%)' }}
          animate={{ x: [0, -40, 0], y: [0, -20, 0], scale: [1, 1.15, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <FloatingClouds />
        <FloatingStars />
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-grid opacity-[0.04]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform glow-orange">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>
          <span className="text-2xl font-black tracking-tight">
            <span className="text-white">Jalanea</span>
            <span className="text-orange-400"> ATS</span>
          </span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => setShowKeyModal(true)}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-full border transition-colors ${
              hasApiKey
                ? 'text-emerald-300 hover:text-emerald-200 bg-emerald-900/30 border-emerald-700/30 hover:border-emerald-500/50'
                : 'text-amber-300 hover:text-amber-200 bg-amber-900/30 border-amber-700/30 hover:border-amber-500/50'
            }`}
            title={hasApiKey ? 'API key configured' : 'Add your API key for AI features'}
          >
            <Settings className="w-4 h-4" />
            <span className="font-medium hidden sm:inline">
              {hasApiKey ? 'API Key ✓' : 'Add API Key'}
            </span>
          </button>
          <div className="hidden md:flex items-center gap-2 text-sm text-indigo-300 bg-indigo-900/40 px-4 py-2 rounded-full border border-indigo-700/30">
            <Moon className="w-4 h-4 text-yellow-400" />
            <span className="font-medium">Free forever</span>
          </div>
        </motion.div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-4xl mx-auto px-6 pb-24 pt-6">
        {/* Header */}
        <div className="text-center mb-10 relative">
          {/* Floating stickers */}
          <Sticker rotate={-12} className="top-0 left-[5%] bg-gradient-to-r from-cyan-400 to-cyan-500 text-cyan-950 hidden lg:block">
            🔒 Private
          </Sticker>
          <Sticker rotate={8} className="top-[15%] right-[5%] bg-gradient-to-r from-pink-400 to-pink-500 text-pink-950 hidden lg:block">
            ⚡ Fast
          </Sticker>

          {/* Badge */}
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
            <span className="text-orange-400 font-bold">locally in your browser</span>.
          </motion.p>
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

        {/* Upload Card - Always enabled, no API key required */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
          className="glass-card rounded-3xl p-2 mb-10 relative"
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

        {/* How it Works - Clear explanation of the tool */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-10"
        >
          <h2 className="text-lg font-bold text-white mb-4 text-center">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">1</div>
              <h3 className="text-sm font-bold text-white mb-1">Upload your resume</h3>
              <p className="text-xs text-indigo-300">PDF, DOCX, or TXT. Everything stays in your browser.</p>
            </div>
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">2</div>
              <h3 className="text-sm font-bold text-white mb-1">See what bots see</h3>
              <p className="text-xs text-indigo-300">View the plain text that ATS software extracts from your resume.</p>
            </div>
            <div className="bg-indigo-900/30 backdrop-blur-sm rounded-2xl border-2 border-indigo-500/30 p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center mx-auto mb-3 text-white font-bold">3</div>
              <h3 className="text-sm font-bold text-white mb-1">Fix issues</h3>
              <p className="text-xs text-indigo-300">Get specific tips to improve formatting and keyword coverage.</p>
            </div>
          </div>
        </motion.div>

        {/* Optional: API Key for AI Features - Show as enhancement, not requirement */}
        {!isLoadingConfig && !hasApiKey && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-10 p-4 bg-indigo-900/30 border border-indigo-500/30 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                <Sparkles className="w-5 h-5 text-indigo-300" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-indigo-200">
                  <span className="font-semibold text-white">Want AI-powered insights?</span>{' '}
                  Add a free API key for semantic matching and advanced analysis.
                </p>
              </div>
              <button
                onClick={() => setShowKeyModal(true)}
                className="shrink-0 px-4 py-2 text-sm bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 rounded-lg border border-indigo-500/30 transition-colors"
              >
                Add Key
              </button>
            </div>
          </motion.div>
        )}

        {/* Feature cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <FeatureCard
            icon={Shield}
            title="Privacy First"
            description="Your resume never leaves your browser. All processing happens locally."
            delay={0.45}
          />
          <FeatureCard
            icon={Eye}
            title="See What ATS Sees"
            description="View the plain text that applicant tracking systems extract from your resume."
            delay={0.5}
          />
          <FeatureCard
            icon={CheckCircle}
            title="Actionable Insights"
            description="Get specific recommendations to improve how your resume parses."
            delay={0.55}
          />
        </div>

        {/* Tips section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-orange-500/10 border-2 border-orange-500/30 rounded-2xl p-5"
        >
          <h3 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2">
            <span>💡</span> Tips for best results
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

        {/* Footer links */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 text-center text-sm text-indigo-400"
        >
          <Link href="/privacy" className="hover:text-indigo-300 transition-colors">
            Privacy Policy
          </Link>
          <span className="mx-2">•</span>
          <Link href="/terms" className="hover:text-indigo-300 transition-colors">
            Terms of Use
          </Link>
        </motion.div>
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
