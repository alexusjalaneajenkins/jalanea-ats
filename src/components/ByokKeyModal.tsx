'use client';

/**
 * BYOK Key Modal Component
 *
 * Allows users to configure their Gemini API key and model for enhanced features.
 * Includes validation and preference management.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Key,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader2,
  ExternalLink,
  Settings2,
  Gift,
  Sparkles,
} from 'lucide-react';
import {
  LlmConfig,
  DEFAULT_LLM_CONFIG,
  GeminiModel,
  GEMINI_MODELS,
  DEFAULT_GEMINI_MODEL,
} from '@/lib/llm/types';
import { geminiProvider } from '@/lib/llm/gemini';

// ============================================================================
// Types
// ============================================================================

interface ByokKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: LlmConfig) => void;
  currentConfig?: LlmConfig;
}

const GEMINI_KEY_URL = 'https://aistudio.google.com/apikey';
const GEMINI_KEY_FORMAT = 'AIza...';

// ============================================================================
// Component
// ============================================================================

export function ByokKeyModal({
  isOpen,
  onClose,
  onSave,
  currentConfig,
}: ByokKeyModalProps) {
  // State
  const provider: LlmConfig['provider'] = 'gemini';
  const [geminiModel, setGeminiModel] = useState<GeminiModel>(
    currentConfig?.geminiModel || DEFAULT_GEMINI_MODEL
  );
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState(
    currentConfig?.preferences || DEFAULT_LLM_CONFIG.preferences
  );
  const [activeTab, setActiveTab] = useState<'key' | 'preferences'>('key');
  // Key mode: 'demo' uses server key with 3/day limit, 'byok' uses user's own key
  const [keyMode, setKeyMode] = useState<'demo' | 'byok'>(
    currentConfig?.apiKey ? 'byok' : 'demo'
  );

  // Reset validation when key or model changes
  useEffect(() => {
    setValidationResult(null);
  }, [apiKey, geminiModel]);

  // Update gemini provider model when selection changes
  useEffect(() => {
    geminiProvider.setModel(geminiModel);
  }, [geminiModel]);

  // Validate API key
  const validateKey = async () => {
    if (!apiKey.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const isValid = await geminiProvider.validateKey(apiKey);
      setValidationResult(isValid);
    } catch {
      setValidationResult(false);
    } finally {
      setIsValidating(false);
    }
  };

  // Handle save
  const handleSave = () => {
    const config: LlmConfig = {
      provider,
      geminiModel,
      // Clear API key if using demo mode
      apiKey: keyMode === 'byok' ? apiKey.trim() : '',
      hasConsented: keyMode === 'byok' ? (currentConfig?.hasConsented || false) : false,
      consentTimestamp: keyMode === 'byok' ? currentConfig?.consentTimestamp : undefined,
      preferences,
    };
    onSave(config);
    onClose();
  };

  // Toggle preference
  const togglePreference = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg mx-4 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden max-h-[90vh] flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Key className="w-5 h-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-white">
                AI Assistant Settings
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-700/50 shrink-0">
            <button
              onClick={() => setActiveTab('key')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'key'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gemini Key
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'preferences'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Preferences
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'key' ? (
              <div className="space-y-6">
                {/* Key Mode Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    API Key Mode
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {/* Demo Mode */}
                    <button
                      onClick={() => setKeyMode('demo')}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        keyMode === 'demo'
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${keyMode === 'demo' ? 'bg-emerald-500/20' : 'bg-slate-700/50'}`}>
                          <Gift className={`w-5 h-5 ${keyMode === 'demo' ? 'text-emerald-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm ${keyMode === 'demo' ? 'text-emerald-300' : 'text-white'}`}>
                              Demo Mode
                            </p>
                            {keyMode === 'demo' && (
                              <div className="p-0.5 bg-emerald-500 rounded-full">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            3 free analyses/day
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* BYOK Mode */}
                    <button
                      onClick={() => setKeyMode('byok')}
                      className={`relative p-4 rounded-xl border text-left transition-all ${
                        keyMode === 'byok'
                          ? 'border-amber-500/50 bg-amber-500/10'
                          : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${keyMode === 'byok' ? 'bg-amber-500/20' : 'bg-slate-700/50'}`}>
                          <Sparkles className={`w-5 h-5 ${keyMode === 'byok' ? 'text-amber-400' : 'text-slate-400'}`} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-medium text-sm ${keyMode === 'byok' ? 'text-amber-300' : 'text-white'}`}>
                              My Own Key
                            </p>
                            {keyMode === 'byok' && (
                              <div className="p-0.5 bg-amber-500 rounded-full">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-1">
                            Unlimited analyses
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Demo Mode Info */}
                {keyMode === 'demo' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30"
                  >
                    <div className="flex items-start gap-3">
                      <Gift className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-emerald-300">
                          Free Demo Mode Active
                        </p>
                        <p className="text-xs text-emerald-400/80 mt-1">
                          You get 3 free AI analyses per day. No sign-up required.
                          Your analyses reset daily at midnight.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* BYOK Section - only show when BYOK mode selected */}
                {keyMode === 'byok' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                  >
                    {/* Gemini Model Selection */}
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-3">
                        Gemini Model
                      </label>
                      <div className="grid grid-cols-1 gap-2">
                        {GEMINI_MODELS.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => setGeminiModel(model.id)}
                            className={`relative p-3 rounded-xl border text-left transition-all ${
                              geminiModel === model.id
                                ? 'border-cyan-500/50 bg-cyan-500/10'
                                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-white text-sm">
                                    {model.displayName}
                                  </p>
                                  {geminiModel === model.id && (
                                    <div className="p-0.5 bg-cyan-500 rounded-full">
                                      <Check className="w-3 h-3 text-white" />
                                    </div>
                                  )}
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {model.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* API Key Input */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-300">
                          Gemini API Key
                        </label>
                        <a
                          href={GEMINI_KEY_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                        >
                          Get a free key
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="relative">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="Paste your API key here"
                          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 pr-24"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="p-2 text-slate-400 hover:text-white transition-colors"
                          >
                            {showKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={validateKey}
                            disabled={!apiKey.trim() || isValidating}
                            className="px-3 py-1.5 text-xs font-medium bg-slate-700 hover:bg-slate-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isValidating ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              'Test'
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Validation Result */}
                      {validationResult !== null && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`mt-3 p-3 rounded-lg flex items-center gap-2 ${
                            validationResult
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {validationResult ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="text-sm">API key is valid!</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4" />
                              <span className="text-sm">
                                Invalid API key. Please check and try again.
                              </span>
                            </>
                          )}
                        </motion.div>
                      )}
                    </div>

                    {/* Quick how-to */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <p className="text-sm text-slate-200 font-semibold mb-2">
                        Get a Gemini key in 60 seconds
                      </p>
                      <ol className="text-xs text-slate-400 space-y-1">
                        <li>1. Open Google AI Studio and click "Get API key".</li>
                        <li>2. Create a key in a new or existing project.</li>
                        <li>3. Copy the key and paste it here.</li>
                      </ol>
                    </div>

                    {/* Security Notice */}
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                      <p className="text-sm text-slate-400">
                        <span className="text-amber-400 font-medium">Security:</span>{' '}
                        Your API key is stored only in your browser&apos;s local storage.
                        It is never sent to our servers.
                      </p>
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-slate-400 mb-4">
                  Configure which AI-powered features to enable:
                </p>

                {/* Preference Toggles */}
                <PreferenceToggle
                  icon={<Settings2 className="w-5 h-5" />}
                  label="Semantic Matching"
                  description="Find skills in your resume that match JD keywords using different words"
                  enabled={preferences.enableSemanticMatching}
                  onChange={() => togglePreference('enableSemanticMatching')}
                />

                <PreferenceToggle
                  icon={<Settings2 className="w-5 h-5" />}
                  label="Rewrite Suggestions"
                  description="Get AI suggestions for incorporating missing keywords"
                  enabled={preferences.enableRewriteSuggestions}
                  onChange={() => togglePreference('enableRewriteSuggestions')}
                />

                <PreferenceToggle
                  icon={<Settings2 className="w-5 h-5" />}
                  label="Bias Review"
                  description="Identify potentially biased language in your resume"
                  enabled={preferences.enableBiasReview}
                  onChange={() => togglePreference('enableBiasReview')}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3 shrink-0">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isValidating}
              className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Settings
            </button>
          </div>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface PreferenceToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onChange: () => void;
}

function PreferenceToggle({
  icon,
  label,
  description,
  enabled,
  onChange,
}: PreferenceToggleProps) {
  return (
    <button
      onClick={onChange}
      className="w-full p-4 rounded-xl border border-slate-700/50 hover:border-slate-600 bg-slate-800/30 text-left transition-all"
    >
      <div className="flex items-start gap-4">
        <div
          className={`p-2 rounded-lg ${
            enabled ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-700/50 text-slate-400'
          }`}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="font-medium text-white">{label}</p>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
        </div>
        <div
          className={`w-12 h-7 rounded-full p-1 transition-colors ${
            enabled ? 'bg-amber-500' : 'bg-slate-700'
          }`}
        >
          <motion.div
            animate={{ x: enabled ? 20 : 0 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            className="w-5 h-5 rounded-full bg-white shadow-sm"
          />
        </div>
      </div>
    </button>
  );
}

export default ByokKeyModal;
