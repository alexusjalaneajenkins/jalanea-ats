'use client';

/**
 * Consent Modal Component
 *
 * Displays consent flow for BYOK features with clear warnings
 * about data sharing, usage limits, and responsibilities.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  AlertTriangle,
  Cloud,
  Eye,
  Lock,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  ConsentAcknowledgments,
  REQUIRED_ACKNOWLEDGMENTS,
} from '@/lib/llm/types';
import { Dialog } from '@/components/ui/Dialog';

// ============================================================================
// Types
// ============================================================================

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void | Promise<void>;
  providerName: string;
}

// ============================================================================
// Component
// ============================================================================

export function ConsentModal({
  isOpen,
  onClose,
  onConsent,
  providerName,
}: ConsentModalProps) {
  const [acknowledgments, setAcknowledgments] = useState<ConsentAcknowledgments>({
    dataSharing: false,
    apiCosts: false,
    reviewRequired: false,
    localStorageOnly: false,
  });

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Check if all required acknowledgments are accepted
  const allAcknowledged = REQUIRED_ACKNOWLEDGMENTS.every(
    (key) => acknowledgments[key]
  );

  // Toggle an acknowledgment
  const toggleAcknowledgment = (key: keyof ConsentAcknowledgments) => {
    setAcknowledgments((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Handle consent
  const handleConsent = async () => {
    if (!allAcknowledged || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await onConsent();
      handleClose();
    } catch {
      setSubmitError(
        'AI consent could not be saved. Nothing was enabled; please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset state on close
  const handleClose = () => {
    setAcknowledgments({
      dataSharing: false,
      apiCosts: false,
      reviewRequired: false,
      localStorageOnly: false,
    });
    setCurrentStep(0);
    setSubmitError(null);
    onClose();
  };

  const steps = [
    {
      icon: Cloud,
      title: 'Data Will Be Sent Externally',
      description: `When you use AI features, your resume and job description text will be sent to ${providerName}'s servers for processing.`,
      warning: 'This data leaves your device and is processed by a third-party service.',
      acknowledgmentKey: 'dataSharing' as const,
      acknowledgmentText: 'I understand my data will be sent to external servers',
    },
    {
      icon: AlertTriangle,
      title: 'Usage Limits Apply',
      description: 'AI requests count against the limits of the key you use. The demo key allows a small daily limit, and your own key may have quotas set by Google.',
      warning: 'If you hit a limit, try again later or switch Gemini models.',
      acknowledgmentKey: 'apiCosts' as const,
      acknowledgmentText: 'I understand AI usage limits apply',
    },
    {
      icon: Eye,
      title: 'Review AI Suggestions Carefully',
      description: 'AI suggestions are not perfect. Always review and edit suggestions before using them on your resume.',
      warning: 'Never blindly copy AI output. You are responsible for the final content.',
      acknowledgmentKey: 'reviewRequired' as const,
      acknowledgmentText: 'I will review all AI suggestions before using them',
    },
    {
      icon: Lock,
      title: 'How AI Access Works',
      description: 'Free and paid AI requests use Jalanea\'s server connection to Google Gemini. If you add your own API key, that key is stored only in your browser.',
      warning: 'Resume and job-description text is processed by Google Gemini, but Jalanea does not store that text on its servers.',
      acknowledgmentKey: 'localStorageOnly' as const,
      acknowledgmentText: 'I understand how AI requests and API keys are handled',
    },
  ];

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        if (!isSubmitting) handleClose();
      }}
      labelledBy="consent-dialog-title"
      closeOnBackdrop={!isSubmitting}
    >
      <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative w-full max-w-xl bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2
                    id="consent-dialog-title"
                    className="text-lg font-semibold text-white"
                  >
                    Enable AI Features
                  </h2>
                  <p className="text-sm text-slate-400">
                    Please review and acknowledge each item
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
                aria-label="Close AI consent dialog"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="px-6 py-3 border-b border-slate-700/30">
            <div className="flex items-center gap-2">
              {steps.map((step, index) => {
                const isCompleted = acknowledgments[step.acknowledgmentKey];
                const isCurrent = index === currentStep;
                return (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    disabled={isSubmitting}
                    aria-label={`Review consent step ${index + 1}: ${step.title}`}
                    aria-current={isCurrent ? 'step' : undefined}
                    className="flex min-h-11 flex-1 items-center disabled:cursor-not-allowed"
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-full rounded-full transition-colors ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isCurrent
                            ? 'bg-amber-500'
                            : 'bg-slate-700'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Step {currentStep + 1} of {steps.length}
            </p>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Step Icon and Title */}
                <div className="text-center">
                  <div className="inline-flex p-4 bg-amber-500/10 rounded-2xl mb-4">
                    <StepIcon className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white">
                    {currentStepData.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-slate-300 text-center leading-relaxed">
                  {currentStepData.description}
                </p>

                {/* Warning Box */}
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-amber-200">
                      {currentStepData.warning}
                    </p>
                  </div>
                </div>

                {/* Acknowledgment Checkbox */}
                <button
                  onClick={() => toggleAcknowledgment(currentStepData.acknowledgmentKey)}
                  disabled={isSubmitting}
                  aria-pressed={
                    acknowledgments[currentStepData.acknowledgmentKey]
                  }
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    acknowledgments[currentStepData.acknowledgmentKey]
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        acknowledgments[currentStepData.acknowledgmentKey]
                          ? 'border-emerald-500 bg-emerald-500'
                          : 'border-slate-600'
                      }`}
                    >
                      {acknowledgments[currentStepData.acknowledgmentKey] && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span
                      className={`text-sm font-medium ${
                        acknowledgments[currentStepData.acknowledgmentKey]
                          ? 'text-emerald-400'
                          : 'text-slate-300'
                      }`}
                    >
                      {currentStepData.acknowledgmentText}
                    </span>
                  </div>
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
            <div className="flex items-center justify-between">
              {/* Back Button */}
              <button
                onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                disabled={currentStep === 0 || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>

              {/* Next/Complete Button */}
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={
                    !acknowledgments[currentStepData.acknowledgmentKey]
                    || isSubmitting
                  }
                  className="px-6 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleConsent}
                  disabled={!allAcknowledged || isSubmitting}
                  aria-busy={isSubmitting}
                  className="px-6 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  {isSubmitting ? 'Saving Consent…' : 'Enable AI Features'}
                </button>
              )}
            </div>

            {submitError && (
              <p role="alert" className="mt-4 text-center text-sm text-red-300">
                {submitError}
              </p>
            )}

            {/* Summary of acknowledgments */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {steps.map((step, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    acknowledgments[step.acknowledgmentKey]
                      ? 'bg-emerald-500'
                      : 'bg-slate-700'
                  }`}
                  title={step.title}
                />
              ))}
              <span className="text-xs text-slate-500 ml-2">
                {REQUIRED_ACKNOWLEDGMENTS.filter((k) => acknowledgments[k]).length} of{' '}
                {REQUIRED_ACKNOWLEDGMENTS.length} acknowledged
              </span>
            </div>
          </div>
      </motion.div>
    </Dialog>
  );
}

export default ConsentModal;
