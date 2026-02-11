'use client';

/**
 * Bullet Suggestion Popover Component
 *
 * Displays AI-generated variations for a resume bullet point.
 * Based on "Select and Replace" UX pattern research [EXTERNAL - Gemini].
 *
 * Features:
 * - 3 variations with strategy labels (High Impact, Leadership, Concise)
 * - Edit-in-place before replacing
 * - Refinement chips for steering AI
 * - Regenerate option
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Check,
  X,
  RefreshCw,
  Copy,
  Edit3,
  ChevronDown,
  Target,
  Zap,
  Minus,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

export interface BulletVariation {
  id: string;
  strategy: 'high-impact' | 'leadership' | 'concise';
  label: string;
  text: string;
  highlights: {
    type: 'metric' | 'verb' | 'keyword';
    text: string;
    start: number;
    end: number;
  }[];
}

interface BulletSuggestionPopoverProps {
  /** Original bullet text */
  original: string;
  /** AI-generated variations */
  variations: BulletVariation[];
  /** Position relative to the bullet */
  position: { top: number; left: number };
  /** Loading state */
  isLoading?: boolean;
  /** Error message */
  error?: string | null;
  /** Callback when user selects a variation */
  onSelect: (text: string) => void;
  /** Callback to regenerate suggestions */
  onRegenerate: () => void;
  /** Callback to close the popover */
  onClose: () => void;
  /** Callback for refinement (e.g., "make shorter") */
  onRefine?: (instruction: string) => void;
}

const strategyIcons: Record<string, React.ReactNode> = {
  'high-impact': <Target className="w-3.5 h-3.5" />,
  'leadership': <Zap className="w-3.5 h-3.5" />,
  'concise': <Minus className="w-3.5 h-3.5" />,
};

const strategyColors: Record<string, string> = {
  'high-impact': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  'leadership': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'concise': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
};

export function BulletSuggestionPopover({
  original,
  variations,
  position,
  isLoading,
  error,
  onSelect,
  onRegenerate,
  onClose,
  onRefine,
}: BulletSuggestionPopoverProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRefinements, setShowRefinements] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (editingId) {
          setEditingId(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [editingId, onClose]);

  const handleStartEdit = (variation: BulletVariation) => {
    setEditingId(variation.id);
    setEditedText(variation.text);
  };

  const handleSaveEdit = () => {
    if (editedText.trim()) {
      onSelect(editedText.trim());
    }
    setEditingId(null);
  };

  const handleCopy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderHighlightedText = (variation: BulletVariation) => {
    if (variation.highlights.length === 0) {
      return <span>{variation.text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastEnd = 0;

    // Sort highlights by position
    const sorted = [...variation.highlights].sort((a, b) => a.start - b.start);

    sorted.forEach((highlight, i) => {
      // Add text before highlight
      if (highlight.start > lastEnd) {
        parts.push(
          <span key={`text-${i}`}>{variation.text.slice(lastEnd, highlight.start)}</span>
        );
      }

      // Add highlighted text
      const highlightClass =
        highlight.type === 'metric'
          ? 'text-emerald-400 font-semibold'
          : highlight.type === 'verb'
          ? 'text-purple-400 font-semibold'
          : 'text-cyan-400 font-semibold';

      parts.push(
        <span key={`highlight-${i}`} className={highlightClass}>
          {highlight.text}
        </span>
      );

      lastEnd = highlight.end;
    });

    // Add remaining text
    if (lastEnd < variation.text.length) {
      parts.push(<span key="remaining">{variation.text.slice(lastEnd)}</span>);
    }

    return <>{parts}</>;
  };

  const refinementChips = [
    { label: 'Make Shorter', instruction: 'make it shorter and more concise' },
    { label: 'Add Metrics', instruction: 'add quantifiable metrics and numbers' },
    { label: 'More Professional', instruction: 'make it more professional and formal' },
    { label: 'Fix Grammar', instruction: 'fix any grammar or spelling issues' },
  ];

  return (
    <motion.div
      ref={popoverRef}
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="absolute z-50 w-[400px] max-w-[calc(100vw-2rem)]"
      style={{
        top: position.top + 8,
        left: Math.max(16, Math.min(position.left, window.innerWidth - 416)),
      }}
    >
      <div className="bg-indigo-950 border border-indigo-500/30 rounded-xl shadow-2xl shadow-black/50 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-indigo-900/50 border-b border-indigo-500/20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">AI Suggestions</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowRefinements(!showRefinements)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-300 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
            >
              <span>Refine</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${showRefinements ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-indigo-400 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Refinement Chips */}
        <AnimatePresence>
          {showRefinements && onRefine && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-2 px-4 py-3 bg-indigo-900/30 border-b border-indigo-500/20">
                {refinementChips.map((chip) => (
                  <button
                    key={chip.label}
                    onClick={() => onRefine(chip.instruction)}
                    disabled={isLoading}
                    className="px-2.5 py-1 text-xs font-medium bg-indigo-800/50 hover:bg-indigo-700/50 text-indigo-200 rounded-lg border border-indigo-600/30 transition-colors disabled:opacity-50"
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Original bullet (collapsed) */}
        <div className="px-4 py-2 bg-indigo-900/20 border-b border-indigo-500/10">
          <div className="text-xs text-indigo-400 mb-1">Original:</div>
          <div className="text-sm text-indigo-300 line-clamp-2">{original}</div>
        </div>

        {/* Content */}
        <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-3" />
              <p className="text-sm text-indigo-300">Generating improvements...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-300">{error}</p>
              <button
                onClick={onRegenerate}
                className="mt-2 text-xs text-red-400 hover:text-red-300 underline"
              >
                Try again
              </button>
            </div>
          ) : variations.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-indigo-400">No suggestions available</p>
            </div>
          ) : (
            variations.map((variation) => (
              <div
                key={variation.id}
                className="p-3 bg-indigo-900/30 hover:bg-indigo-900/50 rounded-lg border border-indigo-500/20 transition-colors"
              >
                {/* Strategy badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded-full border ${strategyColors[variation.strategy]}`}
                  >
                    {strategyIcons[variation.strategy]}
                    {variation.label}
                  </span>
                </div>

                {/* Text or edit field */}
                {editingId === variation.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedText}
                      onChange={(e) => setEditedText(e.target.value)}
                      className="w-full px-3 py-2 bg-indigo-950 border border-indigo-500/30 rounded-lg text-sm text-white placeholder-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs text-indigo-300 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        className="px-3 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Use This
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-indigo-100 mb-3">
                      {renderHighlightedText(variation)}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onSelect(variation.text)}
                        className="flex-1 px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-orange-500/20 to-pink-500/20 hover:from-orange-500/30 hover:to-pink-500/30 text-orange-300 rounded-lg border border-orange-500/30 transition-colors flex items-center justify-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        Replace
                      </button>
                      <button
                        onClick={() => handleStartEdit(variation)}
                        className="px-3 py-1.5 text-xs text-indigo-300 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors flex items-center gap-1"
                        title="Edit before replacing"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleCopy(variation.text, variation.id)}
                        className="px-2 py-1.5 text-indigo-400 hover:text-white hover:bg-indigo-800/50 rounded-lg transition-colors"
                        title="Copy to clipboard"
                      >
                        {copiedId === variation.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {!isLoading && !error && variations.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-indigo-900/30 border-t border-indigo-500/20">
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-indigo-500">Was this helpful?</span>
              <button className="p-1 text-indigo-400 hover:text-emerald-400 transition-colors">
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button className="p-1 text-indigo-400 hover:text-red-400 transition-colors">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default BulletSuggestionPopover;
