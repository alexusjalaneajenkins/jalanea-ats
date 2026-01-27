'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Upload, FileText, BarChart3, Sparkles, ChevronRight } from 'lucide-react';

const ONBOARDING_STORAGE_KEY = 'jalanea-onboarding-seen';

interface OnboardingModalProps {
  /** Force show the modal (for testing) */
  forceShow?: boolean;
}

const steps = [
  {
    icon: <Key className="w-6 h-6" />,
    title: 'Add Your API Key',
    description: 'Get a free Gemini API key from Google AI Studio. This powers the AI analysis features.',
    color: 'from-amber-500 to-orange-500',
  },
  {
    icon: <Upload className="w-6 h-6" />,
    title: 'Upload Your Resume',
    description: 'Drag and drop your PDF or DOCX resume. Everything is processed locally in your browser.',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    icon: <FileText className="w-6 h-6" />,
    title: 'Paste a Job Description',
    description: 'Copy the job posting you\'re applying to. We\'ll analyze how well your resume matches.',
    color: 'from-purple-500 to-pink-500',
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: 'View Your Results',
    description: 'See your scores, keyword matches, and get actionable tips to improve your resume.',
    color: 'from-emerald-500 to-teal-500',
  },
];

/**
 * Onboarding Modal Component
 *
 * Shows a welcome modal on first visit explaining how to use the app.
 * Dismisses permanently after user clicks "Got it".
 */
export function OnboardingModal({ forceShow = false }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Check if user has seen onboarding
  useEffect(() => {
    if (forceShow) {
      setIsOpen(true);
      return;
    }

    try {
      const seen = localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!seen) {
        // Small delay so page loads first
        const timer = setTimeout(() => setIsOpen(true), 500);
        return () => clearTimeout(timer);
      }
    } catch {
      // localStorage not available
    }
  }, [forceShow]);

  // Mark as seen and close
  const handleClose = () => {
    try {
      localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
    } catch {
      // localStorage not available
    }
    setIsOpen(false);
  };

  // Go to next step or close
  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleClose();
    }
  };

  // Skip to end
  const handleSkip = () => {
    handleClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-gradient-to-br from-indigo-950 via-indigo-900 to-purple-950 rounded-3xl border border-indigo-500/30 shadow-2xl overflow-hidden"
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-2 text-indigo-400 hover:text-white transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="px-6 pt-6 pb-4 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
                className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-black text-white mb-2">
                Welcome to Jalanea ATS
              </h2>
              <p className="text-sm text-indigo-300">
                Let's get you started in 4 simple steps
              </p>
            </div>

            {/* Step indicator dots */}
            <div className="flex justify-center gap-2 mb-4">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-6 bg-gradient-to-r from-orange-500 to-pink-500'
                      : index < currentStep
                        ? 'bg-emerald-500'
                        : 'bg-indigo-700'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>

            {/* Step content */}
            <div className="px-6 pb-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-center"
                >
                  <div className={`w-14 h-14 mx-auto mb-4 rounded-xl bg-gradient-to-br ${steps[currentStep].color} flex items-center justify-center text-white shadow-lg`}>
                    {steps[currentStep].icon}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    Step {currentStep + 1}: {steps[currentStep].title}
                  </h3>
                  <p className="text-sm text-indigo-300 leading-relaxed">
                    {steps[currentStep].description}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer buttons */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Skip intro
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                ) : (
                  "Let's Go!"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * Hook to reset onboarding (for testing)
 */
export function useResetOnboarding() {
  return () => {
    try {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      // localStorage not available
    }
  };
}
