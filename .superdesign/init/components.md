# Shared UI Primitives

Framework detection:
- Framework: React 19
- Meta-framework: Next.js App Router (`src/app`)
- Component library: custom components in `src/components/ui`
- Styling: Tailwind CSS v4 utility classes plus global CSS in `src/app/globals.css`

## KeywordChip
- File: `src/components/ui/KeywordChip.tsx`
- Description: Reusable keyword/status badge and list renderer used in ATS analysis views.
- Key props: `keyword`, `status`, `importance`, `onClick`, `size`

```tsx
'use client';

/**
 * Keyword Chip Component
 *
 * Consistent keyword badge for displaying matched, missing, and partial keyword matches.
 * Includes icons alongside colors for color blindness accessibility.
 */

import { Check, X, Minus, AlertCircle } from 'lucide-react';

export type KeywordStatus = 'matched' | 'missing' | 'partial' | 'bonus';
export type KeywordImportance = 'critical' | 'optional';

export interface KeywordChipProps {
  /** The keyword text to display */
  keyword: string;
  /** Status of the keyword match */
  status: KeywordStatus;
  /** Importance level of the keyword */
  importance?: KeywordImportance;
  /** Optional click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
}

const statusConfig = {
  matched: {
    bg: 'bg-emerald-500/20',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300',
    icon: Check,
    iconLabel: 'matched',
  },
  missing: {
    bg: 'bg-transparent',
    border: 'border-red-500/50 border-dashed',
    text: 'text-red-300',
    icon: X,
    iconLabel: 'missing',
  },
  partial: {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/40',
    text: 'text-amber-300',
    icon: Minus,
    iconLabel: 'partial match',
  },
  bonus: {
    bg: 'bg-blue-500/20',
    border: 'border-blue-500/40',
    text: 'text-blue-300',
    icon: AlertCircle,
    iconLabel: 'bonus',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    text: 'text-xs',
    iconSize: 'w-3 h-3',
    gap: 'gap-1',
  },
  md: {
    padding: 'px-2.5 py-1',
    text: 'text-sm',
    iconSize: 'w-3.5 h-3.5',
    gap: 'gap-1.5',
  },
};

export function KeywordChip({
  keyword,
  status,
  importance,
  onClick,
  size = 'sm',
}: KeywordChipProps) {
  const config = statusConfig[status];
  const sizes = sizeConfig[size];
  const Icon = config.icon;

  const Component = onClick ? 'button' : 'span';

  return (
    <Component
      className={`
        inline-flex items-center ${sizes.gap} ${sizes.padding}
        rounded-full ${sizes.text} font-medium
        border ${config.bg} ${config.border} ${config.text}
        ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-indigo-500/50' : ''}
      `}
      onClick={onClick}
      role={onClick ? 'button' : 'listitem'}
      aria-label={`${keyword}, ${config.iconLabel}${importance === 'critical' ? ', required' : ''}`}
    >
      <Icon
        className={sizes.iconSize}
        aria-hidden="true"
      />
      <span>{keyword}</span>
      {importance === 'critical' && (
        <span className="sr-only">(required)</span>
      )}
    </Component>
  );
}

/**
 * KeywordChipList - Renders a list of keywords with consistent styling
 */
export interface KeywordChipListProps {
  keywords: string[];
  status: KeywordStatus;
  importance?: KeywordImportance;
  onKeywordClick?: (keyword: string) => void;
  emptyMessage?: string;
  size?: 'sm' | 'md';
}

export function KeywordChipList({
  keywords,
  status,
  importance,
  onKeywordClick,
  emptyMessage = 'None',
  size = 'sm',
}: KeywordChipListProps) {
  if (keywords.length === 0) {
    return (
      <span className="text-xs text-indigo-500 italic">{emptyMessage}</span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" role="list">
      {keywords.map((keyword) => (
        <KeywordChip
          key={keyword}
          keyword={keyword}
          status={status}
          importance={importance}
          onClick={onKeywordClick ? () => onKeywordClick(keyword) : undefined}
          size={size}
        />
      ))}
    </div>
  );
}

export default KeywordChip;
```

## ScoreAnnouncer
- File: `src/components/ui/ScoreAnnouncer.tsx`
- Description: Screen-reader-only live region for announcing score changes.
- Key props: `scores`, `announceOnMount`

```tsx
'use client';

/**
 * Score Announcer Component
 *
 * Provides an aria-live region for announcing score changes to screen readers.
 * Uses polite announcements to avoid interrupting user navigation.
 */

import { useEffect, useState, useRef } from 'react';

export interface ScoreUpdate {
  name: string;
  value: number | string;
  label?: string;
}

export interface ScoreAnnouncerProps {
  /** Current scores to announce */
  scores: ScoreUpdate[];
  /** Whether to announce on initial render */
  announceOnMount?: boolean;
}

export function ScoreAnnouncer({
  scores,
  announceOnMount = true,
}: ScoreAnnouncerProps) {
  const [announcement, setAnnouncement] = useState('');
  const prevScoresRef = useRef<ScoreUpdate[]>([]);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Skip if no scores
    if (scores.length === 0) return;

    // Handle initial announcement
    if (isFirstRender.current) {
      isFirstRender.current = false;
      if (announceOnMount) {
        const initialMessage = scores
          .map((s) => `${s.name}: ${s.value}${s.label ? `, ${s.label}` : ''}`)
          .join('. ');
        setAnnouncement(`Analysis complete. ${initialMessage}`);
      }
      prevScoresRef.current = scores;
      return;
    }

    // Check for changes and announce
    const changes: string[] = [];
    scores.forEach((score) => {
      const prev = prevScoresRef.current.find((p) => p.name === score.name);
      if (!prev || prev.value !== score.value) {
        changes.push(
          `${score.name} updated to ${score.value}${score.label ? `, ${score.label}` : ''}`
        );
      }
    });

    if (changes.length > 0) {
      setAnnouncement(changes.join('. '));
    }

    prevScoresRef.current = scores;
  }, [scores, announceOnMount]);

  // Clear announcement after it's been read
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
}

export default ScoreAnnouncer;
```

## Tooltip
- File: `src/components/ui/Tooltip.tsx`
- Description: Accessible tooltip wrapper with motion-driven reveal and directional positioning.
- Key props: `content`, `children`, `position`, `delay`, `className`

```tsx
'use client';

/**
 * Accessible Tooltip Component
 *
 * Features:
 * - Proper ARIA attributes (role="tooltip", aria-describedby)
 * - Keyboard accessible (shows on focus, hides on Escape)
 * - Supports hover and focus triggers
 * - Respects reduced motion preferences
 */

import { useState, useCallback, useEffect, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface TooltipProps {
  /** The content to display in the tooltip */
  content: React.ReactNode;
  /** The trigger element */
  children: React.ReactNode;
  /** Position of the tooltip relative to trigger */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Delay before showing tooltip (ms) */
  delay?: number;
  /** Additional class names for the tooltip */
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 200,
  className = '',
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const tooltipId = useId();

  const showTooltip = useCallback(() => {
    const id = setTimeout(() => setIsVisible(true), delay);
    setTimeoutId(id);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  }, [timeoutId]);

  // Handle Escape key to close tooltip
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isVisible) {
        hideTooltip();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, hideTooltip]);

  // Position styles
  const positionStyles = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  // Arrow styles
  const arrowStyles = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-indigo-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-indigo-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-indigo-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-indigo-800 border-y-transparent border-l-transparent',
  };

  // Animation variants
  const variants = {
    hidden: {
      opacity: 0,
      scale: 0.95,
      transition: { duration: 0.1 },
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.15 },
    },
  };

  return (
    <div className="relative inline-flex">
      {/* Trigger element wrapper */}
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            id={tooltipId}
            role="tooltip"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={variants}
            className={`
              absolute z-50 ${positionStyles[position]}
              px-3 py-2 text-sm text-indigo-100
              bg-indigo-800 rounded-lg shadow-lg
              max-w-xs whitespace-normal
              pointer-events-none
              ${className}
            `}
          >
            {content}
            {/* Arrow */}
            <div
              className={`absolute w-0 h-0 border-4 ${arrowStyles[position]}`}
              aria-hidden="true"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default Tooltip;
```
