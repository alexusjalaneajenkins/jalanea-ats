'use client';

import { Check, Key, Upload, FileText, BarChart3 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  description: string;
}

interface StepGuideProps {
  currentStep: number;
  variant?: 'horizontal' | 'compact';
}

const steps: Step[] = [
  {
    id: 'api-key',
    label: 'Add API Key',
    shortLabel: 'API Key',
    icon: <Key className="w-4 h-4" />,
    description: 'Get your free Gemini API key',
  },
  {
    id: 'upload',
    label: 'Upload Resume',
    shortLabel: 'Upload',
    icon: <Upload className="w-4 h-4" />,
    description: 'Upload your PDF or DOCX resume',
  },
  {
    id: 'job-description',
    label: 'Add Job Description',
    shortLabel: 'Job Desc',
    icon: <FileText className="w-4 h-4" />,
    description: 'Paste the job posting you\'re applying to',
  },
  {
    id: 'results',
    label: 'View Results',
    shortLabel: 'Results',
    icon: <BarChart3 className="w-4 h-4" />,
    description: 'See how well your resume matches',
  },
];

/**
 * Step Guide Component
 *
 * Shows users where they are in the workflow process.
 * Helps prevent users from feeling lost.
 */
export function StepGuide({ currentStep, variant = 'horizontal' }: StepGuideProps) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-2 py-3 px-4 bg-indigo-900/40 rounded-xl border border-indigo-500/20">
        <span className="text-xs text-indigo-400">Step {currentStep} of {steps.length}:</span>
        <span className="text-sm font-bold text-white">{steps[currentStep - 1]?.label}</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Mobile: Compact pill view */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between gap-2 py-3 px-4 bg-indigo-900/40 rounded-xl border border-indigo-500/20">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              currentStep <= steps.length
                ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white'
                : 'bg-indigo-800 text-indigo-400'
            }`}>
              {currentStep}
            </div>
            <div>
              <p className="text-sm font-bold text-white">{steps[currentStep - 1]?.label}</p>
              <p className="text-xs text-indigo-400">{steps[currentStep - 1]?.description}</p>
            </div>
          </div>
          <div className="text-xs text-indigo-500">
            {currentStep}/{steps.length}
          </div>
        </div>
      </div>

      {/* Desktop: Full horizontal stepper */}
      <div className="hidden sm:block">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isUpcoming = stepNumber > currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step */}
                <div className="flex flex-col items-center">
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      transition-all duration-300
                      ${isCompleted
                        ? 'bg-emerald-500 text-white'
                        : isCurrent
                          ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white ring-4 ring-orange-500/20'
                          : 'bg-indigo-800/50 text-indigo-500 border border-indigo-600/50'
                      }
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-bold ${
                      isCurrent ? 'text-white' : isCompleted ? 'text-emerald-400' : 'text-indigo-500'
                    }`}>
                      {step.shortLabel}
                    </p>
                  </div>
                </div>

                {/* Connector line */}
                {index < steps.length - 1 && (
                  <div className="flex-1 mx-2">
                    <div
                      className={`h-0.5 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : 'bg-indigo-700/50'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Step Hint Component
 *
 * A small hint that appears to tell users what to do next.
 * Similar to ChatGPT's onboarding hints.
 */
interface StepHintProps {
  step: number;
  message: string;
  action?: string;
  onAction?: () => void;
}

export function StepHint({ step, message, action, onAction }: StepHintProps) {
  return (
    <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-orange-500/30 rounded-xl">
      <div className="shrink-0 w-8 h-8 rounded-full bg-gradient-to-r from-orange-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold">
        {step}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-orange-100">{message}</p>
        {action && onAction && (
          <button
            onClick={onAction}
            className="mt-2 text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
          >
            {action} →
          </button>
        )}
      </div>
    </div>
  );
}
