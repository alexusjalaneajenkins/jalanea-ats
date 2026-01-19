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
