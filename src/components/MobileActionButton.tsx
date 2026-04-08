'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, ChevronUp } from 'lucide-react';

interface MobileActionButtonProps {
  /** Target element ID to scroll to */
  targetId: string;
  /** Whether the action has been completed (hides button) */
  isComplete?: boolean;
  /** Label for the button */
  label?: string;
}

/**
 * Mobile Action Button (FAB)
 *
 * A floating action button that appears on mobile when users need to
 * take an action that's below the fold (e.g., add job description).
 *
 * - Appears after user scrolls past the target section
 * - Disappears when action is complete
 * - Hidden on desktop (lg:hidden)
 */
export function MobileActionButton({
  targetId,
  isComplete = false,
  label = 'Add Job Description',
}: MobileActionButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Don't show if complete
    if (isComplete) {
      setIsVisible(false);
      return;
    }

    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show FAB when target is NOT visible (user scrolled past it)
        setIsVisible(!entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '-100px 0px 0px 0px', // Trigger a bit before fully out of view
      }
    );

    observer.observe(targetElement);

    return () => observer.disconnect();
  }, [targetId, isComplete]);

  const handleClick = () => {
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && !isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-4 right-4 z-40 lg:hidden"
        >
          <button
            onClick={handleClick}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-shadow"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <FileText className="w-4 h-4" />
              </div>
              <div className="text-left">
                <p className="text-base font-bold leading-tight">{label}</p>
                <p className="text-xs text-white/80 leading-tight">Tap to go to Step 2</p>
              </div>
            </div>
            <ChevronUp className="w-5 h-5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Pulse indicator for important actions
 *
 * Shows a pulsing dot to draw attention to an element.
 */
export function PulseIndicator({ className = '' }: { className?: string }) {
  return (
    <span className={`relative flex h-3 w-3 ${className}`}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500" />
    </span>
  );
}
