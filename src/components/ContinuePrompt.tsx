'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Clock, FileText, ArrowRight, X } from 'lucide-react';
import Link from 'next/link';

interface ContinuePromptProps {
  /** Whether to show the prompt */
  isVisible: boolean;
  /** The session ID to continue */
  sessionId: string;
  /** The filename of the resume */
  fileName: string;
  /** Time since last session (e.g., "2 hours ago") */
  timeSince: string;
  /** Whether the session had a job description */
  hadJobDescription: boolean;
  /** Callback when user dismisses the prompt */
  onDismiss: () => void;
}

/**
 * Continue Prompt Component
 *
 * Shows a prompt to continue a previous session when user returns.
 * Appears at the top of the landing page.
 */
export function ContinuePrompt({
  isVisible,
  sessionId,
  fileName,
  timeSince,
  hadJobDescription,
  onDismiss,
}: ContinuePromptProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -20, height: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 overflow-hidden"
        >
          <div className="p-4 sm:p-5 bg-gradient-to-r from-cyan-500/10 via-indigo-500/10 to-purple-500/10 border-2 border-cyan-500/30 rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
              <h3 className="text-base font-bold text-white">
                Continue where you left off?
              </h3>
              <button
                onClick={onDismiss}
                className="shrink-0 w-11 h-11 flex items-center justify-center text-indigo-400 hover:text-white transition-colors rounded-lg hover:bg-indigo-800/50"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Icon */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-sm text-indigo-300">
                  <FileText className="w-4 h-4 shrink-0" />
                  <span className="truncate min-w-0">{fileName}</span>
                  <span className="text-indigo-500">•</span>
                  <span className="shrink-0">{timeSince}</span>
                </div>
                {!hadJobDescription && (
                  <p className="mt-1 text-xs text-amber-400">
                    You haven't added a job description yet
                  </p>
                )}
              </div>

              {/* Action button */}
              <Link
                href={`/results/${sessionId}`}
                className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-500 text-white font-bold rounded-xl hover:opacity-90 transition-opacity shadow-lg text-sm"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="mt-3 sm:mt-2 sm:pl-16">
              <button
                onClick={onDismiss}
                className="text-xs text-indigo-300 hover:text-white underline underline-offset-2"
              >
                Dismiss
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
