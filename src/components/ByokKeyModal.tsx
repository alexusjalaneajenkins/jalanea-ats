'use client';

/**
 * BYOK Key Modal Component
 *
 * Allows users to configure their LLM API key for enhanced features.
 * Includes validation, provider selection, and preference management.
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
} from 'lucide-react';
import {
  LlmConfig,
  SupportedProvider,
  DEFAULT_LLM_CONFIG,
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

interface ProviderInfo {
  name: string;
  displayName: string;
  description: string;
  keyUrl: string;
  keyFormat: string;
  available: boolean;
}

// ============================================================================
// Provider Information
// ============================================================================

const PROVIDERS: Record<SupportedProvider, ProviderInfo> = {
  gemini: {
    name: 'gemini',
    displayName: 'Google Gemini',
    description: 'Fast and cost-effective. Recommended for most users.',
    keyUrl: 'https://aistudio.google.com/apikey',
    keyFormat: 'AIza...',
    available: true,
  },
  openai: {
    name: 'openai',
    displayName: 'OpenAI',
    description: 'GPT-4 models. Coming soon.',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyFormat: 'sk-...',
    available: false,
  },
  anthropic: {
    name: 'anthropic',
    displayName: 'Anthropic Claude',
    description: 'Claude models. Coming soon.',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyFormat: 'sk-ant-...',
    available: false,
  },
};

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
  const [provider, setProvider] = useState<SupportedProvider>(
    currentConfig?.provider || 'gemini'
  );
  const [apiKey, setApiKey] = useState(currentConfig?.apiKey || '');
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [preferences, setPreferences] = useState(
    currentConfig?.preferences || DEFAULT_LLM_CONFIG.preferences
  );
  const [activeTab, setActiveTab] = useState<'key' | 'preferences'>('key');

  // Reset validation when key changes
  useEffect(() => {
    setValidationResult(null);
  }, [apiKey, provider]);

  // Handle provider change
  const handleProviderChange = (newProvider: SupportedProvider) => {
    if (PROVIDERS[newProvider].available) {
      setProvider(newProvider);
      setApiKey('');
      setValidationResult(null);
    }
  };

  // Validate API key
  const validateKey = async () => {
    if (!apiKey.trim()) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      // Currently only Gemini is implemented
      if (provider === 'gemini') {
        const isValid = await geminiProvider.validateKey(apiKey);
        setValidationResult(isValid);
      }
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
      apiKey,
      hasConsented: currentConfig?.hasConsented || false,
      consentTimestamp: currentConfig?.consentTimestamp,
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

  if (!isOpen) return null;

  return (
    <AnimatePresence>
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
          className="relative w-full max-w-lg mx-4 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
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
          <div className="flex border-b border-slate-700/50">
            <button
              onClick={() => setActiveTab('key')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'key'
                  ? 'text-amber-400 border-b-2 border-amber-400'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              API Key
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
          <div className="p-6">
            {activeTab === 'key' ? (
              <div className="space-y-6">
                {/* Provider Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Select Provider
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(PROVIDERS).map(([key, info]) => (
                      <button
                        key={key}
                        onClick={() => handleProviderChange(key as SupportedProvider)}
                        disabled={!info.available}
                        className={`relative p-4 rounded-xl border text-left transition-all ${
                          provider === key
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : info.available
                            ? 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
                            : 'border-slate-700/50 bg-slate-800/30 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-white">
                              {info.displayName}
                            </p>
                            <p className="text-sm text-slate-400 mt-1">
                              {info.description}
                            </p>
                          </div>
                          {provider === key && info.available && (
                            <div className="p-1 bg-amber-500 rounded-full">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* API Key Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      API Key
                    </label>
                    <a
                      href={PROVIDERS[provider].keyUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      Get API Key
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="relative">
                    <input
                      type={showKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder={PROVIDERS[provider].keyFormat}
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

                {/* Security Notice */}
                <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                  <p className="text-sm text-slate-400">
                    <span className="text-amber-400 font-medium">Security:</span>{' '}
                    Your API key is stored only in your browser&apos;s local storage.
                    It is never sent to our servers.
                  </p>
                </div>
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

                <PreferenceToggle
                  icon={<Settings2 className="w-5 h-5" />}
                  label="Cost Estimates"
                  description="Show estimated API costs before making requests"
                  enabled={preferences.showCostEstimates}
                  onChange={() => togglePreference('showCostEstimates')}
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700/50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={activeTab === 'key' && !apiKey.trim()}
              className="px-4 py-2 text-sm font-medium bg-amber-500 hover:bg-amber-400 text-slate-900 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Save Settings
            </button>
          </div>
        </motion.div>
      </div>
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
