'use client';

/**
 * Consent Modal Component
 *
 * Displays consent flow for BYOK features with clear warnings
 * about data sharing, costs, and responsibilities.
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Shield,
  AlertTriangle,
  Cloud,
  DollarSign,
  Eye,
  Lock,
  Check,
  ChevronRight,
} from 'lucide-react';
import {
  ConsentAcknowledgments,
  REQUIRED_ACKNOWLEDGMENTS,
} from '@/lib/llm/types';

// ============================================================================
// Types
// ============================================================================

interface ConsentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: () => void;
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
  const handleConsent = () => {
    if (allAcknowledged) {
      onConsent();
      onClose();
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
    onClose();
  };

  if (!isOpen) return null;

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
      icon: DollarSign,
      title: 'API Costs Are Your Responsibility',
      description: 'Using AI features will consume API credits from your account. Costs depend on usage and the provider\'s pricing.',
      warning: 'You are responsible for monitoring your API usage and associated costs.',
      acknowledgmentKey: 'apiCosts' as const,
      acknowledgmentText: 'I understand I am responsible for any API costs',
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
      title: 'Your Key Stays Local',
      description: 'Your API key is stored only in your browser. Jalanea never sees or stores your API key on our servers.',
      warning: 'Keep your API key secure. Don\'t share it with others.',
      acknowledgmentKey: 'localStorageOnly' as const,
      acknowledgmentText: 'I understand my API key is stored locally only',
    },
  ];

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-xl mx-4 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 rounded-lg">
                  <Shield className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Enable AI Features
                  </h2>
                  <p className="text-sm text-slate-400">
                    Please review and acknowledge each item
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
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
                    className={`flex-1 h-2 rounded-full transition-colors ${
                      isCompleted
                        ? 'bg-emerald-500'
                        : isCurrent
                        ? 'bg-amber-500'
                        : 'bg-slate-700'
                    }`}
                  />
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
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                    acknowledgments[currentStepData.acknowledgmentKey]
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-slate-700 hover:border-slate-600 bg-slate-800/30'
                  }`}
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
                disabled={currentStep === 0}
                className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Back
              </button>

              {/* Next/Complete Button */}
              {currentStep < steps.length - 1 ? (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!acknowledgments[currentStepData.acknowledgmentKey]}
                  className="px-6 py-2 text-sm font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleConsent}
                  disabled={!allAcknowledged}
                  className="px-6 py-2 text-sm font-medium bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Enable AI Features
                </button>
              )}
            </div>

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
      </div>
    </AnimatePresence>
  );
}

export default ConsentModal;
