'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Banner
 * Shows install prompt on supported devices and registers service worker
 */
export function PWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('SW registered:', registration.scope);
        },
        (err) => {
          console.log('SW registration failed:', err);
        }
      );
    }

    // Check if already dismissed
    const wasDismissed = localStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }

    // Listen for install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      if (!wasDismissed) {
        // Show banner after a short delay
        setTimeout(() => setShowBanner(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;

    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowBanner(false);
      setInstallPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!showBanner || dismissed || !installPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-50 md:left-auto md:right-6 md:max-w-sm"
      >
        <div className="bg-indigo-900/95 backdrop-blur-lg rounded-2xl border border-indigo-500/30 p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl shrink-0">
              <Download className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-white mb-1">
                Install Jalanea ATS
              </h3>
              <p className="text-xs text-indigo-300 mb-3">
                Add to your home screen for quick access, even offline.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleInstall}
                  className="px-4 py-1.5 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-sm font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                  Install
                </button>
                <button
                  onClick={handleDismiss}
                  className="px-4 py-1.5 text-indigo-300 text-sm hover:text-white transition-colors"
                >
                  Not now
                </button>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-indigo-400 hover:text-white transition-colors shrink-0"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
