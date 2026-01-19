'use client';

import { Building2, Bot, Search, HelpCircle } from 'lucide-react';
import { ATSVendor, ATSVendorType } from '@/lib/ats';

interface ATSVendorBadgeProps {
  vendor: ATSVendor | null;
  confidence?: 'high' | 'medium' | 'low';
  showType?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * ATS Vendor Badge
 *
 * Displays the detected ATS vendor with an icon and type indicator.
 */
export function ATSVendorBadge({
  vendor,
  confidence = 'high',
  showType = true,
  size = 'md',
}: ATSVendorBadgeProps) {
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  if (!vendor) {
    return (
      <div
        className={`
          inline-flex items-center gap-1.5 rounded-lg
          bg-indigo-500/10 border border-indigo-500/30 text-indigo-300
          ${sizeClasses[size]}
        `}
      >
        <HelpCircle className={iconSizes[size]} />
        <span>Unknown ATS</span>
      </div>
    );
  }

  const typeConfig = getTypeConfig(vendor.type);

  return (
    <div
      className={`
        inline-flex items-center gap-1.5 rounded-lg
        ${typeConfig.bg} ${typeConfig.border} ${typeConfig.text}
        ${sizeClasses[size]}
      `}
    >
      <span className="text-base">{vendor.icon}</span>
      <span className="font-medium">{vendor.name}</span>
      {showType && (
        <>
          <span className="opacity-50">•</span>
          <span className={`flex items-center gap-1 ${typeConfig.typeText}`}>
            {vendor.type === 'sorter' ? (
              <Bot className={iconSizes[size]} />
            ) : (
              <Search className={iconSizes[size]} />
            )}
            <span className="capitalize">{vendor.type}</span>
          </span>
        </>
      )}
      {confidence === 'medium' && (
        <span className="opacity-50 text-xs ml-1">(likely)</span>
      )}
    </div>
  );
}

/**
 * Get color config based on vendor type
 */
function getTypeConfig(type: ATSVendorType) {
  if (type === 'sorter') {
    return {
      bg: 'bg-purple-500/10',
      border: 'border border-purple-500/30',
      text: 'text-purple-200',
      typeText: 'text-purple-400',
    };
  }
  return {
    bg: 'bg-cyan-500/10',
    border: 'border border-cyan-500/30',
    text: 'text-cyan-200',
    typeText: 'text-cyan-400',
  };
}

interface ATSVendorIconProps {
  vendor: ATSVendor | null;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Compact ATS vendor icon for tight spaces
 */
export function ATSVendorIcon({ vendor, size = 'md' }: ATSVendorIconProps) {
  const sizeClasses = {
    sm: 'w-5 h-5 text-xs',
    md: 'w-7 h-7 text-sm',
    lg: 'w-9 h-9 text-base',
  };

  if (!vendor) {
    return (
      <div
        className={`
          ${sizeClasses[size]} rounded-lg flex items-center justify-center
          bg-indigo-500/20 border border-indigo-500/30
        `}
        title="Unknown ATS"
      >
        <HelpCircle className="w-3 h-3 text-indigo-400" />
      </div>
    );
  }

  const typeConfig = getTypeConfig(vendor.type);

  return (
    <div
      className={`
        ${sizeClasses[size]} rounded-lg flex items-center justify-center
        ${typeConfig.bg} ${typeConfig.border}
      `}
      title={`${vendor.name} (${vendor.type})`}
    >
      <span>{vendor.icon}</span>
    </div>
  );
}
